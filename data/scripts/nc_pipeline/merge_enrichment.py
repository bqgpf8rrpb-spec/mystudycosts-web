#!/usr/bin/env python3
from __future__ import annotations

import os
import sys

# Prevent local `types.py` shadowing Python stdlib `types` when run as script.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR in sys.path:
    sys.path.remove(SCRIPT_DIR)

import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
V2_PATH = ROOT / "data" / "university_programs_v2.json"
CANDIDATES_PATH = ROOT / "data" / "mappings" / "v2_enrichment_candidates.json"


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def extract_program_name(entry: Any) -> str | None:
    if isinstance(entry, str):
        value = entry.strip()
        return value if value else None
    if isinstance(entry, dict):
        name = entry.get("name")
        if isinstance(name, str) and name.strip():
            return name.strip()
    return None


def collect_existing_program_names(entries: list[Any]) -> list[str]:
    names: list[str] = []
    for item in entries:
        extracted = extract_program_name(item)
        if extracted:
            names.append(extracted)
    return names


def main() -> int:
    if not V2_PATH.exists():
        print(f"ERROR: Missing v2 data file: {V2_PATH}")
        return 1
    if not CANDIDATES_PATH.exists():
        print(f"ERROR: Missing enrichment candidates file: {CANDIDATES_PATH}")
        return 1

    v2_data = load_json(V2_PATH)
    candidates = load_json(CANDIDATES_PATH)

    if not isinstance(v2_data, dict):
        print("ERROR: university_programs_v2.json must be a JSON object.")
        return 1
    if not isinstance(candidates, dict):
        print("ERROR: v2_enrichment_candidates.json must be a JSON object.")
        return 1

    universities_processed = 0
    programs_added = 0

    for university, new_entries in candidates.items():
        if university not in v2_data:
            continue
        if not isinstance(v2_data.get(university), list):
            continue
        if not isinstance(new_entries, list):
            continue

        universities_processed += 1
        existing_entries = v2_data[university]
        existing_names = collect_existing_program_names(existing_entries)
        merged_set = set(existing_names)

        for candidate in new_entries:
            name = extract_program_name(candidate)
            if not name:
                continue
            if name not in merged_set:
                merged_set.add(name)
                programs_added += 1

        v2_data[university] = sorted(merged_set, key=str.casefold)

    with V2_PATH.open("w", encoding="utf-8") as handle:
        json.dump(v2_data, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    print(
        "Merge complete: "
        f"universities_processed={universities_processed}, "
        f"programs_added={programs_added}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
