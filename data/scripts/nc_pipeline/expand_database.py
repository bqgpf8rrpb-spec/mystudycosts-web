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


def normalize_degree(raw_degree: str | None) -> str:
    if not raw_degree:
        return ""
    d = raw_degree.strip()
    dl = d.lower()
    if "bachelor" in dl or "b.sc" in dl:
        return "(B.Sc.)"
    if "master" in dl or "m.sc" in dl:
        return "(M.Sc.)"
    if "b.a" in dl:
        return "(B.A.)"
    if "m.a" in dl:
        return "(M.A.)"
    cleaned = re.sub(r"\s+", " ", d)
    return f"({cleaned})" if cleaned else ""


def format_program(raw_title: str, raw_degree: str | None) -> str:
    title = re.sub(r"\s+", " ", raw_title.strip())
    if not title:
        return ""
    suffix = normalize_degree(raw_degree)
    if suffix and not re.search(r"\([^)]+\)\s*$", title):
        return f"{title} {suffix}"
    return title


def extract_program_names(entries: list[Any]) -> set[str]:
    names: set[str] = set()
    for entry in entries:
        if isinstance(entry, str):
            value = entry.strip()
            if value:
                names.add(value)
        elif isinstance(entry, dict):
            name = entry.get("name")
            if isinstance(name, str) and name.strip():
                names.add(name.strip())
    return names


def main() -> int:
    for required in (RAW_PATH, ALIASES_PATH, V2_PATH):
        if not required.exists():
            print(f"ERROR: missing input file: {required}")
            return 1

    raw_rows = load_jsonl(RAW_PATH)
    aliases = load_json(ALIASES_PATH)
    v2_data = load_json(V2_PATH)

    if not isinstance(aliases, dict) or not isinstance(v2_data, dict):
        print("ERROR: invalid alias/v2 file structure.")
        return 1

    added_universities = 0
    added_programs = 0

    for row in raw_rows:
        raw_uni = row.get("university")
        raw_title = row.get("title")
        raw_degree = row.get("degree")

        if not isinstance(raw_uni, str) or not raw_uni.strip():
            continue
        if not isinstance(raw_title, str) or not raw_title.strip():
            continue

        clean_uni = re.sub(r"\s+", " ", raw_uni.strip())
        alias_key = clean_uni.lower()
        if alias_key in aliases:
            continue

        if clean_uni not in v2_data:
            v2_data[clean_uni] = []
            added_universities += 1

        existing_names = extract_program_names(v2_data.get(clean_uni, []))
        program = format_program(raw_title, raw_degree if isinstance(raw_degree, str) else None)
        if not program:
            continue
        if program not in existing_names:
            existing_names.add(program)
            added_programs += 1
        v2_data[clean_uni] = sorted(existing_names, key=str.casefold)

    with V2_PATH.open("w", encoding="utf-8") as f:
        json.dump(v2_data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(
        "Expand complete: "
        f"new_universities={added_universities}, new_programs={added_programs}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
