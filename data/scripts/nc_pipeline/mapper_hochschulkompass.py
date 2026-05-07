#!/usr/bin/env python3
from __future__ import annotations

import os
import sys

# Prevent local `types.py` shadowing Python stdlib `types` when run as script.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR in sys.path:
    sys.path.remove(SCRIPT_DIR)

# Allow importing nc_pipeline package from data/scripts.
SCRIPTS_DIR = os.path.dirname(SCRIPT_DIR)
if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)

import difflib
import json
import re
from pathlib import Path
from typing import Any

from nc_pipeline.normalizer import load_alias_map, normalize_program_name  # noqa: E402


ROOT = os.path.dirname(os.path.dirname(os.path.dirname(SCRIPT_DIR)))
RAW_JSONL_FILE = os.path.join(ROOT, "data", "raw", "hochschulkompass_raw_clean.jsonl")
PROGRAMS_FILE = os.path.join(ROOT, "data", "university_programs_v2.json")
UNIVERSITY_ALIASES_FILE = Path(ROOT) / "data" / "mappings" / "university_aliases.json"
PROGRAM_ALIASES_FILE = Path(ROOT) / "data" / "mappings" / "program_aliases.json"


def load_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def load_jsonl(path: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                parsed = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, dict):
                rows.append(parsed)
    return rows


def build_program_lookup(program_data: dict[str, Any]) -> dict[str, list[str]]:
    lookup: dict[str, list[str]] = {}
    for university, programs in program_data.items():
        if university == "last_updated" or not isinstance(programs, list):
            continue
        names: list[str] = []
        for entry in programs:
            if isinstance(entry, dict):
                name = entry.get("name")
                if isinstance(name, str) and name.strip():
                    names.append(name.strip())
            elif isinstance(entry, str) and entry.strip():
                names.append(entry.strip())
        lookup[university] = names
    return lookup


def normalize_university_name(
    raw_university: str | None,
    alias_map: dict[str, str],
    valid_universities: set[str],
) -> str | None:
    if not raw_university:
        return None
    key = raw_university.strip().lower()
    mapped = alias_map.get(key)
    if mapped and mapped in valid_universities:
        return mapped
    if raw_university in valid_universities:
        return raw_university
    return None


def normalize_degree_suffix(raw_degree: str | None) -> str | None:
    if not raw_degree:
        return None
    d = raw_degree.strip().lower()
    if not d:
        return None

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
    return None


def build_alias_exact_candidate(raw_title: str, degree_suffix: str | None) -> str:
    normalized = normalize_program_name(raw_title).strip()
    if degree_suffix and not re.search(r"\([^)]+\)\s*$", normalized):
        return f"{normalized} {degree_suffix}".strip()
    return normalized


def match_program_cascade(
    *,
    raw_title: str | None,
    degree_suffix: str | None,
    program_alias_map: dict[str, str],
    valid_programs: list[str],
) -> tuple[str | None, str, str, str | None, float | None]:
    if not raw_title:
        return None, "missing_title", "", None, None

    # Priority 1: exact (including alias maps).
    raw_key = raw_title.strip().lower()
    normalized_title = normalize_program_name(raw_title)
    normalized_key = normalized_title.lower()
    degree_candidate = build_alias_exact_candidate(raw_title, degree_suffix)
    degree_candidate_key = degree_candidate.lower()

    for key in (raw_key, normalized_key, degree_candidate_key):
        mapped = program_alias_map.get(key)
        if mapped and mapped in valid_programs:
            return mapped, "alias_exact", normalized_title, None, None

    for candidate in (raw_title.strip(), normalized_title, degree_candidate):
        if candidate in valid_programs:
            return candidate, "exact", normalized_title, None, None

    # Priority 2: token/fuzzy inside the already matched university.
    norm_to_canonical: dict[str, str] = {}
    for p in valid_programs:
        norm_to_canonical.setdefault(normalize_program_name(p), p)

    fuzzy_target = degree_candidate
    fuzzy_candidates = list(norm_to_canonical.keys())
    best_close = difflib.get_close_matches(fuzzy_target, fuzzy_candidates, n=1, cutoff=0.0)
    closest_v2_match = norm_to_canonical[best_close[0]] if best_close else None
    closest_ratio: float | None = None
    if best_close:
        closest_ratio = difflib.SequenceMatcher(None, fuzzy_target, best_close[0]).ratio()

    close = difflib.get_close_matches(fuzzy_target, fuzzy_candidates, n=1, cutoff=0.75)
    if close:
        return norm_to_canonical[close[0]], "fuzzy", normalized_title, closest_v2_match, closest_ratio

    return None, "unmapped", normalized_title, closest_v2_match, closest_ratio


def main() -> int:
    if not os.path.exists(RAW_JSONL_FILE):
        print(f"ERROR: missing raw file: {RAW_JSONL_FILE}")
        return 1

    raw_rows = load_jsonl(RAW_JSONL_FILE)
    program_data = load_json(PROGRAMS_FILE)
    university_alias_map = load_alias_map(UNIVERSITY_ALIASES_FILE)
    program_alias_map = load_alias_map(PROGRAM_ALIASES_FILE)
    program_lookup = build_program_lookup(program_data)
    valid_universities = set(program_lookup.keys())

    mapped_count = 0
    university_unmapped_count = 0
    program_unmapped_count = 0
    university_unmapped_examples: list[dict[str, Any]] = []
    program_unmapped_examples: list[dict[str, Any]] = []

    for row in raw_rows:
        raw_university = row.get("university")
        raw_title = row.get("title")
        raw_degree = row.get("degree")

        canonical_university = normalize_university_name(
            raw_university=raw_university,
            alias_map=university_alias_map,
            valid_universities=valid_universities,
        )
        if not canonical_university:
            university_unmapped_count += 1
            if len(university_unmapped_examples) < 5:
                university_unmapped_examples.append(
                    {
                        "reason": "university_unmapped",
                        "raw_university": raw_university,
                        "raw_title": raw_title,
                        "raw_degree": raw_degree,
                    }
                )
            continue

        degree_suffix = normalize_degree_suffix(raw_degree)
        valid_programs = program_lookup.get(canonical_university, [])
        matched_program, strategy, normalized_title, closest_v2_match, closest_ratio = match_program_cascade(
            raw_title=raw_title,
            degree_suffix=degree_suffix,
            program_alias_map=program_alias_map,
            valid_programs=valid_programs,
        )

        if matched_program:
            mapped_count += 1
        elif strategy.startswith("unmapped") or strategy == "missing_title":
            program_unmapped_count += 1
            if len(program_unmapped_examples) < 10:
                program_unmapped_examples.append(
                    {
                        "reason": f"program_{strategy}",
                        "canonical_university": canonical_university,
                        "raw_university": raw_university,
                        "raw_title": raw_title,
                        "raw_degree": raw_degree,
                        "normalized_title": normalized_title,
                        "closest_v2_match": closest_v2_match,
                        "closest_ratio": round(closest_ratio, 4) if closest_ratio is not None else None,
                    }
                )

    total = len(raw_rows)
    unmapped = total - mapped_count
    print(f"Total Processed: {total} | Mapped: {mapped_count} | Unmapped: {unmapped}")
    print(
        "Failure Breakdown: "
        f"university_unmapped={university_unmapped_count} | "
        f"program_unmapped={program_unmapped_count}"
    )

    if university_unmapped_examples:
        print("Top 5 university_unmapped examples:")
        print(json.dumps(university_unmapped_examples[:5], indent=2, ensure_ascii=False))
    else:
        print("Top 5 university_unmapped examples: none")

    if program_unmapped_examples:
        print("Top 10 program_unmapped examples:")
        print(json.dumps(program_unmapped_examples[:10], indent=2, ensure_ascii=False))
    else:
        print("Top 10 program_unmapped examples: none")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
