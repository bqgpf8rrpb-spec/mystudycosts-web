from __future__ import annotations

import json
import re
from abc import ABC, abstractmethod
from typing import Any

import requests
from bs4 import BeautifulSoup

from ..errors import FetchError, ParseError
from ..types import RawNCRecord


class UniversityScraper(ABC):
    university_id: str
    display_name: str
    source_url: str
    requires_js: bool = False
    timeout_seconds: int = 25

    def normalize_hint(self) -> dict[str, Any]:
        return {}

    def fetch(self) -> str:
        if self.requires_js:
            return self.fetch_with_playwright()
        return self.fetch_static()

    def fetch_static(self) -> str:
        try:
            response = requests.get(
                self.source_url,
                timeout=self.timeout_seconds,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (X11; Linux x86_64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/124.0.0.0 Safari/537.36"
                    )
                },
            )
            response.raise_for_status()
            return response.text
        except requests.RequestException as exc:
            raise FetchError(f"{self.university_id}: fetch failed ({exc})") from exc

    def fetch_with_playwright(self) -> str:
        try:
            from playwright.sync_api import sync_playwright
        except Exception as exc:
            raise FetchError(
                f"{self.university_id}: playwright unavailable ({exc})"
            ) from exc

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                page.goto(self.source_url, wait_until="networkidle", timeout=30000)
                content = page.content()
                browser.close()
                return content
        except Exception as exc:
            raise FetchError(
                f"{self.university_id}: playwright fetch failed ({exc})"
            ) from exc

    @abstractmethod
    def parse(self, payload: str) -> list[RawNCRecord]:
        raise NotImplementedError

    def parse_table_rows(
        self,
        payload: str,
        min_columns: int = 2,
    ) -> list[RawNCRecord]:
        try:
            soup = BeautifulSoup(payload, "lxml")
            rows = soup.select("table tr")
            records: list[RawNCRecord] = []
            for row in rows:
                cells = [c.get_text(" ", strip=True) for c in row.select("th,td")]
                if len(cells) < min_columns:
                    continue
                program = cells[0]
                nc_text = self.pick_nc_token(cells[1:])
                if not program or not nc_text:
                    continue
                records.append(
                    RawNCRecord(
                        source_university_name=self.display_name,
                        source_program_name=program,
                        source_nc_text=nc_text,
                        source_url=self.source_url,
                        confidence=0.75,
                    )
                )
            return records
        except Exception as exc:
            raise ParseError(f"{self.university_id}: table parse failed ({exc})") from exc

    def parse_json_records(
        self,
        payload: str,
        program_keys: list[str],
        nc_keys: list[str],
    ) -> list[RawNCRecord]:
        try:
            raw = json.loads(payload)
        except Exception as exc:
            raise ParseError(f"{self.university_id}: invalid JSON ({exc})") from exc

        if isinstance(raw, dict):
            candidates = raw.get("data") if isinstance(raw.get("data"), list) else [raw]
        elif isinstance(raw, list):
            candidates = raw
        else:
            candidates = []

        records: list[RawNCRecord] = []
        for item in candidates:
            if not isinstance(item, dict):
                continue
            program = self.extract_first(item, program_keys)
            nc_text = self.extract_first(item, nc_keys)
            if not program or not nc_text:
                continue
            records.append(
                RawNCRecord(
                    source_university_name=self.display_name,
                    source_program_name=str(program),
                    source_nc_text=str(nc_text),
                    source_url=self.source_url,
                    confidence=0.85,
                )
            )
        return records

    @staticmethod
    def extract_first(item: dict[str, Any], keys: list[str]) -> str | None:
        for key in keys:
            value = item.get(key)
            if value:
                return str(value)
        return None

    @staticmethod
    def pick_nc_token(cells: list[str]) -> str | None:
        for cell in cells:
            if re.search(r"(zulassungsfrei|ohne\s*nc|k\.?\s*a\.?)", cell, re.I):
                return cell
            if re.search(r"\b[0-4][,.]\d\b", cell):
                return cell
        return None

