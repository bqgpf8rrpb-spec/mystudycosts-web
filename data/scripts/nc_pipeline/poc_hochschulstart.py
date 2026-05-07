#!/usr/bin/env python3
"""
PoC: Find and inspect DoSV "Grenzwerte" data from hochschulstart.de.

Output:
- Either first 15 extracted table rows as JSON (HTML case)
- Or first-page text excerpt (PDF case)
- Plus a short technical format assessment
"""

from __future__ import annotations

import os
import sys

# Prevent local "types.py" in this folder from shadowing stdlib "types".
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR in sys.path:
    sys.path.remove(SCRIPT_DIR)

import json
import re
import tempfile
from collections import deque
from dataclasses import dataclass
from typing import Iterable, Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    )
}

DOMAIN = "www.hochschulstart.de"
START_URLS = [
    "https://www.hochschulstart.de/",
    "https://www.hochschulstart.de/unterstuetzung/downloads",
    "https://www.hochschulstart.de/informieren-planen",
    "https://www.hochschulstart.de/informieren-planen/verfahrensdetails",
]
KEYWORDS = ("grenzwert", "grenzwerte", "auswahlgrenzen", "nc", "numerus", "zulassungs")
SEMESTER_RE = re.compile(r"(wintersemester|sommersemester)\s*(\d{4})(?:\s*/\s*(\d{4}))?", re.I)
YEAR_RE = re.compile(r"(20\d{2})")


@dataclass
class Candidate:
    url: str
    anchor_text: str
    score: int
    semester_score: int


def fetch(url: str, timeout: int = 20) -> Optional[requests.Response]:
    try:
        response = requests.get(url, headers=HEADERS, timeout=timeout)
        if response.status_code >= 400:
            return None
        return response
    except requests.RequestException:
        return None


def is_same_domain(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and parsed.netloc.endswith(DOMAIN)


def normalize_links(base_url: str, soup: BeautifulSoup) -> Iterable[tuple[str, str]]:
    for a in soup.select("a[href]"):
        href = a.get("href", "").strip()
        text = " ".join(a.get_text(" ", strip=True).split())
        if not href:
            continue
        abs_url = urljoin(base_url, href)
        if not is_same_domain(abs_url):
            continue
        yield abs_url, text


def keyword_score(text: str) -> int:
    lowered = text.lower()
    return sum(1 for kw in KEYWORDS if kw in lowered)


def detect_semester_score(text: str) -> int:
    """
    Higher means likely more recent semester reference.
    """
    best = 0
    for match in SEMESTER_RE.finditer(text):
        season = match.group(1).lower()
        y1 = int(match.group(2))
        y2 = int(match.group(3)) if match.group(3) else y1
        season_bonus = 1 if season.startswith("winter") else 0
        best = max(best, y2 * 10 + season_bonus)
    if best:
        return best
    years = [int(y) for y in YEAR_RE.findall(text)]
    return max(years) if years else 0


def discover_grenzwerte_url(max_pages: int = 40) -> Optional[Candidate]:
    visited: set[str] = set()
    queue: deque[str] = deque(START_URLS)
    candidates: list[Candidate] = []

    while queue and len(visited) < max_pages:
        current = queue.popleft()
        if current in visited:
            continue
        visited.add(current)

        response = fetch(current)
        if not response:
            continue
        soup = BeautifulSoup(response.text, "html.parser")

        page_text = " ".join(soup.get_text(" ", strip=True).split())[:12000]
        if keyword_score(current + " " + page_text) >= 2:
            candidates.append(
                Candidate(
                    url=current,
                    anchor_text="(page-content-match)",
                    score=keyword_score(current + " " + page_text),
                    semester_score=detect_semester_score(current + " " + page_text),
                )
            )

        for link, text in normalize_links(current, soup):
            combined = f"{link} {text}"
            score = keyword_score(combined)
            semester_score = detect_semester_score(combined)
            if score > 0:
                candidates.append(
                    Candidate(
                        url=link,
                        anchor_text=text,
                        score=score,
                        semester_score=semester_score,
                    )
                )

            # Crawl plausible navigation links for further discovery.
            if (
                link not in visited
                and len(queue) < max_pages * 2
                and any(x in link.lower() for x in ("informieren", "planen", "bewerben", "dosv", "service"))
            ):
                queue.append(link)

    if not candidates:
        return None

    # Prefer stronger keyword matches and newest semester mentions.
    candidates.sort(key=lambda c: (c.score, c.semester_score, c.url), reverse=True)
    return candidates[0]


def extract_html_rows(url: str, limit: int = 15) -> list[dict[str, str]]:
    response = fetch(url)
    if not response:
        return []

    soup = BeautifulSoup(response.text, "html.parser")
    rows: list[dict[str, str]] = []

    for table in soup.select("table"):
        headers = [
            " ".join(th.get_text(" ", strip=True).split()).lower()
            for th in table.select("thead th, tr th")
        ]
        # We keep it flexible because site table schema may vary.
        for tr in table.select("tbody tr, tr"):
            cells = [" ".join(td.get_text(" ", strip=True).split()) for td in tr.select("td")]
            if len(cells) < 2:
                continue

            if headers and len(headers) >= len(cells):
                mapped = dict(zip(headers[: len(cells)], cells))
                row = {
                    "hochschule": mapped.get("hochschule", mapped.get("hochschule / ort", cells[0] if cells else "")),
                    "studiengang": mapped.get("studiengang", cells[1] if len(cells) > 1 else ""),
                    "quote": mapped.get("quote", cells[2] if len(cells) > 2 else ""),
                    "nc_wert": mapped.get("grenzwert", mapped.get("nc", cells[3] if len(cells) > 3 else "")),
                }
            else:
                row = {
                    "hochschule": cells[0] if len(cells) > 0 else "",
                    "studiengang": cells[1] if len(cells) > 1 else "",
                    "quote": cells[2] if len(cells) > 2 else "",
                    "nc_wert": cells[3] if len(cells) > 3 else "",
                }
            rows.append(row)
            if len(rows) >= limit:
                return rows

    return rows


def first_pdf_from_page(url: str) -> Optional[str]:
    response = fetch(url)
    if not response:
        return None
    soup = BeautifulSoup(response.text, "html.parser")
    pdf_links: list[str] = []
    for link, text in normalize_links(url, soup):
        lowered = f"{link} {text}".lower()
        if ".pdf" in lowered and ("auswahlgrenzen" in lowered or any(kw in lowered for kw in KEYWORDS)):
            pdf_links.append(link)
    if not pdf_links:
        for link, _ in normalize_links(url, soup):
            if link.lower().endswith(".pdf"):
                pdf_links.append(link)
    return pdf_links[0] if pdf_links else None


def latest_auswahlgrenzen_pdf_from_downloads() -> tuple[Optional[str], Optional[str]]:
    downloads_url = "https://www.hochschulstart.de/unterstuetzung/downloads"
    response = fetch(downloads_url)
    if not response:
        return None, None
    soup = BeautifulSoup(response.text, "html.parser")
    matches: list[tuple[int, str]] = []
    for link, text in normalize_links(downloads_url, soup):
        lowered = f"{link} {text}".lower()
        if ".pdf" not in lowered:
            continue
        if "auswahlgrenzen" not in lowered and "grenzwerte" not in lowered:
            continue
        semester_score = detect_semester_score(lowered)
        if semester_score == 0:
            years = [int(y) for y in YEAR_RE.findall(lowered)]
            semester_score = max(years) if years else 0
        matches.append((semester_score, link))
    if not matches:
        return downloads_url, None
    matches.sort(key=lambda x: (x[0], x[1]), reverse=True)
    return downloads_url, matches[0][1]


def extract_pdf_first_page_text(pdf_url: str, max_chars: int = 2500) -> tuple[str, str]:
    response = fetch(pdf_url, timeout=40)
    if not response:
        return "", "Konnte PDF nicht herunterladen."

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=True) as tmp:
        tmp.write(response.content)
        tmp.flush()

        # Try pdfplumber first, fallback to PyPDF2.
        try:
            import pdfplumber  # type: ignore

            with pdfplumber.open(tmp.name) as pdf:
                text = (pdf.pages[0].extract_text() or "").strip() if pdf.pages else ""
            return text[:max_chars], ""
        except ModuleNotFoundError:
            plumber_note = "Hinweis: Für robustere PDF-Extraktion ggf. `pip install pdfplumber`."
        except Exception:
            plumber_note = ""

        try:
            from PyPDF2 import PdfReader  # type: ignore

            reader = PdfReader(tmp.name)
            text = (reader.pages[0].extract_text() or "").strip() if reader.pages else ""
            note = plumber_note or "Extraktion via PyPDF2."
            return text[:max_chars], note
        except ModuleNotFoundError:
            return "", (plumber_note + " `pip install PyPDF2` falls nicht vorhanden.").strip()
        except Exception as exc:
            return "", f"PDF-Extraktion fehlgeschlagen: {exc}"


def main() -> None:
    downloads_url, direct_pdf = latest_auswahlgrenzen_pdf_from_downloads()
    if direct_pdf:
        text, note = extract_pdf_first_page_text(direct_pdf)
        print(
            json.dumps(
                {
                    "source_url": downloads_url,
                    "pdf_url": direct_pdf,
                    "first_page_text_excerpt": text,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        suffix = f" {note}" if note else ""
        print(
            "Technische Einschätzung: Format PDF; Daten sind nur eingeschränkt maschinenlesbar "
            "(Text-Extraktion möglich, aber tabellarische Struktur kann uneinheitlich sein)." + suffix
        )
        return

    candidate = discover_grenzwerte_url()
    if not candidate:
        print("Keine Grenzwerte-Quelle auf hochschulstart.de automatisch gefunden.")
        print("Technische Einschätzung: Format unbekannt; maschinenlesbar unklar.")
        return

    target_url = candidate.url
    html_rows = extract_html_rows(target_url, limit=15)

    if html_rows:
        print(json.dumps({"source_url": target_url, "rows": html_rows[:15]}, ensure_ascii=False, indent=2))
        print("Technische Einschätzung: Format HTML; Daten sind grundsätzlich maschinenlesbar (tabellarisch extrahierbar).")
        return

    pdf_url = target_url if target_url.lower().endswith(".pdf") else first_pdf_from_page(target_url)
    if not pdf_url:
        print(f"Quelle gefunden, aber kein HTML-Table/PDF identifiziert: {target_url}")
        print("Technische Einschätzung: Format unklar; maschinenlesbar unsicher.")
        return

    text, note = extract_pdf_first_page_text(pdf_url)
    print(
        json.dumps(
            {
                "source_url": target_url,
                "pdf_url": pdf_url,
                "first_page_text_excerpt": text,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    suffix = f" {note}" if note else ""
    print(
        "Technische Einschätzung: Format PDF; Daten sind nur eingeschränkt maschinenlesbar "
        "(Text-Extraktion möglich, aber tabellarische Struktur kann uneinheitlich sein)." + suffix
    )


if __name__ == "__main__":
    main()
