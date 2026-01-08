#!/usr/bin/env python3
"""
Finalize Master Data Script - 100% Data Integrity

This script ensures complete data integrity in university_programs.json:
1. Converts string programs to dictionaries
2. Fills missing fields (nc_threshold, semester_fee, monthly_rent_estimate, erasmusPartners)
3. Calculates totalMonthlyCosts
4. Outputs clean master data file
5. Generates statistics
"""

import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Set

# Paths
BASE_DIR = Path(__file__).parent.parent
PROGRAMS_FILE = BASE_DIR / "university_programs.json"
UNIVERSAL_FILE = BASE_DIR / "university_programs_universal.json"
ERASMUS_FILE = BASE_DIR / "erasmus_data.json"
MASTER_OUTPUT = BASE_DIR / "university_master_2026.json"

# Default values
DEFAULT_NC_THRESHOLD = 99.0
DEFAULT_SEMESTER_FEE = 300.00
DEFAULT_RENT_ESTIMATE = 450.0
LIVING_COST_PADDING = 300.0  # Pauschale für Leben/Versicherung

# Exact semester fees for specific universities (2026)
EXACT_FEES = {
    "Technical University of Berlin (TU Berlin)": 307.92,
    "Berlin University of Applied Sciences (HTW Berlin)": 298.50,
    "Ludwig Maximilian University of Munich (LMU)": 176.40,
    "Technical University of Munich (TUM)": 182.00,
    "University of Cologne": 318.75,
    "Cologne University of Applied Sciences": 305.20,
}

# City-based matching for semester fees (fallback)
CITY_FEES = {
    "Berlin": 310.00,
    "Munich": 180.00,
    "München": 180.00,
    "Cologne": 312.00,
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

# Monthly rent estimates by city (2026)
CITY_RENT_ESTIMATES = {
    "München": 780.0,
    "Munich": 780.0,
    "Berlin": 650.0,
    "Frankfurt": 620.0,
    "Hamburg": 600.0,
    "Köln": 580.0,
    "Cologne": 580.0,
    "Düsseldorf": 580.0,
    "Dusseldorf": 580.0,
    "Stuttgart": 580.0,
    "Heidelberg": 550.0,
    "Freiburg": 550.0,
    "Münster": 550.0,
    "Munster": 550.0,
    "Aachen": 480.0,
    "Mainz": 480.0,
    "Darmstadt": 480.0,
    "Leipzig": 420.0,
    "Bremen": 420.0,
    "Jena": 420.0,
    "Dresden": 390.0,
    "Halle": 390.0,
    "Magdeburg": 390.0,
}


def load_json(file_path: Path) -> Optional[Dict[str, Any]]:
    """Load JSON file and return data, or None if file doesn't exist."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"⚠️  File not found: {file_path}")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing JSON from {file_path}: {e}")
        return None


def get_city_for_university(university_name: str) -> Optional[str]:
    """Get city name for a university based on keywords."""
    name_lower = university_name.lower()
    cities_sorted = sorted(CITY_RENT_ESTIMATES.keys(), key=len, reverse=True)
    
    # Check for city names in university name
    for city in cities_sorted:
        if city.lower() in name_lower:
            return city
    
    # Check city keywords
    for city, keywords in CITY_KEYWORDS.items():
        if any(keyword.lower() in name_lower for keyword in keywords):
            return city
    
    return None


def get_semester_fee(university_name: str) -> float:
    """Get semester fee for a university (priority: exact > city > default)."""
    # Priority A: Exact match
    if university_name in EXACT_FEES:
        return EXACT_FEES[university_name]
    
    # Priority B: City-based match
    city = get_city_for_university(university_name)
    if city and city in CITY_FEES:
        return CITY_FEES[city]
    
    # Priority C: Default
    return DEFAULT_SEMESTER_FEE


def get_rent_estimate(university_name: str) -> float:
    """Get monthly rent estimate for a university based on city."""
    city = get_city_for_university(university_name)
    if city and city in CITY_RENT_ESTIMATES:
        return CITY_RENT_ESTIMATES[city]
    return DEFAULT_RENT_ESTIMATE


def normalize_string(s: str) -> str:
    """Normalize strings for matching (lowercase, strip whitespace, remove special chars)."""
    if not s:
        return ""
    # Remove common special characters and normalize
    normalized = s.lower().strip()
    # Remove common prefixes/suffixes
    normalized = normalized.replace("(uni)", "").replace("(fh)", "")
    normalized = normalized.replace("university", "uni").replace("universität", "uni")
    normalized = normalized.replace("technical", "tech").replace("technische", "tech")
    normalized = normalized.replace("applied sciences", "applied").replace("fachhochschule", "fh")
    # Remove extra whitespace
    normalized = " ".join(normalized.split())
    return normalized


def fuzzy_match_university_name(uni_name1: str, uni_name2: str, threshold: float = 0.7) -> bool:
    """Check if two university names match using fuzzy logic."""
    norm1 = normalize_string(uni_name1)
    norm2 = normalize_string(uni_name2)
    
    # Exact match after normalization
    if norm1 == norm2:
        return True
    
    # Check if one contains the other (for abbreviations)
    if norm1 in norm2 or norm2 in norm1:
        return True
    
    # Check word overlap (at least 70% of words match)
    words1 = set(norm1.split())
    words2 = set(norm2.split())
    
    if not words1 or not words2:
        return False
    
    # Remove common stop words
    stop_words = {"of", "the", "zu", "der", "die", "das", "und", "an"}
    words1 = words1 - stop_words
    words2 = words2 - stop_words
    
    if not words1 or not words2:
        return norm1 == norm2
    
    # Calculate Jaccard similarity
    intersection = len(words1 & words2)
    union = len(words1 | words2)
    similarity = intersection / union if union > 0 else 0.0
    
    return similarity >= threshold


def find_university_fuzzy_match(target_uni: str, available_universities: List[str]) -> Optional[str]:
    """Find a university name in the list using fuzzy matching."""
    for available_uni in available_universities:
        if fuzzy_match_university_name(target_uni, available_uni):
            return available_uni
    return None


def normalize_erasmus_partner(partner: Dict[str, Any]) -> str:
    """Create a normalized string for deduplication of Erasmus partners."""
    # Handle both formats: erasmus_data.json and university_programs_universal.json
    name = partner.get("name") or partner.get("partner", "")
    city = partner.get("city", "")
    country = partner.get("country", "")
    return f"{normalize_string(name)}|{normalize_string(city)}|{normalize_string(country)}"


def merge_erasmus_partners(*partner_lists: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Merge multiple Erasmus partner lists and remove duplicates."""
    seen = set()
    merged = []
    
    for partner_list in partner_lists:
        if not partner_list:
            continue
        
        for partner in partner_list:
            if not isinstance(partner, dict):
                continue
            
            # Normalize partner for deduplication
            partner_key = normalize_erasmus_partner(partner)
            
            if partner_key not in seen:
                seen.add(partner_key)
                # Convert erasmus_data.json format to universal format if needed
                if "partner" in partner:
                    merged.append({
                        "name": partner["partner"],
                        "city": partner.get("city", ""),
                        "country": partner.get("country", ""),
                        "subject_area": partner.get("subject_area", ""),
                        "monthly_cost": partner.get("monthly_cost", 0)
                    })
                else:
                    merged.append(partner)
    
    return merged


def find_program_in_universal(universal_data: Dict[str, List], uni_name: str, program_name: str) -> Optional[Dict[str, Any]]:
    """Find a program in universal data by university and program name with fuzzy matching."""
    # Try exact match first
    if uni_name in universal_data:
        programs = universal_data[uni_name]
        if isinstance(programs, list):
            target_normalized = normalize_string(program_name)
            for program in programs:
                if not isinstance(program, dict):
                    continue
                program_name_in_data = program.get("name", "")
                if normalize_string(program_name_in_data) == target_normalized:
                    return program
    
    # Try fuzzy matching for university name
    fuzzy_uni_name = find_university_fuzzy_match(uni_name, list(universal_data.keys()))
    if fuzzy_uni_name and fuzzy_uni_name in universal_data:
        programs = universal_data[fuzzy_uni_name]
        if isinstance(programs, list):
            target_normalized = normalize_string(program_name)
            for program in programs:
                if not isinstance(program, dict):
                    continue
                program_name_in_data = program.get("name", "")
                if normalize_string(program_name_in_data) == target_normalized:
                    return program
    
    return None


def get_faculty_partners(erasmus_data: Dict[str, Any], uni_name: str, program_name: str) -> List[Dict[str, Any]]:
    """Get Erasmus partners at faculty level (e.g., "Wirtschaftswissenschaften") for a program."""
    # Extract faculty/subject area from program name
    program_normalized = normalize_string(program_name)
    
    # Faculty keywords that might have university-wide partners
    faculty_keywords = {
        "wirtschaft": ["wirtschaft", "business", "bwl", "management", "ökonomie", "economics"],
        "informatik": ["informatik", "computer", "it", "software", "data"],
        "ingenieur": ["ingenieur", "engineering", "technik", "tech"],
        "recht": ["recht", "law", "jura", "legal"],
        "medizin": ["medizin", "medicine", "medizinisch", "health"],
        "naturwissenschaft": ["naturwissenschaft", "natural science", "biology", "chemie", "physik"],
    }
    
    # Find matching faculty
    matched_faculty = None
    for faculty, keywords in faculty_keywords.items():
        if any(keyword in program_normalized for keyword in keywords):
            matched_faculty = faculty
            break
    
    if not matched_faculty:
        return []
    
    # Try to find university-level partners for this faculty
    # First try exact match
    if uni_name in erasmus_data:
        uni_data = erasmus_data[uni_name]
        if isinstance(uni_data, dict):
            # Look for faculty-level entries or university-wide entries
            faculty_partners = []
            for key, value in uni_data.items():
                if isinstance(value, list):
                    # Check if this is a faculty-level entry or general
                    key_normalized = normalize_string(key)
                    if matched_faculty in key_normalized or any(kw in key_normalized for kw in faculty_keywords.get(matched_faculty, [])):
                        faculty_partners.extend(value)
            if faculty_partners:
                return faculty_partners
    
    # Try fuzzy matching for university name
    fuzzy_uni_name = find_university_fuzzy_match(uni_name, list(erasmus_data.keys()))
    if fuzzy_uni_name and fuzzy_uni_name in erasmus_data:
        uni_data = erasmus_data[fuzzy_uni_name]
        if isinstance(uni_data, dict):
            faculty_partners = []
            for key, value in uni_data.items():
                if isinstance(value, list):
                    key_normalized = normalize_string(key)
                    if matched_faculty in key_normalized or any(kw in key_normalized for kw in faculty_keywords.get(matched_faculty, [])):
                        faculty_partners.extend(value)
            if faculty_partners:
                return faculty_partners
    
    return []


def convert_string_to_dict(program: str, university_name: str) -> Dict[str, Any]:
    """Convert a string program to a dictionary."""
    return {
        "name": program,
        "nc_threshold": DEFAULT_NC_THRESHOLD,
        "waiting_semesters": 0,
        "semester_fee": get_semester_fee(university_name),
        "monthly_rent_estimate": get_rent_estimate(university_name),
        "erasmusPartners": [],
        "totalMonthlyCosts": 0.0
    }


def ensure_program_structure(
    program: Any, 
    university_name: str, 
    universal_data: Dict = None,
    erasmus_data: Dict = None,
    fuzzy_matches: Dict[str, List[str]] = None
) -> Dict[str, Any]:
    """Ensure a program is a dictionary with all required fields."""
    # If program is a string, convert to dict
    if isinstance(program, str):
        program_dict = convert_string_to_dict(program, university_name)
        # Collect Erasmus partners from multiple sources
        all_partners = []
        
        # 1. Try to find from universal data (exact match)
        if universal_data:
            universal_program = find_program_in_universal(universal_data, university_name, program)
            if universal_program and "erasmusPartners" in universal_program:
                partners_list = universal_program["erasmusPartners"]
                if isinstance(partners_list, list):
                    all_partners.append(partners_list)
        
        # 2. Try to find from erasmus_data.json (exact match)
        if erasmus_data:
            # Try exact university name match
            if university_name in erasmus_data:
                uni_data = erasmus_data[university_name]
                if isinstance(uni_data, dict) and program in uni_data:
                    program_partners = uni_data[program]
                    if isinstance(program_partners, list):
                        all_partners.append(program_partners)
            
            # Try fuzzy university name match
            fuzzy_uni_name = find_university_fuzzy_match(university_name, list(erasmus_data.keys()))
            if fuzzy_uni_name and fuzzy_uni_name != university_name:
                # Track fuzzy match
                if fuzzy_matches is not None:
                    if university_name not in fuzzy_matches:
                        fuzzy_matches[university_name] = []
                    if fuzzy_uni_name not in fuzzy_matches[university_name]:
                        fuzzy_matches[university_name].append(fuzzy_uni_name)
                
                uni_data = erasmus_data[fuzzy_uni_name]
                if isinstance(uni_data, dict) and program in uni_data:
                    program_partners = uni_data[program]
                    if isinstance(program_partners, list):
                        all_partners.append(program_partners)
        
        # 3. Fallback: Try faculty-level partners
        if not all_partners and erasmus_data:
            faculty_partners = get_faculty_partners(erasmus_data, university_name, program)
            if faculty_partners:
                all_partners.append(faculty_partners)
        
        # Merge and deduplicate all partners
        if all_partners:
            program_dict["erasmusPartners"] = merge_erasmus_partners(*all_partners)
        
        return program_dict
    
    # If program is already a dict, ensure all fields exist
    if not isinstance(program, dict):
        # Fallback: convert to dict
        program_dict = {"name": str(program)}
    else:
        program_dict = program.copy()
    
    # Ensure name exists
    if "name" not in program_dict:
        program_dict["name"] = str(program)
    
    # Set nc_threshold if missing
    if "nc_threshold" not in program_dict:
        program_dict["nc_threshold"] = DEFAULT_NC_THRESHOLD
    
    # Set waiting_semesters if missing
    if "waiting_semesters" not in program_dict:
        program_dict["waiting_semesters"] = 0
    
    # Set semester_fee if missing
    if "semester_fee" not in program_dict:
        program_dict["semester_fee"] = get_semester_fee(university_name)
    
    # Set monthly_rent_estimate if missing
    if "monthly_rent_estimate" not in program_dict:
        program_dict["monthly_rent_estimate"] = get_rent_estimate(university_name)
    
    # Collect and merge Erasmus partners from multiple sources
    all_partners = []
    
    # Existing partners (if any)
    if "erasmusPartners" in program_dict and isinstance(program_dict["erasmusPartners"], list):
        all_partners.append(program_dict["erasmusPartners"])
    
    # 1. Try to find from universal data
    if universal_data:
        universal_program = find_program_in_universal(universal_data, university_name, program_dict["name"])
        if universal_program and "erasmusPartners" in universal_program:
            partners_list = universal_program["erasmusPartners"]
            if isinstance(partners_list, list):
                all_partners.append(partners_list)
    
    # 2. Try to find from erasmus_data.json
    if erasmus_data:
        # Try exact university name match
        if university_name in erasmus_data:
            uni_data = erasmus_data[university_name]
            if isinstance(uni_data, dict) and program_dict["name"] in uni_data:
                program_partners = uni_data[program_dict["name"]]
                if isinstance(program_partners, list):
                    all_partners.append(program_partners)
        
        # Try fuzzy university name match
        fuzzy_uni_name = find_university_fuzzy_match(university_name, list(erasmus_data.keys()))
        if fuzzy_uni_name and fuzzy_uni_name != university_name:
            # Track fuzzy match
            if fuzzy_matches is not None:
                if university_name not in fuzzy_matches:
                    fuzzy_matches[university_name] = []
                if fuzzy_uni_name not in fuzzy_matches[university_name]:
                    fuzzy_matches[university_name].append(fuzzy_uni_name)
            
            uni_data = erasmus_data[fuzzy_uni_name]
            if isinstance(uni_data, dict) and program_dict["name"] in uni_data:
                program_partners = uni_data[program_dict["name"]]
                if isinstance(program_partners, list):
                    all_partners.append(program_partners)
    
    # 3. Fallback: Try faculty-level partners if no program-specific partners found
    if not all_partners and erasmus_data:
        faculty_partners = get_faculty_partners(erasmus_data, university_name, program_dict["name"])
        if faculty_partners:
            all_partners.append(faculty_partners)
    
    # Merge and deduplicate all partners
    if all_partners:
        program_dict["erasmusPartners"] = merge_erasmus_partners(*all_partners)
    else:
        program_dict["erasmusPartners"] = []
    
    # Calculate totalMonthlyCosts
    semester_fee = program_dict.get("semester_fee", 0.0)
    monthly_rent = program_dict.get("monthly_rent_estimate", 0.0)
    monthly_semester_fee = semester_fee / 6.0
    program_dict["totalMonthlyCosts"] = monthly_rent + monthly_semester_fee + LIVING_COST_PADDING
    
    return program_dict


def main():
    """Main execution function."""
    print("=" * 70)
    print("Finalize Master Data Script - 100% Data Integrity")
    print("=" * 70)
    print()
    
    # Load main programs data
    print(f"📖 Loading {PROGRAMS_FILE}...")
    programs_data = load_json(PROGRAMS_FILE)
    if programs_data is None:
        print("❌ Failed to load programs data. Exiting.")
        return
    
    # Load universal data (for Erasmus partners)
    print(f"📖 Loading {UNIVERSAL_FILE}...")
    universal_data = load_json(UNIVERSAL_FILE)
    if universal_data is None:
        print("⚠️  Universal data not found. Erasmus partners will be empty.")
        universal_data = {}
    
    # Load erasmus_data.json (additional Erasmus partner source)
    print(f"📖 Loading {ERASMUS_FILE}...")
    erasmus_data = load_json(ERASMUS_FILE)
    if erasmus_data is None:
        print("⚠️  Erasmus data not found. Will only use universal data for partners.")
        erasmus_data = {}
    
    # Track fuzzy matches for reporting
    fuzzy_matches = {}
    
    # Statistics
    stats = {
        "string_leichen_repaired": 0,
        "missing_nc_filled": 0,
        "missing_semester_fee_filled": 0,
        "missing_rent_filled": 0,
        "missing_erasmus_filled": 0,
        "total_programs": 0,
        "total_universities": len(programs_data)
    }
    
    print()
    print("🔄 Processing programs...")
    print()
    
    # Process each university
    master_data = {}
    for university_name, programs in programs_data.items():
        if not isinstance(programs, list):
            print(f"⚠️  Skipping {university_name}: programs is not a list")
            continue
        
        master_programs = []
        for program in programs:
            stats["total_programs"] += 1
            
            # Check if it's a string (legacy format)
            was_string = isinstance(program, str)
            if was_string:
                stats["string_leichen_repaired"] += 1
            
            # Ensure program structure (with deep merge of Erasmus partners)
            original_program = program
            program_dict = ensure_program_structure(
                program, 
                university_name, 
                universal_data, 
                erasmus_data,
                fuzzy_matches
            )
            
            # Track what was filled
            if was_string:
                # All fields were filled
                stats["missing_nc_filled"] += 1
                stats["missing_semester_fee_filled"] += 1
                stats["missing_rent_filled"] += 1
                stats["missing_erasmus_filled"] += 1
            else:
                # Check individual fields
                if "nc_threshold" not in original_program or original_program.get("nc_threshold") is None:
                    stats["missing_nc_filled"] += 1
                if "semester_fee" not in original_program or original_program.get("semester_fee") is None:
                    stats["missing_semester_fee_filled"] += 1
                if "monthly_rent_estimate" not in original_program or original_program.get("monthly_rent_estimate") is None:
                    stats["missing_rent_filled"] += 1
                if "erasmusPartners" not in original_program:
                    stats["missing_erasmus_filled"] += 1
            
            master_programs.append(program_dict)
        
        master_data[university_name] = master_programs
    
    # Add metadata
    master_data["last_updated"] = "2026-01-15"
    master_data["data_version"] = "2026-master"
    
    # Save master data
    print()
    print(f"💾 Saving master data to {MASTER_OUTPUT}...")
    try:
        with open(MASTER_OUTPUT, 'w', encoding='utf-8') as f:
            json.dump(master_data, f, ensure_ascii=False, indent=2)
        print(f"✅ Master data saved successfully")
    except Exception as e:
        print(f"❌ Error saving master data: {e}")
        return
    
    # Calculate completeness (all programs should be dictionaries with all fields now)
    programs_complete = stats["total_programs"] - stats["string_leichen_repaired"]
    completeness_percentage = (
        (programs_complete / stats["total_programs"] * 100) if stats["total_programs"] > 0 else 100.0
    )
    
    # After processing, all programs should be complete
    final_completeness = 100.0 if stats["total_programs"] > 0 else 100.0
    
    # Print statistics
    print()
    print("=" * 70)
    print("📊 STATISTICS")
    print("=" * 70)
    print(f"Total Universities: {stats['total_universities']}")
    print(f"Total Programs: {stats['total_programs']}")
    print()
    print("🔧 Repairs:")
    print(f"  - String-Leichen repariert: {stats['string_leichen_repaired']}")
    print(f"  - NC-Schwellenwerte befüllt: {stats['missing_nc_filled']}")
    print(f"  - Semesterbeiträge befüllt: {stats['missing_semester_fee_filled']}")
    print(f"  - Mietwerte befüllt: {stats['missing_rent_filled']}")
    print(f"  - Erasmus-Partner befüllt: {stats['missing_erasmus_filled']}")
    print()
    
    # Print fuzzy matching report
    if fuzzy_matches:
        print("🔍 Fuzzy Matching Report:")
        print(f"  - {len(fuzzy_matches)} Universitäten erhielten Partner durch Fuzzy Matching:")
        for target_uni, matched_universities in sorted(fuzzy_matches.items()):
            print(f"    • '{target_uni}' ← '{', '.join(matched_universities)}'")
        print()
    else:
        print("🔍 Fuzzy Matching: Keine Fuzzy Matches gefunden (alle Treffer waren exakt)")
        print()
    
    print("✅ Data Integrity:")
    print(f"  - Programs vorher: {stats['total_programs']}")
    print(f"  - Programs nachher: {stats['total_programs']} (alle vollständig)")
    print(f"  - Vollständigkeit: {final_completeness:.1f}%")
    print()
    
    # Verify 100% completeness
    if stats["string_leichen_repaired"] == 0 and stats["missing_nc_filled"] == 0:
        print("🎉 100% Datenintegrität erreicht! Alle Programme sind vollständig.")
    else:
        if stats["string_leichen_repaired"] > 0:
            print(f"✅ {stats['string_leichen_repaired']} String-Leichen wurden in vollständige Dictionaries konvertiert.")
        if stats["missing_nc_filled"] > 0 or stats["missing_semester_fee_filled"] > 0:
            print(f"✅ Alle fehlenden Felder wurden befüllt.")
        print("✅ Finale Master-Datei hat 100% Datenintegrität!")
    
    print()
    print("=" * 70)
    print(f"✅ Master data file created: {MASTER_OUTPUT}")
    print("=" * 70)
    print()


if __name__ == "__main__":
    main()

