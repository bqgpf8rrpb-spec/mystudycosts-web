#!/usr/bin/env python3
"""
PoC for Hochschulkompass study-search retrieval.

Goal:
- Fetch first result page from advanced study search.
- Prove we can get HTTP 200 without immediate bot blocking.
- Parse first 10 entries with core metadata.
"""

from __future__ import annotations

import json
import re
import sys
import time
from typing import Any
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.hochschulkompass.de"
TARGET_URL = (
    "https://www.hochschulkompass.de/studium/studiengangsuche/"
    "erweiterte-studiengangsuche/search/1/studtyp/3.html"
)
PAGE_DELAY_SECONDS = 1.5
TEST_PAGES = [1, 2, 100]


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
    raw_number = match.group(1)
    normalized = re.sub(r"[^\d]", "", raw_number)
    return int(normalized) if normalized else None


def parse_html_results(
    html_text: str,
    *,
    page_label: str,
    limit: int | None = None,
) -> tuple[list[dict[str, Any]], list[str]]:
    soup = BeautifulSoup(html_text, "html.parser")
    results: list[dict[str, Any]] = []
    warnings: list[str] = []

    boxes = soup.select("section.result-box")
    if not boxes:
        warnings.append(f"[{page_label}] WARN: Keine section.result-box gefunden.")

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

        missing_fields: list[str] = []
        if not title:
            missing_fields.append("title")
        if not details.get("hochschule"):
            missing_fields.append("university")
        if not details.get("abschluss"):
            missing_fields.append("degree")
        if not detail_url:
            missing_fields.append("detail_url")
        if missing_fields:
            warnings.append(
                f"[{page_label}] WARN: result-box #{idx} fehlt: {', '.join(missing_fields)}"
            )

        results.append(
            {
                "title": title,
                "university": details.get("hochschule"),
                "degree": details.get("abschluss"),
                "study_mode": details.get("studienform"),
                "detail_url": detail_url,
            }
        )

        if limit is not None and len(results) >= limit:
            break

    return results, warnings


def parse_json_results(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, dict):
        for key in ("results", "items", "data", "hits"):
            candidate = payload.get(key)
            if isinstance(candidate, list):
                payload = candidate
                break

    if not isinstance(payload, list):
        return []

    results: list[dict[str, Any]] = []
    for item in payload[:10]:
        if not isinstance(item, dict):
            continue

        title = (
            item.get("title")
            or item.get("name")
            or item.get("studiengang")
            or item.get("program")
        )
        university = (
            item.get("university")
            or item.get("hochschule")
            or item.get("institution")
        )
        degree = item.get("degree") or item.get("abschluss")
        study_mode = item.get("study_mode") or item.get("studienform")
        detail_url = item.get("detail_url") or item.get("url") or item.get("href")
        if detail_url:
            detail_url = urljoin(BASE_URL, str(detail_url))

        results.append(
            {
                "title": title,
                "university": university,
                "degree": degree,
                "study_mode": study_mode,
                "detail_url": detail_url,
            }
        )

    return results


def build_page_url(page: int) -> str:
    if page <= 1:
        return TARGET_URL
    return (
        "https://www.hochschulkompass.de/studium/studiengangsuche/"
        f"erweiterte-studiengangsuche/search/1/studtyp/3/pn/{page}.html"
    )


def main() -> int:
    session = make_session()
    print(f"Target URL: {TARGET_URL}")

    page_status_lines: list[str] = []
    drift_warnings: list[str] = []
    first_page_top10: list[dict[str, Any]] = []
    total_count: int | None = None

    for i, page in enumerate(TEST_PAGES):
        page_url = build_page_url(page)

        try:
            response = session.get(page_url, timeout=30, allow_redirects=True)
        except requests.RequestException as exc:
            page_status_lines.append(f"Page {page}: ERROR request failed: {exc}")
            continue

        if i == 0:
            print(f"HTTP status (page {page}): {response.status_code}")
            print(f"Final URL (page {page}): {response.url}")
            print(f"Content-Type (page {page}): {response.headers.get('Content-Type', 'unknown')}")

        status_text = "OK" if response.status_code == 200 else "NON-200"
        parsed_count = 0

        if response.status_code == 200:
            content_type = (response.headers.get("Content-Type") or "").lower()
            body = response.text.lstrip()
            if "application/json" in content_type or body.startswith("{") or body.startswith("["):
                try:
                    payload = response.json()
                    page_results = parse_json_results(payload)
                except (json.JSONDecodeError, ValueError) as exc:
                    page_status_lines.append(f"Page {page}: {response.status_code} {status_text}, JSON parse ERROR: {exc}")
                    page_results = []
                parsed_count = len(page_results)
                if page == 1:
                    first_page_top10 = page_results[:10]
            else:
                page_results, page_warnings = parse_html_results(
                    response.text,
                    page_label=f"page-{page}",
                    limit=None,
                )
                parsed_count = len(page_results)
                drift_warnings.extend(page_warnings)
                if page == 1:
                    first_page_top10 = page_results[:10]
                    total_count = extract_total_results_count(response.text)

        page_status_lines.append(f"Page {page}: {response.status_code} {status_text}, {parsed_count} items")

        if i < len(TEST_PAGES) - 1:
            time.sleep(PAGE_DELAY_SECONDS)

    print(f"Detected total results: {total_count if total_count is not None else 'unknown'}")
    for line in page_status_lines:
        print(line)

    if drift_warnings:
        print("Drift warnings:")
        for warning in drift_warnings:
            print(warning)
    else:
        print("Drift warnings: none")

    if not first_page_top10:
        print("ERROR: Keine Treffer auf Seite 1 geparst.")
        return 4

    print("First page top 10 sample:")
    print(json.dumps(first_page_top10, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
