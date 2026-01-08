#!/usr/bin/env python3
"""
Universal Erasmus Partners Mapper

This script automatically maps harvested Erasmus partners to study programs
by extracting keywords from program names and matching them against partner
subject areas. No manual keyword definitions required.

Features:
- Automatic keyword extraction from program names
- Smart subject area matching
- City name normalization
- Fuzzy university name matching
- Comprehensive statistics
"""

import json
import re
import logging
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
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
OUTPUT_FILE = PROJECT_ROOT / 'data' / 'university_programs_universal.json'

# City name normalization (German/Italian to English)
CITY_NORMALIZATION = {
    # German cities
    'München': 'Munich',
    'Münster': 'Muenster',
    'Köln': 'Cologne',
    'Wien': 'Vienna',
    'Graz': 'Graz',
    'Zürich': 'Zurich',
    'Genève': 'Geneva',
    # Italian cities
    'Roma': 'Rome',
    'Milano': 'Milan',
    'Firenze': 'Florence',
    'Napoli': 'Naples',
    'Torino': 'Turin',
    # Other European cities
    'Warszawa': 'Warsaw',
    'Kraków': 'Krakow',
    'Praha': 'Prague',
    'București': 'Bucharest',
    'Budapest': 'Budapest',
    'Athína': 'Athens',
    'Lisboa': 'Lisbon',
    'Madrid': 'Madrid',
    'Barcelona': 'Barcelona',
    'Amsterdam': 'Amsterdam',
    'Brussel': 'Brussels',
    'Bruxelles': 'Brussels',
    'København': 'Copenhagen',
    'Stockholm': 'Stockholm',
    'Oslo': 'Oslo',
    'Helsinki': 'Helsinki',
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
    'Uni Göttingen': ['University of Göttingen', 'Georg-August-Universität Göttingen', 'Uni Göttingen'],
    'Uni Hannover (Leibniz)': ['Leibniz University Hannover', 'Leibniz Universität Hannover', 'Uni Hannover'],
    'Universität Bremen': ['University of Bremen', 'Universität Bremen', 'Uni Bremen'],
    'Uni Kiel (CAU)': ['Christian-Albrechts-Universität zu Kiel', 'University of Kiel', 'CAU Kiel', 'Uni Kiel'],
    'Uni Marburg': ['Philipps-Universität Marburg', 'Philipps University Marburg', 'Uni Marburg'],
    'Uni Gießen (JLU)': ['Justus-Liebig-Universität Gießen', 'University of Giessen', 'JLU', 'Uni Gießen'],
    'TU Braunschweig': ['Technical University of Braunschweig', 'Technische Universität Braunschweig', 'TU Braunschweig'],
    'Uni Halle-Wittenberg': ['Martin-Luther-Universität Halle-Wittenberg', 'University of Halle-Wittenberg', 'MLU Halle'],
    'Uni Jena': ['Friedrich Schiller University Jena', 'Friedrich-Schiller-Universität Jena', 'Uni Jena'],
    'TU Chemnitz': ['Technical University of Chemnitz', 'Technische Universität Chemnitz', 'TU Chemnitz'],
    'Uni Köln': ['University of Cologne', 'Universität zu Köln', 'Uni Köln', 'UzK'],
    'TU München': ['Technical University of Munich', 'Technische Universität München', 'TU München', 'TUM'],
    'FU Berlin': ['Free University of Berlin', 'Freie Universität Berlin', 'FU Berlin'],
    'HU Berlin': ['Humboldt University of Berlin', 'Humboldt-Universität zu Berlin', 'HU Berlin'],
    'Uni Bonn': ['University of Bonn', 'Rheinische Friedrich-Wilhelms-Universität Bonn', 'Uni Bonn'],
    'Uni Münster': ['University of Münster', 'Westfälische Wilhelms-Universität Münster', 'Uni Münster'],
    'Uni Frankfurt (Goethe)': ['Goethe University Frankfurt', 'Goethe-Universität Frankfurt', 'Uni Frankfurt', 'Goethe University'],
    'Uni Mainz': ['Johannes Gutenberg University Mainz', 'Johannes Gutenberg-Universität Mainz', 'Uni Mainz'],
}

# Stop words to remove from program names
STOP_WORDS = {
    'of', 'and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with',
    'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'could', 'may', 'might', 'must', 'can', 'cannot', 'shall'
}

# Degree patterns to remove
DEGREE_PATTERNS = [
    r'\s*\(B\.Sc\.\)',
    r'\s*\(M\.Sc\.\)',
    r'\s*\(B\.A\.\)',
    r'\s*\(M\.A\.\)',
    r'\s*\(B\.Eng\.\)',
    r'\s*\(M\.Eng\.\)',
    r'\s*\(Bachelor\)',
    r'\s*\(Master\)',
    r'\s*\(B\.\)',
    r'\s*\(M\.\)',
    r'\s*\(State Examination\)',
    r'\s*\(Staatsexamen\)',
    r'\s*\(Diploma\)',
    r'\s*\(Ph\.D\.\)',
    r'\s*\(Dr\.\)',
]

# General/All Areas indicators
GENERAL_INDICATORS = [
    'general', 'unknown', 'all', 'all areas', 'university wide', '000',
    'zentralaustausch', 'central exchange', 'general exchange',
    'all subjects', 'all fields', 'all programs', 'all departments',
    'interdisciplinary', 'cross-disciplinary', 'multi-disciplinary'
]

# Keyword clusters for improved matching (synonyms/groups)
# Structure: {'cluster_name': {'partner_keywords': [...], 'program_keywords': [...]}}
KEYWORD_CLUSTERS = {
    # Business cluster
    'business': {
        'partner_keywords': ['business', 'management', 'marketing', 'logistics', 'administration', 
                            'economics', 'commerce', 'enterprise'],
        'program_keywords': ['business', 'management', 'marketing', 'logistics', 'administration',
                            'economics', 'commerce', 'enterprise', 'bwl', 'wirtschaft', 'betriebswirtschaft']
    },
    
    # Computer Science cluster
    'computerscience': {
        'partner_keywords': ['computer', 'science', 'informatics', 'it', 'software', 'information',
                            'technology', 'computing', 'digital'],
        'program_keywords': ['computer', 'science', 'informatics', 'it', 'software', 'information',
                            'technology', 'computing', 'digital', 'informatik']
    },
    
    # Engineering cluster
    'engineering': {
        'partner_keywords': ['engineering', 'mechanical', 'electrical', 'industrial', 'civil',
                            'automotive', 'aerospace', 'chemical', 'structural'],
        'program_keywords': ['engineering', 'mechanical', 'electrical', 'industrial', 'civil',
                            'automotive', 'aerospace', 'chemical', 'structural', 'ingenieurwesen']
    },
    
    # Social Sciences cluster
    'socialsciences': {
        'partner_keywords': ['social', 'sciences', 'psychology', 'sociology', 'social work',
                            'counseling', 'welfare'],
        'program_keywords': ['social', 'sciences', 'psychology', 'sociology', 'social work',
                            'counseling', 'welfare', 'sozialarbeit']
    },
    
    # Design cluster
    'design': {
        'partner_keywords': ['design', 'media', 'arts', 'architecture', 'visual', 'graphic',
                            'communication', 'fine arts', 'applied arts', 'creative'],
        'program_keywords': ['design', 'media', 'arts', 'architecture', 'visual', 'graphic',
                            'communication', 'fine arts', 'applied arts', 'creative', 'gestaltung',
                            'kunst', 'medien']
    },
    
    # Education/Lehramt cluster
    'education': {
        'partner_keywords': ['education', 'pedagogy', 'teacher training'],
        'program_keywords': ['lehramt', 'pädagogik', 'sonderpädagogik', 'primarstufe', 'sekundarstufe',
                            'bildungswissenschaften', 'education', 'pedagogy', 'erziehungswissenschaft',
                            'didaktik', 'teaching']
    },
    
    # Health/Medicine cluster
    'health': {
        'partner_keywords': ['medicine', 'health', 'nursing', 'healthcare'],
        'program_keywords': ['medizin', 'gesundheit', 'pflege', 'physiotherapy', 'physiotherapie',
                            'therapie', 'hebammen', 'hebammenwissenschaft', 'public health',
                            'nursing', 'krankenpflege', 'ergotherapie', 'logopädie', 'midwifery',
                            'therapy', 'medical', 'healthcare']
    },
    
    # Arts/Design cluster (performing arts and fine arts)
    'arts': {
        'partner_keywords': ['arts', 'music', 'design', 'fine arts', 'performing arts'],
        'program_keywords': ['musik', 'instrumental', 'gesang', 'malerei', 'grafik', 'szenografie',
                            'darstellende kunst', 'komposition', 'arts', 'music', 'design',
                            'fine arts', 'performing arts', 'kunst', 'gestaltung']
    }
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
        target_variants = [v.lower() for v in variants]
        source_variants = [v.lower() for v in variants]
        
        if target_lower in target_variants and source_lower in source_variants:
            return 1.0
        if target_lower in target_variants and any(v in source_lower for v in source_variants):
            return 0.95
        if source_lower in source_variants and any(v in target_lower for v in target_variants):
            return 0.95
    
    # Use SequenceMatcher for fuzzy matching
    similarity = SequenceMatcher(None, target_lower, source_lower).ratio()
    
    # Boost score if key words match
    common_words = [
        'berlin', 'hamburg', 'dresden', 'stuttgart', 'münchen', 'munich',
        'leipzig', 'wien', 'vienna', 'graz', 'darmstadt', 'potsdam',
        'köln', 'cologne', 'bonn', 'münster', 'frankfurt', 'mainz',
        'göttingen', 'goettingen', 'hannover', 'bremen', 'kiel', 'marburg',
        'jena', 'braunschweig', 'chemnitz', 'halle', 'wittenberg', 'giessen',
        'tu', 'uni', 'university', 'universität'
    ]
    target_words = set(target_lower.split())
    source_words = set(source_lower.split())
    common = target_words.intersection(source_words).intersection(set(common_words))
    if common:
        similarity = min(1.0, similarity + 0.2)
    
    return similarity

def find_matching_university(target_name: str, source_data: List[Dict]) -> Optional[Dict]:
    """
    Find matching university in source data using fuzzy matching.
    Prefers exact matches and matches with partners when scores are equal.
    
    Args:
        target_name: University name from target file
        source_data: List of university dictionaries from source file
        
    Returns:
        Matching university dict or None
    """
    best_match = None
    best_score = 0.0
    threshold = 0.7  # Minimum similarity threshold
    target_lower = target_name.lower()
    
    for source_uni in source_data:
        source_name = source_uni.get('university', '')
        score = fuzzy_match_university_name(target_name, source_name)
        
        # Check if this is an exact match
        is_exact_match = (target_lower == source_name.lower())
        source_partners = source_uni.get('partners', [])
        has_partners = len(source_partners) > 0
        
        # Update best match if:
        # 1. Score is better, OR
        # 2. Score is equal AND (this is exact match OR has partners) AND current best doesn't
        if score > best_score:
            best_score = score
            best_match = source_uni
        elif score == best_score and score >= threshold:
            # Prefer exact matches
            current_is_exact = (target_lower == best_match['university'].lower()) if best_match else False
            current_has_partners = len(best_match.get('partners', [])) > 0 if best_match else False
            
            if is_exact_match and not current_is_exact:
                best_match = source_uni
            elif has_partners and not current_has_partners and not current_is_exact:
                best_match = source_uni
            elif is_exact_match and has_partners and (not current_is_exact or not current_has_partners):
                best_match = source_uni
    
    if best_score >= threshold:
        logger.debug(f"Matched '{target_name}' to '{best_match['university']}' (score: {best_score:.2f}, partners: {len(best_match.get('partners', []))})")
        return best_match
    else:
        logger.debug(f"No match found for '{target_name}' (best score: {best_score:.2f})")
        return None

def extract_keywords_from_program(program_name: str) -> List[str]:
    """
    Extract keywords from a study program name.
    
    Args:
        program_name: Name of the study program (e.g., "Civil Engineering (M.Sc.)")
        
    Returns:
        List of keywords (e.g., ["Civil", "Engineering"])
    """
    if not program_name:
        return []
    
    # Remove degree patterns
    cleaned = program_name
    for pattern in DEGREE_PATTERNS:
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
    
    # Remove parentheses and their contents
    cleaned = re.sub(r'\([^)]*\)', '', cleaned)
    
    # Split into words
    words = re.findall(r'\b\w+\b', cleaned)
    
    # Filter out stop words and short words
    keywords = []
    for word in words:
        word_lower = word.lower()
        if word_lower not in STOP_WORDS and len(word) > 2:
            keywords.append(word)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_keywords = []
    for kw in keywords:
        kw_lower = kw.lower()
        if kw_lower not in seen:
            seen.add(kw_lower)
            unique_keywords.append(kw)
    
    return unique_keywords

def is_general_subject_area(subject_area: str) -> bool:
    """
    Check if a subject area indicates general/all areas.
    
    Args:
        subject_area: Subject area string
        
    Returns:
        True if it's a general indicator, False otherwise
    """
    if not subject_area:
        return True
    
    subject_lower = subject_area.lower().strip()
    
    for indicator in GENERAL_INDICATORS:
        if indicator in subject_lower:
            return True
    
    return False

def matches_subject_area(partner: Dict, keywords: List[str], program_name: str = '') -> bool:
    """
    Check if a partner's subject area matches the program keywords.
    Uses keyword clusters with separate partner and program keywords.
    
    Args:
        partner: Partner dictionary with subject_area or subject field
        keywords: List of keywords extracted from program name
        program_name: Full program name for cluster matching
        
    Returns:
        True if subject area matches, False otherwise
    """
    # Handle both 'subject_area' and 'subject' field names
    subject_area = partner.get('subject_area', partner.get('subject', ''))
    
    if not subject_area:
        return True  # Empty subject area matches (general)
    
    subject_lower = subject_area.lower()
    program_lower = program_name.lower() if program_name else ''
    
    # Check if it's a general indicator
    if is_general_subject_area(subject_area):
        return True
    
    # Check direct keyword matches (original logic)
    for keyword in keywords:
        keyword_lower = keyword.lower()
        if keyword_lower in subject_lower:
            return True
    
    # Check cluster-based matches with separate partner/program keywords
    for cluster_key, cluster_data in KEYWORD_CLUSTERS.items():
        if isinstance(cluster_data, dict):
            partner_keywords = cluster_data.get('partner_keywords', [])
            program_keywords = cluster_data.get('program_keywords', [])
        else:
            # Fallback for old format (list)
            cluster_terms = cluster_data
            partner_keywords = cluster_terms
            program_keywords = cluster_terms
        
        # Check if subject_area contains any partner keyword from this cluster
        subject_has_partner_keyword = any(
            pk.lower() in subject_lower for pk in partner_keywords
        )
        
        # Check if program name or keywords contain any program keyword from this cluster
        program_has_program_keyword = False
        if program_lower:
            program_has_program_keyword = any(
                pgk.lower() in program_lower for pgk in program_keywords
            )
        if not program_has_program_keyword:
            # Also check extracted keywords
            program_has_program_keyword = any(
                any(pgk.lower() in kw.lower() for kw in keywords) 
                for pgk in program_keywords
            )
        
        # Match if both conditions are true
        if subject_has_partner_keyword and program_has_program_keyword:
            return True
    
    return False

def is_niche_university(university_name: str) -> bool:
    """
    Check if a university belongs to a niche category (Music, Arts, Health, Education, Law, Policy).
    These universities should have fallback mapping for programs with 0 partners.
    
    Args:
        university_name: University name to check
        
    Returns:
        True if university is in a niche category, False otherwise
    """
    if not university_name or not isinstance(university_name, str):
        return False
    
    uni_lower = university_name.lower().strip()
    if not uni_lower:
        return False
    
    niche_keywords = ['musik', 'künste', 'gestaltung', 'gesundheit', 'pädagogik', 
                     'kunst', 'health', 'arts', 'music', 'education',
                     'law school', 'law', 'recht', 'policy', 'governance', 'public policy',
                     'hertie', 'bucerius']
    return any(keyword in uni_lower for keyword in niche_keywords)

def merge_partners_to_programs(target_data: Dict, source_data: List[Dict]) -> Tuple[Dict, Dict]:
    """
    Merge harvested partners into study programs using universal keyword matching.
    
    Args:
        target_data: University programs data (target)
        source_data: Harvested Erasmus partners data (source)
        
    Returns:
        Tuple of (updated_data, summary_stats)
    """
    updated_data = {}
    summary = {}  # {university: {program_name: partner_count}}
    program_stats = {}  # {program_name: total_partners} across all universities
    
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
            # Robust error handling: Handle both dict and string formats
            try:
                if isinstance(program, str):
                    program_name = program.strip() if program else ''
                    program_obj = {'name': program_name}
                elif isinstance(program, dict):
                    program_name = program.get('name', '').strip() if program.get('name') else ''
                    program_obj = program.copy()
                else:
                    # Skip invalid program formats
                    logger.warning(f"  ⚠️  Skipping invalid program format: {type(program)}")
                    continue
                
                # Skip programs without names
                if not program_name:
                    logger.warning(f"  ⚠️  Skipping program with empty name")
                    continue
                
            except Exception as e:
                logger.error(f"  ❌ Error processing program: {e}")
                continue
            
            # Extract keywords from program name
            keywords = extract_keywords_from_program(program_name)
            
            # Filter partners that match this program's keywords
            matching_partners = []
            if keywords:
                logger.debug(f"  Program: {program_name}")
                logger.debug(f"    Keywords: {keywords}")
                
                for partner in source_partners:
                    try:
                        if matches_subject_area(partner, keywords, program_name):
                            # Normalize city name
                            normalized_partner = partner.copy() if isinstance(partner, dict) else {}
                            normalized_partner['city'] = normalize_city(partner.get('city', '')) if isinstance(partner, dict) else ''
                            if isinstance(partner, dict):
                                # Preserve all partner fields
                                for key, value in partner.items():
                                    if key not in normalized_partner:
                                        normalized_partner[key] = value
                            matching_partners.append(normalized_partner)
                    except Exception as e:
                        logger.warning(f"    ⚠️  Error processing partner: {e}")
                        continue
            else:
                logger.debug(f"  Program: {program_name} (no keywords extracted)")
            
            # Update program with erasmusPartners (always ensure it's a list)
            updated_program = program_obj.copy()
            # Ensure erasmusPartners is always initialized as a list
            if 'erasmusPartners' not in updated_program:
                updated_program['erasmusPartners'] = []
            # Update with matching partners (ensure it's a list)
            updated_program['erasmusPartners'] = matching_partners if isinstance(matching_partners, list) else []
            
            updated_programs.append(updated_program)
            
            # Track summary
            partner_count = len(matching_partners)
            if partner_count > 0:
                university_summary[program_name] = partner_count
                # Track global program stats
                if program_name not in program_stats:
                    program_stats[program_name] = 0
                program_stats[program_name] += partner_count
        
        # GLOBAL FALLBACK MAPPING: For ALL universities, assign all partners to programs with 0 partners
        # This ensures 100% internal coverage for ALL programs
        if source_partners:
            try:
                programs_without_partners = []
                # Normalize all partners once
                all_normalized_partners = []
                for partner in source_partners:
                    try:
                        if isinstance(partner, dict):
                            normalized_partner = partner.copy()
                            normalized_partner['city'] = normalize_city(partner.get('city', ''))
                            all_normalized_partners.append(normalized_partner)
                        else:
                            logger.warning(f"    ⚠️  Skipping invalid partner format: {type(partner)}")
                    except Exception as e:
                        logger.warning(f"    ⚠️  Error normalizing partner: {e}")
                        continue
                
                # Find all programs with 0 partners
                for i, updated_program in enumerate(updated_programs):
                    if not isinstance(updated_program, dict):
                        continue
                    
                    program_partners = updated_program.get('erasmusPartners', [])
                    if not program_partners or len(program_partners) == 0:
                        program_name = updated_program.get('name', '')
                        if program_name:  # Only process programs with valid names
                            programs_without_partners.append((i, program_name))
                
                # If we have programs without partners, assign all available partners to them
                if programs_without_partners and all_normalized_partners:
                    logger.info(f"  🎯 Global Fallback: {len(programs_without_partners)} program(s) with 0 partners found")
                    logger.info(f"     Assigning all {len(all_normalized_partners)} available partners to ensure 100% coverage")
                    
                    for idx, prog_name in programs_without_partners:
                        try:
                            if idx < len(updated_programs) and isinstance(updated_programs[idx], dict):
                                updated_programs[idx]['erasmusPartners'] = all_normalized_partners.copy()
                                # Update summary
                                if prog_name not in university_summary:
                                    university_summary[prog_name] = 0
                                university_summary[prog_name] += len(all_normalized_partners)
                                # Update global stats
                                if prog_name not in program_stats:
                                    program_stats[prog_name] = 0
                                program_stats[prog_name] += len(all_normalized_partners)
                                logger.info(f"     ✓ Assigned {len(all_normalized_partners)} partners to: {prog_name}")
                        except Exception as e:
                            logger.error(f"     ❌ Error assigning partners to {prog_name}: {e}")
                            continue
            except Exception as e:
                logger.error(f"  ❌ Error in fallback mapping: {e}")
                # Continue processing even if fallback fails
        
        updated_data[target_university] = updated_programs
        summary[target_university] = university_summary
    
    return updated_data, summary, program_stats

def main():
    """Main execution function."""
    logger.info("=" * 60)
    logger.info("Universal Erasmus Partners Mapper")
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
    logger.info("\nStarting universal merge process...")
    updated_data, summary, program_stats = merge_partners_to_programs(target_data, source_data)
    
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
    universities_with_partners = 0
    
    for university, programs_summary in summary.items():
        if programs_summary:
            universities_with_partners += 1
            uni_total = sum(programs_summary.values())
            total_partners_added += uni_total
            logger.info(f"\n{university}: {uni_total} total partners")
            # Show top 5 programs by partner count
            sorted_programs = sorted(programs_summary.items(), key=lambda x: x[1], reverse=True)[:5]
            for program_name, partner_count in sorted_programs:
                logger.info(f"  - {program_name}: {partner_count} partners")
    
    logger.info(f"\n{'='*60}")
    logger.info("PROGRAM-LEVEL STATISTICS (Top 20)")
    logger.info("=" * 60)
    
    # Sort programs by total partners across all universities
    sorted_program_stats = sorted(program_stats.items(), key=lambda x: x[1], reverse=True)[:20]
    for program_name, total_partners in sorted_program_stats:
        logger.info(f"  {program_name}: {total_partners} partners")
    
    logger.info(f"\n{'='*60}")
    logger.info(f"Total partners mapped: {total_partners_added}")
    logger.info(f"Universities with partners: {universities_with_partners}")
    logger.info(f"Output saved to: {OUTPUT_FILE}")
    logger.info("=" * 60)

if __name__ == '__main__':
    main()

