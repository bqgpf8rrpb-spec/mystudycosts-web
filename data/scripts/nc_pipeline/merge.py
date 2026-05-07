from __future__ import annotations

from typing import Iterable

from .types import NormalizedNCRecord


def deduplicate_records(records: Iterable[NormalizedNCRecord]) -> list[NormalizedNCRecord]:
    best_by_key: dict[tuple[str, str], NormalizedNCRecord] = {}

    for record in records:
        key = (record.university, record.program)
        previous = best_by_key.get(key)
        if previous is None:
            best_by_key[key] = record
            continue

        current_score = score_record(record)
        previous_score = score_record(previous)
        if current_score > previous_score:
            best_by_key[key] = record

    return list(best_by_key.values())


def score_record(record: NormalizedNCRecord) -> tuple[float, float]:
    source_weight = 1.0 if record.source_type == "live_scrape" else 0.7
    return (source_weight, float(record.confidence))


def to_new_nc_data(records: list[NormalizedNCRecord]) -> list[dict[str, object]]:
    sorted_records = sorted(records, key=lambda r: (r.university, r.program))
    return [
        {
            "university": r.university,
            "program": r.program,
            "nc_threshold": (
                round(float(r.nc_threshold), 2) if r.nc_threshold is not None else None
            ),
        }
        for r in sorted_records
    ]

