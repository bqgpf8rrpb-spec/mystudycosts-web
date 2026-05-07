#!/usr/bin/env python3
from __future__ import annotations

import os
import sys

# Prevent local `types.py` shadowing Python stdlib `types` when run as script.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR in sys.path:
    sys.path.remove(SCRIPT_DIR)

import argparse
import json
import math
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.hochschulkompass.de"
SEARCH_PAGE_URL = (
    "https://www.hochschulkompass.de/studium/studiengangsuche/"
    "erweiterte-studiengangsuche/search/1/studtyp/3.html"
)
PAGE_URL_TEMPLATE = (
    "https://www.hochschulkompass.de/studium/studiengangsuche/"
    "erweiterte-studiengangsuche/search/1/studtyp/3/pn/{page}.html"
)
OUTPUT_FILE = Path(__file__).resolve().parents[2] / "raw" / "hochschulkompass_raw.jsonl"
REQUEST_TIMEOUT_SECONDS = 30
MAX_RETRIES = 3


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bulk scrape Hochschulkompass search pages into JSONL.")
    parser.add_argument("--max-pages", type=int, default=None, help="Max pages to scrape for testing.")
    parser.add_argument("--resume-page", type=int, default=1, help="Page number to resume from.")
    parser.add_argument("--delay", type=float, default=1.5, help="Delay between requests in seconds.")
    return parser.parse_args()


def make_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": (
                "text/html,application/xhtml+xml,application/xml;q=0.9,"
                "application/json;q=0.8,*/*;q=0.7"
            ),
            "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "DNT": "1",
        }
    )
    return session


def extract_total_results_count(html_text: str) -> int | None:
    soup = BeautifulSoup(html_text, "html.parser")
    text = soup.get_text(" ", strip=True)
    match = re.search(r"Treffer\s+\d+\s+bis\s+\d+\s+von\s+ingesamt\s+([\d\.\,]+)", text, re.I)
    if not match:
        match = re.search(r"([\d\.\,]+)\s+Treffern", text, re.I)
    if not match:
        return None
    normalized = re.sub(r"[^\d]", "", match.group(1))
    return int(normalized) if normalized else None


def build_page_url(page: int) -> str:
    if page <= 1:
        return SEARCH_PAGE_URL
    return PAGE_URL_TEMPLATE.format(page=page)


def fetch_with_retry(session: requests.Session, url: str) -> requests.Response:
    backoff_seconds = 1.0
    last_exception: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = session.get(url, timeout=REQUEST_TIMEOUT_SECONDS, allow_redirects=True)
        except requests.RequestException as exc:
            last_exception = exc
            if attempt >= MAX_RETRIES:
                raise RuntimeError(f"Request failed after {MAX_RETRIES} attempts: {exc}") from exc
            print(f"WARN: Request error on attempt {attempt}/{MAX_RETRIES} for {url}: {exc}")
            time.sleep(backoff_seconds)
            backoff_seconds *= 2
            continue

        if response.status_code in (403, 404):
            raise RuntimeError(f"Fatal status {response.status_code} for {url}")

        if 500 <= response.status_code <= 599:
            if attempt >= MAX_RETRIES:
                raise RuntimeError(
                    f"HTTP {response.status_code} after {MAX_RETRIES} attempts for {url}"
                )
            print(
                f"WARN: HTTP {response.status_code} on attempt {attempt}/{MAX_RETRIES} "
                f"for {url}"
            )
            time.sleep(backoff_seconds)
            backoff_seconds *= 2
            continue

        return response

    raise RuntimeError(f"Unexpected fetch loop failure for {url}: {last_exception}")


def parse_result_boxes(html_text: str, page: int) -> tuple[list[dict[str, Any]], list[str]]:
    soup = BeautifulSoup(html_text, "html.parser")
    boxes = soup.select("section.result-box")
    warnings: list[str] = []
    if not boxes:
        warnings.append(f"[page-{page}] WARN: No result boxes found.")

    items: list[dict[str, Any]] = []
    scraped_at = datetime.now(tz=timezone.utc).isoformat()

    for idx, box in enumerate(boxes, start=1):
        title_el = box.select_one("h2")
        title = title_el.get_text(strip=True) if title_el else None

        details: dict[str, str] = {}
        for li in box.select("ul.info li"):
            label_el = li.select_one("span.title")
            value_el = li.select_one("span.status")
            if not label_el or not value_el:
                continue
            label = label_el.get_text(" ", strip=True).lower()
            value = value_el.get_text(" ", strip=True)
            details[label] = value

        detail_anchor = box.select_one("a.btn-info.btn[href]")
        detail_href = detail_anchor["href"] if detail_anchor else None
        detail_url = urljoin(BASE_URL, detail_href) if detail_href else None

        missing: list[str] = []
        if not title:
            missing.append("title")
        if not details.get("hochschule"):
            missing.append("university")
        if not details.get("abschluss"):
            missing.append("degree")
        if not detail_url:
            missing.append("detail_url")
        if missing:
            warnings.append(f"[page-{page}] WARN: result-box #{idx} missing {', '.join(missing)}")

        items.append(
            {
                "title": title,
                "university": details.get("hochschule"),
                "degree": details.get("abschluss"),
                "study_mode": details.get("studienform"),
                "detail_url": detail_url,
                "source_page": page,
                "scraped_at": scraped_at,
            }
        )

    return items, warnings


def append_jsonl(path: Path, records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
        handle.flush()


def run() -> int:
    args = parse_args()
    if args.resume_page < 1:
        raise ValueError("--resume-page must be >= 1")
    if args.max_pages is not None and args.max_pages < 1:
        raise ValueError("--max-pages must be >= 1")

    session = make_session()
    first_url = build_page_url(1)
    print(f"Bootstrapping from: {first_url}")

    first_response = fetch_with_retry(session, first_url)
    if first_response.status_code != 200:
        print(f"ERROR: bootstrap failed with HTTP {first_response.status_code}")
        return 2

    total_results = extract_total_results_count(first_response.text)
    if total_results is None:
        print("ERROR: could not extract total result count from first page.")
        return 3

    total_pages = max(1, math.ceil(total_results / 10))
    if args.max_pages is not None:
        end_page = min(total_pages, args.resume_page + args.max_pages - 1)
    else:
        end_page = total_pages

    print(f"Detected total results: {total_results}")
    print(f"Detected total pages: {total_pages}")
    print(f"Scrape range: {args.resume_page}..{end_page}")
    print(f"Output JSONL: {OUTPUT_FILE}")

    total_saved = 0
    for page in range(args.resume_page, end_page + 1):
        url = build_page_url(page)
        try:
            response = first_response if page == 1 else fetch_with_retry(session, url)
        except RuntimeError as exc:
            print(f"ERROR: aborting at page {page}: {exc}")
            return 4

        if response.status_code in (403, 404):
            print(f"ERROR: aborting due to HTTP {response.status_code} at page {page}")
            return 5
        if response.status_code != 200:
            print(f"ERROR: aborting due to HTTP {response.status_code} at page {page}")
            return 6

        items, warnings = parse_result_boxes(response.text, page)
        append_jsonl(OUTPUT_FILE, items)
        total_saved += len(items)

        for warning in warnings:
            print(warning)

        print(f"Scraped Page {page}/{total_pages}... Saved {total_saved} items total")

        if page < end_page:
            time.sleep(args.delay)

    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
