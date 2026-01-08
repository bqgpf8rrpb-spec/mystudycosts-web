#!/usr/bin/env python3
"""
Update monthly rent estimates in university_programs.json.

This script:
1. Loads university_programs.json
2. Adds monthly_rent_estimate field to each program based on city in university name
3. Saves the updated file
"""

import json
from pathlib import Path

# Define base directory (script is in data/scripts/)
BASE_DIR = Path(__file__).parent.parent.parent
PROGRAMS_FILE = BASE_DIR / "data" / "university_programs.json"

# Monthly rent estimates by city for 2026 (Warmmiete estimates)
CITY_RENT_ESTIMATES = {
    # 780.0 €
    "München": 780.0,
    "Munich": 780.0,
    # 650.0 €
    "Berlin": 650.0,
    # 620.0 €
    "Frankfurt": 620.0,
    # 600.0 €
    "Hamburg": 600.0,
    # 580.0 €
    "Köln": 580.0,
    "Cologne": 580.0,
    "Düsseldorf": 580.0,
    "Dusseldorf": 580.0,
    "Stuttgart": 580.0,
    # 550.0 €
    "Heidelberg": 550.0,
    "Freiburg": 550.0,
    "Münster": 550.0,
    "Munster": 550.0,
    # 480.0 €
    "Aachen": 480.0,
    "Mainz": 480.0,
    "Darmstadt": 480.0,
    # 420.0 €
    "Leipzig": 420.0,
    "Bremen": 420.0,
    "Jena": 420.0,
    # 390.0 €
    "Dresden": 390.0,
    "Halle": 390.0,
    "Magdeburg": 390.0,
}

# Default rent estimate for cities not in the list
DEFAULT_RENT_ESTIMATE = 450.0


def get_city_for_university(university_name: str) -> str:
    """
    Extract city name from university name.
    
    Returns:
        City name if found, None otherwise
    """
    university_lower = university_name.lower()
    
    # Check each city in order (longer names first to avoid partial matches)
    cities_sorted = sorted(CITY_RENT_ESTIMATES.keys(), key=len, reverse=True)
    
    for city in cities_sorted:
        if city.lower() in university_lower:
            return city
    
    return None


def get_rent_estimate_for_university(university_name: str) -> float:
    """
    Get monthly rent estimate for a university based on city.
    
    Args:
        university_name: Name of the university
        
    Returns:
        Monthly rent estimate in euros
    """
    city = get_city_for_university(university_name)
    
    if city and city in CITY_RENT_ESTIMATES:
        return CITY_RENT_ESTIMATES[city]
    
    return DEFAULT_RENT_ESTIMATE


def update_rent_estimates():
    """Update monthly rent estimates in university_programs.json."""
    print("="*70)
    print("UPDATING MONTHLY RENT ESTIMATES")
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
        'by_city': {city: 0 for city in CITY_RENT_ESTIMATES.keys()},
        'by_rent_value': {},  # Group by rent value
        'default': 0,
        'total_programs': 0,
        'total_universities': 0,
    }
    
    # Process each university
    for university_name, programs in data.items():
        if not isinstance(programs, list):
            continue
        
        # Skip if no programs
        if not programs:
            continue
        
        stats['total_universities'] += 1
        
        # Get rent estimate for this university
        rent_estimate = get_rent_estimate_for_university(university_name)
        city = get_city_for_university(university_name)
        
        # Track statistics
        rent_key = f"{rent_estimate:.1f} €"
        if rent_key not in stats['by_rent_value']:
            stats['by_rent_value'][rent_key] = {'count': 0, 'cities': [], 'is_default': False}
        stats['by_rent_value'][rent_key]['count'] += 1
        
        if city and city in CITY_RENT_ESTIMATES:
            stats['by_city'][city] += 1
            # Add city if not already in list (avoid duplicates)
            if city not in stats['by_rent_value'][rent_key]['cities']:
                stats['by_rent_value'][rent_key]['cities'].append(city)
            update_type = city.upper()
        else:
            stats['default'] += 1
            stats['by_rent_value'][rent_key]['is_default'] = True
            update_type = "DEFAULT"
        
        # Update all programs for this university
        programs_updated = 0
        for i, program in enumerate(programs):
            if isinstance(program, dict):
                program['monthly_rent_estimate'] = rent_estimate
                programs_updated += 1
                stats['total_programs'] += 1
            elif isinstance(program, str):
                # Convert string program to dict
                programs[i] = {
                    'name': program,
                    'monthly_rent_estimate': rent_estimate
                }
                programs_updated += 1
                stats['total_programs'] += 1
        
        # Log updates (show first few and cities with many universities)
        if programs_updated > 0:
            if stats['total_universities'] <= 20 or (city and stats['by_city'][city] <= 3):
                print(f"  {update_type:10} | {university_name[:50]:50} | {rent_estimate:6.1f} € ({programs_updated} programs)")
    
    print()
    print("="*70)
    print("STATISTICS")
    print("="*70)
    print(f"  Total Universities Processed:  {stats['total_universities']}")
    print(f"  Total Programs Updated:        {stats['total_programs']}")
    print()
    print("  Universities by Rent Value (2026 Warmmiete):")
    # Sort by rent value (extract numeric value for sorting)
    for rent_value in sorted(stats['by_rent_value'].keys(), key=lambda x: float(x.replace(' €', '')), reverse=True):
        data = stats['by_rent_value'][rent_value]
        if data['cities']:
            cities_str = ', '.join(sorted(data['cities'])[:5])  # Show first 5 cities
            if len(data['cities']) > 5:
                cities_str += f" ... (+{len(data['cities']) - 5} more)"
            print(f"    {rent_value:8} ({data['count']:3} universities) - {cities_str}")
        else:
            print(f"    {rent_value:8} ({data['count']:3} universities) - Other cities (default)")
    print()
    
    # Save updated data
    print(f"💾 Saving: {PROGRAMS_FILE}")
    with open(PROGRAMS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("✅ Successfully updated monthly rent estimates!")
    print()
    return True


if __name__ == "__main__":
    try:
        success = update_rent_estimates()
        exit(0 if success else 1)
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

