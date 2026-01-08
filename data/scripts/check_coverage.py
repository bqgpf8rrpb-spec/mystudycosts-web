#!/usr/bin/env python3
"""
Utility script to check Erasmus partner coverage across universities.
Identifies "White Spot" universities with programs but no partners yet.
"""

import json
import sys
from pathlib import Path
from collections import defaultdict

# Path to the merged data file
DATA_FILE = Path(__file__).parent.parent / "university_programs_universal.json"

# Universities to ignore in statistics (no Erasmus participation)
IGNORE_KEYWORDS = [
    "öffentlichen Dienst",
    "öffentliche Verwaltung",
    "Finanzen",
    "Polizei",
    "Bundesagentur für Arbeit",
    "öffentlicher Dienst",
    "Verwaltung",
    "Finanzverwaltung",
    "Steuerverwaltung",
    "Polizeihochschule",
    "Polizeiführungsakademie"
]

def should_ignore_university(uni_name: str) -> bool:
    """
    Check if a university should be ignored in statistics.
    
    Args:
        uni_name: University name to check
        
    Returns:
        True if university should be ignored, False otherwise
    """
    uni_lower = uni_name.lower()
    return any(keyword.lower() in uni_lower for keyword in IGNORE_KEYWORDS)

def analyze_coverage():
    """Analyze Erasmus partner coverage across universities."""
    
    # Load the data
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: Could not find {DATA_FILE}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON in {DATA_FILE}: {e}")
        sys.exit(1)
    
    # Statistics
    universities_with_partners = set()
    universities_without_partners = defaultdict(int)  # university_name -> program_count
    ignored_universities = set()
    
    total_universities = len(data)
    total_programs_with_partners = 0
    total_programs_without_partners = 0
    
    # Practical statistics (excluding ignored universities)
    practical_universities_with_partners = set()
    practical_universities_without_partners = defaultdict(int)
    practical_total_universities = 0
    practical_programs_with_partners = 0
    practical_programs_without_partners = 0
    
    # Iterate through all universities (data is a dict: {university_name: [programs]})
    for uni_name, programs in data.items():
        # Check if this university should be ignored
        is_ignored = should_ignore_university(uni_name)
        
        has_any_partners = False
        program_count = 0
        
        # Check each program
        for program in programs:
            # Handle both dict and string program formats
            if isinstance(program, dict):
                program_count += 1
                erasmus_partners = program.get('erasmusPartners', [])
                
                if erasmus_partners and len(erasmus_partners) > 0:
                    has_any_partners = True
                    total_programs_with_partners += 1
                    if not is_ignored:
                        practical_programs_with_partners += 1
                else:
                    total_programs_without_partners += 1
                    if not is_ignored:
                        practical_programs_without_partners += 1
            # else: program is just a string or other format, skip
        
        # Track ignored universities
        if is_ignored:
            ignored_universities.add(uni_name)
            continue
        
        # Count for practical statistics
        practical_total_universities += 1
        
        # Categorize university
        if has_any_partners:
            universities_with_partners.add(uni_name)
            practical_universities_with_partners.add(uni_name)
        else:
            # Only count if it has programs
            if program_count > 0:
                universities_without_partners[uni_name] = program_count
                practical_universities_without_partners[uni_name] = program_count
    
    # Sort white spot universities by program count (descending) - only practical ones
    white_spots = sorted(
        practical_universities_without_partners.items(),
        key=lambda x: x[1],
        reverse=True
    )
    
    # Print results
    print("=" * 70)
    print("ERASMUS PARTNER COVERAGE ANALYSIS")
    print("=" * 70)
    print()
    
    # Overall statistics (including ignored universities)
    print("📊 OVERALL STATISTICS (All Universities)")
    print("-" * 70)
    print(f"Total Universities:                    {total_universities}")
    print(f"Universities with Partners:            {len(universities_with_partners)}")
    print(f"Universities without Partners:         {len(universities_without_partners)}")
    print(f"Ignored Universities:                  {len(ignored_universities)} (no Erasmus participation)")
    if total_universities > 0:
        print(f"Coverage:                              {len(universities_with_partners)/total_universities*100:.1f}%")
    print()
    print(f"Total Programs with Partners:          {total_programs_with_partners}")
    print(f"Total Programs without Partners:       {total_programs_without_partners}")
    if total_programs_with_partners + total_programs_without_partners > 0:
        program_coverage = total_programs_with_partners / (total_programs_with_partners + total_programs_without_partners) * 100
        print(f"Program Coverage:                      {program_coverage:.1f}%")
    print()
    
    # Practical statistics (excluding ignored universities)
    print("📊 PRACTICAL STATISTICS (Excluding Non-Erasmus Universities)")
    print("-" * 70)
    print(f"Practical Total Universities:          {practical_total_universities}")
    print(f"Universities with Partners:            {len(practical_universities_with_partners)}")
    print(f"Universities without Partners:         {len(practical_universities_without_partners)}")
    if practical_total_universities > 0:
        practical_coverage = len(practical_universities_with_partners) / practical_total_universities * 100
        print(f"Practical Coverage:                    {practical_coverage:.1f}%")
    print()
    print(f"Programs with Partners:                {practical_programs_with_partners}")
    print(f"Programs without Partners:             {practical_programs_without_partners}")
    if practical_programs_with_partners + practical_programs_without_partners > 0:
        practical_program_coverage = practical_programs_with_partners / (practical_programs_with_partners + practical_programs_without_partners) * 100
        print(f"Practical Program Coverage:            {practical_program_coverage:.1f}%")
    print()
    
    # Top 20 White Spot Universities (only practical)
    print("=" * 70)
    print("TOP 20 'WHITE SPOT' UNIVERSITIES (Most Programs, 0 Partners)")
    print("(Excluding non-Erasmus universities)")
    print("=" * 70)
    print()
    
    if not white_spots:
        print("✅ All universities have at least some partners!")
    else:
        print(f"{'Rank':<6} {'University':<50} {'Programs':<10}")
        print("-" * 70)
        
        for rank, (uni_name, program_count) in enumerate(white_spots[:20], 1):
            print(f"{rank:<6} {uni_name:<50} {program_count:<10}")
        
        if len(white_spots) > 20:
            print()
            print(f"... and {len(white_spots) - 20} more universities with no partners")
    
    print()
    print("=" * 70)

if __name__ == "__main__":
    analyze_coverage()

