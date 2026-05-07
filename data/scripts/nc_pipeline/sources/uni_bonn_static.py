from __future__ import annotations

import re
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from .base import UniversityScraper
from ..errors import FetchError, ParseError
from ..types import RawNCRecord


_LIST_URL = "https://www.uni-bonn.de/de/studium/studienangebot/studiengaenge-a-z"
_SLUG_RE = re.compile(r"/studiengaenge-a-z/([a-z0-9\-]+)/?$", re.I)


class UniBonnStaticScraper(UniversityScraper):
    university_id = "uni_bonn_static"
    display_name = "Rheinische Friedrich-Wilhelms-Universität Bonn (Bonn)"
    source_url = _LIST_URL

    def fetch_static(self) -> str:
        chunks: list[str] = []
        seen_slugs: set[str] = set()
        empty_rounds = 0
        try:
            for b_start in range(0, 2500, 30):
                url = _LIST_URL if b_start == 0 else f"{_LIST_URL}?b_start:int={b_start}"
                response = requests.get(
                    url,
                    timeout=self.timeout_seconds,
                    headers={
                        "User-Agent": (
                            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                        ),
                        "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
                    },
                )
                response.raise_for_status()
                chunks.append(response.text)

                page_slugs: set[str] = set()
                soup = BeautifulSoup(response.text, "lxml")
                for a in soup.select("a[href]"):
                    href = (a.get("href") or "").strip()
                    path = urlparse(href).path
                    m = _SLUG_RE.search(path)
                    if m:
                        page_slugs.add(m.group(1).lower())

                new = page_slugs - seen_slugs
                seen_slugs |= page_slugs
                if not new:
                    empty_rounds += 1
                    if empty_rounds >= 3:
                        break
                else:
                    empty_rounds = 0
        except requests.RequestException as exc:
            raise FetchError(f"{self.university_id}: fetch failed ({exc})") from exc

        return "\n".join(chunks)

    def parse(self, payload: str) -> list[RawNCRecord]:
        soup = BeautifulSoup(payload, "lxml")
        best: dict[str, tuple[str, str, str]] = {}

        for anchor in soup.select("a[href]"):
            href = (anchor.get("href") or "").strip()
            if not href:
                continue
            path = urlparse(href).path
            m = _SLUG_RE.search(path)
            if not m:
                continue
            slug = m.group(1).lower()
            full_url = urljoin(_LIST_URL, href)
            text = re.sub(r"\s+", " ", anchor.get_text(" ", strip=True))
            if len(text) < 6:
                continue

            lower = text.lower()
            if "zulassungsfrei" in lower:
                nc_raw = "zulassungsfrei"
            elif "zulassungsbeschränkt" in lower or "zulassungsbeschraenkt" in lower:
                nc_raw = "örtlich zulassungsbeschränkt"
            else:
                nc_raw = "NC"

            prev = best.get(slug)
            if prev is None or len(text) > len(prev[0]):
                best[slug] = (text, nc_raw, full_url)

        if not best:
            raise ParseError(f"{self.university_id}: no program links found")

        records: list[RawNCRecord] = []
        for slug, (program, nc_raw, url) in sorted(best.items()):
            records.append(
                RawNCRecord(
                    source_university_name=self.display_name,
                    source_program_name=program,
                    source_nc_text=nc_raw,
                    source_url=url,
                    confidence=0.72,
                )
            )
        return records
