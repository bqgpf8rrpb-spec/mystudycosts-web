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


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    data = load_json(V2_PATH)
    if not isinstance(data, dict):
        print("ERROR: university_programs_v2.json is not a JSON object.")
        return 1

    uni_count = 0
    program_count = 0
    for key, value in data.items():
        if key == "last_updated":
            continue
        uni_count += 1
        if isinstance(value, list):
            program_count += len(value)

    print("Beweis-Report:")
    print(f"Total Universitäten in V2: {uni_count}")
    print(f"Total Studiengänge in V2: {program_count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
