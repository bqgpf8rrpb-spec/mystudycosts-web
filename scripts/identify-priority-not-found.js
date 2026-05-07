#!/usr/bin/env node

/**
 * Identifies high-priority universities from MoveOn not_found list
 * that have many EU partners and should get custom scraper configs.
 *
 * Outputs Top 30 by Study partner count for adding to scrape-uni-websites.js
 */

const fs = require('fs');
const path = require('path');

const MOVEON_REGISTRY = path.join(__dirname, '..', 'data', 'moveon_registry.json');
const PARTNERS_DB = path.join(__dirname, '..', 'data', 'erasmus_partners.json');

function main() {
  const registry = JSON.parse(fs.readFileSync(MOVEON_REGISTRY, 'utf-8'));
  const db = JSON.parse(fs.readFileSync(PARTNERS_DB, 'utf-8'));

  const notFoundIds = new Set(
    (registry.not_found || []).map(n => n.university_id)
  );

  const priority = [];
  for (const uniId of Object.keys(db.universities)) {
    if (!notFoundIds.has(uniId)) continue;

    const uni = db.universities[uniId];
    const studyPartners = (uni.partners || []).filter(
      p => p.activity_type !== 'traineeship' && p.confidence !== 'traineeship'
    );

    if (studyPartners.length > 0) {
      priority.push({
        id: uniId,
        name: uni.name,
        studyPartners: studyPartners.length,
      });
    }
  }

  priority.sort((a, b) => b.studyPartners - a.studyPartners);
  const top30 = priority.slice(0, 30);

  console.log('=== Top 30 not_found Unis by Study Partners ===\n');
  top30.forEach((u, i) => {
    console.log(`${(i + 1).toString().padStart(2)}. ${u.studyPartners.toString().padStart(4)}  ${u.name} (${u.id})`);
  });

  console.log('\n--- JSON for UNI_CONFIGS ---');
  console.log(JSON.stringify(top30, null, 2));
}

main();
