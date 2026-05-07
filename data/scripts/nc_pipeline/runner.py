from __future__ import annotations

import argparse
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Any

from .errors import FetchError, MappingError, ParseError, ValidationError
from .io_utils import (
    read_cache,
    read_json,
    serialize_health,
    serialize_normalized,
    serialize_raw,
    utc_run_id,
    write_cache,
    write_json,
)
from .merge import deduplicate_records, to_new_nc_data
from .normalizer import ensure_mappable_program_data, load_alias_map, normalize_records
from .sources import SCRAPER_MODULES
from .types import ModuleStatus, RawNCRecord, ScraperHealth
from .validators import summarize_by_university, validate_min_success, validate_normalized_records


ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT / "data"
SCRIPT_DIR = ROOT / "data" / "scripts"
MAPPINGS_DIR = DATA_DIR / "mappings"

PROGRAMS_FILE = DATA_DIR / "university_programs_v2.json"
NEW_DATA_FILE = DATA_DIR / "new_nc_data.json"
REPORTS_DIR = DATA_DIR / "nc_reports"
RAW_DIR = DATA_DIR / "nc_raw"
CACHE_DIR = DATA_DIR / "nc_cache"
UNMAPPED_FILE = DATA_DIR / "unmapped_records.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run modular NC scraping pipeline")
    parser.add_argument("--universities", default="", help="Comma-separated module IDs")
    parser.add_argument("--max-workers", type=int, default=4)
    parser.add_argument("--timeout-seconds", type=int, default=25)
    parser.add_argument("--retries", type=int, default=1)
    parser.add_argument("--fallback-cache-ttl-days", type=int, default=180)
    parser.add_argument("--min-successful-modules", type=int, default=1)
    parser.add_argument("--max-failure-rate", type=float, default=0.7)
    parser.add_argument("--strict", action="store_true")
    return parser.parse_args()


def select_scrapers(universities_arg: str) -> list[Any]:
    all_scrapers = [cls() for cls in SCRAPER_MODULES]
    if not universities_arg.strip():
        return all_scrapers
    allowed = {x.strip() for x in universities_arg.split(",") if x.strip()}
    return [s for s in all_scrapers if s.university_id in allowed]


def _execute_scraper(scraper: Any, timeout_seconds: int, retries: int) -> tuple[list[RawNCRecord], ScraperHealth]:
    started = time.time()
    last_error: Exception | None = None

    for attempt in range(retries + 1):
        try:
            scraper.timeout_seconds = timeout_seconds
            payload = scraper.fetch()
            records = scraper.parse(payload)
            health = ScraperHealth(
                university_id=scraper.university_id,
                status=ModuleStatus.SUCCESS,
                records_extracted=len(records),
                duration_ms=int((time.time() - started) * 1000),
                retries=attempt,
            )
            return records, health
        except (FetchError, ParseError, Exception) as exc:
            last_error = exc
            if attempt >= retries:
                break

    health = ScraperHealth(
        university_id=scraper.university_id,
        status=ModuleStatus.FAILED,
        records_extracted=0,
        duration_ms=int((time.time() - started) * 1000),
        error=str(last_error) if last_error else "unknown_error",
        retries=retries,
    )
    return [], health


def fallback_is_fresh(cached_at: str | None, ttl_days: int) -> bool:
    if not cached_at:
        return False
    try:
        then = datetime.fromisoformat(cached_at)
    except ValueError:
        return False
    age_days = (datetime.utcnow() - then).days
    return age_days <= ttl_days


def build_summary_text(summary: dict[str, Any]) -> str:
    lines = []
    lines.append("## NC Pipeline Summary")
    lines.append("")
    lines.append(f"- Run ID: `{summary['run_id']}`")
    lines.append(f"- Modules total: `{summary['modules_total']}`")
    lines.append(f"- Modules success: `{summary['modules_success']}`")
    lines.append(f"- Modules failed: `{summary['modules_failed']}`")
    lines.append(f"- Modules fallback cache: `{summary['modules_fallback_cache']}`")
    lines.append(f"- Records extracted: `{summary['records_extracted']}`")
    lines.append(f"- Records normalized(valid): `{summary['records_normalized']}`")
    lines.append(f"- Records invalid/unmapped: `{summary['records_invalid_or_unmapped']}`")
    lines.append(f"- Updated output entries: `{summary['new_data_entries']}`")
    lines.append("")
    if summary["failed_modules"]:
        lines.append("### Failed modules")
        for item in summary["failed_modules"]:
            lines.append(f"- `{item['university_id']}`: {item.get('error', 'unknown')}")
        lines.append("")
    return "\n".join(lines)


def maybe_send_webhook(summary: dict[str, Any]) -> None:
    webhook = os.getenv("NC_PIPELINE_WEBHOOK_URL", "").strip()
    if not webhook:
        return
    should_alert = summary["hard_fail"] or summary["modules_failed"] > 0
    if not should_alert:
        return

    try:
        import requests

        message = {
            "text": (
                f"NC pipeline run {summary['run_id']}: "
                f"failed_modules={summary['modules_failed']}, "
                f"fallback={summary['modules_fallback_cache']}, "
                f"hard_fail={summary['hard_fail']}"
            )
        }
        requests.post(webhook, json=message, timeout=8)
    except Exception:
        pass


def run_pipeline() -> int:
    args = parse_args()
    run_id = utc_run_id()

    raw_run_dir = RAW_DIR / run_id
    report_run_dir = REPORTS_DIR / run_id
    report_run_dir.mkdir(parents=True, exist_ok=True)
    raw_run_dir.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    program_data = read_json(PROGRAMS_FILE, default={})
    ensure_mappable_program_data(program_data)

    university_alias_map = load_alias_map(MAPPINGS_DIR / "university_aliases.json")
    program_alias_map = load_alias_map(MAPPINGS_DIR / "program_aliases.json")

    scrapers = select_scrapers(args.universities)

    all_raw_records: list[RawNCRecord] = []
    all_normalized = []
    all_unmapped: list[dict[str, Any]] = []
    health_rows: list[dict[str, Any]] = []
    failed_modules: list[dict[str, Any]] = []
    fallback_count = 0

    with ThreadPoolExecutor(max_workers=max(args.max_workers, 1)) as pool:
        futures = {
            pool.submit(_execute_scraper, scraper, args.timeout_seconds, args.retries): scraper
            for scraper in scrapers
        }
        for future in as_completed(futures):
            scraper = futures[future]
            raw_records, health = future.result()

            if health.status == ModuleStatus.SUCCESS and raw_records:
                normalized_records, unmapped = normalize_records(
                    records=raw_records,
                    program_data=program_data,
                    university_alias_map=university_alias_map,
                    program_alias_map=program_alias_map,
                    source_type="live_scrape",
                )
                valid_records, invalid = validate_normalized_records(normalized_records)
                health.records_normalized = len(valid_records)

                all_raw_records.extend(raw_records)
                all_normalized.extend(valid_records)
                all_unmapped.extend(unmapped)
                all_unmapped.extend(invalid)

                write_json(raw_run_dir / f"{scraper.university_id}.json", serialize_raw(raw_records))
                write_cache(CACHE_DIR, scraper.university_id, valid_records)
            else:
                cached_at, cached_records = read_cache(CACHE_DIR, scraper.university_id)
                if cached_records and fallback_is_fresh(cached_at, args.fallback_cache_ttl_days):
                    health.status = ModuleStatus.FALLBACK_CACHE
                    health.used_fallback_cache = True
                    health.records_normalized = len(cached_records)
                    all_normalized.extend(cached_records)
                    fallback_count += 1
                else:
                    failed_modules.append(
                        {
                            "university_id": scraper.university_id,
                            "error": health.error or "no_cache_available",
                        }
                    )
            health_rows.append(serialize_health(health))

    deduped = deduplicate_records(all_normalized)
    new_data_payload = to_new_nc_data(deduped)
    write_json(NEW_DATA_FILE, new_data_payload)

    modules_total = len(scrapers)
    modules_failed = sum(1 for row in health_rows if row["status"] == ModuleStatus.FAILED)
    modules_success = sum(
        1 for row in health_rows if row["status"] in (ModuleStatus.SUCCESS, ModuleStatus.FALLBACK_CACHE)
    )

    hard_fail = False
    try:
        validate_min_success(
            successful_modules=modules_success,
            total_modules=modules_total,
            min_successful_modules=args.min_successful_modules,
            max_failure_rate=args.max_failure_rate,
        )
    except ValidationError:
        hard_fail = True
        if args.strict:
            # strict mode turns gate violations into workflow failure
            pass

    summary = {
        "run_id": run_id,
        "modules_total": modules_total,
        "modules_success": modules_success,
        "modules_failed": modules_failed,
        "modules_fallback_cache": fallback_count,
        "records_extracted": len(all_raw_records),
        "records_normalized": len(deduped),
        "records_invalid_or_unmapped": len(all_unmapped),
        "new_data_entries": len(new_data_payload),
        "failed_modules": failed_modules,
        "by_university": summarize_by_university(deduped),
        "hard_fail": hard_fail,
    }

    write_json(report_run_dir / "summary.json", summary)
    write_json(report_run_dir / "module_health.json", health_rows)
    write_json(report_run_dir / "module_failures.json", failed_modules)
    write_json(UNMAPPED_FILE, all_unmapped)

    summary_text = build_summary_text(summary)
    print(summary_text)

    github_step_summary = os.getenv("GITHUB_STEP_SUMMARY")
    if github_step_summary:
        with open(github_step_summary, "a", encoding="utf-8") as f:
            f.write(summary_text + "\n")

    maybe_send_webhook(summary)

    if hard_fail and args.strict:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(run_pipeline())

