from __future__ import annotations

from .his_base import HISGenericScraper


class FAUErlangenScraper(HISGenericScraper):
    """FAU Campo (HIS). Anonymous requests currently receive an empty wtree shell (root only);

    extracting programs may require a logged-in session, a semester-selected URL, or a static fallback.
    """
    university_id = "fau_erlangen"
    display_name = "Friedrich-Alexander-Universität Erlangen-Nürnberg"
    source_url = "https://campo.fau.de/"
    entry_url = (
        "https://campo.fau.de/qisserver/rds"
        "?state=wtree&search=1&category=studiengang.browse"
    )
    his_mode = "legacy_qis"

    def normalize_hint(self) -> dict[str, object]:
        return {
            "university_aliases": [
                "University of Erlangen-Nuremberg (FAU)",
                "Friedrich-Alexander-Universität Erlangen-Nürnberg",
                "FAU Erlangen-Nürnberg",
            ]
        }
