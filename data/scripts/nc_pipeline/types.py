from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any


class ModuleStatus(str, Enum):
    SUCCESS = "success"
    PARTIAL_SUCCESS = "partial_success"
    FAILED = "failed"
    SKIPPED = "skipped"
    FALLBACK_CACHE = "fallback_cache"


@dataclass
class RawNCRecord:
    source_university_name: str
    source_program_name: str
    source_nc_text: str
    semester: str | None = None
    source_url: str | None = None
    scraped_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    confidence: float = 0.5
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class NormalizedNCRecord:
    university: str
    program: str
    nc_threshold: float | None
    source_university_name: str
    source_program_name: str
    source_url: str | None = None
    scraped_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    confidence: float = 0.5
    source_type: str = "live_scrape"


@dataclass
class ScraperHealth:
    university_id: str
    status: ModuleStatus
    records_extracted: int = 0
    records_normalized: int = 0
    duration_ms: int = 0
    error: str | None = None
    retries: int = 0
    used_fallback_cache: bool = False


@dataclass
class ScrapeResult:
    university_id: str
    raw_records: list[RawNCRecord] = field(default_factory=list)
    normalized_records: list[NormalizedNCRecord] = field(default_factory=list)
    health: ScraperHealth | None = None
    unmapped_records: list[dict[str, Any]] = field(default_factory=list)

