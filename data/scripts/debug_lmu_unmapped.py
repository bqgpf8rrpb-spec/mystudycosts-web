#!/usr/bin/env python3
"""One-off: top unmapped LMU programs after normalize_program_name + fuzzy cutoff.

Run from repo: ``python3 data/scripts/debug_lmu_unmapped.py``
(Lives under ``data/scripts/`` so Python's script dir is not ``nc_pipeline/``, which
would shadow the stdlib ``types`` module.)
"""

from __future__ import annotations

import difflib
import json
import os
import sys
from collections import Counter
from pathlib import Path

_here = os.path.dirname(os.path.abspath(__file__))
if _here not in sys.path:
    sys.path.insert(0, _here)
ROOT = Path(_here).resolve().parents[1]

from nc_pipeline.normalizer import (
    build_program_lookup,
    canonicalize_name,
    canonicalize_program_name,
    load_alias_map,
    normalize_program_name,
    parse_nc_threshold,
)
from nc_pipeline.sources.lmu_muenchen import LMUMuenchenScraper

LMU_KEY = "Ludwig Maximilian University of Munich (LMU)"
PROGRAMS_FILE = ROOT / "data" / "university_programs_v2.json"
MAPPINGS_DIR = ROOT / "data" / "mappings"


def _best_v2_match(normalized: str, valid_programs: list[str]) -> tuple[str, float]:
    best_name: str | None = None
    best_ratio = 0.0
    n_low = normalized.lower()
    for p in valid_programs:
        np = normalize_program_name(p)
        r = difflib.SequenceMatcher(None, n_low, np.lower()).ratio()
        if r > best_ratio:
            best_ratio = r
            best_name = p
    assert best_name is not None
    return best_name, best_ratio


def main() -> None:
    with open(PROGRAMS_FILE, encoding="utf-8") as f:
        program_data = json.load(f)
    program_lookup = build_program_lookup(program_data)
    valid_programs = program_lookup.get(LMU_KEY, [])
    uni_aliases = load_alias_map(MAPPINGS_DIR / "university_aliases.json")
    prog_aliases = load_alias_map(MAPPINGS_DIR / "program_aliases.json")

    scraper = LMUMuenchenScraper()
    payload = scraper.fetch()
    records = scraper.parse(payload)

    misses: Counter[str] = Counter()
    for rec in records:
        if not parse_nc_threshold(rec.source_nc_text)[0]:
            continue
        uni = canonicalize_name(
            rec.source_university_name,
            list(program_lookup.keys()),
            uni_aliases,
        )
        if uni != LMU_KEY:
            continue
        mapped = canonicalize_program_name(
            rec.source_program_name,
            valid_programs,
            prog_aliases,
            threshold=0.66,
        )
        if mapped is not None:
            continue
        norm = normalize_program_name(rec.source_program_name)
        misses[norm] += 1

    top = misses.most_common(15)
    print("| Rank | Count | Normalized (unmapped) | Closest v2 program | Similarity |")
    print("| ---: | ----: | --- | --- | ---: |")
    for i, (norm, cnt) in enumerate(top, start=1):
        closest, ratio = _best_v2_match(norm, valid_programs)
        print(f"| {i} | {cnt} | {norm} | {closest} | {ratio:.3f} |")


if __name__ == "__main__":
    main()
