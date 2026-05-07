from __future__ import annotations

import io
import re

import pdfplumber
from bs4 import BeautifulSoup

from .base import UniversityScraper
from ..errors import FetchError
from ..errors import ParseError
from ..types import RawNCRecord


class UniKoelnScraper(UniversityScraper):
    university_id = "uni_koeln"
    display_name = "Universität zu Köln"
    source_url = "https://verwaltung.uni-koeln.de/studsek/content/zulassung/zulassungsverfahren/index_ger.html"
    requires_js = False

    def parse(self, payload: str) -> list[RawNCRecord]:
        soup = BeautifulSoup(payload, "lxml")
        pdf_url = self._find_latest_results_pdf(soup)
        if not pdf_url:
            raise ParseError(f"{self.university_id}: no procedure-result PDF link found")

        pdf_bytes = self._download_pdf(pdf_url)
        records = self._parse_pdf_records(pdf_bytes, pdf_url)
        if not records:
            raise ParseError(f"{self.university_id}: no NC records found in latest PDF")
        return records

    def _find_latest_results_pdf(self, soup: BeautifulSoup) -> str | None:
        link = soup.select_one('a.c-text-icon[href$=".pdf"][download]')
        if link is None:
            link = soup.select_one('a[href$=".pdf"][download]')
        if link is None:
            return None
        return link.get("href", "").strip() or None

    def _download_pdf(self, pdf_url: str) -> bytes:
        try:
            import requests

            response = requests.get(
                pdf_url,
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
            return response.content
        except Exception as exc:
            raise FetchError(f"{self.university_id}: PDF download failed ({exc})") from exc

    def _parse_pdf_records(self, pdf_content: bytes, pdf_url: str) -> list[RawNCRecord]:
        all_text_parts: list[str] = []
        with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                if page_text:
                    all_text_parts.append(page_text)

        text = "\n".join(all_text_parts)
        records: list[RawNCRecord] = []
        pattern = re.compile(
            r"^\s*(?P<program>.+?)\s*/\s*DoSV\s+(?P<nc>\d,\d)\s+(?P<secondary>\d,\d)\s*$"
        )

        for line in text.splitlines():
            cleaned_line = re.sub(r"\s+", " ", line).strip()
            if not cleaned_line:
                continue
            match = pattern.match(cleaned_line)
            if not match:
                continue
            records.append(
                RawNCRecord(
                    source_university_name=self.display_name,
                    source_program_name=match.group("program").strip(),
                    source_nc_text=match.group("nc"),
                    source_url=pdf_url,
                    confidence=0.9,
                    metadata={"secondary_cutoff": match.group("secondary")},
                )
            )
        return records

    def normalize_hint(self) -> dict[str, object]:
        return {
            "university_aliases": [
                "Universität zu Köln",
                "University of Cologne",
                "Uni Köln",
            ]
        }

