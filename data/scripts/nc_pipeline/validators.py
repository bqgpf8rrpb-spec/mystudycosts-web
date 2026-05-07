from __future__ import annotations

from collections import defaultdict

from .errors import ValidationError
from .types import NormalizedNCRecord


def validate_normalized_records(
    records: list[NormalizedNCRecord],
    min_nc: float = 0.0,
    max_nc: float = 4.0,
) -> tuple[list[NormalizedNCRecord], list[dict[str, str]]]:
    valid: list[NormalizedNCRecord] = []
    invalid: list[dict[str, str]] = []

    for record in records:
        if not record.university or not record.program:
            invalid.append(
                {
                    "reason": "missing_required_fields",
                    "university": record.university,
                    "program": record.program,
                }
            )
            continue
        if record.nc_threshold is not None:
            if not (min_nc <= float(record.nc_threshold) <= max_nc):
                invalid.append(
                    {
                        "reason": "nc_out_of_range",
                        "university": record.university,
                        "program": record.program,
                        "nc_threshold": str(record.nc_threshold),
                    }
                )
                continue
        valid.append(record)
    return valid, invalid


def validate_min_success(
    successful_modules: int,
    total_modules: int,
    min_successful_modules: int,
    max_failure_rate: float,
) -> None:
    if total_modules == 0:
        raise ValidationError("No modules configured")

    failures = total_modules - successful_modules
    failure_rate = failures / total_modules

    if successful_modules < min_successful_modules:
        raise ValidationError(
            f"Successful modules below threshold: {successful_modules} < {min_successful_modules}"
        )
    if failure_rate > max_failure_rate:
        raise ValidationError(
            f"Module failure rate too high: {failure_rate:.2%} > {max_failure_rate:.2%}"
        )


def summarize_by_university(records: list[NormalizedNCRecord]) -> dict[str, int]:
    counter: dict[str, int] = defaultdict(int)
    for record in records:
        counter[record.university] += 1
    return dict(counter)

