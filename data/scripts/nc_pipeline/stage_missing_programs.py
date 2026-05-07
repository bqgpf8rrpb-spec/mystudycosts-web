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
OUT_PATH = ROOT / "data" / "mappings" / "v2_enrichment_candidates.json"
FUZZY_CUTOFF = 0.66


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
    names: list[str] = []
    for entry in entries:
        if isinstance(entry, str):
            value = entry.strip()
            if value:
                names.append(value)
        elif isinstance(entry, dict):
            name = entry.get("name")
            if isinstance(name, str) and name.strip():
                names.append(name.strip())
    return names


def normalize_title(value: str) -> str:
    text = value.strip()
    text = text.replace("–", "-").replace("—", "-")
    text = re.sub(r"\s+", " ", text)
    return text


def degree_suffix(raw_degree: str | None) -> str:
    if not raw_degree:
        return ""
    d = raw_degree.lower()
    if "bachelor" in d or "b.sc" in d:
        return "(B.Sc.)"
    if "master" in d or "m.sc" in d:
        return "(M.Sc.)"
    m = re.sub(r"\s+", " ", raw_degree.strip())
    return f"({m})" if m else ""


def enriched_program_name(raw_title: str, raw_degree: str | None) -> str:
    title = normalize_title(raw_title)
    suffix = degree_suffix(raw_degree)
    if not suffix:
        return title
    if re.search(r"\([^)]+\)\s*$", title):
        return title
    return f"{title} {suffix}"


def is_mapped_program(candidate: str, existing_programs: list[str]) -> bool:
    if candidate in existing_programs:
        return True
    close = difflib.get_close_matches(candidate, existing_programs, n=1, cutoff=FUZZY_CUTOFF)
    return bool(close)


def main() -> int:
    for required in (RAW_PATH, ALIASES_PATH, V2_PATH):
        if not required.exists():
            print(f"ERROR: missing input file: {required}")
            return 1

    raw_rows = load_jsonl(RAW_PATH)
    aliases = load_json(ALIASES_PATH)
    v2_data = load_json(V2_PATH)

    if not isinstance(aliases, dict) or not isinstance(v2_data, dict):
        print("ERROR: invalid JSON structure in aliases or v2 file.")
        return 1

    candidates: dict[str, set[str]] = {}
    processed = 0
    program_unmapped = 0

    for row in raw_rows:
        processed += 1
        raw_uni = row.get("university")
        raw_title = row.get("title")
        raw_degree = row.get("degree")

        if not isinstance(raw_uni, str) or not raw_uni.strip():
            continue
        if not isinstance(raw_title, str) or not raw_title.strip():
            continue

        uni_key = raw_uni.strip().lower()
        canonical_uni = aliases.get(uni_key)
        if not canonical_uni or canonical_uni not in v2_data:
            continue

        existing_programs = extract_program_names(v2_data.get(canonical_uni))
        if not existing_programs:
            continue

        candidate = enriched_program_name(raw_title, raw_degree if isinstance(raw_degree, str) else None)
        if is_mapped_program(candidate, existing_programs):
            continue

        candidates.setdefault(canonical_uni, set()).add(candidate)
        program_unmapped += 1

    output = {
        uni: sorted(list(programs), key=str.casefold)
        for uni, programs in sorted(candidates.items(), key=lambda kv: kv[0].casefold())
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
        f.write("\n")

    total_candidates = sum(len(v) for v in output.values())
    print(
        "Staging complete: "
        f"processed={processed}, universities={len(output)}, candidate_programs={total_candidates}, "
        f"program_unmapped_events={program_unmapped}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
