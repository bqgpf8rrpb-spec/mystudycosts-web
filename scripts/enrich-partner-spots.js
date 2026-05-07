#!/usr/bin/env node

/**
 * Enrich Partner Spots
 *
 * Merges data/partner-spots-override.json into data/erasmus_partners.json.
 * Override entries match by partner_id or by (german_uni_id, partner_uni_name, partner_city).
 * Populates spots_per_semester and/or spots_per_year for partners.
 *
 * Run: node scripts/enrich-partner-spots.js
 */

const fs = require('fs');
const path = require('path');

const PARTNERS_PATH = path.join(__dirname, '..', 'data', 'erasmus_partners.json');
const OVERRIDE_PATH = path.join(__dirname, '..', 'data', 'partner-spots-override.json');

function main() {
  if (!fs.existsSync(PARTNERS_PATH)) {
    console.error('Partners file not found:', PARTNERS_PATH);
    process.exit(1);
  }

  let override = [];
  if (fs.existsSync(OVERRIDE_PATH)) {
    const raw = JSON.parse(fs.readFileSync(OVERRIDE_PATH, 'utf-8'));
    override = Array.isArray(raw)
      ? raw
      : raw.overrides || [];
    override = override.filter(
      (o) =>
        o && !o._comment && !o._example && (o.partner_id || (o.german_uni_id && o.partner_uni_name && o.partner_city))
    );
  } else {
    console.log('No override file found. Create data/partner-spots-override.json to add spots.');
    return;
  }

  const db = JSON.parse(fs.readFileSync(PARTNERS_PATH, 'utf-8'));
  let updated = 0;

  for (const uniId of Object.keys(db.universities)) {
    const partners = db.universities[uniId].partners;
    for (const partner of partners) {
      const entry = override.find((o) => {
        if (o.partner_id && partner.id) {
          return o.partner_id === partner.id;
        }
        if (o.german_uni_id && o.partner_uni_name && o.partner_city) {
          return (
            o.german_uni_id === uniId &&
            (o.partner_uni_name || '').toLowerCase() === (partner.partner_uni_name || '').toLowerCase() &&
            (o.partner_city || '').toLowerCase() === (partner.partner_city || '').toLowerCase()
          );
        }
        return false;
      });
      if (entry) {
        if (entry.spots_per_semester != null) {
          partner.spots_per_semester = entry.spots_per_semester;
        }
        if (entry.spots_per_year != null) {
          partner.spots_per_year = entry.spots_per_year;
        }
        updated++;
      }
    }
  }

  fs.writeFileSync(PARTNERS_PATH, JSON.stringify(db));
  console.log(`Enriched ${updated} partners with spots data.`);
  console.log('Output:', PARTNERS_PATH);
}

main();
