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
RAW_JSONL_FILE = ROOT / "data" / "raw" / "hochschulkompass_raw.jsonl"
ALIASES_FILE = ROOT / "data" / "mappings" / "university_aliases.json"
OUTPUT_FILE = ROOT / "data" / "mappings" / "unmapped_universities_list.json"


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def main() -> int:
    if not RAW_JSONL_FILE.exists():
        print(f"ERROR: missing raw JSONL file: {RAW_JSONL_FILE}")
        return 1
    if not ALIASES_FILE.exists():
        print(f"ERROR: missing alias file: {ALIASES_FILE}")
        return 1

    alias_data = load_json(ALIASES_FILE)
    if not isinstance(alias_data, dict):
        print("ERROR: university_aliases.json must be a JSON object.")
        return 1

    known_alias_keys = {str(key).strip().lower() for key in alias_data.keys() if str(key).strip()}
    unmatched_universities: set[str] = set()

    with RAW_JSONL_FILE.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            if not isinstance(item, dict):
                continue

            university = item.get("university")
            if not isinstance(university, str):
                continue
            university = university.strip()
            if not university:
                continue

            if university.lower() in known_alias_keys:
                continue
            unmatched_universities.add(university)

    output_list = sorted(unmatched_universities, key=str.casefold)
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_FILE.open("w", encoding="utf-8") as handle:
        json.dump(output_list, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    print(f"Saved {len(output_list)} unmapped university names to {OUTPUT_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
