#!/usr/bin/env python3
"""
Auto-Update NC Thresholds Script

This script updates NC thresholds in university_programs.json based on external data source.
It performs safety checks, creates backups, and logs all changes.
"""

import json
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

# Paths
BASE_DIR = Path(__file__).parent.parent
PROGRAMS_FILE = BASE_DIR / "university_programs.json"
NEW_DATA_FILE = BASE_DIR / "new_nc_data.json"
BACKUP_DIR = BASE_DIR / "backups"
BACKUP_FILE = BACKUP_DIR / "university_programs_old.json"

# Date format for last_updated
LAST_UPDATED = "2026-01-15"  # January 2026


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


def validate_json_structure(data: Dict[str, Any]) -> bool:
    """Validate that the JSON structure is correct (dictionary with university keys)."""
    if not isinstance(data, dict):
        print("❌ Root structure is not a dictionary")
        return False
    
    # Check that all values are lists
    for uni_name, programs in data.items():
        if uni_name == "last_updated":
            continue  # Skip metadata fields
        if not isinstance(programs, list):
            print(f"⚠️  Programs for {uni_name} is not a list (skipping)")
            continue  # Skip this university but continue validation
        for program in programs:
            if not isinstance(program, dict):
                # Some programs might be stored as strings (legacy format)
                # We skip these during validation
                continue
            if "name" not in program or "nc_threshold" not in program:
                print(f"⚠️  Program in {uni_name} missing required fields (name, nc_threshold) - skipping")
                continue
    
    return True


def create_backup(source_file: Path, backup_file: Path) -> bool:
    """Create a backup of the source file."""
    try:
        # Ensure backup directory exists
        backup_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Create backup
        shutil.copy2(source_file, backup_file)
        print(f"✅ Backup created: {backup_file}")
        return True
    except Exception as e:
        print(f"❌ Error creating backup: {e}")
        return False


def normalize_string(s: str) -> str:
    """Normalize strings for matching (lowercase, strip whitespace)."""
    return s.lower().strip()


def find_matching_program(
    programs: List[Dict[str, Any]], 
    target_program_name: str
) -> Optional[Dict[str, Any]]:
    """Find a program in the list that matches the target name (case-insensitive)."""
    target_normalized = normalize_string(target_program_name)
    
    for program in programs:
        program_name = program.get("name", "")
        if normalize_string(program_name) == target_normalized:
            return program
    
    return None


def update_nc_thresholds(
    programs_data: Dict[str, Any],
    new_data: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Update NC thresholds in programs_data based on new_data.
    Returns list of update logs.
    """
    updates = []
    
    for new_entry in new_data:
        university_name = new_entry.get("university")
        program_name = new_entry.get("program")
        new_nc = new_entry.get("nc_threshold")
        
        # Validate new entry
        if not all([university_name, program_name, new_nc is not None]):
            print(f"⚠️  Skipping invalid entry: {new_entry}")
            continue
        
        # Check if university exists
        if university_name not in programs_data:
            print(f"⚠️  University not found: {university_name}")
            continue
        
        # Find matching program
        programs = programs_data[university_name]
        
        # Skip if programs is not a list (shouldn't happen, but safety check)
        if not isinstance(programs, list):
            print(f"⚠️  Programs for {university_name} is not a list (skipping)")
            continue
        
        program = find_matching_program(programs, program_name)
        
        if not program:
            print(f"⚠️  Program not found: {program_name} at {university_name}")
            continue
        
        # Skip if program is not a dictionary (legacy string format)
        if not isinstance(program, dict):
            print(f"⚠️  Program {program_name} at {university_name} is stored as string (legacy format, skipping)")
            continue
        
        # Check if update is needed
        old_nc = program.get("nc_threshold")
        if old_nc == new_nc:
            # No change needed
            continue
        
        # Update NC threshold
        program["nc_threshold"] = new_nc
        updates.append({
            "university": university_name,
            "program": program_name,
            "old_nc": old_nc,
            "new_nc": new_nc
        })
        print(f"✅ Update: {program_name} at {university_name} from {old_nc} to {new_nc}")
    
    return updates


def save_json(file_path: Path, data: Dict[str, Any]) -> bool:
    """Save JSON file with proper formatting."""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✅ File saved: {file_path}")
        return True
    except Exception as e:
        print(f"❌ Error saving file: {e}")
        return False


def main():
    """Main execution function."""
    print("=" * 70)
    print("NC Threshold Auto-Update Script")
    print("=" * 70)
    print()
    
    # Load existing programs data
    print(f"📖 Loading {PROGRAMS_FILE}...")
    programs_data = load_json(PROGRAMS_FILE)
    if programs_data is None:
        print("❌ Failed to load programs data. Exiting.")
        return
    
    # Validate existing structure
    print("🔍 Validating JSON structure...")
    if not validate_json_structure(programs_data):
        print("❌ JSON structure validation failed. Exiting.")
        return
    print("✅ JSON structure is valid")
    print()
    
    # Load new NC data
    print(f"📖 Loading new NC data from {NEW_DATA_FILE}...")
    new_data_raw = load_json(NEW_DATA_FILE)
    if new_data_raw is None:
        print("❌ Failed to load new NC data. Exiting.")
        print(f"💡 Tip: Create {NEW_DATA_FILE} with format:")
        print('   [')
        print('     {')
        print('       "university": "Technical University of Munich (TUM)",')
        print('       "program": "Business Administration (B.Sc.)",')
        print('       "nc_threshold": 1.8')
        print('     }')
        print('   ]')
        return
    
    # Ensure new_data is a list
    if not isinstance(new_data_raw, list):
        print("❌ New NC data must be a list. Exiting.")
        return
    
    new_data = new_data_raw
    print(f"✅ Loaded {len(new_data)} entries from new NC data")
    print()
    
    # Create backup before making changes
    print("💾 Creating backup...")
    if not create_backup(PROGRAMS_FILE, BACKUP_FILE):
        print("❌ Backup creation failed. Exiting to prevent data loss.")
        return
    print()
    
    # Update NC thresholds
    print("🔄 Updating NC thresholds...")
    updates = update_nc_thresholds(programs_data, new_data)
    print()
    
    if not updates:
        print("ℹ️  No updates needed. All NC thresholds are already up to date.")
        return
    
    print(f"📊 Summary: {len(updates)} NC threshold(s) updated")
    print()
    
    # Set last_updated field
    programs_data["last_updated"] = LAST_UPDATED
    print(f"📅 Set last_updated to: {LAST_UPDATED}")
    print()
    
    # Validate JSON structure again before saving
    print("🔍 Validating updated JSON structure...")
    if not validate_json_structure(programs_data):
        print("❌ JSON structure validation failed after updates!")
        print(f"💡 Restore from backup: {BACKUP_FILE}")
        return
    print("✅ JSON structure is still valid")
    print()
    
    # Save updated data
    print("💾 Saving updated data...")
    if not save_json(PROGRAMS_FILE, programs_data):
        print("❌ Failed to save updated data!")
        print(f"💡 Restore from backup: {BACKUP_FILE}")
        return
    
    print()
    print("=" * 70)
    print("✅ Update completed successfully!")
    print("=" * 70)
    print()
    print(f"📝 Updated {len(updates)} NC threshold(s)")
    print(f"💾 Backup saved to: {BACKUP_FILE}")
    print(f"📅 Last updated: {LAST_UPDATED}")
    print()


if __name__ == "__main__":
    main()

