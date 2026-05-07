from __future__ import annotations

import difflib
import json
import re
from pathlib import Path
from typing import Any

from .errors import MappingError
from .types import NormalizedNCRecord, RawNCRecord


def load_alias_map(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)
    if not isinstance(raw, dict):
        return {}
    return {k.strip().lower(): str(v).strip() for k, v in raw.items()}


def parse_nc_threshold(raw_text: str) -> tuple[bool, float | None]:
    text = raw_text.strip().lower()
    if not text:
        return False, None

    if re.search(r"(zulassungsfrei|ohne\s*nc|kein\s*nc)", text):
        return True, 0.0
    if re.search(
        r"(zulassungsbeschränkt|zulassungsbeschraenkt|örtlich\s+zulassungsbeschränkt|"
        r"oertlich\s+zulassungsbeschraenkt|bundesweit\s+zulassungsbeschränkt)",
        text,
    ):
        return True, None
    if re.search(r"(?:\befv\b|eignungsfeststellungsverfahren)", text):
        return True, None
    if re.search(r"(?:sov|studienorientierungsverfahren)", text):
        return True, None
    if text == "nc":
        return True, None
    if re.search(r"(weitere informationen|details zur zulassung|tum asia)", text):
        return True, None

    match = re.search(r"([0-4][,.]\d)", text)
    if not match:
        return False, None
    return True, float(match.group(1).replace(",", "."))


def canonicalize_name(
    source_name: str,
    valid_names: list[str],
    alias_map: dict[str, str],
    threshold: float = 0.86,
) -> str | None:
    key = source_name.strip().lower()
    if key in alias_map:
        mapped = alias_map[key]
        if mapped in valid_names:
            return mapped
    if source_name in valid_names:
        return source_name

    close = difflib.get_close_matches(source_name, valid_names, n=1, cutoff=threshold)
    return close[0] if close else None


# Longest keys first so multi-word subjects replace before single-word overlaps.
_SUBJECT_PHRASES_DE_EN: tuple[tuple[str, str], ...] = tuple(
    sorted(
        {
            "Betriebswirtschaftslehre": "Business Administration",
            "Volkswirtschaftslehre": "Economics",
            "Wirtschaftswissenschaften": "Economics",
            "Wirtschaftsinformatik": "Information Systems",
            "Bioinformatik": "Bioinformatics",
            "Biochemie": "Biochemistry",
            "Molekulare Biowissenschaften": "Molecular Biosciences",
            "Technische Chemie": "Technical Chemistry",
            "Lebensmittelchemie": "Food Chemistry",
            "Geowissenschaften": "Geosciences",
            "Geographie": "Geography",
            "Geografie": "Geography",
            "Ur- und Frühgeschichte": "Prehistoric Archaeology",
            "Vor- und Frühgeschichte": "Prehistoric Archaeology",
            "Klassische Archäologie": "Classical Archaeology",
            "Christliche Archäologie": "Christian Archaeology",
            "Europäische Ethnologie": "European Ethnology",
            "Kunstgeschichte": "Art History",
            "Musikwissenschaft": "Musicology",
            "Theaterwissenschaft": "Theater Studies",
            "Filmwissenschaft": "Film Studies",
            "Politikwissenschaft": "Political Science",
            "Sozial- und Kulturanthropologie": "Social and Cultural Anthropology",
            "Sozialwissenschaften": "Social Sciences",
            "Sportwissenschaft": "Sports Science",
            "Sport- und Gesundheitswissenschaften": "Sports Science",
            "Datenwissenschaft": "Statistics",
            "Statistik": "Statistics",
            "Mathematik": "Mathematics",
            "Chemie": "Chemistry",
            "Physik": "Physics",
            "Astronomie": "Astrophysics",
            "Astrophysik": "Astrophysics",
            "Biologie": "Biology",
            "Psychologie": "Psychology",
            "Informatik": "Computer Science",
            "Geschichte": "History",
            "Philosophie": "Philosophy",
            "Theologie": "Theology",
            "Germanistik": "German Studies",
            "Anglistik": "English Studies",
            "Romanistik": "Romance Studies",
            "Hispanistik": "Romance Studies",
            "Sinologie": "Chinese Studies",
            "Japanologie": "Japanese Studies",
            "Koreanistik": "Korean Studies",
            "Indologie und Tibetologie": "Indology",
            "Indologie": "Indology",
            "Islamwissenschaft": "Islamic Studies",
            "Ethnologie": "Social and Cultural Anthropology",
            "Altamerikanistik": "Social and Cultural Anthropology",
            "Afrikawissenschaften": "African Studies",
            "Publizistik": "Media and Communication Studies",
            "Kommunikationswissenschaft": "Media and Communication Studies",
            "Pharmazie": "Pharmacy",
            "Zahnmedizin": "Dentistry",
            "Medizin": "Human Medicine",
            "Jura": "Law",
            "Rechtswissenschaft": "Law",
            "Bildungswissenschaften": "Education Science",
            "Erziehungswissenschaften": "Education Science",
            "Erziehungswissenschaft": "Education Science",
            "Katholische Theologie": "Theology",
            "Evangelische Theologie": "Theology",
            "Kunstwissenschaft": "Art History",
            "Politik und Verwaltung": "Political Science",
            "Ernährungswissenschaften": "Nutritional Science",
            "Ernährungswissenschaft": "Nutritional Science",
            "Französistik": "Romance Studies",
            "Spanistik": "Romance Studies",
            "Soziologie": "Sociology",
            "Agrarwissenschaften": "Agricultural Sciences",
            "Agrarwissenschaft": "Agricultural Sciences",
        }.items(),
        key=lambda kv: len(kv[0]),
        reverse=True,
    )
)

_DEGREE_SUFFIX_PATTERN = re.compile(
    r"\s*\((B\.Sc\.|M\.Sc\.|B\.A\.|M\.A\.|M\.Ed\.|B\.Ed\.|B\.Eng\.|"
    r"LL\.B\.|LL\.M\.|Staatsexamen|State Examination)\)\s*$",
    re.I,
)


def _translate_subject_phrases(text: str) -> str:
    out = text
    for de, en in _SUBJECT_PHRASES_DE_EN:
        out = re.sub(re.escape(de), en, out, flags=re.I)
    return out


def normalize_program_name(name: str) -> str:
    normalized = name.strip()
    normalized = normalized.replace("–", "-").replace("—", "-")

    normalized = re.sub(r"\s*-\s*Immatrikulation\b.*$", "", normalized, flags=re.I)
    normalized = re.sub(
        r"\s*\(\s*PStO\s+\d{4}\s*\)", "", normalized, flags=re.I
    )
    normalized = re.sub(
        r"\s*\(\s*PStOs\s+vor\s+\d{4}\s*\)", "", normalized, flags=re.I
    )
    normalized = re.sub(
        r"\s*\(\s*alt\s*,\s*PStO\s+\d{4}\s*\)", "", normalized, flags=re.I
    )
    normalized = re.sub(r"\bPStO\s+\d{4}\b", "", normalized, flags=re.I)
    normalized = re.sub(r"\s*\(\s*PO\s+\d{4}\s*\)", "", normalized, flags=re.I)
    normalized = re.sub(r"\bPO\s+\d{4}\b", "", normalized, flags=re.I)
    normalized = re.sub(
        r"\s*\(\s*Studienbeginn[^)]*\)", "", normalized, flags=re.I
    )
    normalized = re.sub(r"^Studiengang\s+", "", normalized, flags=re.I)

    # Uni Bonn A–Z list: leading B/M/L badge + verbose degree
    normalized = re.sub(r"^[BML]\s+", "", normalized)
    # Long rows often omit the comma: "... Science Agrarwissenschaften Ein-Fach ..."
    normalized = re.sub(
        r"^Bachelor\s+of\s+Science\s+(.+?)\s+(?:Ein|Zwei|Begleit|Kern)-Fach\b.*$",
        r"\1 (B.Sc.)",
        normalized,
        flags=re.I | re.S,
    )
    normalized = re.sub(
        r"^Master\s+of\s+Science\s+(.+?)\s+(?:Ein|Zwei|Begleit|Kern)-Fach\b.*$",
        r"\1 (M.Sc.)",
        normalized,
        flags=re.I | re.S,
    )
    normalized = re.sub(
        r"^Master\s+of\s+Arts\s+(.+?)\s+(?:Ein|Zwei|Begleit|Kern)-Fach\b.*$",
        r"\1 (M.A.)",
        normalized,
        flags=re.I | re.S,
    )
    m_bl = re.match(
        r"^Bachelor\s+Lehramt\s+(\S+)\s+(?:Berufskolleg|Gymnasium)\b.*",
        normalized,
        re.I,
    )
    if m_bl:
        normalized = f"{m_bl.group(1)} (B.A.)"
    m_med_short = re.match(
        r"^Master\s+of\s+Education\s+([A-Za-zäöüÄÖÜß][A-Za-zäöüÄÖÜß\-]*)\b",
        normalized,
        re.I,
    )
    if m_med_short:
        normalized = f"{m_med_short.group(1)} (M.Ed.)"
    for pat, deg in (
        (
            r"^Weiterbildender\s+Master,\s*(?:Ein|Zwei|Begleit|Kern)-Fach\s+(.+)$",
            "(M.Sc.)",
        ),
        (
            r"^Master\s+of\s+Science(?:\s+in)?\s+(.+)$",
            "(M.Sc.)",
        ),
        (
            r"^Master\s+of\s+Arts,\s*(?:Ein|Zwei|Begleit|Kern)-Fach\s+(.+)$",
            "(M.A.)",
        ),
        (
            r"^Master\s+of\s+Arts\s+(.+)$",
            "(M.A.)",
        ),
        (
            r"^Master\s+of\s+Education,\s*[^,]+,\s*(.+)$",
            "(M.Ed.)",
        ),
        (
            r"^Master\s+of\s+Education,\s*(?:Ein|Zwei|Begleit|Kern)-Fach\s+(.+)$",
            "(M.Ed.)",
        ),
        (
            r"^Master\s+of\s+Education\s+(.+)$",
            "(M.Ed.)",
        ),
        (
            r"^Bachelor\s+of\s+Science,\s*(?:Ein|Zwei|Begleit|Kern)-Fach\s+(.+)$",
            "(B.Sc.)",
        ),
        (
            r"^Bachelor\s+of\s+Science\s+(.+)$",
            "(B.Sc.)",
        ),
        (
            r"^Bachelor\s+of\s+Arts,\s*(?:Ein|Zwei|Begleit|Kern)-Fach\s+(.+)$",
            "(B.A.)",
        ),
        (
            r"^Bachelor\s+of\s+Arts\s+(.+)$",
            "(B.A.)",
        ),
        (
            r"^Bachelor\s+of\s+Laws,\s*(?:Ein|Zwei|Begleit|Kern)-Fach\s+(.+)$",
            "(LL.B.)",
        ),
        (
            r"^Bachelor\s+Lehramt,\s*.+?\s+(.+)$",
            "(B.A.)",
        ),
    ):
        m = re.match(pat, normalized.strip(), re.I)
        if m:
            subject = re.sub(r"\s+", " ", m.group(1).strip())
            normalized = f"{subject} {deg.strip()}"
            break

    # Convert verbose degree suffixes into compact canonical degree tokens.
    substitutions = [
        (r"\s*-\s*Bachelor of Science\s*\(B\.Sc\.\)\s*$", " (B.Sc.)"),
        (r"\s*-\s*Master of Science\s*\(M\.Sc\.\)\s*$", " (M.Sc.)"),
        (r"\s*-\s*Bachelor of Arts\s*\(B\.A\.\)\s*$", " (B.A.)"),
        (r"\s*-\s*Master of Arts\s*\(M\.A\.\)\s*$", " (M.A.)"),
        (r"\s*-\s*Master of Education\s*\(M\.Ed\.\)\s*$", " (M.Ed.)"),
        (r"\s*-\s*Bachelor of Engineering\s*\(B\.Eng\.\)\s*$", " (B.Eng.)"),
    ]
    for pattern, replacement in substitutions:
        normalized = re.sub(pattern, replacement, normalized, flags=re.I)

    # Remove non-degree qualifiers that should not be part of canonical names.
    patterns = [
        r"\s*-\s*Staatsexamen\s*$",
        r"\s*-\s*Zertifikat\s*$",
        r"\s*\(Bachelorteilstudiengang\)\s*-\s*Sonstiges\s*$",
        r"\s*-\s*Sonstiges\s*$",
    ]
    for pattern in patterns:
        normalized = re.sub(pattern, "", normalized, flags=re.I)

    normalized = re.sub(r"\s+", " ", normalized).strip(" -")

    if not _DEGREE_SUFFIX_PATTERN.search(normalized):
        m_ma = re.match(
            r"^Master\s+(?!of\b)(.+)$",
            normalized,
            re.I,
        )
        if m_ma:
            subj = m_ma.group(1).strip()
            subj = re.sub(
                r"\s*\([^)]*(?:Wirtschaftspädagogik|Didaktik|Unterrichtsfach)[^)]*\)\s*",
                " ",
                subj,
                flags=re.I,
            )
            subj = re.sub(r"\s+", " ", subj).strip()
            deg = (
                "(M.Sc.)"
                if re.search(
                    r"(wirtschaft|informatik|mathematik|physik|chemie|biologie|"
                    r"statistik|data|science|engineering|ökonom|ökonom|finance|"
                    r"management|digital|quantitative|biochemistry|psychology|"
                    r"astro|geod|geologie|meteorology|nutrition|computer|information)",
                    subj,
                    re.I,
                )
                else "(M.A.)"
            )
            normalized = f"{subj} {deg}"

        m_ba = re.match(
            r"^Bachelor\s+(?!of\b)(.+)$",
            normalized,
            re.I,
        )
        if m_ba:
            subj = m_ba.group(1).strip()
            subj = re.sub(
                r"\s*\([^)]*(?:Wirtschaftspädagogik|Didaktik|Unterrichtsfach)[^)]*\)\s*",
                " ",
                subj,
                flags=re.I,
            )
            subj = re.sub(r"\s+", " ", subj).strip()
            deg = (
                "(B.Sc.)"
                if re.search(
                    r"(wirtschaft|informatik|mathematik|physik|chemie|biologie|"
                    r"statistik|science|engineering|data|psychology|astro|geo|"
                    r"biochemistry|nutrition|computer|information|technolog|"
                    r"ökolog|ökonom|management|digital)",
                    subj,
                    re.I,
                )
                else "(B.A.)"
            )
            normalized = f"{subj} {deg}"

        m_la = re.match(r"^Lehramt\s+(.+)$", normalized, re.I)
        if m_la:
            subj = m_la.group(1).strip()
            if re.search(r"wirtschaft", subj, re.I):
                normalized = "Economics (B.Sc.)"
            else:
                normalized = f"{subj} (B.A.)"

    normalized = re.sub(r"\s+", " ", normalized).strip(" -")

    m_suf = _DEGREE_SUFFIX_PATTERN.search(normalized)
    if m_suf:
        subj_part = normalized[: m_suf.start()].strip()
        suf = m_suf.group(1)
        if re.fullmatch(r"Staatsexamen|State Examination", suf, re.I):
            deg_out = "(State Examination)"
        else:
            deg_out = f"({suf})"
        subj_en = _translate_subject_phrases(subj_part)
        subj_en = re.sub(r"\s+", " ", subj_en).strip(" -")
        normalized = f"{subj_en} {deg_out}".strip()

    normalized = re.sub(
        r"\(Staatsexamen\)\s*$", "(State Examination)", normalized, flags=re.I
    )
    normalized = re.sub(r"\s+", " ", normalized).strip(" -")
    return normalized


def canonicalize_program_name(
    source_program_name: str,
    valid_programs: list[str],
    alias_map: dict[str, str],
    threshold: float = 0.8,
) -> str | None:
    raw_key = source_program_name.strip().lower()
    normalized_source = normalize_program_name(source_program_name)
    normalized_key = normalized_source.lower()

    for key in [raw_key, normalized_key]:
        if key in alias_map:
            mapped = alias_map[key]
            if mapped in valid_programs:
                return mapped

    if source_program_name in valid_programs:
        return source_program_name
    if normalized_source in valid_programs:
        return normalized_source

    normalized_to_canonical: dict[str, str] = {}
    for program in valid_programs:
        normalized_to_canonical.setdefault(normalize_program_name(program), program)

    if normalized_source in normalized_to_canonical:
        return normalized_to_canonical[normalized_source]

    normalized_candidates = list(normalized_to_canonical.keys())
    close = difflib.get_close_matches(
        normalized_source, normalized_candidates, n=1, cutoff=threshold
    )
    if close:
        return normalized_to_canonical[close[0]]

    return None


def build_program_lookup(program_data: dict[str, Any]) -> dict[str, list[str]]:
    lookup: dict[str, list[str]] = {}
    for university, programs in program_data.items():
        if university == "last_updated":
            continue
        if not isinstance(programs, list):
            continue
        names: list[str] = []
        for entry in programs:
            if isinstance(entry, str):
                names.append(entry)
            elif isinstance(entry, dict):
                name = entry.get("name")
                if isinstance(name, str):
                    names.append(name)
        lookup[university] = names
    return lookup


def normalize_records(
    records: list[RawNCRecord],
    program_data: dict[str, Any],
    university_alias_map: dict[str, str],
    program_alias_map: dict[str, str],
    source_type: str = "live_scrape",
) -> tuple[list[NormalizedNCRecord], list[dict[str, Any]]]:
    program_lookup = build_program_lookup(program_data)
    valid_universities = list(program_lookup.keys())

    normalized: list[NormalizedNCRecord] = []
    unmapped: list[dict[str, Any]] = []

    for record in records:
        is_parseable, nc_value = parse_nc_threshold(record.source_nc_text)
        if not is_parseable:
            unmapped.append(
                {
                    "reason": "nc_unparseable",
                    "source_university_name": record.source_university_name,
                    "source_program_name": record.source_program_name,
                    "source_nc_text": record.source_nc_text,
                    "source_url": record.source_url,
                }
            )
            continue

        university = canonicalize_name(
            record.source_university_name, valid_universities, university_alias_map
        )
        if not university:
            unmapped.append(
                {
                    "reason": "university_unmapped",
                    "source_university_name": record.source_university_name,
                    "source_program_name": record.source_program_name,
                    "source_nc_text": record.source_nc_text,
                    "source_url": record.source_url,
                }
            )
            continue

        valid_programs = program_lookup.get(university, [])
        program = canonicalize_program_name(
            record.source_program_name,
            valid_programs,
            program_alias_map,
            threshold=0.66,
        )
        if not program:
            unmapped.append(
                {
                    "reason": "program_unmapped",
                    "university": university,
                    "source_program_name": record.source_program_name,
                    "source_nc_text": record.source_nc_text,
                    "source_url": record.source_url,
                }
            )
            continue

        normalized.append(
            NormalizedNCRecord(
                university=university,
                program=program,
                nc_threshold=nc_value,
                source_university_name=record.source_university_name,
                source_program_name=record.source_program_name,
                source_url=record.source_url,
                scraped_at=record.scraped_at,
                confidence=record.confidence,
                source_type=source_type,
            )
        )

    return normalized, unmapped


def ensure_mappable_program_data(program_data: dict[str, Any]) -> None:
    if not isinstance(program_data, dict):
        raise MappingError("university_programs.json root must be an object")

