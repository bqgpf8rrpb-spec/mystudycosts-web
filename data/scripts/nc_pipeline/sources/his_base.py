from __future__ import annotations

from collections import deque
import re
from urllib.parse import parse_qs, urlencode, urljoin, urlparse, urlunparse

import requests
from bs4 import BeautifulSoup

from .base import UniversityScraper
from ..errors import FetchError, ParseError
from ..types import RawNCRecord


_DEGREE_MARKER_PATTERN = re.compile(
    r"(?:"
    r"\bBachelor\b|\bB\.Sc\.|\bB\.A\.|\bB\.Ed\.|\bB\.Eng\.|"
    r"\bMaster\b|\bM\.Sc\.|\bM\.A\.|\bM\.Ed\.|"
    r"\bStaatsexamen\b|\bMagister\b|\bPromotion\b|\bLehramt\b|\bDiplom\b|"
    r"\bLL\.B\.|\bLL\.M\."
    r")",
    re.I,
)

# Course / module codes (e.g. BA-INF 015) — not degree programs
_COURSE_MODULE_CODE_PATTERN = re.compile(
    r"\b[A-Z]{2,4}-[A-Z]{2,4}\s+\d{3}\b|\b[A-Z]{2,}-[A-Z]{2,}\s+\d{2,4}\b",
)


class HISGenericScraper(UniversityScraper):
    his_mode: str = "auto"
    entry_url: str | None = None
    #: Optional URLs to GET first (same session) before entry_url — cookies / portal context.
    modern_session_prime_urls: tuple[str, ...] = ()
    max_depth: int = 5
    max_pages: int = 300

    def __init__(self) -> None:
        self._detected_mode: str = self.his_mode
        self._fetched_pages: list[tuple[str, str]] = []
        self._session: requests.Session | None = None

    def fetch_static(self) -> str:
        url = self.entry_url or self.source_url
        self._fetched_pages = []
        try:
            self._session = requests.Session()
            self._session.headers.update(
                {
                    "User-Agent": (
                        "Mozilla/5.0 (X11; Linux x86_64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/124.0.0.0 Safari/537.36"
                    ),
                    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
                    "Accept": (
                        "text/html,application/xhtml+xml,application/xml;q=0.9,"
                        "image/avif,image/webp,*/*;q=0.8"
                    ),
                }
            )
            if self.his_mode == "modern_hisinone" and self.modern_session_prime_urls:
                prime_last: str | None = None
                for prime in self.modern_session_prime_urls:
                    try:
                        pr = self._session.get(prime, timeout=self.timeout_seconds)
                        pr.raise_for_status()
                        prime_last = pr.url
                    except requests.RequestException:
                        continue
                if prime_last:
                    self._session.headers["Referer"] = prime_last
            response = self._session.get(url, timeout=self.timeout_seconds)
            response.raise_for_status()
            initial_html = response.text
            self._fetched_pages.append((response.url, initial_html))

            self._detected_mode = self._detect_mode(response.url, initial_html)
            if self._detected_mode == "legacy_qis":
                self._collect_legacy_tree_pages(response.url)
            else:
                self._collect_modern_results_pages(response.url)
            return initial_html
        except requests.RequestException as exc:
            raise FetchError(f"{self.university_id}: fetch failed ({exc})") from exc
        finally:
            if self._session:
                self._session.close()
                self._session = None

    def parse(self, payload: str) -> list[RawNCRecord]:
        pages = self._fetched_pages or [(self.source_url, payload)]
        if self._detected_mode == "legacy_qis":
            records = self._parse_legacy_qis(pages)
        else:
            records = self._parse_modern_hisinone(pages)
        if not records:
            raise ParseError(f"{self.university_id}: no HIS records extracted")
        return records

    def _detect_mode(self, final_url: str, html: str) -> str:
        if self.his_mode in {"legacy_qis", "modern_hisinone"}:
            return self.his_mode

        haystack = f"{final_url}\n{html}".lower()
        modern_markers = [
            "/qisserver/pages/cs/sys/portal/hisinonestartpage.faces",
            "/qisserver/pages/zul/applicant/searchcourseofstudies.xhtml",
            "_flowexecutionkey",
            "_flowid",
        ]
        if any(marker in haystack for marker in modern_markers):
            return "modern_hisinone"

        legacy_markers = ["/qisserver/rds", "state=wtree", "trex=step", "state=user"]
        if any(marker in haystack for marker in legacy_markers):
            return "legacy_qis"
        return "modern_hisinone"

    def _collect_legacy_tree_pages(self, start_url: str) -> None:
        if not self._session:
            return
        queue: deque[tuple[str, int]] = deque([(start_url, 0)])
        visited: set[str] = set()

        while queue and len(visited) < self.max_pages:
            current_url, depth = queue.popleft()
            canonical = self._canonicalize_url(current_url)
            if canonical in visited or depth > self.max_depth:
                continue
            visited.add(canonical)
            try:
                response = self._session.get(current_url, timeout=self.timeout_seconds)
                response.raise_for_status()
            except requests.RequestException:
                continue
            self._fetched_pages.append((response.url, response.text))
            soup = BeautifulSoup(response.text, "lxml")
            for anchor in soup.select("a[href]"):
                href = (anchor.get("href") or "").strip()
                if not href:
                    continue
                child = urljoin(response.url, href)
                if not self._is_legacy_tree_link(child):
                    continue
                if self._is_legacy_branch_blocked(child):
                    continue
                child_canonical = self._canonicalize_url(child)
                if child_canonical not in visited:
                    queue.append((child, depth + 1))

    def _collect_modern_results_pages(self, entry_url: str) -> None:
        if not self._session:
            return
        parsed = urlparse(entry_url)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        # Prefer course-of-studies search first (avoid wrong portal flows).
        start_candidates = [
            urljoin(
                origin,
                "/qisserver/pages/zul/applicant/searchCourseOfStudies.xhtml"
                "?_flowId=searchCourseOfStudiesAPP-flow"
                "&navigationPosition=studiesOffered,searchCourseOfStudyAPP&recordRequest=true",
            ),
            urljoin(
                origin,
                "/qisserver/pages/zul/applicant/searchCourseOfStudies.xhtml"
                "?_flowId=searchCourseOfStudiesAPP-flow",
            ),
            entry_url,
        ]
        seen_seed: set[str] = set()
        unique_starts: list[str] = []
        for u in start_candidates:
            c = self._canonicalize_url(u)
            if c not in seen_seed:
                seen_seed.add(c)
                unique_starts.append(u)

        visited: set[str] = set()
        queued: deque[str] = deque(unique_starts)

        while queued and len(visited) < 40:
            url = queued.popleft()
            canonical = self._canonicalize_url(url)
            if canonical in visited:
                continue
            visited.add(canonical)
            try:
                response = self._session.get(url, timeout=self.timeout_seconds)
                response.raise_for_status()
            except requests.RequestException:
                continue
            html = response.text
            self._fetched_pages.append((response.url, html))

            soup = BeautifulSoup(html, "lxml")
            form = self._pick_search_form(soup, response.url)
            if form is None:
                continue
            action = form.get("action") or response.url
            action_url = urljoin(response.url, action)
            hidden_inputs = self._extract_hidden_inputs(form)
            submit_names = self._search_submit_candidates(form)

            payload = dict(hidden_inputs)
            if "_flowId" not in payload and "searchcourseofstudies" in action_url.lower():
                payload["_flowId"] = "searchCourseOfStudiesAPP-flow"

            post_payloads = []
            if submit_names:
                for name, value in submit_names:
                    enriched = dict(payload)
                    enriched[name] = value
                    post_payloads.append(enriched)
            else:
                post_payloads.append(payload)

            for post_payload in post_payloads[:3]:
                try:
                    posted = self._session.post(
                        action_url,
                        data=post_payload,
                        timeout=self.timeout_seconds,
                    )
                    posted.raise_for_status()
                except requests.RequestException:
                    continue
                self._fetched_pages.append((posted.url, posted.text))
                posted_soup = BeautifulSoup(posted.text, "lxml")
                for page_link in self._extract_modern_pagination_links(posted_soup, posted.url):
                    if self._canonicalize_url(page_link) not in visited:
                        queued.append(page_link)

    def _parse_legacy_qis(self, pages: list[tuple[str, str]]) -> list[RawNCRecord]:
        records: list[RawNCRecord] = []
        seen: set[tuple[str, str]] = set()

        for page_url, html in pages:
            soup = BeautifulSoup(html, "lxml")

            for row in soup.select("table tr"):
                cells = [c.get_text(" ", strip=True) for c in row.select("th,td")]
                if len(cells) < 1:
                    continue
                ok_row, program = self._program_from_table_row(cells)
                if not ok_row:
                    continue
                nc_raw = self._pick_admission_token(cells[1:]) or "NC"
                key = (program.lower(), nc_raw.lower())
                if key in seen:
                    continue
                seen.add(key)
                records.append(
                    RawNCRecord(
                        source_university_name=self.display_name,
                        source_program_name=program,
                        source_nc_text=nc_raw,
                        source_url=page_url,
                        confidence=0.65,
                    )
                )

            for anchor in soup.select("a[href]"):
                text = self._clean_text(anchor.get_text(" ", strip=True))
                href = anchor.get("href", "").strip()
                if not href or not self._is_valid_program_name(text):
                    continue
                full_url = urljoin(page_url, href)
                if self._is_legacy_tree_link(full_url):
                    continue
                nc_raw = self._pick_admission_token([text]) or "NC"
                key = (text.lower(), nc_raw.lower())
                if key in seen:
                    continue
                seen.add(key)
                records.append(
                    RawNCRecord(
                        source_university_name=self.display_name,
                        source_program_name=text,
                        source_nc_text=nc_raw,
                        source_url=full_url,
                        confidence=0.55,
                    )
                )
        return records

    def _parse_modern_hisinone(
        self, pages: list[tuple[str, str]]
    ) -> list[RawNCRecord]:
        records: list[RawNCRecord] = []
        seen: set[tuple[str, str]] = set()

        for page_url, html in pages:
            soup = BeautifulSoup(html, "lxml")

            for row in soup.select("table tr"):
                cells = [c.get_text(" ", strip=True) for c in row.select("th,td")]
                if len(cells) < 1:
                    continue
                ok_row, program = self._program_from_table_row(cells)
                if not ok_row:
                    continue
                nc_raw = self._pick_admission_token(cells[1:]) or self._pick_admission_token(cells) or "NC"
                key = (program.lower(), nc_raw.lower())
                if key in seen:
                    continue
                seen.add(key)
                records.append(
                    RawNCRecord(
                        source_university_name=self.display_name,
                        source_program_name=program,
                        source_nc_text=nc_raw,
                        source_url=page_url,
                        confidence=0.8,
                    )
                )

            for item in soup.select("li, div, article"):
                item_text = self._clean_text(item.get_text(" ", strip=True))
                if not self._is_valid_program_name(item_text):
                    continue
                anchor = item.select_one("a[href]")
                if not anchor:
                    continue
                program = self._clean_text(anchor.get_text(" ", strip=True))
                if not self._is_valid_program_name(program):
                    continue
                nc_raw = self._pick_admission_token([item_text]) or "NC"
                key = (program.lower(), nc_raw.lower())
                if key in seen:
                    continue
                seen.add(key)
                records.append(
                    RawNCRecord(
                        source_university_name=self.display_name,
                        source_program_name=program,
                        source_nc_text=nc_raw,
                        source_url=urljoin(page_url, anchor.get("href", "")),
                        confidence=0.72,
                    )
                )

            text_blob = soup.get_text(" ", strip=True)
            for anchor in soup.select("a[href]"):
                label = self._clean_text(anchor.get_text(" ", strip=True))
                if not self._is_valid_program_name(label):
                    continue
                nc_raw = self._pick_admission_token([label, text_blob]) or "NC"
                key = (label.lower(), nc_raw.lower())
                if key in seen:
                    continue
                seen.add(key)
                records.append(
                    RawNCRecord(
                        source_university_name=self.display_name,
                        source_program_name=label,
                        source_nc_text=nc_raw,
                        source_url=urljoin(page_url, anchor.get("href", "")),
                        confidence=0.62,
                    )
                )
        return records

    def _pick_admission_token(self, cells: list[str]) -> str | None:
        for cell in cells:
            normalized = re.sub(r"\s+", " ", cell).strip()
            if not normalized:
                continue
            lower = normalized.lower()
            if "zulassungsfrei" in lower:
                return "0.0"
            if "örtlich zulassungsbeschränkt" in lower or "bundesweit zulassungsbeschränkt" in lower:
                return "NC"
            if "nc" in lower or "numerus clausus" in lower:
                return "NC"
            if re.search(r"\b[0-4][,.]\d\b", normalized):
                return re.search(r"\b[0-4][,.]\d\b", normalized).group(0)
            if "eignungsfeststellungsverfahren" in lower or "efv" in lower:
                return "EFV"
        return None

    def _canonicalize_url(self, url: str) -> str:
        parsed = urlparse(url)
        query = parse_qs(parsed.query, keep_blank_values=True)
        ordered = sorted((k, v) for k, v in query.items())
        normalized_query = urlencode(ordered, doseq=True)
        return urlunparse(
            (
                parsed.scheme,
                parsed.netloc,
                parsed.path,
                parsed.params,
                normalized_query,
                "",
            )
        )

    def _is_legacy_tree_link(self, url: str) -> bool:
        lower = url.lower()
        if "/qisserver/rds" not in lower and "/lsf/rds" not in lower:
            return False
        return ("state=wtree" in lower) or ("trex=step" in lower)

    def _is_legacy_branch_blocked(self, url: str) -> bool:
        lower = url.lower()
        blocked = (
            "personsearch",
            "personsear",
            "raumsearch",
            "moduleparameter=person",
            "moduleparameter=raum",
            "einrichtung.browse",
            "category=einrichtung",
            "unistructure",
            "veranstaltung.browse",
            "lectureindex",
            "currentlectur",
            "ausfallende",
            "suche nach personen",
            "suche nach räumen",
        )
        return any(b in lower for b in blocked)

    def _clean_text(self, text: str) -> str:
        return re.sub(r"\s+", " ", text).strip(" :|-")

    def _has_degree_marker(self, text: str) -> bool:
        return bool(_DEGREE_MARKER_PATTERN.search(text))

    def _looks_like_course_module(self, text: str) -> bool:
        return bool(_COURSE_MODULE_CODE_PATTERN.search(text))

    def _is_blacklisted_program_text(self, lower_text: str) -> bool:
        terms = (
            "tastenkombination",
            "seiteninhalt",
            "seitennavigation",
            "zum seiteninhalt",
            "link kopieren",
            "open in new window",
            "back to",
            "sortierbare spalte",
            "here you can inform",
            "barriers",
            "gebäude",
            "seminarraum",
            "hörsaal",
            "cip-pool",
            "cip pool",
            "veranstaltungssuche",
            "vorlesungsverzeichnis",
            "sie sind hier",
            "einrichtungen und personen",
            "login",
            "hilfe",
            "startseite",
            "navigation",
            "bewerbung/einschreibung",
            "studierende",
            "beschäftigte",
            "prof. dr.",
            "univ.prof.",
            "univ.prof",
            "pd dr.",
            "apl. prof.",
            "dr. med.",
            "prüfungsanmeldung",
            "an- und abmeldezeitraum",
            "modularisierte studienpläne",
            "klausur-masterplan",
            "masterplan",
        )
        if any(t in lower_text for t in terms):
            return True
        if re.search(
            r"\b(prof\.|univ\.|pd\s+dr|apl\.\s*prof|dr\.\s*med)\b",
            lower_text,
            re.I,
        ):
            return True
        return False

    def _is_valid_program_name(self, text: str) -> bool:
        normalized = self._clean_text(text)
        if len(normalized) < 8:
            return False
        lower = normalized.lower()
        if self._is_blacklisted_program_text(lower):
            return False
        if self._looks_like_course_module(normalized):
            return False
        if not self._has_degree_marker(normalized):
            return False
        if re.search(r"(fakultät|fakultätsübergreifend)\s*$", lower) and len(normalized) < 40:
            return False
        return True

    def _program_from_table_row(self, cells: list[str]) -> tuple[bool, str]:
        joined = self._clean_text(" ".join(cells))
        if len(joined) < 8:
            return False, ""
        lower = joined.lower()
        if self._is_blacklisted_program_text(lower):
            return False, ""
        if self._looks_like_course_module(joined):
            return False, ""
        if not self._has_degree_marker(joined):
            return False, ""
        program_cell = ""
        for cell in cells:
            c = self._clean_text(cell)
            if self._has_degree_marker(c) and len(c) >= 8:
                program_cell = c
                break
        if not program_cell:
            program_cell = self._clean_text(max(cells, key=len))
        if self._looks_like_course_module(program_cell):
            return False, ""
        return True, program_cell

    def _pick_search_form(self, soup: BeautifulSoup, page_url: str) -> BeautifulSoup | None:
        forms = soup.select("form")
        for form in forms:
            action = urljoin(page_url, (form.get("action") or "").strip()).lower()
            if "searchcourseofstudies" in action:
                return form
        for form in forms:
            action = (form.get("action") or "").lower()
            form_html = str(form).lower()
            if "searchcourseofstudies" in form_html and (
                "javax.faces.viewstate" in form_html or "_flowexecutionkey" in form_html
            ):
                return form
        if "searchcourseofstudies" in page_url.lower():
            for form in forms:
                form_html = str(form).lower()
                if "javax.faces.viewstate" in form_html or "_flowexecutionkey" in form_html:
                    return form
        return None

    def _extract_hidden_inputs(self, form: BeautifulSoup) -> dict[str, str]:
        hidden: dict[str, str] = {}
        for field in form.select("input[type='hidden'][name]"):
            name = (field.get("name") or "").strip()
            if not name:
                continue
            hidden[name] = (field.get("value") or "").strip()
        return hidden

    def _search_submit_candidates(self, form: BeautifulSoup) -> list[tuple[str, str]]:
        candidates: list[tuple[str, str]] = []
        for btn in form.select("button[name], input[type='submit'][name]"):
            name = (btn.get("name") or "").strip()
            if not name:
                continue
            value = (btn.get("value") or "").strip()
            label = self._clean_text(btn.get_text(" ", strip=True) or value).lower()
            if "suchen" in label or "search" in label or not label:
                candidates.append((name, value))
        return candidates

    def _extract_modern_pagination_links(self, soup: BeautifulSoup, base_url: str) -> list[str]:
        links: list[str] = []
        for anchor in soup.select("a[href]"):
            href = (anchor.get("href") or "").strip()
            if not href:
                continue
            full = urljoin(base_url, href)
            lower = full.lower()
            if (
                "_flowexecutionkey" in lower
                or "searchcourseofstudies" in lower
                or "recordrequest=true" in lower
                or "page=" in lower
            ):
                links.append(full)
        return links
