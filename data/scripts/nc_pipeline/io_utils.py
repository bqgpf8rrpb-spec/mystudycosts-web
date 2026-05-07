from __future__ import annotations

import json
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Any

from .types import NormalizedNCRecord, RawNCRecord, ScraperHealth


def utc_run_id() -> str:
    return datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def write_json(path: Path, payload: Any) -> None:
    ensure_dir(path.parent)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def serialize_raw(records: list[RawNCRecord]) -> list[dict[str, Any]]:
    return [asdict(r) for r in records]


def serialize_normalized(records: list[NormalizedNCRecord]) -> list[dict[str, Any]]:
    return [asdict(r) for r in records]


def serialize_health(health: ScraperHealth) -> dict[str, Any]:
    return asdict(health)


def write_cache(cache_dir: Path, university_id: str, records: list[NormalizedNCRecord]) -> None:
    payload = {
        "cached_at": datetime.utcnow().isoformat(),
        "records": serialize_normalized(records),
    }
    write_json(cache_dir / f"{university_id}.json", payload)


def read_cache(cache_dir: Path, university_id: str) -> tuple[str | None, list[NormalizedNCRecord]]:
    payload = read_json(cache_dir / f"{university_id}.json", default={})
    records_raw = payload.get("records", [])
    records: list[NormalizedNCRecord] = []
    for item in records_raw:
        try:
            records.append(NormalizedNCRecord(**item))
        except TypeError:
            continue
    return payload.get("cached_at"), records

