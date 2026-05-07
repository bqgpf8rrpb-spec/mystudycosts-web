from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .base import UniversityScraper
from ..errors import FetchError
from ..errors import ParseError
from ..types import RawNCRecord


class TUMScraper(UniversityScraper):
    university_id = "tum"
    display_name = "Technische Universität München"
    source_url = "https://www.tum.de/studium/studienangebot"
    requires_js = False

    def parse(self, payload: str) -> list[RawNCRecord]:
        soup = BeautifulSoup(payload, "lxml")
        program_options = soup.select("option[data-url]")
        if not program_options:
            raise ParseError(f"{self.university_id}: no program options with detail links found")

        candidates: list[tuple[str, str]] = []
        for option in program_options:
            program_name = option.get_text(" ", strip=True)
            detail_path = option.get("data-url", "").strip()
            if not program_name or not detail_path:
                continue
            candidates.append((program_name, urljoin("https://www.tum.de", detail_path)))

        records: list[RawNCRecord] = []
        max_workers = min(12, max(1, len(candidates)))
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_map = {
                executor.submit(self._parse_admission_type, program_name, detail_url): (
                    program_name,
                    detail_url,
                )
                for program_name, detail_url in candidates
            }
            for future in as_completed(future_map):
                program_name, detail_url = future_map[future]
                try:
                    admission_token = future.result()
                except Exception:
                    continue
                if not admission_token:
                    continue
                records.append(
                    RawNCRecord(
                        source_university_name=self.display_name,
                        source_program_name=program_name,
                        source_nc_text=admission_token,
                        source_url=detail_url,
                        confidence=0.85,
                    )
                )

        if not records:
            raise ParseError(f"{self.university_id}: no admission records extracted")
        return records

    def _parse_admission_type(self, program_name: str, detail_url: str) -> str | None:
        try:
            html = self.fetch_url(detail_url)
        except FetchError:
            return None

        soup = BeautifulSoup(html, "lxml")
        for strong in soup.find_all("strong"):
            label = strong.get_text(" ", strip=True)
            if label.lower() != "art der zulassung":
                continue
            container = strong.parent
            if container is None:
                return None

            admission_text = container.get_text(" ", strip=True)
            if "Keine Zulassungsbeschränkung" in admission_text:
                return "zulassungsfrei"
            if "Eignungsfeststellungsverfahren" in admission_text:
                return "EFV"
            if "Eignungsverfahren für Masterstudiengänge" in admission_text:
                return "EFV"
            if "Numerus Clausus" in admission_text:
                return "NC"

            if admission_text:
                return admission_text
        return None

    def fetch_url(self, url: str) -> str:
        try:
            import requests

            response = requests.get(
                url,
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
        except Exception as exc:
            raise FetchError(f"{self.university_id}: detail fetch failed ({exc})") from exc

    def normalize_hint(self) -> dict[str, object]:
        return {
            "university_aliases": [
                "Technische Universität München",
                "Technical University of Munich",
                "TUM",
            ]
        }

