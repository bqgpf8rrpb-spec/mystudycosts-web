from __future__ import annotations

from .his_base import HISGenericScraper


class LMUMuenchenScraper(HISGenericScraper):
    university_id = "lmu_muenchen"
    display_name = "Ludwig-Maximilians-Universität München (Munich)"
    source_url = (
        "https://lsf.verwaltung.uni-muenchen.de/qisserver/rds"
        "?state=wtree&search=1&category=studiengang.browse"
    )
    entry_url = (
        "https://lsf.verwaltung.uni-muenchen.de/qisserver/rds"
        "?state=wtree&search=1&category=studiengang.browse"
    )
    his_mode = "legacy_qis"

    def normalize_hint(self) -> dict[str, object]:
        return {
            "university_aliases": [
                "Ludwig-Maximilians-Universität München (Munich)",
                "Ludwig-Maximilians-Universität München",
                "LMU München",
                "LMU Munich",
            ]
        }
