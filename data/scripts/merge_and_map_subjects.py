#!/usr/bin/env python3
"""
Merge and Map Erasmus Partners to Study Programs

This script intelligently merges harvested Erasmus partner data into the
university_programs.json file by matching partners to study programs based
on subject area keywords.

Features:
- Fuzzy university name matching
- Subject area keyword matching
- City name normalization (German/Italian to English)
- Intelligent program-to-subject mapping
"""

import json
import re
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from difflib import SequenceMatcher

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
TARGET_FILE = PROJECT_ROOT / 'data' / 'university_programs.json'
SOURCE_FILE = PROJECT_ROOT / 'data' / 'batch1_erasmus_data.json'
OUTPUT_FILE = PROJECT_ROOT / 'data' / 'university_programs_v2.json'

# City name normalization (German/Italian to English)
CITY_NORMALIZATION = {
    # German cities
    'München': 'Munich',
    'Münster': 'Muenster',
    'Köln': 'Cologne',
    'Wien': 'Vienna',
    'Graz': 'Graz',  # Keep as is
    'Zürich': 'Zurich',
    'Genève': 'Geneva',
    'Roma': 'Rome',
    'Milano': 'Milan',
    'Firenze': 'Florence',
    'Napoli': 'Naples',
    'Torino': 'Turin',
    'Warszawa': 'Warsaw',
    'Kraków': 'Krakow',
    'Praha': 'Prague',
    'București': 'Bucharest',
    'Budapest': 'Budapest',  # Keep as is
    'Athína': 'Athens',
    'Lisboa': 'Lisbon',
    'Madrid': 'Madrid',  # Keep as is
    'Barcelona': 'Barcelona',  # Keep as is
    'Amsterdam': 'Amsterdam',  # Keep as is
    'Brussel': 'Brussels',
    'Bruxelles': 'Brussels',
    'København': 'Copenhagen',
    'Stockholm': 'Stockholm',  # Keep as is
    'Oslo': 'Oslo',  # Keep as is
    'Helsinki': 'Helsinki',  # Keep as is
}

# University name fuzzy matching patterns
UNIVERSITY_NAME_VARIANTS = {
    'TU Berlin': ['Technical University of Berlin', 'Technische Universität Berlin', 'TU Berlin'],
    'Uni Hamburg': ['University of Hamburg', 'Universität Hamburg', 'Uni Hamburg', 'UHH'],
    'TU Dresden': ['Technical University of Dresden', 'Technische Universität Dresden', 'TU Dresden', 'TUD'],
    'Uni Stuttgart': ['University of Stuttgart', 'Universität Stuttgart', 'Uni Stuttgart'],
    'LMU München': ['Ludwig Maximilian University of Munich', 'LMU München', 'LMU Munich', 'Ludwig-Maximilians-Universität'],
    'Uni Leipzig': ['University of Leipzig', 'Universität Leipzig', 'Uni Leipzig'],
    'Uni Wien': ['University of Vienna', 'Universität Wien', 'Uni Wien', 'Univie'],
    'Uni Graz': ['University of Graz', 'Universität Graz', 'Uni Graz', 'Karl-Franzens-Universität'],
    'TU Darmstadt': ['Technical University of Darmstadt', 'Technische Universität Darmstadt', 'TU Darmstadt'],
    'Uni Potsdam': ['University of Potsdam', 'Universität Potsdam', 'Uni Potsdam'],
}

# Program to Subject Area Keyword Mapping
PROGRAM_SUBJECT_KEYWORDS = {
    # Business & Economics
    'business': ['business', 'wirtschaft', 'bwl', 'vwl', 'management', 'betriebswirtschaft', 'volkswirtschaft', '041', '313', '314', '031', 'economics', 'ökonomie', 'commerce', 'finance', 'accounting', 'marketing'],
    'management': ['management', 'business', 'wirtschaft', 'bwl', '041', '313', '314', 'leadership', 'administration'],
    'economics': ['economics', 'volkswirtschaft', 'vwl', 'economics', 'ökonomie', '031', '314', 'economic'],
    
    # Computer Science & IT
    'computer': ['computer', 'informatik', 'informatics', 'computing', '061', '481', '482', 'software', 'programming', 'it', 'information technology', 'data science', 'artificial intelligence', 'ai', 'machine learning'],
    'informatics': ['informatik', 'informatics', 'computer', 'computing', '061', '481', '482'],
    
    # Engineering
    'engineering': ['engineering', 'ingenieur', 'ingénieur', '071', '072', '073', '074', '075', '076', '077', 'mechanical', 'electrical', 'civil', 'chemical', 'aerospace'],
    'mechanical': ['mechanical', 'maschinenbau', 'mécanique', '071', 'mechanical engineering'],
    'electrical': ['electrical', 'elektrotechnik', 'électrique', '071', 'electrical engineering', 'electronics'],
    'civil': ['civil', 'bauingenieur', 'génie civil', '073', 'civil engineering', 'construction'],
    
    # Natural Sciences
    'physics': ['physics', 'physik', 'physique', '053', 'physics', 'theoretical physics', 'applied physics'],
    'chemistry': ['chemistry', 'chemie', 'chimie', '054', 'chemical', 'biochemistry'],
    'biology': ['biology', 'biologie', 'biologie', '051', 'biological', 'biomedical', 'biotechnology'],
    'mathematics': ['mathematics', 'mathematik', 'mathématiques', '053', 'math', 'statistics', 'applied mathematics'],
    
    # Social Sciences
    'psychology': ['psychology', 'psychologie', 'psychologie', '031', 'psych', 'psychological', 'clinical psychology'],
    'sociology': ['sociology', 'soziologie', 'sociologie', '031', 'social', 'social sciences'],
    'political': ['political', 'politik', 'politique', '031', 'political science', 'politics', 'government'],
    
    # Humanities
    'history': ['history', 'geschichte', 'histoire', '022', 'historical', 'historian'],
    'philosophy': ['philosophy', 'philosophie', 'philosophie', '021', 'philosophical'],
    'literature': ['literature', 'literatur', 'littérature', '023', 'literary', 'languages', 'linguistics'],
    'languages': ['languages', 'sprachen', 'langues', '023', 'linguistics', 'translation', 'interpreting'],
    
    # Architecture & Design
    'architecture': ['architecture', 'architektur', 'architecture', '058', 'architectural', 'urban planning', 'urban design'],
    'design': ['design', 'design', 'design', '021', 'graphic design', 'industrial design'],
    
    # Medicine & Health
    'medicine': ['medicine', 'medizin', 'médecine', '091', 'medical', 'health', 'healthcare'],
    'pharmacy': ['pharmacy', 'pharmazie', 'pharmacie', '091', 'pharmaceutical'],
    
    # Law
    'law': ['law', 'recht', 'droit', '042', 'legal', 'jurisprudence', 'lawyer'],
    
    # Education
    'education': ['education', 'erziehung', 'éducation', '011', 'pedagogy', 'teaching', 'teacher training'],
}

def normalize_city(city: str) -> str:
    """
    Normalize city names from German/Italian to English.
    
    Args:
        city: City name to normalize
        
    Returns:
        Normalized city name
    """
    if not city:
        return city
    
    # Check direct mapping
    if city in CITY_NORMALIZATION:
        return CITY_NORMALIZATION[city]
    
    # Check case-insensitive
    city_lower = city.lower()
    for german, english in CITY_NORMALIZATION.items():
        if city_lower == german.lower():
            return english
    
    # Return original if no mapping found
    return city

def fuzzy_match_university_name(target_name: str, source_name: str) -> float:
    """
    Calculate similarity score between two university names.
    
    Args:
        target_name: University name from target file
        source_name: University name from source file
        
    Returns:
        Similarity score (0.0 to 1.0)
    """
    # Normalize names
    target_lower = target_name.lower()
    source_lower = source_name.lower()
    
    # Check exact match
    if target_lower == source_lower:
        return 1.0
    
    # Check if one contains the other
    if target_lower in source_lower or source_lower in target_lower:
        return 0.9
    
    # Check known variants
    for key, variants in UNIVERSITY_NAME_VARIANTS.items():
        if target_lower in [v.lower() for v in variants] and source_lower in [v.lower() for v in variants]:
            return 1.0
        if target_lower in [v.lower() for v in variants] and any(v.lower() in source_lower for v in variants):
            return 0.95
        if source_lower in [v.lower() for v in variants] and any(v.lower() in target_lower for v in variants):
            return 0.95
    
    # Use SequenceMatcher for fuzzy matching
    similarity = SequenceMatcher(None, target_lower, source_lower).ratio()
    
    # Boost score if key words match (e.g., "Berlin", "Hamburg")
    common_words = ['berlin', 'hamburg', 'dresden', 'stuttgart', 'münchen', 'munich', 'leipzig', 'wien', 'vienna', 'graz', 'darmstadt', 'potsdam', 'tu', 'uni', 'university', 'universität']
    target_words = set(target_lower.split())
    source_words = set(source_lower.split())
    common = target_words.intersection(source_words).intersection(set(common_words))
    if common:
        similarity = min(1.0, similarity + 0.2)
    
    return similarity

def find_matching_university(target_name: str, source_data: List[Dict]) -> Optional[Dict]:
    """
    Find matching university in source data using fuzzy matching.
    
    Args:
        target_name: University name from target file
        source_data: List of university dictionaries from source file
        
    Returns:
        Matching university dict or None
    """
    best_match = None
    best_score = 0.0
    threshold = 0.7  # Minimum similarity threshold
    
    for source_uni in source_data:
        source_name = source_uni.get('university', '')
        score = fuzzy_match_university_name(target_name, source_name)
        
        if score > best_score:
            best_score = score
            best_match = source_uni
    
    if best_score >= threshold:
        logger.debug(f"Matched '{target_name}' to '{best_match['university']}' (score: {best_score:.2f})")
        return best_match
    else:
        logger.debug(f"No match found for '{target_name}' (best score: {best_score:.2f})")
        return None

def get_program_keywords(program_name: str) -> List[str]:
    """
    Get subject area keywords for a study program.
    
    Args:
        program_name: Name of the study program
        
    Returns:
        List of keywords to match against subject areas
    """
    program_lower = program_name.lower()
    keywords = []
    
    # Check each program category
    for category, category_keywords in PROGRAM_SUBJECT_KEYWORDS.items():
        if category in program_lower:
            keywords.extend(category_keywords)
    
    # Add specific keyword extraction
    if any(word in program_lower for word in ['business', 'bwl', 'betriebswirtschaft']):
        keywords.extend(PROGRAM_SUBJECT_KEYWORDS['business'])
    if any(word in program_lower for word in ['management', 'wirtschaft']):
        keywords.extend(PROGRAM_SUBJECT_KEYWORDS['management'])
    if any(word in program_lower for word in ['economics', 'vwl', 'volkswirtschaft']):
        keywords.extend(PROGRAM_SUBJECT_KEYWORDS['economics'])
    if any(word in program_lower for word in ['computer', 'informatik', 'computing']):
        keywords.extend(PROGRAM_SUBJECT_KEYWORDS['computer'])
    if any(word in program_lower for word in ['engineering', 'ingenieur']):
        keywords.extend(PROGRAM_SUBJECT_KEYWORDS['engineering'])
    if any(word in program_lower for word in ['psychology', 'psychologie']):
        keywords.extend(PROGRAM_SUBJECT_KEYWORDS['psychology'])
    if any(word in program_lower for word in ['architecture', 'architektur']):
        keywords.extend(PROGRAM_SUBJECT_KEYWORDS['architecture'])
    if any(word in program_lower for word in ['medicine', 'medizin']):
        keywords.extend(PROGRAM_SUBJECT_KEYWORDS['medicine'])
    if any(word in program_lower for word in ['law', 'recht', 'jurisprudence']):
        keywords.extend(PROGRAM_SUBJECT_KEYWORDS['law'])
    
    # Remove duplicates while preserving order
    seen = set()
    unique_keywords = []
    for kw in keywords:
        if kw not in seen:
            seen.add(kw)
            unique_keywords.append(kw)
    
    return unique_keywords

def matches_subject_area(partner: Dict, program_keywords: List[str]) -> bool:
    """
    Check if a partner's subject area matches the program keywords.
    
    Args:
        partner: Partner dictionary with subject_area or subject field
        program_keywords: List of keywords to match against
        
    Returns:
        True if subject area matches, False otherwise
    """
    # Handle both 'subject_area' and 'subject' field names
    subject_area = partner.get('subject_area', partner.get('subject', '')).lower()
    
    # Always include "General/Unknown" and "Erasmus+ All" partners
    if not subject_area or subject_area in ['general/unknown', 'general', 'unknown', 'erasmus+ all', 'all', 'zentralaustausch']:
        return True
    
    # Check if any keyword matches
    for keyword in program_keywords:
        if keyword.lower() in subject_area:
            return True
    
    return False

def merge_partners_to_programs(target_data: Dict, source_data: List[Dict]) -> Tuple[Dict, Dict]:
    """
    Merge harvested partners into study programs.
    
    Args:
        target_data: University programs data (target)
        source_data: Harvested Erasmus partners data (source)
        
    Returns:
        Tuple of (updated_data, summary_stats)
    """
    updated_data = {}
    summary = {}
    
    for target_university, programs in target_data.items():
        logger.info(f"\n{'='*60}")
        logger.info(f"Processing: {target_university}")
        logger.info(f"{'='*60}")
        
        # Find matching university in source data
        source_university = find_matching_university(target_university, source_data)
        
        if not source_university:
            logger.warning(f"⚠️  No matching university found in source data")
            updated_data[target_university] = programs
            continue
        
        source_partners = source_university.get('partners', [])
        logger.info(f"Found {len(source_partners)} partners in source data")
        
        updated_programs = []
        university_summary = {}
        
        for program in programs:
            # Handle both dict and string formats
            if isinstance(program, str):
                program_name = program
                program_obj = {'name': program_name}
            else:
                program_name = program.get('name', '')
                program_obj = program.copy()
            
            logger.info(f"  Processing program: {program_name}")
            
            # Get keywords for this program
            program_keywords = get_program_keywords(program_name)
            
            # Filter partners that match this program's subject area
            matching_partners = []
            for partner in source_partners:
                if matches_subject_area(partner, program_keywords):
                    # Normalize city name
                    normalized_partner = partner.copy()
                    normalized_partner['city'] = normalize_city(partner.get('city', ''))
                    matching_partners.append(normalized_partner)
            
            # Update program with erasmusPartners
            updated_program = program_obj.copy()
            updated_program['erasmusPartners'] = matching_partners
            
            updated_programs.append(updated_program)
            
            # Track summary
            partner_count = len(matching_partners)
            if partner_count > 0:
                university_summary[program_name] = partner_count
                logger.info(f"    ✅ Added {partner_count} partners")
            else:
                logger.info(f"    ⚠️  No matching partners found")
        
        updated_data[target_university] = updated_programs
        summary[target_university] = university_summary
    
    return updated_data, summary

def main():
    """Main execution function."""
    logger.info("=" * 60)
    logger.info("Erasmus Partners Merge and Map Script")
    logger.info("=" * 60)
    
    # Load target data
    logger.info(f"Loading target file: {TARGET_FILE}")
    try:
        with open(TARGET_FILE, 'r', encoding='utf-8') as f:
            target_data = json.load(f)
        logger.info(f"✅ Loaded {len(target_data)} universities from target")
    except Exception as e:
        logger.error(f"❌ Failed to load target file: {e}")
        return
    
    # Load source data
    logger.info(f"Loading source file: {SOURCE_FILE}")
    try:
        with open(SOURCE_FILE, 'r', encoding='utf-8') as f:
            source_data = json.load(f)
        logger.info(f"✅ Loaded {len(source_data)} universities from source")
    except Exception as e:
        logger.error(f"❌ Failed to load source file: {e}")
        return
    
    # Merge partners into programs
    logger.info("\nStarting merge process...")
    updated_data, summary = merge_partners_to_programs(target_data, source_data)
    
    # Save updated data
    logger.info(f"\nSaving updated data to: {OUTPUT_FILE}")
    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(updated_data, f, indent=2, ensure_ascii=False)
        logger.info(f"✅ Saved updated data")
    except Exception as e:
        logger.error(f"❌ Failed to save output file: {e}")
        return
    
    # Print summary
    logger.info("\n" + "=" * 60)
    logger.info("MERGE SUMMARY")
    logger.info("=" * 60)
    
    total_partners_added = 0
    for university, programs_summary in summary.items():
        if programs_summary:
            logger.info(f"\n{university}:")
            for program_name, partner_count in programs_summary.items():
                logger.info(f"  - {program_name}: Added {partner_count} partners")
                total_partners_added += partner_count
    
    logger.info(f"\n{'='*60}")
    logger.info(f"Total partners added: {total_partners_added}")
    logger.info(f"Output saved to: {OUTPUT_FILE}")
    logger.info("=" * 60)

if __name__ == '__main__':
    main()

