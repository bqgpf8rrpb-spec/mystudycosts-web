#!/usr/bin/env python3
from __future__ import annotations

import os
import sys

# Prevent local "types.py" in this folder from shadowing stdlib "types".
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR in sys.path:
    sys.path.remove(SCRIPT_DIR)

import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from google import genai
from google.genai import types


DATA_PATH = Path("data/university_programs_v2.json")
TEST_LIMIT = 10
GEMINI_MODEL = "gemini-2.0-flash"

TARGET_PROGRAM_PATTERN = re.compile(r"(psychologie|betriebswirtschaft|bwl)", re.IGNORECASE)
BACHELOR_PATTERN = re.compile(r"(bachelor|b\.?\s*sc\.?|b\.?\s*a\.?)", re.IGNORECASE)


def load_json(path: Path) -> Dict[str, List[Any]]:
    with path.open("r", encoding="utf-8") as f:
        payload = json.load(f)

    if not isinstance(payload, dict):
        raise ValueError("Unsupported JSON structure. Expected dict: {university: [programs...]}.")

    for university, programs in payload.items():
        if not isinstance(university, str) or not isinstance(programs, list):
            raise ValueError("Invalid structure. Expected dict entries like: {'Uni': ['Program', ...]}.")

    return payload


def save_json(path: Path, payload: Any) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")


def normalize_program(program: Any) -> Dict[str, Any]:
    if isinstance(program, str):
        return {"name": program.strip(), "nc_value": None, "nc_last_updated": None}
    if isinstance(program, dict):
        name = str(program.get("name", "")).strip()
        return {
            "name": name,
            "nc_value": program.get("nc_value"),
            "nc_last_updated": program.get("nc_last_updated"),
        }
    return {"name": str(program).strip(), "nc_value": None, "nc_last_updated": None}


def is_tum(university_name: str) -> bool:
    name = university_name.lower()
    return "technical university of munich" in name or "(tum)" in name


def matches_target_program(program_name: str) -> bool:
    return bool(TARGET_PROGRAM_PATTERN.search(program_name) and BACHELOR_PATTERN.search(program_name))


def extract_nc_with_gemini(client: genai.Client, program_name: str, university_name: str) -> str:
    prompt = (
        f"Suche im Internet (Google) nach den aktuellsten NC-Werten (Numerus Clausus) für das Hauptverfahren des Studiengangs '{program_name}' "
        f"an der Hochschule '{university_name}'. Extrahiere den finalen Grenzwert (z.B. 1,7 oder 2.3). Wenn der Studiengang offiziell "
        f"'zulassungsfrei', ein Master ohne klassischen NC ist oder ein 'Eignungsfeststellungsverfahren' nutzt, antworte mit 'N/A'. "
        f"Antworte NUR mit validem JSON: {{'nc': '<Wert>'}}"
    )

    response = None
    for attempt in range(2):
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    tools=[{"google_search": {}}],
                    temperature=0.0,
                ),
            )
            break
        except Exception as exc:
            if attempt == 0:
                print("Rate limit hit, waiting 15s...")
                time.sleep(15)
                continue
            print(f"Warning: retry failed for model {GEMINI_MODEL}: {exc}")
            raise

    if response is None:
        raise RuntimeError("No response returned from Gemini.")
    raw_text = (response.text or "").strip()

    # Accept either strict JSON or single-quoted pseudo-JSON from model.
    match = re.search(r"\{.*\}", raw_text, re.DOTALL)
    candidate = match.group(0).strip() if match else raw_text
    normalized = candidate.replace("'", '"')
    try:
        parsed = json.loads(normalized)
        nc_value = str(parsed.get("nc", "N/A")).strip()
    except json.JSONDecodeError:
        # Last fallback: directly detect grade pattern.
        grade_match = re.search(r"\b([1-4](?:[.,]\d{1,2})?)\b", raw_text)
        nc_value = grade_match.group(1).replace(",", ".") if grade_match else "N/A"

    return nc_value if nc_value else "N/A"


def reset_na_values(payload: Dict[str, List[Any]]) -> None:
    for _, programs in payload.items():
        for idx, program in enumerate(programs):
            normalized = normalize_program(program)
            if str(normalized.get("nc_value", "")).strip().upper() == "N/A":
                normalized["nc_value"] = None
                normalized["nc_last_updated"] = None
            programs[idx] = normalized


def main() -> None:
    if not os.getenv("GEMINI_API_KEY", "").strip():
        raise RuntimeError("GEMINI_API_KEY is not set.")

    client = genai.Client()

    payload = load_json(DATA_PATH)
    reset_na_values(payload)
    candidates: List[Dict[str, Any]] = []

    # Target classic NC bachelor programs, excluding TUM.
    for university, programs in payload.items():
        if is_tum(university):
            continue

        for idx, program in enumerate(programs):
            normalized = normalize_program(program)
            programs[idx] = normalized

            program_name = str(normalized.get("name", "")).strip()
            if (
                normalized.get("nc_value") is None
                and matches_target_program(program_name)
                and len(candidates) < TEST_LIMIT
            ):
                candidates.append(
                    {
                        "university": university,
                        "program_index": idx,
                    }
                )

    if not candidates:
        print("No matching entries found for Psychologie/Betriebswirtschaft/BWL Bachelor programs.")
        return

    results: List[Dict[str, str]] = []
    timestamp = datetime.now(timezone.utc).isoformat()

    for i, candidate in enumerate(candidates):
        time.sleep(5)
        university = candidate["university"]
        program_index = candidate["program_index"]
        entry = payload[university][program_index]
        program = str(entry.get("name", "")).strip() or "UNKNOWN_PROGRAM"
        try:
            nc_value = extract_nc_with_gemini(client, program, university)
        except Exception as exc:
            print(f"Warning: extraction failed for {university} | {program}: {exc}")
            nc_value = "N/A"

        entry["nc_value"] = nc_value
        entry["nc_last_updated"] = timestamp

        results.append(
            {
                "university": university,
                "program": program,
                "nc_value": nc_value,
            }
        )

        print(f"[{i + 1}/{len(candidates)}] {university} | {program} -> NC: {nc_value}")

    save_json(DATA_PATH, payload)

    print(f"\n--- RESULTS ({len(results)} TEST ENTRIES) ---")
    for row in results:
        print(f"{row['university']} | {row['program']} | NC: {row['nc_value']}")


if __name__ == "__main__":
    main()
