#!/usr/bin/env python3
"""
Mobility Online Partner Harvester using Playwright

This script harvests Erasmus partner data from universities using Mobility Online
or similar exchange databases. It uses Playwright to handle JavaScript-rendered
content that regular HTTP requests cannot access.

Features:
- JavaScript rendering with Playwright
- Automatic detection of partner tables
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
from datetime import datetime

try:
    from playwright.sync_api import sync_playwright, Browser, Page, TimeoutError as PlaywrightTimeoutError
except ImportError:
    print("ERROR: Playwright is not installed.")
    print("Please install it with: pip install playwright")
    print("Then install browsers with: playwright install chromium")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('harvest_playwright_errors.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
OUTPUT_FILE = PROJECT_ROOT / 'data' / 'batch1_erasmus_data.json'
ERROR_LOG = SCRIPT_DIR / 'harvest_playwright_errors.txt'

# Configuration
HEADLESS = False  # Always visible for human-in-the-loop interaction
TIMEOUT = 60000  # 60 seconds timeout to allow for manual interaction
RATE_LIMIT_MIN = 3
RATE_LIMIT_MAX = 5

# Subject filters (for filtering if possible)
SUBJECT_FILTERS = ['Business', 'Management', 'Economics', 'Wirtschaft', 'BWL', 'VWL', 'Betriebswirtschaft']

# Batch 3 universities
UNIVERSITIES_BATCH_1 = [
    {"name": "Uni Göttingen", "url": "https://uni-goettingen.moveon4.de/publisher/1/deu"},
    {"name": "Uni Hannover (Leibniz)", "url": "https://uni-hannover.moveon4.de/publisher/1/deu"},
    {"name": "Uni Bremen", "url": "https://www.uni-bremen.de/studium/starten-studieren/studium-international/auslandsstudium/partnerhochschulen"},
    {"name": "Uni Kiel (CAU)", "url": "https://www.international.uni-kiel.de/de/studium-im-ausland/erasmus-studium/partnerhochschulen"},
    {"name": "Uni Marburg", "url": "https://marburg.moveon4.de/publisher/1/deu"},
    {"name": "Uni Gießen (JLU)", "url": "https://jlu.moveon4.de/publisher/1/deu"},
    {"name": "TU Braunschweig", "url": "https://tu-braunschweig.moveon4.de/publisher/1/deu"},
    {"name": "Uni Halle-Wittenberg", "url": "https://halle.moveon4.de/publisher/1/deu"},
    {"name": "Uni Jena", "url": "https://uni-jena.moveon4.de/publisher/1/deu"},
    {"name": "TU Chemnitz", "url": "https://www.tu-chemnitz.de/international/outgoing/partner/index.php"}
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

def is_moveon_publisher_url(url: str) -> bool:
    """Check if URL is a MoveON Publisher link."""
    return 'moveon4.de' in url or 'moveon' in url.lower()

def wait_for_table(page: Page, timeout: int = 10000) -> bool:
    """
    Wait for a table to appear on the page.
    
    Args:
        page: Playwright page object
        timeout: Timeout in milliseconds
        
    Returns:
        True if table found, False otherwise
    """
    try:
        # Wait for any table element
        page.wait_for_selector('table', timeout=timeout)
        return True
    except PlaywrightTimeoutError:
        # Try waiting for tbody (some tables might be dynamically created)
        try:
            page.wait_for_selector('tbody', timeout=5000)
            return True
        except PlaywrightTimeoutError:
            return False

def extract_partners_from_table_html(html: str) -> List[Dict]:
    """
    Extract partner information from HTML table string.
    
    Args:
        html: HTML string containing table
        
    Returns:
        List of partner dictionaries
    """
    from bs4 import BeautifulSoup
    
    partners = []
    soup = BeautifulSoup(html, 'html.parser')
    tables = soup.find_all('table')
    
    for table in tables:
        rows = table.find_all('tr')
        if len(rows) < 2:  # Need at least header + one data row
            continue
        
        # Try to identify column headers
        header_row = rows[0]
        headers = [th.get_text(strip=True).lower() for th in header_row.find_all(['th', 'td'])]
        
        # Map common header patterns to field names
        name_col = None
        city_col = None
        country_col = None
        subject_area_col = None
        
        for idx, header in enumerate(headers):
            header_lower = header.lower()
            if any(word in header_lower for word in ['university', 'universität', 'partner', 'name', 'institution', 'hochschule']):
                name_col = idx
            elif any(word in header_lower for word in ['city', 'stadt', 'ort', 'location']):
                city_col = idx
            elif any(word in header_lower for word in ['country', 'land', 'staat', 'nation']):
                country_col = idx
            elif any(word in header_lower for word in ['subject', 'fach', 'field', 'studium', 'program', 'fachbereich', 'fachgebiet', 'department', 'abteilung', 'isced', 'area', 'bereich']):
                subject_area_col = idx
        
        # If we couldn't identify columns, try positional (common patterns)
        if name_col is None:
            name_col = 0  # First column often has name
        if city_col is None and len(headers) > 1:
            city_col = 1
        if country_col is None and len(headers) > 2:
            country_col = 2
        if subject_area_col is None and len(headers) > 3:
            subject_area_col = 3  # Often the 4th column
        
        # Extract data rows
        for row in rows[1:]:
            cells = row.find_all(['td', 'th'])
            if len(cells) < 2:
                continue
            
            # Extract values
            name = cells[name_col].get_text(strip=True) if name_col is not None and name_col < len(cells) else ""
            city = cells[city_col].get_text(strip=True) if city_col is not None and city_col < len(cells) else ""
            country = cells[country_col].get_text(strip=True) if country_col is not None and country_col < len(cells) else ""
            subject_area = cells[subject_area_col].get_text(strip=True) if subject_area_col is not None and subject_area_col < len(cells) else "General/Unknown"
            
            # Validate and clean
            if name and len(name) > 3:
                # Filter out navigation items and invalid entries
                invalid_patterns = [
                    r'^(suche|search|navigation|menü|menu|finanzierung|adressen)$',
                    r'^\d+\s*(km|eur|€)',
                    r'^(über|about|organisation|behörde)',
                ]
                
                is_invalid = any(re.match(pattern, name.lower()) for pattern in invalid_patterns)
                
                if not is_invalid:
                    # Clean up name (remove extra whitespace, newlines)
                    name = ' '.join(name.split())
                    city = ' '.join(city.split())
                    country = ' '.join(country.split())
                    subject = ' '.join(subject.split())
                    
                    # Additional validation: name should look like a university
                    if any(word in name.lower() for word in ['university', 'universität', 'uni', 'college', 'hochschule', 'institut']) or len(name) > 10:
                        # Clean and validate subject_area
                        if not subject_area or subject_area.strip() == "":
                            subject_area = "General/Unknown"
                        else:
                            subject_area = ' '.join(subject_area.split())
                        
                        partners.append({
                            "name": name,
                            "city": city,
                            "country": country,
                            "subject_area": subject_area
                        })
    
    return partners

def extract_partners_from_page(page: Page) -> List[Dict]:
    """
    Extract partner university information from a Playwright page.
    Extracts ALL subjects/fields, not filtered.
    
    Args:
        page: Playwright page object
        
    Returns:
        List of partner dictionaries with subject_area field
    """
    partners = []
    
    try:
        # Wait for content to load
        page.wait_for_load_state('networkidle', timeout=TIMEOUT)
        
        # Wait for table if possible
        wait_for_table(page, timeout=10000)
        
        # HUMAN-IN-THE-LOOP: Pause for manual interaction
        logger.info("\n" + "="*60)
        logger.info("⏸️  PAUSE: Please manually interact with the page:")
        logger.info("   ⚠️  IMPORTANT: Select 'ALL DEPARTMENTS' in the dropdown")
        logger.info("   ⚠️  IMPORTANT: Ensure the 'SUBJECT' / 'FACH' column is visible")
        logger.info("   - Click 'Show All' or 'Next Page' to load all results")
        logger.info("   - Scroll to ensure all data is visible")
        logger.info("="*60)
        logger.info("Press Enter in the terminal when you're ready to extract data...")
        
        # Use both page.pause() and input() for maximum compatibility
        try:
            page.pause()  # Opens Playwright Inspector if available
        except Exception:
            pass  # page.pause() might not work in all contexts
        
        input()  # Wait for user to press Enter
        
        logger.info("✅ Resuming extraction...")
        
        # Wait a moment for any final rendering
        time.sleep(2)
        
        # Get page HTML after user interaction
        html = page.content()
        
        # Extract from tables
        table_partners = extract_partners_from_table_html(html)
        partners.extend(table_partners)
        
        # If no table partners, try to extract from lists or divs
        if not partners:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html, 'html.parser')
            
            # Look for structured lists
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
                            if name and len(name) > 3 and any(word in name.lower() for word in ['university', 'universität', 'uni', 'college', 'hochschule']):
                                subject_area = parts[3] if len(parts) > 3 else "General/Unknown"
                                if not subject_area or subject_area.strip() == "":
                                    subject_area = "General/Unknown"
                                
                                partners.append({
                                    "name": name,
                                    "city": parts[1] if len(parts) > 1 else "",
                                    "country": parts[2] if len(parts) > 2 else "",
                                    "subject_area": subject_area
                                })
        
        # No filtering - we want ALL subjects
        
    except PlaywrightTimeoutError as e:
        logger.warning(f"Timeout waiting for page content: {e}")
    except Exception as e:
        logger.warning(f"Error extracting partners from page: {e}")
    
    return partners

def handle_moveon_publisher(page: Page, url: str) -> List[Dict]:
    """
    Special handling for MoveON Publisher pages.
    
    Args:
        page: Playwright page object
        url: Original URL
        
    Returns:
        List of partner dictionaries
    """
    partners = []
    
    try:
        logger.info("Handling MoveON Publisher page...")
        
        # Wait for page to load
        page.wait_for_load_state('networkidle', timeout=TIMEOUT)
        
        # Wait a bit more for JavaScript to render
        time.sleep(3)
        
        # Look for iframes that might contain the partner database
        iframes = page.query_selector_all('iframe')
        target_frame = None
        
        for iframe in iframes:
            try:
                iframe_src = iframe.get_attribute('src')
                if iframe_src and ('moveon' in iframe_src.lower() or 'publisher' in iframe_src.lower()):
                    logger.info(f"Found MoveON iframe: {iframe_src}")
                    # Try to access iframe content (may require same-origin)
                    frame = iframe.content_frame()
                    if frame:
                        target_frame = frame
                        frame.wait_for_load_state('networkidle', timeout=TIMEOUT)
                        time.sleep(2)
                        break
            except Exception as e:
                logger.debug(f"Could not access iframe: {e}")
        
        # Extract from iframe if found, otherwise from main page
        if target_frame:
            partners.extend(extract_partners_from_page(target_frame))
        else:
            partners.extend(extract_partners_from_page(page))
        
    except Exception as e:
        logger.warning(f"Error handling MoveON Publisher: {e}")
    
    return partners

def harvest_university(page: Page, university: Dict) -> Dict:
    """
    Harvest Erasmus partners for a single university.
    
    Args:
        page: Playwright page object
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
        # Navigate to page
        logger.info(f"Navigating to {url}...")
        page.goto(url, wait_until='domcontentloaded', timeout=TIMEOUT)
        
        # Handle MoveON Publisher pages specially
        if is_moveon_publisher_url(url):
            partners = handle_moveon_publisher(page, url)
        else:
            # Regular page extraction
            partners = extract_partners_from_page(page)
        
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
        
    except PlaywrightTimeoutError as e:
        error_msg = f"Timeout loading page: {str(e)}"
        log_error(name, url, error_msg)
        logger.error(f"❌ Timeout harvesting {name}: {e}")
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
    logger.info("Mobility Online Partner Harvester - Batch 1 (Playwright)")
    logger.info("Semi-Automated Mode: Human-in-the-Loop")
    logger.info(f"Timestamp: {datetime.now().isoformat()}")
    logger.info(f"Headless mode: {HEADLESS} (Browser will be visible)")
    logger.info("=" * 60)
    logger.info("📋 Instructions:")
    logger.info("   1. The browser will open for each university")
    logger.info("   2. Wait for the page to load completely")
    logger.info("   3. ⚠️  IMPORTANT: Select 'ALL DEPARTMENTS' in any dropdown")
    logger.info("   4. ⚠️  IMPORTANT: Ensure the 'SUBJECT' / 'FACH' column is visible")
    logger.info("   5. Manually click 'Show All' or 'Next Page' to load all results")
    logger.info("   6. Scroll to ensure all data is visible")
    logger.info("   7. Press Enter in the terminal when ready to extract")
    logger.info("   8. The script will extract ALL visible data with subject areas")
    logger.info("=" * 60)
    
    results = []
    total_partners = 0
    
    with sync_playwright() as p:
        # Launch browser
        logger.info("Launching browser...")
        browser = p.chromium.launch(headless=HEADLESS)
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1920, 'height': 1080}
        )
        page = context.new_page()
        
        try:
            for idx, university in enumerate(UNIVERSITIES_BATCH_1, 1):
                logger.info(f"\n[{idx}/{len(UNIVERSITIES_BATCH_1)}] Processing {university['name']}...")
                
                result = harvest_university(page, university)
                results.append(result)
                total_partners += len(result.get('partners', []))
                
                # Rate limiting (except for last university)
                if idx < len(UNIVERSITIES_BATCH_1):
                    sleep_time = RATE_LIMIT_MIN + (idx % (RATE_LIMIT_MAX - RATE_LIMIT_MIN + 1))
                    logger.info(f"Sleeping {sleep_time} seconds before next request...")
                    time.sleep(sleep_time)
        
        finally:
            browser.close()
    
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

