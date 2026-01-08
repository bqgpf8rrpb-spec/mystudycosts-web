#!/usr/bin/env python3
"""
Generate NC search index from university_programs.json.

This script:
1. Loads university_programs.json
2. Creates a flat list of all programs with NC information
3. Saves to nc_search_index.json
"""

import json
from pathlib import Path

# Define base directory (script is in data/scripts/)
BASE_DIR = Path(__file__).parent.parent.parent
PROGRAMS_FILE = BASE_DIR / "data" / "university_programs.json"
UNIVERSITIES_FILE = BASE_DIR / "data" / "universities.json"
OUTPUT_FILE = BASE_DIR / "data" / "nc_search_index.json"


def is_fachhochschule(university_name: str) -> bool:
    """
    Determine if a university is a Fachhochschule (FH) or University (Uni).
    
    Returns:
        True if FH, False if Uni
    """
    name_lower = university_name.lower()
    
    fh_keywords = [
        "applied sciences",
        "htw",
        "fh ",
        "fachhochschule",
        "hochschule für angewandte wissenschaften",
        "hochschule für technik",
        "hochschule für wirtschaft",
        "university of applied sciences",
    ]
    
    return any(keyword in name_lower for keyword in fh_keywords)


def get_city_from_university_name(university_name: str) -> str:
    """
    Extract city name from university name.
    """
    # Try to extract city from common patterns
    name_lower = university_name.lower()
    
    # Common city patterns
    city_patterns = [
        ("berlin", "Berlin"),
        ("munich", "Munich"),
        ("münchen", "Munich"),
        ("hamburg", "Hamburg"),
        ("frankfurt", "Frankfurt"),
        ("cologne", "Cologne"),
        ("köln", "Cologne"),
        ("stuttgart", "Stuttgart"),
        ("heidelberg", "Heidelberg"),
        ("aachen", "Aachen"),
        ("leipzig", "Leipzig"),
        ("dresden", "Dresden"),
        ("bonn", "Bonn"),
        ("freiburg", "Freiburg"),
        ("münster", "Münster"),
        ("mainz", "Mainz"),
        ("darmstadt", "Darmstadt"),
        ("bremen", "Bremen"),
        ("jena", "Jena"),
        ("halle", "Halle"),
        ("magdeburg", "Magdeburg"),
        ("düsseldorf", "Düsseldorf"),
        ("göttingen", "Göttingen"),
        ("karlsruhe", "Karlsruhe"),
        ("tübingen", "Tübingen"),
        ("würzburg", "Würzburg"),
        ("rostock", "Rostock"),
        ("kiel", "Kiel"),
        ("regensburg", "Regensburg"),
    ]
    
    for pattern, city in city_patterns:
        if pattern in name_lower:
            return city
    
    # If no pattern matches, try to extract from "University of X" pattern
    if "university of" in name_lower:
        parts = university_name.split("University of")
        if len(parts) > 1:
            city_part = parts[1].strip().split()[0]
            # Remove common suffixes
            city_part = city_part.replace("(", "").replace(")", "").split(",")[0]
            return city_part
    
    return "Unknown"


def get_state_from_city(city: str, universities_map: dict) -> str:
    """
    Get state from city using universities.json data or city-to-state mapping.
    Returns German state names.
    """
    # First check if we have the city in our universities map
    for uni_data in universities_map.values():
        uni_city = uni_data.get('city', '')
        if uni_city.lower() == city.lower():
            state = uni_data.get('state', '')
            # Convert English state names to German if needed
            state = convert_state_to_german(state)
            if state:
                return state
    
    # Comprehensive city-to-state mapping (German state names)
    city_to_state = {
        # Berlin
        "Berlin": "Berlin",
        
        # Bayern (Bavaria)
        "Munich": "Bayern",
        "München": "Bayern",
        "Würzburg": "Bayern",
        "Regensburg": "Bayern",
        "Augsburg": "Bayern",
        "Erlangen": "Bayern",
        "Nürnberg": "Bayern",
        "Nuremberg": "Bayern",
        "Passau": "Bayern",
        "Bayreuth": "Bayern",
        "Bamberg": "Bayern",
        
        # Hamburg
        "Hamburg": "Hamburg",
        
        # NRW (North Rhine-Westphalia)
        "Cologne": "NRW",
        "Köln": "NRW",
        "Aachen": "NRW",
        "Düsseldorf": "NRW",
        "Bonn": "NRW",
        "Münster": "NRW",
        "Dortmund": "NRW",
        "Duisburg": "NRW",
        "Essen": "NRW",
        "Bochum": "NRW",
        "Bielefeld": "NRW",
        "Siegen": "NRW",
        "Wuppertal": "NRW",
        "Gelsenkirchen": "NRW",
        "Mönchengladbach": "NRW",
        "Krefeld": "NRW",
        "Leverkusen": "NRW",
        "Paderborn": "NRW",
        
        # Hessen
        "Frankfurt": "Hessen",
        "Darmstadt": "Hessen",
        "Kassel": "Hessen",
        "Gießen": "Hessen",
        "Marburg": "Hessen",
        "Fulda": "Hessen",
        "Wiesbaden": "Hessen",
        
        # Sachsen (Saxony)
        "Leipzig": "Sachsen",
        "Dresden": "Sachsen",
        "Chemnitz": "Sachsen",
        
        # Baden-Württemberg
        "Heidelberg": "Baden-Württemberg",
        "Stuttgart": "Baden-Württemberg",
        "Karlsruhe": "Baden-Württemberg",
        "Freiburg": "Baden-Württemberg",
        "Tübingen": "Baden-Württemberg",
        "Ulm": "Baden-Württemberg",
        "Mannheim": "Baden-Württemberg",
        "Konstanz": "Baden-Württemberg",
        "Heilbronn": "Baden-Württemberg",
        
        # Sachsen-Anhalt
        "Halle": "Sachsen-Anhalt",
        "Magdeburg": "Sachsen-Anhalt",
        
        # Thüringen (Thuringia)
        "Jena": "Thüringen",
        "Weimar": "Thüringen",
        "Erfurt": "Thüringen",
        "Ilmenau": "Thüringen",
        
        # Niedersachsen (Lower Saxony)
        "Göttingen": "Niedersachsen",
        "Hannover": "Niedersachsen",
        "Hanover": "Niedersachsen",
        "Braunschweig": "Niedersachsen",
        "Osnabrück": "Niedersachsen",
        "Oldenburg": "Niedersachsen",
        "Lüneburg": "Niedersachsen",
        
        # Rheinland-Pfalz (Rhineland-Palatinate)
        "Mainz": "Rheinland-Pfalz",
        "Trier": "Rheinland-Pfalz",
        "Kaiserslautern": "Rheinland-Pfalz",
        "Koblenz": "Rheinland-Pfalz",
        "Landau": "Rheinland-Pfalz",
        
        # Bremen
        "Bremen": "Bremen",
        
        # Schleswig-Holstein
        "Kiel": "Schleswig-Holstein",
        "Lübeck": "Schleswig-Holstein",
        "Flensburg": "Schleswig-Holstein",
        
        # Mecklenburg-Vorpommern
        "Rostock": "Mecklenburg-Vorpommern",
        "Greifswald": "Mecklenburg-Vorpommern",
        "Stralsund": "Mecklenburg-Vorpommern",
        
        # Saarland
        "Saarbrücken": "Saarland",
        "Saarbrucken": "Saarland",
        
        # Brandenburg
        "Potsdam": "Brandenburg",
        "Cottbus": "Brandenburg",
        "Frankfurt (Oder)": "Brandenburg",
    }
    
    return city_to_state.get(city, "Unknown")


def convert_state_to_german(state: str) -> str:
    """
    Convert English state names to German names.
    """
    if not state:
        return ""
    
    state_lower = state.lower().strip()
    conversion_map = {
        # Standard case (as they appear in universities.json)
        "bavaria": "Bayern",
        "north rhine-westphalia": "NRW",
        "hesse": "Hessen",
        "saxony": "Sachsen",
        "saxony-anhalt": "Sachsen-Anhalt",
        "thuringia": "Thüringen",
        "lower saxony": "Niedersachsen",
        "rhineland-palatinate": "Rheinland-Pfalz",
        "schleswig-holstein": "Schleswig-Holstein",
        "mecklenburg-western pomerania": "Mecklenburg-Vorpommern",
        "baden-württemberg": "Baden-Württemberg",
        "baden-wuerttemberg": "Baden-Württemberg",
        "berlin": "Berlin",
        "hamburg": "Hamburg",
        "bremen": "Bremen",
        "saarland": "Saarland",
        "brandenburg": "Brandenburg",
    }
    
    # Try exact match first (case-sensitive)
    if state in conversion_map:
        return conversion_map[state]
    
    # Try case-insensitive match
    if state_lower in conversion_map:
        return conversion_map[state_lower]
    
    # Return original if no conversion found (might already be German)
    return state


def generate_nc_index():
    """Generate NC search index from university programs."""
    print("="*70)
    print("GENERATING NC SEARCH INDEX")
    print("="*70)
    print()
    
    # Load programs data
    if not PROGRAMS_FILE.exists():
        print(f"❌ Error: File not found: {PROGRAMS_FILE}")
        return False
    
    print(f"📖 Loading: {PROGRAMS_FILE}")
    with open(PROGRAMS_FILE, 'r', encoding='utf-8') as f:
        programs_data = json.load(f)
    
    print(f"✅ Loaded {len(programs_data)} universities")
    
    # Load universities data for city/state mapping
    universities_map = {}
    if UNIVERSITIES_FILE.exists():
        print(f"📖 Loading: {UNIVERSITIES_FILE}")
        with open(UNIVERSITIES_FILE, 'r', encoding='utf-8') as f:
            universities_list = json.load(f)
            for uni in universities_list:
                universities_map[uni['name']] = uni
        print(f"✅ Loaded {len(universities_map)} university mappings")
    
    print()
    
    # Generate index
    index = []
    stats = {
        'total_programs': 0,
        'with_nc': 0,
        'without_nc': 0,
        'uni_count': 0,
        'fh_count': 0,
    }
    
    for university_name, programs in programs_data.items():
        if not isinstance(programs, list):
            continue
        
        # Determine university type
        is_fh = is_fachhochschule(university_name)
        if is_fh:
            stats['fh_count'] += 1
        else:
            stats['uni_count'] += 1
        
        # Get city and state
        city = get_city_from_university_name(university_name)
        
        # Try to get from universities_map first
        if university_name in universities_map:
            uni_data = universities_map[university_name]
            city = uni_data.get('city', city)
            state = uni_data.get('state', get_state_from_city(city, universities_map))
        else:
            state = get_state_from_city(city, universities_map)
        
        # Process each program
        for program in programs:
            if isinstance(program, str):
                program_name = program
                nc_threshold = None
                monthly_rent = 0.0
                semester_fee = 0.0
            elif isinstance(program, dict):
                program_name = program.get('name', '')
                nc_threshold = program.get('nc_threshold')
                monthly_rent = program.get('monthly_rent_estimate', 0.0) or 0.0
                semester_fee = program.get('semester_fee', 0.0) or 0.0
            else:
                continue
            
            if not program_name:
                continue
            
            stats['total_programs'] += 1
            if nc_threshold is not None and nc_threshold > 0:
                stats['with_nc'] += 1
            else:
                stats['without_nc'] += 1
            
            # Calculate total monthly costs
            semester_fee_monthly = (semester_fee / 6.0) if semester_fee else 0.0
            total_monthly_costs = monthly_rent + semester_fee_monthly
            
            # Create index entry
            index_entry = {
                "programName": program_name,
                "university": university_name,
                "city": city,
                "state": state,
                "type": "FH" if is_fh else "Uni",
                "nc": float(nc_threshold) if nc_threshold is not None and nc_threshold > 0 else None,
                "totalMonthlyCosts": round(total_monthly_costs, 2)
            }
            
            index.append(index_entry)
    
    print("="*70)
    print("STATISTICS")
    print("="*70)
    print(f"  Total Programs:              {stats['total_programs']}")
    print(f"  Programs with NC:            {stats['with_nc']}")
    print(f"  Programs without NC:         {stats['without_nc']}")
    print(f"  Universities (Uni):          {stats['uni_count']}")
    print(f"  Universities (FH):           {stats['fh_count']}")
    print(f"  Index Entries Created:       {len(index)}")
    print()
    
    # Save index
    print(f"💾 Saving: {OUTPUT_FILE}")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    print("✅ Successfully generated NC search index!")
    print()
    return True


if __name__ == "__main__":
    try:
        success = generate_nc_index()
        exit(0 if success else 1)
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

