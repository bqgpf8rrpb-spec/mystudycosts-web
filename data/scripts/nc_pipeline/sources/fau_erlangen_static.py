from __future__ import annotations

import re
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from .base import UniversityScraper
from ..errors import FetchError, ParseError
from ..types import RawNCRecord


_LIST_URL = "https://www.fau.eu/studying/degree-programs/all-degree-programs/"
_DEGREE_PROG_PATH = re.compile(r"/degree-program/[^/]+/?$", re.I)


def _strip_label_paragraph(p_tag) -> str:
    if p_tag is None:
        return ""
    for span in p_tag.select(".label"):
        span.decompose()
    return " ".join(p_tag.get_text(" ", strip=True).split())


def _admission_to_nc_raw(admission_plain: str) -> str:
    t = admission_plain.strip().lower()
    if not t:
        return "NC"

    if "no nc" in t or "(no nc)" in t:
        return "ohne NC"
    if "no admissions restrictions" in t or "no admission restrictions" in t:
        return "zulassungsfrei"
    if "admission-free" in t and "requirement" in t:
        return "weitere informationen"
    if "with nc" in t or t.startswith("with nc") or t == "nc":
        return "örtlich zulassungsbeschränkt"
    if "hochschulstart" in t:
        return "örtlich zulassungsbeschränkt"
    if "free with restriction" in t:
        return "örtlich zulassungsbeschränkt"
    if "qualification assessment" in t or "aptitude test" in t:
        return "Eignungsfeststellungsverfahren"

    return "NC"


class FAUErlangenStaticScraper(UniversityScraper):
    university_id = "fau_erlangen_static"
    display_name = "Friedrich-Alexander-Universität Erlangen-Nürnberg"
    source_url = _LIST_URL

    def fetch_static(self) -> str:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-GB,en;q=0.9,de;q=0.8",
        }
        chunks: list[str] = []
        max_pages = 40

        try:
            first = requests.get(
                _LIST_URL, timeout=self.timeout_seconds, headers=headers
            )
            first.raise_for_status()
            chunks.append(first.text)
            soup0 = BeautifulSoup(first.text, "lxml")
            page_nums: list[int] = []
            for a in soup0.select("nav.fau-pagination a.page-number"):
                txt = a.get_text(strip=True)
                if txt.isdigit():
                    page_nums.append(int(txt))
            if page_nums:
                max_pages = max(page_nums)

            for pagenum in range(2, max_pages + 1):
                url = f"{_LIST_URL}?pagenum={pagenum}"
                response = requests.get(url, timeout=self.timeout_seconds, headers=headers)
                response.raise_for_status()
                soup = BeautifulSoup(response.text, "lxml")
                if not soup.select("ul.degree-program-grid > li"):
                    break
                chunks.append(response.text)
        except requests.RequestException as exc:
            raise FetchError(f"{self.university_id}: fetch failed ({exc})") from exc

        return "\n".join(chunks)

    def parse(self, payload: str) -> list[RawNCRecord]:
        soup = BeautifulSoup(payload, "lxml")
        best: dict[str, tuple[str, str, str, str]] = {}

        for li in soup.select("ul.degree-program-grid > li"):
            title_el = li.select_one("p.program-title")
            if not title_el:
                continue
            title = " ".join(title_el.get_text(" ", strip=True).split())
            if len(title) < 4:
                continue

            sub_el = li.select_one("p.program-subtitle")
            subtitle = (
                " ".join(sub_el.get_text(" ", strip=True).split()) if sub_el else ""
            )
            admission = _strip_label_paragraph(li.select_one("p.program-adm-req"))
            nc_raw = _admission_to_nc_raw(admission)

            link = None
            for a in li.select("a[href]"):
                href = (a.get("href") or "").strip()
                if _DEGREE_PROG_PATH.search(urlparse(href).path or ""):
                    link = urljoin(_LIST_URL, href)
                    break
            if not link:
                continue

            slug = (urlparse(link).path or "").rstrip("/").split("/")[-1].lower()
            program = title
            if subtitle and subtitle.lower() not in title.lower():
                program = f"{title} – {subtitle}"

            prev = best.get(slug)
            if prev is None or len(program) > len(prev[0]):
                best[slug] = (program, nc_raw, link, admission)

        if not best:
            raise ParseError(f"{self.university_id}: no degree-program cards found")

        records: list[RawNCRecord] = []
        for slug in sorted(best.keys()):
            program, nc_raw, url, _adm = best[slug]
            records.append(
                RawNCRecord(
                    source_university_name=self.display_name,
                    source_program_name=program,
                    source_nc_text=nc_raw,
                    source_url=url,
                    confidence=0.74,
                )
            )
        return records
