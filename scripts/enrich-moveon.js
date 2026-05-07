#!/usr/bin/env node

/**
 * Enriches erasmus_partners.json with GPS coordinates from MoveOn scraped data.
 * Currently uses partners_fu.json (FU Berlin, 2055 partners with lat/lng).
 *
 * Matching strategy: fuzzy match on partner university name.
 */

const fs = require('fs');
const path = require('path');

const PARTNERS_DB_PATH = path.join(__dirname, '..', 'data', 'erasmus_partners.json');
const FU_PARTNERS_PATH = path.join(__dirname, '..', 'partners_fu.json');

function normalizeForMatch(str) {
  return str
    .toLowerCase()
    .replace(/[''`´]/g, "'")
    .replace(/[^\w\s'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildCoordinateLookup(moveonPartners) {
  const lookup = new Map();
  for (const p of moveonPartners) {
    if (p.lat && p.lng && p.lat !== 0 && p.lng !== 0) {
      const key = normalizeForMatch(p.name);
      lookup.set(key, { lat: p.lat, lng: p.lng, city: p.city });
    }
  }
  return lookup;
}

function main() {
  console.log('=== MoveOn Enrichment ===\n');

  if (!fs.existsSync(PARTNERS_DB_PATH)) {
    console.error('erasmus_partners.json not found. Run transform-erasmus-data.js first.');
    process.exit(1);
  }

  const db = JSON.parse(fs.readFileSync(PARTNERS_DB_PATH, 'utf-8'));

  const moveonSources = [];
  if (fs.existsSync(FU_PARTNERS_PATH)) {
    const fuPartners = JSON.parse(fs.readFileSync(FU_PARTNERS_PATH, 'utf-8'));
    moveonSources.push(...fuPartners);
    console.log(`Loaded ${fuPartners.length} FU Berlin MoveOn partners`);
  }

  if (moveonSources.length === 0) {
    console.log('No MoveOn data available. Skipping enrichment.');
    return;
  }

  const coordLookup = buildCoordinateLookup(moveonSources);
  console.log(`Coordinate lookup: ${coordLookup.size} entries with valid coords\n`);

  let enriched = 0;
  let total = 0;

  for (const uniId of Object.keys(db.universities)) {
    const uni = db.universities[uniId];
    for (const partner of uni.partners) {
      total++;
      const key = normalizeForMatch(partner.partner_uni_name);
      const coords = coordLookup.get(key);
      if (coords) {
        partner.lat = coords.lat;
        partner.lng = coords.lng;
        enriched++;
      }
    }
  }

  fs.writeFileSync(PARTNERS_DB_PATH, JSON.stringify(db));

  console.log(`Enrichment results:`);
  console.log(`  Total partners: ${total.toLocaleString()}`);
  console.log(`  Enriched with coordinates: ${enriched.toLocaleString()}`);
  console.log(`  Coverage: ${((enriched / total) * 100).toFixed(1)}%`);
  console.log(`\nUpdated: ${PARTNERS_DB_PATH}`);
}

main();
