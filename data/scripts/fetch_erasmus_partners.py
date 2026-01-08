#!/usr/bin/env python3
"""
Erasmus Partner Scraper for Mobility Online Universities

This script attempts to scrape Erasmus partner information from universities
that use the Mobility Online system. It handles different website structures
and outputs data in the erasmus-partners.json format.

Note: Many Mobility Online databases require authentication or JavaScript,
so manual verification may be needed for some universities.
"""

import json
import os
import sys
import logging
import time
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
OUTPUT_FILE = PROJECT_ROOT / 'data' / 'erasmus-partners-batch1.json'
BACKUP_FILE = PROJECT_ROOT / 'data' / 'erasmus-partners-batch1.json.backup'

# Request headers to mimic a browser
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
}

# Timeout for requests
REQUEST_TIMEOUT = 15

# Batch 1 universities
UNIVERSITIES_BATCH_1 = [
    {"name": "TU Berlin", "url": "https://www.tu-berlin.de/international/menue/service/datenbanken/mobility_online/"},
    {"name": "Uni Hamburg", "url": "https://www.uni-hamburg.de/internationales/studierende/outgoing/austausch-gaststudium/erasmus/weltweit-studieren.html"},
    {"name": "TU Dresden", "url": "https://tu-dresden.de/internationales/int-kooperationen/mobility-online"},
    {"name": "Uni Stuttgart", "url": "https://www.student.uni-stuttgart.de/auslandsstudium/austauschmoeglichkeiten/"},
    {"name": "LMU München", "url": "https://www.lmu.de/de/studium/im-studium/auslandsstudium/austauschmoeglichkeiten/index.html"},
    {"name": "Uni Leipzig", "url": "https://www.uni-leipzig.de/international/studium-im-ausland/austauschprogramme"},
    {"name": "Uni Wien", "url": "https://international.univie.ac.at/student-mobility/outgoing-students/erasmus-studium/"},
    {"name": "Uni Graz", "url": "https://international.uni-graz.at/de/auslandsaufenthalte/studierende/studium/erasmus-studium/"},
    {"name": "TU Darmstadt", "url": "https://www.tu-darmstadt.de/studieren/studierende_tu/auslandsaufenthalt/austauschprogramme/index.de.jsp"},
    {"name": "Uni Potsdam", "url": "https://www.uni-potsdam.de/de/international/outgoing/studium/erasmus"}
]

def clean_url(url: str) -> str:
    """Remove markdown link formatting from URL."""
    # Remove markdown link format: [text](url) -> url
    match = re.search(r'\(([^)]+)\)', url)
    if match:
        return match.group(1)
    return url.strip()

def fetch_page(url: str) -> Optional[BeautifulSoup]:
    """
    Fetch a webpage and return BeautifulSoup object.
    
    Args:
        url: URL to fetch
        
    Returns:
        BeautifulSoup object or None if failed
    """
    try:
        logger.info(f"Fetching: {url}")
        response = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT, allow_redirects=True)
        response.raise_for_status()
        
        # Check if response is HTML
        content_type = response.headers.get('Content-Type', '').lower()
        if 'html' not in content_type:
            logger.warning(f"Response is not HTML: {content_type}")
            return None
        
        soup = BeautifulSoup(response.content, 'html.parser')
        return soup
        
    except requests.exceptions.Timeout:
        logger.error(f"Timeout fetching {url}")
        return None
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching {url}: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error fetching {url}: {e}")
        return None

def find_mobility_online_link(soup: BeautifulSoup, base_url: str) -> Optional[str]:
    """
    Find links to Mobility Online database.
    
    Args:
        soup: BeautifulSoup object
        base_url: Base URL for resolving relative links
        
    Returns:
        URL to Mobility Online or None
    """
    if not soup:
        return None
    
    # Common patterns for Mobility Online links
    patterns = [
        r'mobility.?online',
        r'mobilityonline',
        r'partner.*database',
        r'partner.*suche',
        r'partner.*finder',
        r'erasmus.*partner',
        r'partner.*universit',
    ]
    
    # Search in all links
    for link in soup.find_all('a', href=True):
        href = link.get('href', '')
        text = link.get_text(strip=True).lower()
        
        # Check href
        for pattern in patterns:
            if re.search(pattern, href, re.IGNORECASE):
                full_url = urljoin(base_url, href)
                logger.info(f"Found Mobility Online link: {full_url}")
                return full_url
        
        # Check link text
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                full_url = urljoin(base_url, href)
                logger.info(f"Found Mobility Online link via text: {full_url}")
                return full_url
    
    return None

def extract_partners_from_page(soup: BeautifulSoup) -> List[Dict]:
    """
    Extract partner university information from a page.
    
    This is a basic implementation. Different universities have different
    structures, so this may need customization per university.
    
    Args:
        soup: BeautifulSoup object
        
    Returns:
        List of partner dictionaries
    """
    partners = []
    
    if not soup:
        return partners
    
    # Try to find tables with partner information
    tables = soup.find_all('table')
    for table in tables:
        rows = table.find_all('tr')
        for row in rows[1:]:  # Skip header
            cells = row.find_all(['td', 'th'])
            if len(cells) >= 2:
                # Try to extract university name and location
                name = cells[0].get_text(strip=True)
                location = cells[1].get_text(strip=True) if len(cells) > 1 else ""
                
                if name and len(name) > 3:  # Basic validation
                    # Try to parse location (city, country)
                    location_parts = [p.strip() for p in location.split(',')]
                    city = location_parts[0] if location_parts else ""
                    country = location_parts[1] if len(location_parts) > 1 else ""
                    
                    partners.append({
                        "name": name,
                        "city": city,
                        "country": country,
                        "monthlyLivingCost": 0,  # Will need manual input
                        "travelCost": 0,
                        "insuranceCost": 0
                    })
    
    # Try to find lists with partner information
    lists = soup.find_all(['ul', 'ol'])
    for list_elem in lists:
        items = list_elem.find_all('li')
        for item in items:
            text = item.get_text(strip=True)
            # Look for patterns like "University Name, City, Country"
            if ',' in text and len(text) > 10:
                parts = [p.strip() for p in text.split(',')]
                if len(parts) >= 2:
                    name = parts[0]
                    city = parts[1] if len(parts) > 1 else ""
                    country = parts[2] if len(parts) > 2 else ""
                    
                    if name and len(name) > 3:
                        partners.append({
                            "name": name,
                            "city": city,
                            "country": country,
                            "monthlyLivingCost": 0,
                            "travelCost": 0,
                            "insuranceCost": 0
                        })
    
    return partners

def scrape_university(university: Dict) -> Dict:
    """
    Scrape Erasmus partners for a single university.
    
    Args:
        university: Dictionary with 'name' and 'url'
        
    Returns:
        Dictionary with university name and partners (or error info)
    """
    name = university['name']
    url = clean_url(university['url'])
    
    logger.info(f"\n{'='*60}")
    logger.info(f"Processing: {name}")
    logger.info(f"URL: {url}")
    logger.info(f"{'='*60}")
    
    result = {
        "university": name,
        "url": url,
        "status": "pending",
        "partners": [],
        "mobility_online_link": None,
        "error": None,
        "note": None
    }
    
    try:
        # Fetch the main page
        soup = fetch_page(url)
        if not soup:
            result["status"] = "failed"
            result["error"] = "Could not fetch page"
            return result
        
        # Try to find Mobility Online link
        mobility_link = find_mobility_online_link(soup, url)
        result["mobility_online_link"] = mobility_link
        
        # If we found a Mobility Online link, try to fetch it
        if mobility_link:
            logger.info(f"Attempting to fetch Mobility Online database...")
            mobility_soup = fetch_page(mobility_link)
            if mobility_soup:
                soup = mobility_soup
                result["note"] = "Fetched Mobility Online page"
            else:
                result["note"] = "Mobility Online link found but page requires authentication or JavaScript"
        
        # Try to extract partners
        partners = extract_partners_from_page(soup)
        
        if partners:
            result["partners"] = partners
            result["status"] = "success"
            result["note"] = f"Found {len(partners)} partners (costs need manual input)"
            logger.info(f"✅ Found {len(partners)} partners")
        else:
            result["status"] = "partial"
            result["note"] = "Page fetched but no partners extracted automatically. May require manual extraction or JavaScript rendering."
            logger.warning("⚠️  No partners extracted automatically")
        
        # Be polite - wait between requests
        time.sleep(2)
        
    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)
        logger.error(f"❌ Error processing {name}: {e}")
    
    return result

def save_results(results: List[Dict], output_file: Path) -> None:
    """Save results to JSON file."""
    try:
        # Create backup if file exists
        if output_file.exists():
            backup_file = output_file.with_suffix('.json.backup')
            import shutil
            shutil.copy2(output_file, backup_file)
            logger.info(f"Backup created: {backup_file}")
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        logger.info(f"Results saved to: {output_file}")
    except Exception as e:
        logger.error(f"Failed to save results: {e}")

def generate_summary(results: List[Dict]) -> Dict:
    """Generate summary statistics."""
    summary = {
        "total": len(results),
        "success": 0,
        "partial": 0,
        "failed": 0,
        "error": 0,
        "total_partners": 0,
        "universities_with_partners": 0
    }
    
    for result in results:
        status = result.get("status", "unknown")
        if status == "success":
            summary["success"] += 1
        elif status == "partial":
            summary["partial"] += 1
        elif status == "failed":
            summary["failed"] += 1
        elif status == "error":
            summary["error"] += 1
        
        partners = result.get("partners", [])
        if partners:
            summary["universities_with_partners"] += 1
            summary["total_partners"] += len(partners)
    
    return summary

def main():
    """Main execution function."""
    logger.info("=" * 60)
    logger.info("Erasmus Partner Scraper - Batch 1")
    logger.info(f"Timestamp: {datetime.now().isoformat()}")
    logger.info("=" * 60)
    
    results = []
    
    for idx, university in enumerate(UNIVERSITIES_BATCH_1, 1):
        logger.info(f"\n[{idx}/{len(UNIVERSITIES_BATCH_1)}] Processing {university['name']}...")
        result = scrape_university(university)
        results.append(result)
    
    # Generate summary
    summary = generate_summary(results)
    
    logger.info("\n" + "=" * 60)
    logger.info("SUMMARY")
    logger.info("=" * 60)
    logger.info(f"Total universities: {summary['total']}")
    logger.info(f"✅ Success: {summary['success']}")
    logger.info(f"⚠️  Partial: {summary['partial']}")
    logger.info(f"❌ Failed: {summary['failed']}")
    logger.info(f"💥 Errors: {summary['error']}")
    logger.info(f"📊 Total partners found: {summary['total_partners']}")
    logger.info(f"🏫 Universities with partners: {summary['universities_with_partners']}")
    logger.info("=" * 60)
    
    # Save results
    save_results(results, OUTPUT_FILE)
    
    logger.info("\n✅ Scraping complete!")
    logger.info(f"📁 Results saved to: {OUTPUT_FILE}")
    logger.info("\n⚠️  NOTE: Many Mobility Online databases require:")
    logger.info("   - Authentication/login")
    logger.info("   - JavaScript rendering (use Selenium/Playwright)")
    logger.info("   - Manual data entry for costs")
    logger.info("\n💡 Next steps:")
    logger.info("   1. Review the results file")
    logger.info("   2. Manually verify and complete partner data")
    logger.info("   3. Add cost estimates (monthlyLivingCost, travelCost, insuranceCost)")
    logger.info("   4. Convert to erasmus-partners.json format if needed")

if __name__ == '__main__':
    main()

