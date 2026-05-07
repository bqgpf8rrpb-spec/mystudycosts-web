from .tum import TUMScraper
from .fau_erlangen_static import FAUErlangenStaticScraper
from .lmu_muenchen import LMUMuenchenScraper
from .uni_bonn import UniBonnScraper
from .uni_bonn_static import UniBonnStaticScraper
from .uni_duisburg_essen import UniDuisburgEssenScraper
from .uni_koeln import UniKoelnScraper

SCRAPER_MODULES = [
    TUMScraper,
    FAUErlangenStaticScraper,
    LMUMuenchenScraper,
    UniBonnScraper,
    UniBonnStaticScraper,
    UniDuisburgEssenScraper,
    UniKoelnScraper,
]

