#!/usr/bin/env python3
from __future__ import annotations

import os
import sys

# Prevent local `types.py` shadowing Python stdlib `types` when run as script.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR in sys.path:
    sys.path.remove(SCRIPT_DIR)

import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
RAW_IN = ROOT / "data" / "raw" / "hochschulkompass_raw.jsonl"
RAW_OUT = ROOT / "data" / "raw" / "hochschulkompass_raw_clean.jsonl"
V2_PATH = ROOT / "data" / "university_programs_v2.json"


def clean_text(text: Any) -> str:
    return re.sub(r"\s+", " ", str(text)).strip()


def clean_raw_jsonl() -> int:
    count = 0
    RAW_OUT.parent.mkdir(parents=True, exist_ok=True)
    with RAW_IN.open("r", encoding="utf-8") as src, RAW_OUT.open("w", encoding="utf-8") as dst:
        for line in src:
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            if not isinstance(item, dict):
                continue
            for field in ("university", "title", "degree", "study_mode"):
                if field in item and item[field] is not None:
                    item[field] = clean_text(item[field])
            dst.write(json.dumps(item, ensure_ascii=False) + "\n")
            count += 1
    return count


def normalize_program_entry(entry: Any) -> str | None:
    if isinstance(entry, str):
        value = clean_text(entry)
        return value if value else None
    if isinstance(entry, dict):
        name = entry.get("name")
        if isinstance(name, str):
            value = clean_text(name)
            return value if value else None
    return None


def clean_v2() -> tuple[int, int]:
    with V2_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError("university_programs_v2.json must be a JSON object")

    cleaned: dict[str, Any] = {}
    universities = 0
    programs = 0
    for key, value in data.items():
        clean_key = clean_text(key)
        if clean_key == "last_updated":
            cleaned[clean_key] = value
            continue

        universities += 1
        existing = cleaned.get(clean_key, [])
        existing_set = set(existing) if isinstance(existing, list) else set()
        if isinstance(value, list):
            for item in value:
                program = normalize_program_entry(item)
                if program:
                    existing_set.add(program)
        sorted_programs = sorted(existing_set, key=str.casefold)
        programs += len(sorted_programs)
        cleaned[clean_key] = sorted_programs

    with V2_PATH.open("w", encoding="utf-8") as f:
        json.dump(cleaned, f, ensure_ascii=False, indent=2)
        f.write("\n")

    return universities, programs


def main() -> int:
    if not RAW_IN.exists():
        print(f"ERROR: missing file: {RAW_IN}")
        return 1
    if not V2_PATH.exists():
        print(f"ERROR: missing file: {V2_PATH}")
        return 1

    raw_count = clean_raw_jsonl()
    uni_count, prog_count = clean_v2()
    print(
        "Deep clean complete: "
        f"raw_rows_cleaned={raw_count}, universities_cleaned={uni_count}, programs_cleaned={prog_count}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
