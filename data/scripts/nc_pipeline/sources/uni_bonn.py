from __future__ import annotations

from .his_base import HISGenericScraper


class UniBonnScraper(HISGenericScraper):
    university_id = "uni_bonn"
    display_name = "Rheinische Friedrich-Wilhelms-Universität Bonn (Bonn)"
    source_url = "https://basis.uni-bonn.de/"
    modern_session_prime_urls = (
        "https://basis.uni-bonn.de/qisserver/pages/cs/sys/portal/hisinoneStartPage.faces"
        "?navigationPosition=link_homepage&recordRequest=true",
    )
    entry_url = (
        "https://basis.uni-bonn.de/qisserver/pages/zul/applicant/searchCourseOfStudies.xhtml"
        "?_flowId=searchCourseOfStudiesAPP-flow"
        "&navigationPosition=studiesOffered,searchCourseOfStudyAPP&recordRequest=true"
    )
    his_mode = "modern_hisinone"

    def normalize_hint(self) -> dict[str, object]:
        return {
            "university_aliases": [
                "Rheinische Friedrich-Wilhelms-Universität Bonn (Bonn)",
                "Universität Bonn",
                "University of Bonn",
                "Uni Bonn",
            ]
        }
