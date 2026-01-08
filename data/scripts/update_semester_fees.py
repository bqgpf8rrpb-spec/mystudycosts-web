#!/usr/bin/env python3
"""
Update semester fees in university_programs.json for 2026.

This script:
1. Loads university_programs.json
2. Sets 2026 semester fees for top universities/cities
3. Sets default 300.00 for other universities with low/placeholder values
4. Saves the updated file
"""

import json
import os
from pathlib import Path

# Define base directory (script is in data/scripts/)
BASE_DIR = Path(__file__).parent.parent.parent
PROGRAMS_FILE = BASE_DIR / "data" / "university_programs.json"

# Exact semester fees for specific universities (highest priority)
EXACT_FEES = {
    "Technical University of Berlin (TU Berlin)": 307.92,
    "Berlin University of Applied Sciences (HTW Berlin)": 298.50,
    "Ludwig Maximilian University of Munich (LMU)": 176.40,
    "Technical University of Munich (TUM)": 182.00,
    "University of Cologne": 318.75,
    "Cologne University of Applied Sciences": 305.20,
}

# City-based matching for top cities (fallback when no exact match)
CITY_FEES = {
    "Berlin": 310.00,  # City standard for Berlin universities
    "Munich": 180.00,  # City standard for Munich universities
    "München": 180.00,
    "Cologne": 312.00,  # City standard for Cologne universities
    "Köln": 312.00,
    "Frankfurt": 395.00,
    "Hamburg": 335.00,
    "Aachen": 310.00,
    "Leipzig": 285.00,
}

# City keywords for matching
CITY_KEYWORDS = {
    "Berlin": ["Berlin", "Freie Universität", "Free University", "Humboldt", "Technical University of Berlin", "TU Berlin", "Charité", "Berlin School"],
    "Munich": ["Munich", "München", "LMU", "TUM", "Technical University of Munich", "Ludwig Maximilian"],
    "Cologne": ["Cologne", "Köln", "University of Cologne", "TH Köln"],
    "Frankfurt": ["Frankfurt", "Goethe", "FRA-UAS"],
    "Hamburg": ["Hamburg", "HAW Hamburg", "Hamburg University"],
    "Aachen": ["Aachen", "RWTH"],
    "Leipzig": ["Leipzig", "University of Leipzig", "HTWK Leipzig"],
}

# Default semester fee for other universities with low/placeholder values
DEFAULT_SEMESTER_FEE = 300.00
LOW_FEE_THRESHOLD = 100.00  # Consider fees < 100.00 as placeholders


def normalize_university_name(name: str) -> str:
    """Normalize university name for matching."""
    return name.strip()


def get_city_for_university(name: str) -> str:
    """Get city name for a university based on keywords."""
    name_lower = name.lower()
    for city, keywords in CITY_KEYWORDS.items():
        if any(keyword.lower() in name_lower for keyword in keywords):
            return city
    return None


def get_semester_fee_for_university(university_name: str, current_fee: float = None) -> tuple[float, str]:
    """
    Get semester fee for a university.
    
    Priority:
    A. Exact university name match (EXACT_FEES)
    B. City-based match (CITY_FEES)
    C. Default fee (300.00)
    
    Returns:
        Tuple of (fee, mapping_type) where mapping_type is:
        - "exact" for exact matches
        - "city" for city-based matches
        - "default" for default fee
    """
    normalized_name = normalize_university_name(university_name)
    
    # Step A: Check exact match in EXACT_FEES
    if normalized_name in EXACT_FEES:
        return (EXACT_FEES[normalized_name], "exact")
    
    # Step B: Check city-based matching
    city = get_city_for_university(normalized_name)
    if city and city in CITY_FEES:
        return (CITY_FEES[city], "city")
    
    # Step C: Use default for all others
    return (DEFAULT_SEMESTER_FEE, "default")


def update_semester_fees():
    """Update semester fees in university_programs.json."""
    print("="*70)
    print("UPDATING SEMESTER FEES FOR 2026")
    print("="*70)
    print()
    
    # Load data
    if not PROGRAMS_FILE.exists():
        print(f"❌ Error: File not found: {PROGRAMS_FILE}")
        return False
    
    print(f"📖 Loading: {PROGRAMS_FILE}")
    with open(PROGRAMS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"✅ Loaded {len(data)} universities")
    print()
    
    # Statistics
    stats = {
        'exact': 0,      # Exact university name matches
        'city': 0,       # City-based matches
        'default': 0,    # Default fee applied
        'total_programs': 0,
    }
    
    # Process each university
    for university_name, programs in data.items():
        if not isinstance(programs, list):
            continue
        
        # Skip if no programs
        if not programs:
            continue
        
        # Determine new fee and mapping type
        new_fee, mapping_type = get_semester_fee_for_university(university_name)
        
        # Track statistics
        stats[mapping_type] += 1
        
        # Set update type label for logging
        if mapping_type == "exact":
            update_type = "EXACT"
        elif mapping_type == "city":
            city = get_city_for_university(normalize_university_name(university_name))
            update_type = city.upper() if city else "CITY"
        else:
            update_type = "DEFAULT"
        
        # Update all programs for this university
        programs_updated = 0
        for i, program in enumerate(programs):
            if isinstance(program, dict):
                program['semester_fee'] = new_fee
                programs_updated += 1
                stats['total_programs'] += 1
            elif isinstance(program, str):
                # Convert string program to dict
                programs[i] = {
                    'name': program,
                    'semester_fee': new_fee
                }
                programs_updated += 1
                stats['total_programs'] += 1
        
        # Log all updates (show first 30 and all exact matches)
        if stats[mapping_type] <= 3 or mapping_type == "exact" or programs_updated > 0:
            print(f"  {update_type:10} | {university_name[:50]:50} | {new_fee:6.2f} € ({programs_updated} programs)")
    
    print()
    print("="*70)
    print("STATISTICS")
    print("="*70)
    print(f"  Exact Matches (EXACT_FEES):    {stats['exact']}")
    print(f"  City-Based Matches (CITY_FEES): {stats['city']}")
    print(f"  Default Fee Applied:           {stats['default']}")
    print(f"  Total Programs Updated:        {stats['total_programs']}")
    print()
    
    # Save updated data
    print(f"💾 Saving: {PROGRAMS_FILE}")
    with open(PROGRAMS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("✅ Successfully updated semester fees!")
    print()
    return True


if __name__ == "__main__":
    try:
        success = update_semester_fees()
        exit(0 if success else 1)
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

