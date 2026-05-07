from __future__ import annotations

from .his_base import HISGenericScraper


class UniDuisburgEssenScraper(HISGenericScraper):
    university_id = "uni_duisburg_essen"
    display_name = "Universität Duisburg-Essen"
    source_url = "https://campus.uni-due.de/lsf/"
    entry_url = (
        "https://campus.uni-due.de/lsf/rds"
        "?state=wtree&search=1&category=studiengang.browse"
    )
    his_mode = "legacy_qis"

    def normalize_hint(self) -> dict[str, object]:
        return {
            "university_aliases": [
                "University of Duisburg-Essen",
                "Universität Duisburg-Essen",
                "Uni Duisburg-Essen",
            ]
        }
