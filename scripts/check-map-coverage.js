#!/usr/bin/env node

/**
 * Map Coverage Validation Script
 *
 * Checks how many partner cities in erasmus_partners.json can be resolved to
 * coordinates via city-coordinates.json and city-aliases.json. Uses the same
 * resolution logic as ErasmusMap.tsx (resolveCityCoords), including normalization
 * and country disambiguation (City|Country format).
 *
 * Usage: node scripts/check-map-coverage.js [--top N]
 *   --top N  Show top N unresolved (city, country) pairs by partner count (default: 50)
 */

const fs = require('fs');
const path = require('path');

const PARTNERS_PATH = path.join(__dirname, '..', 'data', 'erasmus_partners.json');
const COORDS_PATH = path.join(__dirname, '..', 'data', 'city-coordinates.json');
const ALIASES_PATH = path.join(__dirname, '..', 'data', 'city-aliases.json');

function resolveCityCoords(city, coordsData, cityAliasMap, country) {
  const trimmed = (city || '').trim();
  const baseCity = trimmed.replace(/\s*\([^)]+\)\s*$/, '').trim();
  const candidates = trimmed !== baseCity ? [trimmed, baseCity] : [trimmed];

  for (const c of candidates) {
    const resolvedKey = cityAliasMap[c] ?? c;
    let coords = coordsData[c] ?? coordsData[resolvedKey];
    if (coords) return coords;

    if (country && country !== 'Various' && country !== 'Unknown') {
      const cityCountryKey = `${c}|${country}`;
      const resolvedCityCountryKey = cityAliasMap[cityCountryKey] ?? cityCountryKey;
      coords = coordsData[cityCountryKey] ?? coordsData[resolvedCityCountryKey];
      if (coords) return coords;
    }
  }

  const lower = trimmed.toLowerCase();
  for (const key of Object.keys(coordsData)) {
    if (key.toLowerCase() === lower) return coordsData[key];
  }
  return null;
}

function main() {
  const args = process.argv.slice(2);
  let topN = 50;
  const topIdx = args.indexOf('--top');
  if (topIdx >= 0 && args[topIdx + 1]) {
    topN = parseInt(args[topIdx + 1], 10) || 50;
  }

  console.log('=== Erasmus Map Coverage Check ===\n');

  if (!fs.existsSync(PARTNERS_PATH)) {
    console.error('❌ erasmus_partners.json not found at', PARTNERS_PATH);
    process.exit(1);
  }
  if (!fs.existsSync(COORDS_PATH)) {
    console.error('❌ city-coordinates.json not found at', COORDS_PATH);
    process.exit(1);
  }
  if (!fs.existsSync(ALIASES_PATH)) {
    console.error('❌ city-aliases.json not found at', ALIASES_PATH);
    process.exit(1);
  }

  const db = JSON.parse(fs.readFileSync(PARTNERS_PATH, 'utf-8'));
  const coordsData = JSON.parse(fs.readFileSync(COORDS_PATH, 'utf-8'));
  const cityAliasMap = JSON.parse(fs.readFileSync(ALIASES_PATH, 'utf-8'));

  const INVALID_CITIES = new Set(['', 'Unknown', 'Various']);
  const pairCounts = new Map();

  let unknownCount = 0;

  for (const uniId of Object.keys(db.universities || {})) {
    const partners = db.universities[uniId].partners || [];
    for (const p of partners) {
      const city = (p.partner_city || '').trim();
      const country = p.partner_country || '';

      if (INVALID_CITIES.has(city)) {
        unknownCount++;
        continue;
      }
      if (!city) continue;

      const key = `${city}|${country}`;
      pairCounts.set(key, {
        city,
        country,
        count: (pairCounts.get(key)?.count || 0) + 1,
      });
    }
  }

  let resolvedPartners = 0;
  let unresolvedPartners = 0;
  const resolvedPairs = new Set();
  const unresolvedPairs = new Map();

  for (const [, info] of pairCounts) {
    const { city, country, count } = info;
    const key = `${city}|${country}`;
    const coords = resolveCityCoords(city, coordsData, cityAliasMap, country);
    if (coords) {
      resolvedPartners += count;
      resolvedPairs.add(key);
    } else {
      unresolvedPartners += count;
      unresolvedPairs.set(key, count);
    }
  }

  const totalPartnersWithCity = resolvedPartners + unresolvedPartners;
  const totalPartners = totalPartnersWithCity + unknownCount;
  const totalPairs = pairCounts.size;

  console.log('Summary');
  console.log('-------');
  console.log(`Total partner entries:      ${totalPartners}`);
  console.log(`  - With valid city:        ${totalPartnersWithCity}`);
  console.log(`  - Unknown/Various/empty:  ${unknownCount}`);
  console.log(`Unique (city, country):     ${totalPairs}`);
  console.log(`Resolved pairs:             ${resolvedPairs.size}`);
  console.log(`Unresolved pairs:           ${unresolvedPairs.size}`);
  console.log(`Resolved partners:          ${resolvedPartners} (${totalPartnersWithCity > 0 ? ((resolvedPartners / totalPartnersWithCity) * 100).toFixed(1) : 0}% of valid)`);
  console.log(`Unresolved partners:        ${unresolvedPartners}`);
  console.log('');

  const sorted = [...unresolvedPairs.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`Top ${topN} unresolved (city, country) pairs:`);
  console.log('-----------------------------------------------');
  for (let i = 0; i < Math.min(topN, sorted.length); i++) {
    const [pairKey, count] = sorted[i];
    const [city, country] = pairKey.split('|');
    console.log(`  ${String(count).padStart(5)}  ${city} | ${country || '(no country)'}`);
  }

  if (sorted.length === 0 && unknownCount === 0) {
    console.log('  (all partners resolve successfully)');
  } else if (sorted.length === 0 && unknownCount > 0) {
    console.log(`  (all partners with valid city resolve; ${unknownCount} skipped due to Unknown/Various)`);
  }
}

main();
