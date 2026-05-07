#!/usr/bin/env node

/**
 * Studiengang Mapping
 *
 * Maps Erasmus partners to specific study programs (Studiengänge) by
 * cross-referencing subject areas from erasmus_partners.json with
 * program names in university_master_2026.json.
 *
 * Strategy:
 *   1. Match programs to subject areas via keyword mapping
 *   2. Partners with matching subject_area or faculty_department get assigned
 *   3. Partners with "General" subject area get assigned to all programs
 *   4. Output: updated university_master_2026.json with enriched erasmusPartners
 */

const fs = require('fs');
const path = require('path');

const MASTER_PATH = path.join(__dirname, '..', 'data', 'university_master_2026.json');
const PARTNERS_PATH = path.join(__dirname, '..', 'data', 'erasmus_partners.json');
const UNI_MAPPING_PATH = path.join(__dirname, '..', 'data', 'german_uni_mapping.json');
const UNMATCHED_OUTPUT_PATH = path.join(__dirname, '..', 'data', 'unmatched_universities.json');

// Maps program name keywords to EU data subject areas
const PROGRAM_TO_SUBJECTS = {
  'computer science': ['ICT', 'Information & Communication Technologies', 'General'],
  'informatik': ['ICT', 'Information & Communication Technologies', 'General'],
  'informatics': ['ICT', 'Information & Communication Technologies', 'General'],
  'data science': ['ICT', 'Information & Communication Technologies', 'Mathematics & Statistics', 'General'],
  'data engineering': ['ICT', 'Information & Communication Technologies', 'General'],
  'software': ['ICT', 'Information & Communication Technologies', 'General'],
  'information systems': ['ICT', 'Information & Communication Technologies', 'Business Administration', 'General'],
  'business informatics': ['ICT', 'Business Administration', 'General'],
  'wirtschaftsinformatik': ['ICT', 'Business Administration', 'General'],
  'cybersecurity': ['ICT', 'Information & Communication Technologies', 'General'],

  'business administration': ['Business Administration', 'Business & Law', 'General'],
  'betriebswirtschaft': ['Business Administration', 'Business & Law', 'General'],
  'bwl': ['Business Administration', 'Business & Law', 'General'],
  'management': ['Business Administration', 'Business & Law', 'General'],
  'economics': ['Business Administration', 'Social Sciences', 'General'],
  'volkswirtschaft': ['Business Administration', 'Social Sciences', 'General'],
  'vwl': ['Business Administration', 'Social Sciences', 'General'],
  'finance': ['Business Administration', 'Business & Law', 'General'],
  'accounting': ['Business Administration', 'Business & Law', 'General'],
  'marketing': ['Business Administration', 'General'],
  'industrial engineering': ['Engineering', 'Business Administration', 'General'],
  'wirtschaftsingenieur': ['Engineering', 'Business Administration', 'General'],

  'mechanical engineering': ['Engineering', 'Manufacturing & Processing', 'General'],
  'maschinenbau': ['Engineering', 'Manufacturing & Processing', 'General'],
  'electrical engineering': ['Engineering', 'General'],
  'elektrotechnik': ['Engineering', 'General'],
  'civil engineering': ['Engineering', 'Architecture & Construction', 'General'],
  'bauingenieur': ['Engineering', 'Architecture & Construction', 'General'],
  'chemical engineering': ['Engineering', 'Physics & Chemistry', 'General'],
  'bioengineering': ['Engineering', 'Biology', 'General'],
  'biomedical engineering': ['Engineering', 'Medicine', 'General'],
  'automotive': ['Engineering', 'Manufacturing & Processing', 'General'],
  'aerospace': ['Engineering', 'General'],
  'process engineering': ['Engineering', 'Manufacturing & Processing', 'General'],
  'materials science': ['Engineering', 'Physics & Chemistry', 'General'],
  'environmental engineering': ['Engineering', 'Environmental Sciences', 'General'],
  'robotics': ['Engineering', 'ICT', 'General'],
  'mechatronics': ['Engineering', 'General'],
  'energy': ['Engineering', 'Environmental Sciences', 'General'],
  'transportation': ['Engineering', 'General'],

  'medicine': ['Medicine', 'Health Sciences', 'General'],
  'medizin': ['Medicine', 'Health Sciences', 'General'],
  'pharmacy': ['Medicine', 'Health Sciences', 'General'],
  'pharmazie': ['Medicine', 'Health Sciences', 'General'],
  'health': ['Health Sciences', 'Medicine', 'General'],
  'gesundheit': ['Health Sciences', 'Medicine', 'General'],
  'nursing': ['Health Sciences', 'Social Services', 'General'],
  'dental': ['Medicine', 'Health Sciences', 'General'],
  'veterinary': ['Veterinary Medicine', 'General'],
  'tiermedizin': ['Veterinary Medicine', 'General'],
  'nutritional science': ['Biology', 'Health Sciences', 'General'],

  'law': ['Law', 'Business & Law', 'General'],
  'jura': ['Law', 'Business & Law', 'General'],
  'rechtswissenschaft': ['Law', 'Business & Law', 'General'],

  'architecture': ['Architecture & Construction', 'General'],
  'architektur': ['Architecture & Construction', 'General'],
  'urban planning': ['Architecture & Construction', 'Social Sciences', 'General'],
  'stadtplanung': ['Architecture & Construction', 'Social Sciences', 'General'],

  'mathematics': ['Mathematics & Statistics', 'Natural Sciences', 'General'],
  'mathematik': ['Mathematics & Statistics', 'Natural Sciences', 'General'],
  'statistics': ['Mathematics & Statistics', 'General'],
  'statistik': ['Mathematics & Statistics', 'General'],

  'physics': ['Physics & Chemistry', 'Natural Sciences', 'General'],
  'physik': ['Physics & Chemistry', 'Natural Sciences', 'General'],
  'chemistry': ['Physics & Chemistry', 'Natural Sciences', 'General'],
  'chemie': ['Physics & Chemistry', 'Natural Sciences', 'General'],
  'geoscience': ['Environmental Sciences', 'Natural Sciences', 'General'],
  'geowissenschaft': ['Environmental Sciences', 'Natural Sciences', 'General'],
  'geology': ['Environmental Sciences', 'Natural Sciences', 'General'],
  'meteorology': ['Environmental Sciences', 'Natural Sciences', 'General'],

  'biology': ['Biology', 'Natural Sciences', 'General'],
  'biologie': ['Biology', 'Natural Sciences', 'General'],
  'biochemistry': ['Biology', 'Physics & Chemistry', 'General'],
  'biotechnology': ['Biology', 'Engineering', 'General'],
  'life science': ['Biology', 'Natural Sciences', 'General'],
  'molecular': ['Biology', 'General'],

  'psychology': ['Social Sciences', 'Health Sciences', 'General'],
  'psychologie': ['Social Sciences', 'Health Sciences', 'General'],
  'sociology': ['Social Sciences', 'General'],
  'soziologie': ['Social Sciences', 'General'],
  'political science': ['Social Sciences', 'General'],
  'politikwissenschaft': ['Social Sciences', 'General'],
  'political': ['Social Sciences', 'General'],
  'international relations': ['Social Sciences', 'General'],
  'public policy': ['Social Sciences', 'General'],
  'public administration': ['Social Sciences', 'Business Administration', 'General'],

  'education': ['Education', 'General'],
  'erziehungswissenschaft': ['Education', 'General'],
  'pädagogik': ['Education', 'General'],
  'paedagogik': ['Education', 'General'],
  'lehramt': ['Education', 'General'],
  'teaching': ['Education', 'General'],
  'sports science': ['Education', 'General'],
  'sportwissenschaft': ['Education', 'General'],

  'history': ['Humanities', 'Arts & Humanities', 'General'],
  'geschichte': ['Humanities', 'Arts & Humanities', 'General'],
  'philosophy': ['Humanities', 'Arts & Humanities', 'General'],
  'philosophie': ['Humanities', 'Arts & Humanities', 'General'],
  'theology': ['Humanities', 'Arts & Humanities', 'General'],
  'theologie': ['Humanities', 'Arts & Humanities', 'General'],
  'cultural studies': ['Humanities', 'Arts & Humanities', 'General'],
  'kulturwissenschaft': ['Humanities', 'Arts & Humanities', 'General'],
  'linguistics': ['Languages', 'Humanities', 'General'],
  'sprachwissenschaft': ['Languages', 'Humanities', 'General'],
  'philology': ['Languages', 'Humanities', 'General'],
  'philologie': ['Languages', 'Humanities', 'General'],
  'literature': ['Languages', 'Humanities', 'General'],
  'literaturwissenschaft': ['Languages', 'Humanities', 'General'],
  'german studies': ['Languages', 'Humanities', 'General'],
  'germanistik': ['Languages', 'Humanities', 'General'],
  'english studies': ['Languages', 'Humanities', 'General'],
  'anglistik': ['Languages', 'Humanities', 'General'],
  'romance': ['Languages', 'Humanities', 'General'],
  'romanistik': ['Languages', 'Humanities', 'General'],
  'slavic': ['Languages', 'Humanities', 'General'],
  'slawistik': ['Languages', 'Humanities', 'General'],

  'art': ['Arts', 'Arts & Humanities', 'General'],
  'kunst': ['Arts', 'Arts & Humanities', 'General'],
  'music': ['Arts', 'General'],
  'musik': ['Arts', 'General'],
  'design': ['Arts', 'General'],
  'film': ['Arts', 'Journalism & Media', 'General'],
  'theater': ['Arts', 'General'],
  'media': ['Journalism & Media', 'Arts', 'General'],
  'kommunikation': ['Journalism & Media', 'Social Sciences', 'General'],
  'journalism': ['Journalism & Media', 'General'],
  'publizistik': ['Journalism & Media', 'General'],

  'social work': ['Social Work', 'Social Services', 'General'],
  'soziale arbeit': ['Social Work', 'Social Services', 'General'],

  'agriculture': ['Agriculture', 'General'],
  'agrarwissenschaft': ['Agriculture', 'General'],
  'horticultural': ['Agriculture', 'General'],
  'forest': ['Forestry', 'Agriculture', 'General'],
  'forstwissenschaft': ['Forestry', 'Agriculture', 'General'],
  'food': ['Agriculture', 'Biology', 'General'],
  'lebensmittel': ['Agriculture', 'Biology', 'General'],

  'geography': ['Environmental Sciences', 'Social Sciences', 'General'],
  'geographie': ['Environmental Sciences', 'Social Sciences', 'General'],

  'tourism': ['Services', 'Business Administration', 'General'],
  'logistics': ['Engineering', 'Business Administration', 'General'],
};

function programNameToSubjects(programName) {
  const lower = programName.toLowerCase();
  const matched = new Set();

  for (const [keyword, subjects] of Object.entries(PROGRAM_TO_SUBJECTS)) {
    if (lower.includes(keyword)) {
      subjects.forEach(s => matched.add(s));
    }
  }

  if (matched.size === 0) {
    matched.add('General');
  }

  return [...matched];
}

function normalizeUniId(name) {
  return name
    .replace(/[^a-zA-ZäöüÄÖÜß\s-]/g, '')
    .trim()
    .toUpperCase()
    .replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE').replace(/ß/g, 'SS')
    .replace(/\s+/g, '_').replace(/-+/g, '_').replace(/_+/g, '_')
    .substring(0, 60);
}

function findEuUniId(masterUniName, uniMapping, euDb) {
  if (uniMapping[masterUniName]) return uniMapping[masterUniName];

  const lower = masterUniName.toLowerCase();
  for (const [name, id] of Object.entries(uniMapping)) {
    if (name.toLowerCase() === lower) return id;
  }

  for (const uniId of Object.keys(euDb.universities)) {
    const euName = euDb.universities[uniId].name.toLowerCase();
    if (euName.includes(lower) || lower.includes(euName)) return uniId;
  }

  const normalized = normalizeUniId(masterUniName);
  if (euDb.universities[normalized]) return normalized;

  return null;
}

// Phase 5: Fuzzy match for unmatched universities (token-based Jaccard)
function tokenMatch(a, b) {
  const tok = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim().split(/\s+/).filter(t => t.length > 1);
  const t1 = new Set(tok(a));
  const t2 = new Set(tok(b));
  if (t1.size === 0 || t2.size === 0) return 0;
  const inter = [...t1].filter(x => t2.has(x)).length;
  return inter / (t1.size + t2.size - inter);
}

function suggestEuUniId(masterUniName, euDb) {
  let best = null, bestScore = 0.4;
  for (const [euId, uni] of Object.entries(euDb.universities)) {
    const s = tokenMatch(masterUniName, uni.name);
    if (s > bestScore) { bestScore = s; best = { euId, euName: uni.name, score: s }; }
  }
  return best;
}

async function main() {
  console.log('=== Studiengang Mapping ===\n');

  const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf-8'));
  const euDb = JSON.parse(fs.readFileSync(PARTNERS_PATH, 'utf-8'));
  const uniMapping = JSON.parse(fs.readFileSync(UNI_MAPPING_PATH, 'utf-8'));

  const masterUniNames = Object.keys(master);
  console.log(`Master: ${masterUniNames.length} universities`);
  console.log(`EU data: ${Object.keys(euDb.universities).length} universities\n`);

  let stats = {
    unisMatched: 0,
    unisUnmatched: 0,
    programsUpdated: 0,
    programsSkipped: 0,
    partnersAssigned: 0,
  };

  const unmatchedList = [];

  for (const masterUniName of masterUniNames) {
    const euUniId = findEuUniId(masterUniName, uniMapping, euDb);

    if (!euUniId || !euDb.universities[euUniId]) {
      stats.unisUnmatched++;
      const suggestion = suggestEuUniId(masterUniName, euDb);
      unmatchedList.push({
        master_name: masterUniName,
        suggested_eu_id: suggestion?.euId || null,
        suggested_eu_name: suggestion?.euName || null,
        score: suggestion?.score || null,
      });
      continue;
    }

    stats.unisMatched++;
    const euPartners = euDb.universities[euUniId].partners;
    const programs = master[masterUniName];

    for (const program of programs) {
      const relevantSubjects = programNameToSubjects(program.name);

      const matchedPartners = euPartners.filter(p => {
        if (relevantSubjects.includes(p.subject_area)) return true;
        if (p.faculty_department) {
          const fd = p.faculty_department.toLowerCase();
          for (const keyword of Object.keys(PROGRAM_TO_SUBJECTS)) {
            if (fd.includes(keyword) && relevantSubjects.some(s =>
              PROGRAM_TO_SUBJECTS[keyword].includes(s)
            )) return true;
          }
        }
        return false;
      });

      if (matchedPartners.length > 0) {
        program.erasmusPartners = matchedPartners.map(p => ({
          name: p.partner_uni_name,
          city: p.partner_city,
          country: p.partner_country,
          subject_area: p.subject_area,
          confidence: p.confidence || 'likely_active',
          ...(p.faculty_department && { faculty_department: p.faculty_department }),
          ...(p.spots_per_year && { spots_per_year: p.spots_per_year }),
          ...(p.study_levels?.length && { study_levels: p.study_levels }),
          ...(p.last_verified && { last_verified: p.last_verified }),
        }));
        stats.programsUpdated++;
        stats.partnersAssigned += matchedPartners.length;
      } else {
        if (!program.erasmusPartners) {
          program.erasmusPartners = [];
        }
        stats.programsSkipped++;
      }
    }
  }

  fs.writeFileSync(MASTER_PATH, JSON.stringify(master, null, 2));

  // Phase 5: Write unmatched universities list with fuzzy-match suggestions
  fs.writeFileSync(UNMATCHED_OUTPUT_PATH, JSON.stringify({
    generated_at: new Date().toISOString(),
    count: unmatchedList.length,
    unmatched: unmatchedList,
  }, null, 2));
  if (unmatchedList.length > 0) {
    console.log(`\nUnmatched universities written to: ${UNMATCHED_OUTPUT_PATH}`);
  }

  // Phase 5: --apply-aliases adds high-confidence suggestions to german_uni_mapping.json
  const applyAliases = process.argv.includes('--apply-aliases');
  if (applyAliases && unmatchedList.length > 0) {
    const toAdd = unmatchedList.filter(u => u.suggested_eu_id && u.score >= 0.7 && !uniMapping[u.master_name]);
    for (const u of toAdd) {
      uniMapping[u.master_name] = u.suggested_eu_id;
    }
    if (toAdd.length > 0) {
      fs.writeFileSync(UNI_MAPPING_PATH, JSON.stringify(uniMapping, null, 2));
      console.log(`Added ${toAdd.length} aliases to german_uni_mapping.json`);
    }
  }

  console.log('\n=== Mapping Complete ===');
  console.log(`Universities matched: ${stats.unisMatched}`);
  console.log(`Universities unmatched: ${stats.unisUnmatched}`);
  console.log(`Programs updated: ${stats.programsUpdated}`);
  console.log(`Programs skipped: ${stats.programsSkipped}`);
  console.log(`Total partner assignments: ${stats.partnersAssigned}`);
  console.log(`\nOutput: ${MASTER_PATH}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
