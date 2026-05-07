#!/usr/bin/env python3
from __future__ import annotations

import os
import sys

# Prevent local `types.py` shadowing Python stdlib `types` when run as script.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR in sys.path:
    sys.path.remove(SCRIPT_DIR)

import difflib
import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
RAW_PATH = ROOT / "data" / "raw" / "hochschulkompass_raw_clean.jsonl"
ALIASES_PATH = ROOT / "data" / "mappings" / "university_aliases.json"
V2_PATH = ROOT / "data" / "university_programs_v2.json"


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(item, dict):
                rows.append(item)
    return rows


def extract_program_names(entries: Any) -> list[str]:
    if not isinstance(entries, list):
        return []
    out: list[str] = []
    for entry in entries:
        if isinstance(entry, str):
            value = entry.strip()
            if value:
                out.append(value)
        elif isinstance(entry, dict):
            name = entry.get("name")
            if isinstance(name, str) and name.strip():
                out.append(name.strip())
    return out


def normalize_degree_suffix(raw_degree: str | None) -> str:
    if not raw_degree:
        return ""
    d = raw_degree.strip().lower()
    if not d:
        return ""
    if "state examination" in d or "staatsexamen" in d:
        return "(State Examination)"
    if "ll.m" in d or "master of laws" in d:
        return "(LL.M.)"
    if "ll.b" in d or "bachelor of laws" in d:
        return "(LL.B.)"
    if "master of engineering" in d or "m.eng" in d:
        return "(M.Eng.)"
    if "bachelor of engineering" in d or "b.eng" in d:
        return "(B.Eng.)"
    if "master of education" in d or "m.ed" in d:
        return "(M.Ed.)"
    if "bachelor of education" in d or "b.ed" in d:
        return "(B.Ed.)"
    if "master of science" in d or d == "master" or "m.sc" in d:
        return "(M.Sc.)"
    if "bachelor of science" in d or d == "bachelor" or "b.sc" in d:
        return "(B.Sc.)"
    if "master of arts" in d or "m.a" in d:
        return "(M.A.)"
    if "bachelor of arts" in d or "b.a" in d:
        return "(B.A.)"
    cleaned = re.sub(r"\s+", " ", raw_degree.strip())
    return f"({cleaned})" if cleaned else ""


def normalize_title(raw_title: str, raw_degree: str | None) -> str:
    title = re.sub(r"\s+", " ", raw_title.strip())
    suffix = normalize_degree_suffix(raw_degree)
    if suffix and not re.search(r"\([^)]+\)\s*$", title):
        return f"{title} {suffix}"
    return title


def main() -> int:
    aliases = load_json(ALIASES_PATH)
    v2_data = load_json(V2_PATH)
    raw_rows = load_jsonl(RAW_PATH)

    if not isinstance(aliases, dict) or not isinstance(v2_data, dict):
        print("ERROR: invalid input JSON structure.")
        return 1

    examples: list[tuple[float, str]] = []

    for row in raw_rows:
        raw_university = row.get("university")
        raw_title = row.get("title")
        raw_degree = row.get("degree")

        if not isinstance(raw_university, str) or not raw_university.strip():
            continue
        if not isinstance(raw_title, str) or not raw_title.strip():
            continue

        canonical_university = aliases.get(raw_university.strip().lower())
        if not canonical_university or canonical_university not in v2_data:
            continue

        programs = extract_program_names(v2_data.get(canonical_university))
        if not programs:
            continue

        normalized_title = normalize_title(raw_title, raw_degree if isinstance(raw_degree, str) else None)

        if normalized_title in programs:
            continue
        close66 = difflib.get_close_matches(normalized_title, programs, n=1, cutoff=0.66)
        if close66:
            continue

        best_match = difflib.get_close_matches(normalized_title, programs, n=1, cutoff=0.0)
        if not best_match:
            continue

        closest_v2 = best_match[0]
        score = difflib.SequenceMatcher(None, normalized_title, closest_v2).ratio()
        if 0.40 <= score <= 0.70:
            line = (
                f"Uni: {canonical_university} | "
                f"HRK-Titel: {raw_title} | "
                f"HRK-Abschluss: {raw_degree if isinstance(raw_degree, str) else ''} | "
                f"V2-Bester-Treffer: {closest_v2} | "
                f"Score: {score:.4f}"
            )
            examples.append((score, line))

    examples.sort(key=lambda x: x[0], reverse=True)
    for _, line in examples[:20]:
        print(line)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
