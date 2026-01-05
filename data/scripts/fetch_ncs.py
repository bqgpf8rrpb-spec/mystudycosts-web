#!/usr/bin/env python3
"""
Automated NC (Numerus Clausus) Data Update Script

This script fetches the latest NC thresholds from various sources and updates
the university_programs.json file. It includes error handling and diff checking
to avoid unnecessary commits.
"""

import json
import os
import sys
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import requests
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
DATA_FILE = PROJECT_ROOT / 'data' / 'university_programs.json'
BACKUP_FILE = PROJECT_ROOT / 'data' / 'university_programs.json.backup'

# API endpoints and sources (placeholder - replace with actual sources)
NC_DATA_SOURCES = {
    'hochschulkompass': 'https://www.hochschulkompass.de/api/v1/nc-data',  # Placeholder
    # Add more sources as needed
}

def load_current_data() -> Dict:
    """Load the current university_programs.json file."""
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error(f"Data file not found: {DATA_FILE}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in data file: {e}")
        sys.exit(1)

def save_backup(data: Dict) -> None:
    """Create a backup of the current data file."""
    try:
        with open(BACKUP_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        logger.info(f"Backup created: {BACKUP_FILE}")
    except Exception as e:
        logger.warning(f"Failed to create backup: {e}")

def save_data(data: Dict) -> None:
    """Save the updated data to university_programs.json."""
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        logger.info(f"Data saved to {DATA_FILE}")
    except Exception as e:
        logger.error(f"Failed to save data: {e}")
        sys.exit(1)

def fetch_nc_from_api(university_name: str, program_name: str) -> Optional[float]:
    """
    Fetch NC threshold from an external API.
    
    This is a placeholder implementation. Replace with actual API calls
    to Hochschulkompass, university websites, or other data sources.
    
    Args:
        university_name: Name of the university
        program_name: Name of the study program
        
    Returns:
        NC threshold as float, or None if not found/error
    """
    try:
        # Placeholder: In a real implementation, you would:
        # 1. Query Hochschulkompass API
        # 2. Scrape university websites
        # 3. Use other data sources
        
        # Example API call (commented out - replace with actual endpoint):
        # response = requests.get(
        #     NC_DATA_SOURCES['hochschulkompass'],
        #     params={'university': university_name, 'program': program_name},
        #     timeout=10
        # )
        # if response.status_code == 200:
        #     data = response.json()
        #     return float(data.get('nc_threshold', 0.0))
        
        # For now, return None to indicate no update available
        return None
        
    except requests.RequestException as e:
        logger.warning(f"API request failed for {university_name} - {program_name}: {e}")
        return None
    except Exception as e:
        logger.warning(f"Error fetching NC for {university_name} - {program_name}: {e}")
        return None

def update_program_nc(
    program: Dict,
    university_name: str,
    program_name: str,
    update_count: Dict[str, int]
) -> Tuple[Dict, bool]:
    """
    Update NC threshold for a single program.
    
    Args:
        program: Program object (can be string or StudyProgram dict)
        university_name: Name of the university
        program_name: Name of the program
        update_count: Counter dict for tracking updates
        
    Returns:
        Tuple of (updated_program, was_updated)
    """
    # Handle string format (old format)
    if isinstance(program, str):
        # Convert to object format
        program_obj = {
            'name': program,
            'nc_threshold': 0.0,
            'waiting_semesters': 0
        }
    else:
        # Already in object format
        program_obj = program.copy()
    
    # Fetch new NC data
    new_nc = fetch_nc_from_api(university_name, program_name)
    
    if new_nc is not None:
        old_nc = program_obj.get('nc_threshold', 0.0)
        if new_nc != old_nc:
            program_obj['nc_threshold'] = new_nc
            update_count['updated'] += 1
            logger.info(f"Updated {university_name} - {program_name}: {old_nc} -> {new_nc}")
            return program_obj, True
        else:
            update_count['unchanged'] += 1
    else:
        update_count['no_data'] += 1
    
    return program_obj, False

def update_university_programs(data: Dict) -> Tuple[Dict, Dict[str, int]]:
    """
    Update NC thresholds for all programs in the data.
    
    Args:
        data: Current university_programs.json data
        
    Returns:
        Tuple of (updated_data, update_stats)
    """
    update_stats = {
        'updated': 0,
        'unchanged': 0,
        'no_data': 0,
        'errors': 0
    }
    
    updated_data = {}
    total_universities = len(data)
    
    for idx, (university_name, programs) in enumerate(data.items(), 1):
        try:
            logger.info(f"Processing {university_name} ({idx}/{total_universities})...")
            
            updated_programs = []
            for program in programs:
                try:
                    # Get program name
                    if isinstance(program, str):
                        program_name = program
                    else:
                        program_name = program.get('name', '')
                    
                    if not program_name:
                        logger.warning(f"Skipping program with no name in {university_name}")
                        updated_programs.append(program)
                        continue
                    
                    # Update NC
                    updated_program, was_updated = update_program_nc(
                        program,
                        university_name,
                        program_name,
                        update_stats
                    )
                    updated_programs.append(updated_program)
                    
                except Exception as e:
                    logger.error(f"Error updating program in {university_name}: {e}")
                    update_stats['errors'] += 1
                    # Keep original program on error
                    updated_programs.append(program)
            
            updated_data[university_name] = updated_programs
            
        except Exception as e:
            logger.error(f"Error processing {university_name}: {e}")
            update_stats['errors'] += 1
            # Keep original data on error
            updated_data[university_name] = programs
            continue
    
    return updated_data, update_stats

def data_has_changes(old_data: Dict, new_data: Dict) -> bool:
    """
    Check if the data has actually changed.
    
    Args:
        old_data: Original data
        new_data: Updated data
        
    Returns:
        True if data has changed, False otherwise
    """
    # Simple comparison - in production, you might want a more sophisticated diff
    return json.dumps(old_data, sort_keys=True) != json.dumps(new_data, sort_keys=True)

def main():
    """Main execution function."""
    logger.info("=" * 60)
    logger.info("NC Data Update Script Started")
    logger.info(f"Timestamp: {datetime.now().isoformat()}")
    logger.info("=" * 60)
    
    # Load current data
    logger.info("Loading current data...")
    current_data = load_current_data()
    logger.info(f"Loaded {len(current_data)} universities")
    
    # Create backup
    logger.info("Creating backup...")
    save_backup(current_data)
    
    # Update NC data
    logger.info("Updating NC thresholds...")
    updated_data, stats = update_university_programs(current_data)
    
    # Log statistics
    logger.info("=" * 60)
    logger.info("Update Statistics:")
    logger.info(f"  Updated: {stats['updated']}")
    logger.info(f"  Unchanged: {stats['unchanged']}")
    logger.info(f"  No data available: {stats['no_data']}")
    logger.info(f"  Errors: {stats['errors']}")
    logger.info("=" * 60)
    
    # Check if data has changed
    if data_has_changes(current_data, updated_data):
        logger.info("✅ Changes detected - saving updated data...")
        save_data(updated_data)
        logger.info("✅ Update complete - changes will be committed")
        sys.exit(0)
    else:
        logger.info("ℹ️  No changes detected - skipping save")
        logger.info("ℹ️  No commit will be made")
        sys.exit(0)

if __name__ == '__main__':
    main()

