#!/usr/bin/env python3
"""
Database Deduplication Script

This script identifies and merges duplicate university entries in the
university_programs_universal.json database. Duplicates are detected based on
fuzzy name matching (e.g., different spacing, slight variations).

Features:
- Fuzzy matching for university names
- Merges program lists from duplicates
- Removes duplicate programs within merged entries
- Preserves all partners for each program
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Tuple
from difflib import SequenceMatcher
from collections import OrderedDict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
INPUT_FILE = PROJECT_ROOT / 'data' / 'university_programs_universal.json'
OUTPUT_FILE = PROJECT_ROOT / 'data' / 'university_programs_universal.json'

# Similarity threshold for considering two names as duplicates
# Higher threshold = more strict (fewer false positives)
SIMILARITY_THRESHOLD = 0.92

def normalize_name(name: str) -> str:
    """
    Normalize a university name for comparison.
    
    Args:
        name: University name to normalize
        
    Returns:
        Normalized name (lowercase, stripped, multiple spaces collapsed)
    """
    if not name:
        return ""
    
    # Convert to lowercase
    normalized = name.lower().strip()
    
    # Collapse multiple spaces into single space
    import re
    normalized = re.sub(r'\s+', ' ', normalized)
    
    return normalized

def calculate_similarity(name1: str, name2: str) -> float:
    """
    Calculate similarity score between two university names.
    
    Args:
        name1: First university name
        name2: Second university name
        
    Returns:
        Similarity score (0.0 to 1.0)
    """
    # Normalize names
    norm1 = normalize_name(name1)
    norm2 = normalize_name(name2)
    
    # Check exact match
    if norm1 == norm2:
        return 1.0
    
    # Check if one contains the other
    if norm1 in norm2 or norm2 in norm1:
        return 0.95
    
    # Use SequenceMatcher for fuzzy matching
    similarity = SequenceMatcher(None, norm1, norm2).ratio()
    
    return similarity

def find_duplicate_groups(university_names: List[str]) -> Dict[str, List[str]]:
    """
    Find groups of duplicate university names using fuzzy matching.
    
    Args:
        university_names: List of all university names
        
    Returns:
        Dictionary mapping canonical name to list of all duplicate names in the group
    """
    groups = {}  # canonical_name -> list of all names in group
    name_to_canonical = {}  # name -> canonical_name
    processed = set()
    
    for i, name1 in enumerate(university_names):
        if name1 in processed:
            continue
        
        # Find all names similar to name1
        similar_names = [name1]
        
        for name2 in university_names[i+1:]:
            if name2 in processed:
                continue
            
            similarity = calculate_similarity(name1, name2)
            
            if similarity >= SIMILARITY_THRESHOLD:
                similar_names.append(name2)
                processed.add(name2)
        
        # Mark all similar names as processed
        processed.add(name1)
        
        # If we found duplicates, create a group
        if len(similar_names) > 1:
            # Choose canonical name: shortest, or lexicographically first if same length
            canonical_name = min(similar_names, key=lambda x: (len(x), x))
            
            # If canonical_name already exists in another group, resolve conflict
            if canonical_name in name_to_canonical:
                # Find the true canonical name for the conflict
                true_canonical = name_to_canonical[canonical_name]
                # Merge this group into existing group
                groups[true_canonical].extend(similar_names)
                for name in similar_names:
                    name_to_canonical[name] = true_canonical
            else:
                # Create new group
                groups[canonical_name] = similar_names
                for name in similar_names:
                    name_to_canonical[name] = canonical_name
    
    return name_to_canonical

def merge_programs(programs1: List, programs2: List) -> List:
    """
    Merge two program lists, avoiding duplicates.
    
    Args:
        programs1: First program list
        programs2: Second program list
        
    Returns:
        Merged program list without duplicates
    """
    # Convert programs to dictionaries if they are strings
    def normalize_program(prog):
        if isinstance(prog, str):
            return {'name': prog, 'erasmusPartners': []}
        return prog.copy() if isinstance(prog, dict) else prog
    
    programs1_normalized = [normalize_program(p) for p in programs1]
    programs2_normalized = [normalize_program(p) for p in programs2]
    
    # Create a map of programs by name
    merged_map = {}
    
    # Add programs from first list
    for prog in programs1_normalized:
        prog_name = prog.get('name', '')
        if prog_name:
            merged_map[prog_name] = prog
    
    # Merge programs from second list
    for prog in programs2_normalized:
        prog_name = prog.get('name', '')
        if not prog_name:
            continue
        
        if prog_name in merged_map:
            # Merge partners if program already exists
            existing_partners = merged_map[prog_name].get('erasmusPartners', [])
            new_partners = prog.get('erasmusPartners', [])
            
            # Create a set of partner keys (name + city) to avoid duplicates
            existing_keys = {(p.get('name', ''), p.get('city', '')) for p in existing_partners}
            
            for partner in new_partners:
                partner_key = (partner.get('name', ''), partner.get('city', ''))
                if partner_key not in existing_keys:
                    existing_partners.append(partner)
                    existing_keys.add(partner_key)
            
            merged_map[prog_name]['erasmusPartners'] = existing_partners
        else:
            # Add new program
            merged_map[prog_name] = prog
    
    return list(merged_map.values())

def deduplicate_database(data: Dict) -> Tuple[Dict, Dict]:
    """
    Deduplicate university entries in the database.
    
    Args:
        data: Dictionary with university names as keys and programs as values
        
    Returns:
        Tuple of (deduplicated_data, merge_info)
    """
    university_names = list(data.keys())
    logger.info(f"Total universities in database: {len(university_names)}")
    
    # Find duplicates
    logger.info("\nSearching for duplicate university names...")
    name_to_canonical = find_duplicate_groups(university_names)
    
    if not name_to_canonical:
        logger.info("✅ No duplicates found!")
        return data, {}
    
    logger.info(f"\nFound {len(name_to_canonical)} duplicate entries to merge")
    
    # Build merge info: canonical_name -> list of merged names
    canonical_names = set(name_to_canonical.values())
    merge_info = {canonical: [canonical] for canonical in canonical_names}
    
    for name, canonical in name_to_canonical.items():
        if name != canonical:
            merge_info[canonical].append(name)
            logger.info(f"  Duplicate found: '{name}' → '{canonical}'")
    
    # Create mapping: canonical_name -> merged programs
    canonical_programs = {}
    
    # Process all universities
    processed = set()
    
    for uni_name in university_names:
        if uni_name in processed:
            continue
        
        if uni_name in name_to_canonical:
            canonical_name = name_to_canonical[uni_name]
            
            if canonical_name not in canonical_programs:
                # Initialize with canonical name's programs
                canonical_programs[canonical_name] = data.get(canonical_name, [])
                processed.add(canonical_name)
            
            # Merge programs from this name into canonical
            if uni_name in data:
                canonical_programs[canonical_name] = merge_programs(
                    canonical_programs[canonical_name],
                    data[uni_name]
                )
            processed.add(uni_name)
        else:
            # This is not a duplicate
            canonical_programs[uni_name] = data[uni_name]
            processed.add(uni_name)
    
    return canonical_programs, merge_info

def main():
    """Main execution function."""
    logger.info("=" * 60)
    logger.info("Database Deduplication Script")
    logger.info("=" * 60)
    
    # Load data
    logger.info(f"Loading database from: {INPUT_FILE}")
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        logger.info(f"✅ Loaded {len(data)} universities")
    except Exception as e:
        logger.error(f"❌ Failed to load database: {e}")
        return
    
    # Count programs before
    total_programs_before = sum(len(programs) for programs in data.values())
    total_partners_before = sum(
        len(prog.get('erasmusPartners', []))
        for programs in data.values()
        for prog in programs
        if isinstance(prog, dict)
    )
    
    # Deduplicate
    logger.info("\nStarting deduplication process...")
    deduplicated_data, merge_info = deduplicate_database(data)
    
    # Count programs after
    total_programs_after = sum(len(programs) for programs in deduplicated_data.values())
    total_partners_after = sum(
        len(prog.get('erasmusPartners', []))
        for programs in deduplicated_data.values()
        for prog in programs
        if isinstance(prog, dict)
    )
    
    # Print merge info
    if merge_info:
        logger.info("\n" + "=" * 60)
        logger.info("MERGE SUMMARY")
        logger.info("=" * 60)
        for canonical_name, merged_names in merge_info.items():
            if len(merged_names) > 1:
                logger.info(f"\nCanonical: '{canonical_name}'")
                logger.info(f"  Merged {len(merged_names) - 1} duplicate(s):")
                for dup_name in merged_names[1:]:
                    logger.info(f"    - '{dup_name}'")
    
    # Save deduplicated data
    logger.info(f"\nSaving deduplicated database to: {OUTPUT_FILE}")
    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(deduplicated_data, f, indent=2, ensure_ascii=False)
        logger.info(f"✅ Saved deduplicated database")
    except Exception as e:
        logger.error(f"❌ Failed to save database: {e}")
        return
    
    # Print statistics
    logger.info("\n" + "=" * 60)
    logger.info("STATISTICS")
    logger.info("=" * 60)
    logger.info(f"Universities before: {len(data)}")
    logger.info(f"Universities after:  {len(deduplicated_data)}")
    logger.info(f"Removed:            {len(data) - len(deduplicated_data)} duplicate entries")
    logger.info(f"\nPrograms before:    {total_programs_before}")
    logger.info(f"Programs after:     {total_programs_after}")
    logger.info(f"\nPartners before:    {total_partners_before}")
    logger.info(f"Partners after:     {total_partners_after}")
    logger.info("=" * 60)

if __name__ == '__main__':
    main()

