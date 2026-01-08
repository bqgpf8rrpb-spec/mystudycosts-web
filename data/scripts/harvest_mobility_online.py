#!/usr/bin/env python3
"""
Mobility Online Partner Harvester

This script harvests Erasmus partner data from universities using Mobility Online
or similar exchange databases. It detects search APIs, iframes, and partner tables,
then extracts structured partner information.

Features:
- Automatic detection of Mobility Online portals
- Iframe and embedded content handling
- Subject/field filtering (Business, Management, Economics)
- Rate limiting for polite scraping
- Comprehensive error handling
- Structured JSON output
"""

import json
import os
import sys
import logging
import time
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse, parse_qs, urlencode
import requests
from bs4 import BeautifulSoup
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('harvest_errors.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
OUTPUT_FILE = PROJECT_ROOT / 'data' / 'batch1_erasmus_data.json'
ERROR_LOG = SCRIPT_DIR / 'harvest_errors.txt'

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
REQUEST_TIMEOUT = 20

# Rate limiting (randomized between min and max)
RATE_LIMIT_MIN = 3
RATE_LIMIT_MAX = 5

# Subject filters (for filtering if possible)
SUBJECT_FILTERS = ['Business', 'Management', 'Economics', 'Wirtschaft', 'BWL', 'VWL', 'Betriebswirtschaft']

# Batch 1 universities
# Korrigierte Links für Mobility Online Suchmasken
UNIVERSITIES_BATCH_1 = [
    {"name": "TU Berlin", "url": "https://web.tu-berlin.de/zuv/komm/international/austauschpl/index.php"},
    {"name": "Uni Hamburg", "url": "https://www.uni-hamburg.de/internationales/studierende/outgoing/austausch-gaststudium/erasmus/weltweit-studieren.html"},
    {"name": "TU Dresden", "url": "https://tu-dresden.de/internationales/int-kooperationen/mobility-online"},
    {"name": "Uni Stuttgart", "url": "https://www.student.uni-stuttgart.de/auslandsstudium/austauschmoeglichkeiten/"},
    # MoveON Publisher Direkt-Links (Viel stabiler!)
    {"name": "LMU München", "url": "https://lmu.moveon4.de/publisher/1/deu"},
    {"name": "Uni Leipzig", "url": "https://leipzig.moveon4.de/publisher/1/deu"},
    {"name": "Uni Wien", "url": "https://international.univie.ac.at/student-mobility/outgoing-students/erasmus-studium/"},
    {"name": "Uni Graz", "url": "https://international.uni-graz.at/de/auslandsaufenthalte/studierende/studium/erasmus-studium/"},
    {"name": "TU Darmstadt", "url": "https://www.tu-darmstadt.de/studieren/studierende_tu/auslandsaufenthalt/austauschprogramme/index.de.jsp"},
    {"name": "Uni Potsdam", "url": "https://www.uni-potsdam.de/de/international/outgoing/studium/erasmus"}
]

def clean_url(url: str) -> str:
    """Remove markdown link formatting from URL."""
    match = re.search(r'\(([^)]+)\)', url)
    if match:
        return match.group(1)
    return url.strip()

def log_error(university: str, url: str, error: str) -> None:
    """Log error to both console and error file."""
    error_msg = f"[{datetime.now().isoformat()}] {university} ({url}): {error}\n"
    logger.error(error_msg)
    try:
        with open(ERROR_LOG, 'a', encoding='utf-8') as f:
            f.write(error_msg)
    except Exception as e:
        logger.warning(f"Failed to write to error log: {e}")

def fetch_page(url: str) -> Optional[Tuple[BeautifulSoup, str]]:
    """
    Fetch a webpage and return BeautifulSoup object with final URL.
    
    Args:
        url: URL to fetch
        
    Returns:
        Tuple of (BeautifulSoup object, final_url) or None if failed
    """
    try:
        logger.info(f"Fetching: {url}")
        response = requests.get(
            url, 
            headers=HEADERS, 
            timeout=REQUEST_TIMEOUT, 
            allow_redirects=True
        )
        response.raise_for_status()
        
        # Check if response is HTML
        content_type = response.headers.get('Content-Type', '').lower()
        if 'html' not in content_type:
            logger.warning(f"Response is not HTML: {content_type}")
            return None
        
        soup = BeautifulSoup(response.content, 'html.parser')
        final_url = response.url
        return soup, final_url
        
    except requests.exceptions.Timeout:
        logger.error(f"Timeout fetching {url}")
        return None
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching {url}: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error fetching {url}: {e}")
        return None

def is_moveon_publisher_url(url: str) -> bool:
    """Check if URL is a MoveON Publisher link."""
    return 'moveon4.de' in url or 'moveon' in url.lower()

def find_mobility_online_links(soup: BeautifulSoup, base_url: str) -> List[str]:
    """
    Find all potential Mobility Online or partner database links.
    
    Args:
        soup: BeautifulSoup object
        base_url: Base URL for resolving relative links
        
    Returns:
        List of potential Mobility Online URLs
    """
    if not soup:
        return []
    
    links = []
    
    # Common patterns for Mobility Online links
    patterns = [
        r'mobility.?online',
        r'mobilityonline',
        r'service4mobility',
        r'partner.*database',
        r'partner.*suche',
        r'partner.*finder',
        r'exchange.*possibilities',
        r'austausch.*möglichkeiten',
        r'erasmus.*partner',
        r'partner.*universit',
        r'search.*results',
        r'suchergebnisse',
    ]
    
    # Search in all links
    for link in soup.find_all('a', href=True):
        href = link.get('href', '')
        text = link.get_text(strip=True).lower()
        
        # Check href
        for pattern in patterns:
            if re.search(pattern, href, re.IGNORECASE):
                full_url = urljoin(base_url, href)
                if full_url not in links:
                    links.append(full_url)
                    logger.info(f"Found potential Mobility Online link: {full_url}")
        
        # Check link text
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                full_url = urljoin(base_url, href)
                if full_url not in links:
                    links.append(full_url)
                    logger.info(f"Found potential Mobility Online link via text: {full_url}")
    
    # Also check iframes
    for iframe in soup.find_all('iframe', src=True):
        src = iframe.get('src', '')
        for pattern in patterns:
            if re.search(pattern, src, re.IGNORECASE):
                full_url = urljoin(base_url, src)
                if full_url not in links:
                    links.append(full_url)
                    logger.info(f"Found Mobility Online iframe: {full_url}")
    
    return links

def extract_partners_from_table(table) -> List[Dict]:
    """
    Extract partner information from an HTML table.
    
    Args:
        table: BeautifulSoup table element
        
    Returns:
        List of partner dictionaries
    """
    partners = []
    
    if not table:
        return partners
    
    rows = table.find_all('tr')
    if len(rows) < 2:  # Need at least header + one data row
        return partners
    
    # Try to identify column headers
    header_row = rows[0]
    headers = [th.get_text(strip=True).lower() for th in header_row.find_all(['th', 'td'])]
    
    # Map common header patterns to field names
    name_col = None
    city_col = None
    country_col = None
    subject_col = None
    
    for idx, header in enumerate(headers):
        header_lower = header.lower()
        if any(word in header_lower for word in ['university', 'universität', 'partner', 'name', 'institution']):
            name_col = idx
        elif any(word in header_lower for word in ['city', 'stadt', 'ort']):
            city_col = idx
        elif any(word in header_lower for word in ['country', 'land', 'staat']):
            country_col = idx
        elif any(word in header_lower for word in ['subject', 'fach', 'field', 'studium', 'program']):
            subject_col = idx
    
    # If we couldn't identify columns, try positional (common patterns)
    if name_col is None:
        name_col = 0  # First column often has name
    if city_col is None and len(headers) > 1:
        city_col = 1
    if country_col is None and len(headers) > 2:
        country_col = 2
    if subject_col is None and len(headers) > 3:
        subject_col = 3
    
    # Extract data rows
    for row in rows[1:]:
        cells = row.find_all(['td', 'th'])
        if len(cells) < 2:
            continue
        
        # Extract values
        name = cells[name_col].get_text(strip=True) if name_col is not None and name_col < len(cells) else ""
        city = cells[city_col].get_text(strip=True) if city_col is not None and city_col < len(cells) else ""
        country = cells[country_col].get_text(strip=True) if country_col is not None and country_col < len(cells) else ""
        subject = cells[subject_col].get_text(strip=True) if subject_col is not None and subject_col < len(cells) else ""
        
        # Validate and clean
        if name and len(name) > 3 and not name.lower() in ['suche', 'search', 'navigation', 'menü', 'menu']:
            # Clean up name (remove extra whitespace, newlines)
            name = ' '.join(name.split())
            city = ' '.join(city.split())
            country = ' '.join(country.split())
            subject = ' '.join(subject.split())
            
            partners.append({
                "name": name,
                "city": city,
                "country": country,
                "subject": subject
            })
    
    return partners

def extract_partners_from_lists(soup: BeautifulSoup) -> List[Dict]:
    """
    Extract partner information from lists (ul/ol).
    
    Args:
        soup: BeautifulSoup object
        
    Returns:
        List of partner dictionaries
    """
    partners = []
    
    if not soup:
        return partners
    
    # Look for structured lists
    lists = soup.find_all(['ul', 'ol'])
    for list_elem in lists:
        items = list_elem.find_all('li')
        for item in items:
            text = item.get_text(strip=True)
            
            # Look for patterns like "University Name, City, Country" or "University Name - City, Country"
            if ',' in text or ' - ' in text:
                # Try comma-separated format
                if ',' in text:
                    parts = [p.strip() for p in text.split(',')]
                else:
                    parts = [p.strip() for p in text.split(' - ')]
                
                if len(parts) >= 2:
                    name = parts[0]
                    city = parts[1] if len(parts) > 1 else ""
                    country = parts[2] if len(parts) > 2 else ""
                    subject = parts[3] if len(parts) > 3 else ""
                    
                    # Validate name
                    if name and len(name) > 3 and any(word in name.lower() for word in ['university', 'universität', 'uni', 'college', 'hochschule']):
                        partners.append({
                            "name": name,
                            "city": city,
                            "country": country,
                            "subject": subject
                        })
    
    return partners

def extract_partners_from_page(soup: BeautifulSoup, filter_subjects: bool = True) -> List[Dict]:
    """
    Extract partner university information from a page.
    
    Args:
        soup: BeautifulSoup object
        filter_subjects: Whether to filter for Business/Management/Economics
        
    Returns:
        List of partner dictionaries
    """
    partners = []
    
    if not soup:
        return partners
    
    # Method 1: Extract from tables (most common)
    tables = soup.find_all('table')
    for table in tables:
        table_partners = extract_partners_from_table(table)
        partners.extend(table_partners)
    
    # Method 2: Extract from lists
    if not partners:
        list_partners = extract_partners_from_lists(soup)
        partners.extend(list_partners)
    
    # Method 3: Look for div-based structures (some modern sites)
    if not partners:
        # Look for divs with class names containing "partner", "university", etc.
        partner_divs = soup.find_all('div', class_=re.compile(r'partner|university|exchange', re.I))
        for div in partner_divs:
            text = div.get_text(strip=True)
            if ',' in text and len(text) > 10:
                parts = [p.strip() for p in text.split(',')]
                if len(parts) >= 2:
                    name = parts[0]
                    if name and len(name) > 3:
                        partners.append({
                            "name": name,
                            "city": parts[1] if len(parts) > 1 else "",
                            "country": parts[2] if len(parts) > 2 else "",
                            "subject": parts[3] if len(parts) > 3 else ""
                        })
    
    # Filter by subject if requested
    if filter_subjects and partners:
        filtered = []
        for partner in partners:
            subject = partner.get('subject', '').lower()
            name = partner.get('name', '').lower()
            
            # Include if subject matches or if we can't determine subject
            if not subject or any(filter_term in subject for filter_term in [f.lower() for f in SUBJECT_FILTERS]):
                filtered.append(partner)
            # Also include if name suggests business school
            elif any(term in name for term in ['business', 'management', 'economics', 'wirtschaft']):
                filtered.append(partner)
        
        if filtered:
            logger.info(f"Filtered {len(partners)} partners to {len(filtered)} Business/Management/Economics partners")
            return filtered
    
    return partners

def try_add_query_params(url: str, subject_filter: str = None) -> str:
    """
    Try to add query parameters for filtering (if URL structure allows).
    
    Args:
        url: Base URL
        subject_filter: Subject to filter for
        
    Returns:
        URL with query parameters (if applicable)
    """
    if not subject_filter:
        return url
    
    # Common query parameter patterns
    params = {}
    
    # Try common parameter names
    if 'search' in url.lower() or 'suche' in url.lower():
        params['q'] = subject_filter
        params['subject'] = subject_filter
        params['fach'] = subject_filter
    
    if params:
        parsed = urlparse(url)
        query = parse_qs(parsed.query)
        query.update({k: [v] for k, v in params.items()})
        new_query = urlencode(query, doseq=True)
        new_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}?{new_query}"
        return new_url
    
    return url

def harvest_university(university: Dict) -> Dict:
    """
    Harvest Erasmus partners for a single university.
    
    Args:
        university: Dictionary with 'name' and 'url'
        
    Returns:
        Dictionary with university name and partners
    """
    name = university['name']
    url = clean_url(university['url'])
    
    logger.info(f"\n{'='*60}")
    logger.info(f"Harvesting: {name}")
    logger.info(f"URL: {url}")
    logger.info(f"{'='*60}")
    
    result = {
        "university": name,
        "partners": []
    }
    
    try:
        # Step 1: Check if this is a MoveON Publisher link (needs special handling)
        if is_moveon_publisher_url(url):
            logger.info(f"Detected MoveON Publisher link - may require JavaScript rendering")
            # MoveON Publisher links often have embedded iframes or JavaScript-rendered content
            # Try to fetch and look for iframes or embedded content
            page_result = fetch_page(url)
            if page_result:
                soup, final_url = page_result
                # Look for iframes that might contain the partner database
                iframes = soup.find_all('iframe', src=True)
                for iframe in iframes:
                    iframe_src = iframe.get('src', '')
                    if 'moveon' in iframe_src.lower() or 'publisher' in iframe_src.lower():
                        iframe_url = urljoin(final_url, iframe_src)
                        logger.info(f"Found MoveON iframe: {iframe_url}")
                        iframe_result = fetch_page(iframe_url)
                        if iframe_result:
                            soup, _ = iframe_result
                            break
            else:
                log_error(name, url, "Could not fetch MoveON Publisher page")
                return result
        else:
            # Step 1: Fetch the main page
            page_result = fetch_page(url)
            if not page_result:
                log_error(name, url, "Could not fetch main page")
                return result
            
            soup, final_url = page_result
        
        # Step 2: Look for Mobility Online links (skip if already on MoveON)
        if not is_moveon_publisher_url(url):
            mobility_links = find_mobility_online_links(soup, final_url)
        else:
            mobility_links = []
        
        # Step 3: Try to extract from main page first
        partners = extract_partners_from_page(soup, filter_subjects=False)
        
        # Step 4: If we found Mobility Online links, try those
        if mobility_links and not partners:
            logger.info(f"Found {len(mobility_links)} Mobility Online links, trying to fetch...")
            for link in mobility_links[:3]:  # Limit to first 3 links
                try:
                    # Try with subject filter
                    filtered_url = try_add_query_params(link, 'Business')
                    link_result = fetch_page(filtered_url)
                    
                    if link_result:
                        link_soup, _ = link_result
                        link_partners = extract_partners_from_page(link_soup, filter_subjects=True)
                        if link_partners:
                            partners.extend(link_partners)
                            logger.info(f"Found {len(link_partners)} partners from {link}")
                            break  # Success, no need to try more links
                    
                    # If filtered didn't work, try without filter
                    if not link_partners:
                        link_result = fetch_page(link)
                        if link_result:
                            link_soup, _ = link_result
                            link_partners = extract_partners_from_page(link_soup, filter_subjects=False)
                            if link_partners:
                                partners.extend(link_partners)
                                logger.info(f"Found {len(link_partners)} partners from {link} (no filter)")
                                break
                    
                    time.sleep(2)  # Be polite between link attempts
                    
                except Exception as e:
                    logger.warning(f"Error fetching Mobility Online link {link}: {e}")
                    continue
        
        # Step 5: If still no partners, try extracting from main page without filters
        if not partners:
            partners = extract_partners_from_page(soup, filter_subjects=False)
        
        # Remove duplicates based on name
        seen_names = set()
        unique_partners = []
        for partner in partners:
            name_key = partner.get('name', '').lower().strip()
            if name_key and name_key not in seen_names:
                seen_names.add(name_key)
                unique_partners.append(partner)
        
        result["partners"] = unique_partners
        
        if unique_partners:
            logger.info(f"✅ Successfully harvested {len(unique_partners)} unique partners")
        else:
            logger.warning(f"⚠️  No partners found for {name}")
            log_error(name, url, "No partners extracted from page")
        
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        log_error(name, url, error_msg)
        logger.error(f"❌ Error harvesting {name}: {e}")
    
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
        raise

def main():
    """Main execution function."""
    # Clear error log
    if ERROR_LOG.exists():
        ERROR_LOG.unlink()
    
    logger.info("=" * 60)
    logger.info("Mobility Online Partner Harvester - Batch 1")
    logger.info(f"Timestamp: {datetime.now().isoformat()}")
    logger.info("=" * 60)
    
    results = []
    total_partners = 0
    
    for idx, university in enumerate(UNIVERSITIES_BATCH_1, 1):
        logger.info(f"\n[{idx}/{len(UNIVERSITIES_BATCH_1)}] Processing {university['name']}...")
        
        result = harvest_university(university)
        results.append(result)
        total_partners += len(result.get('partners', []))
        
        # Rate limiting (except for last university)
        if idx < len(UNIVERSITIES_BATCH_1):
            sleep_time = RATE_LIMIT_MIN + (idx % (RATE_LIMIT_MAX - RATE_LIMIT_MIN + 1))
            logger.info(f"Sleeping {sleep_time} seconds before next request...")
            time.sleep(sleep_time)
    
    # Generate summary
    universities_with_partners = sum(1 for r in results if r.get('partners'))
    
    logger.info("\n" + "=" * 60)
    logger.info("HARVEST SUMMARY")
    logger.info("=" * 60)
    logger.info(f"Total universities processed: {len(results)}")
    logger.info(f"Universities with partners: {universities_with_partners}")
    logger.info(f"Total partners harvested: {total_partners}")
    logger.info(f"Average partners per university: {total_partners / len(results):.1f}" if results else "N/A")
    logger.info("=" * 60)
    
    # Save results
    save_results(results, OUTPUT_FILE)
    
    logger.info("\n✅ Harvest complete!")
    logger.info(f"📁 Results saved to: {OUTPUT_FILE}")
    if ERROR_LOG.exists() and ERROR_LOG.stat().st_size > 0:
        logger.info(f"⚠️  Errors logged to: {ERROR_LOG}")
    else:
        logger.info("✅ No errors encountered!")

if __name__ == '__main__':
    main()

