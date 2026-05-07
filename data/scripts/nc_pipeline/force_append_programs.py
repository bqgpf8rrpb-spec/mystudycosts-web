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
FUZZY_THRESHOLD = 0.70


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
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(row, dict):
                rows.append(row)
    return rows


def extract_program_names(entries: Any) -> set[str]:
    out: set[str] = set()
    if not isinstance(entries, list):
        return out
    for entry in entries:
        if isinstance(entry, str):
            val = re.sub(r"\s+", " ", entry.strip())
            if val:
                out.add(val)
        elif isinstance(entry, dict):
            name = entry.get("name")
            if isinstance(name, str):
                val = re.sub(r"\s+", " ", name.strip())
                if val:
                    out.add(val)
    return out


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip())


def main() -> int:
    aliases = load_json(ALIASES_PATH)
    v2 = load_json(V2_PATH)
    raw = load_jsonl(RAW_PATH)

    if not isinstance(aliases, dict) or not isinstance(v2, dict):
        print("ERROR: invalid aliases/v2 structure")
        return 1

    appended = 0
    for row in raw:
        raw_uni = row.get("university")
        raw_title = row.get("title")
        raw_degree = row.get("degree")

        if not isinstance(raw_uni, str) or not raw_uni.strip():
            continue
        if not isinstance(raw_title, str) or not raw_title.strip():
            continue
        if not isinstance(raw_degree, str) or not raw_degree.strip():
            continue

        canonical_university = aliases.get(raw_uni.strip().lower())
        if not canonical_university or canonical_university not in v2:
            continue

        existing = extract_program_names(v2.get(canonical_university))
        title = norm(raw_title)
        degree = norm(raw_degree)

        if title in existing:
            continue

        best = difflib.get_close_matches(title, list(existing), n=1, cutoff=0.0)
        best_score = 0.0
        if best:
            best_score = difflib.SequenceMatcher(None, title, best[0]).ratio()

        if best_score >= FUZZY_THRESHOLD:
            continue

        forced_title = f"{title} ({degree})"
        if forced_title not in existing:
            existing.add(forced_title)
            appended += 1
        v2[canonical_university] = sorted(existing, key=str.casefold)

    with V2_PATH.open("w", encoding="utf-8") as f:
        json.dump(v2, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Force append complete: appended={appended}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
