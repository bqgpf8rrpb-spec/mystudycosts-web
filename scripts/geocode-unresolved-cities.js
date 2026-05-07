#!/usr/bin/env node

/**
 * Batch Geocoding for Unresolved Partner Cities
 *
 * Reads erasmus_partners.json and finds (city, country) pairs that cannot be
 * resolved via city-coordinates.json and city-aliases.json. Uses Nominatim
 * to geocode each unresolved pair and appends results to city-coordinates.json.
 *
 * Key format: "City" when city appears in only one country, "City|Country" when ambiguous.
 *
 * Usage: node scripts/geocode-unresolved-cities.js [options]
 *   --dry-run    Preview without writing to file
 *   --limit N    Process only first N pairs (default: all)
 *   --delay MS   Delay between requests in ms (default: 1100, Nominatim requires 1/sec)
 */

const fs = require('fs');
const path = require('path');

const PARTNERS_PATH = path.join(__dirname, '..', 'data', 'erasmus_partners.json');
const COORDS_PATH = path.join(__dirname, '..', 'data', 'city-coordinates.json');
const ALIASES_PATH = path.join(__dirname, '..', 'data', 'city-aliases.json');
const FAILURES_PATH = path.join(__dirname, '..', 'data', 'geocode-failures.json');

const INVALID_CITIES = new Set(['', 'Unknown', 'Various']);

function resolveCityCoords(city, country, coordsData, cityAliasMap) {
  const trimmed = (city || '').trim();
  if (!trimmed || INVALID_CITIES.has(trimmed)) return null;

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

async function geocodeWithNominatim(city, country) {
  if (!city || INVALID_CITIES.has(city.trim())) return null;

  const countryVal = country && country !== 'Various' && country !== 'Unknown' ? country : null;

  if (countryVal) {
    try {
      const q = `${encodeURIComponent(city)}, ${encodeURIComponent(countryVal)}`;
      const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'MyStudyCosts-Bot/1.0 (Batch Geocoding)' },
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (err) {
      return null;
    }
  }

  try {
    const q = encodeURIComponent(city);
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MyStudyCosts-Bot/1.0 (Batch Geocoding)' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (err) {
    return null;
  }

  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : null;
  const delayIdx = args.indexOf('--delay');
  const delayMs = delayIdx >= 0 && args[delayIdx + 1] ? parseInt(args[delayIdx + 1], 10) : 1100;

  console.log('=== Geocode Unresolved Cities ===\n');

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

  const pairCounts = new Map();
  for (const uniId of Object.keys(db.universities || {})) {
    const partners = db.universities[uniId].partners || [];
    for (const p of partners) {
      const city = (p.partner_city || '').trim();
      const country = (p.partner_country || '').trim();
      if (!city || INVALID_CITIES.has(city)) continue;
      const key = `${city}\t${country || '(no country)'}`;
      pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
    }
  }

  const cityToCountries = new Map();
  for (const pairKey of pairCounts.keys()) {
    const [city, country] = pairKey.split('\t');
    if (!cityToCountries.has(city)) cityToCountries.set(city, new Set());
    cityToCountries.get(city).add(country);
  }

  const unresolved = [];
  for (const [pairKey, count] of pairCounts) {
    const [city, country] = pairKey.split('\t');
    const countryVal = country === '(no country)' ? undefined : country;
    const coords = resolveCityCoords(city, countryVal, coordsData, cityAliasMap);
    if (!coords) {
      unresolved.push({ city, country: countryVal, count });
    }
  }

  unresolved.sort((a, b) => b.count - a.count);

  console.log(`Total unique (city, country) pairs: ${pairCounts.size}`);
  console.log(`Unresolved pairs to geocode: ${unresolved.length}`);
  if (dryRun) {
    console.log('\n[DRY RUN] Would process first', limit ? limit : unresolved.length, 'pairs.');
    for (let i = 0; i < Math.min(limit || unresolved.length, 20); i++) {
      const u = unresolved[i];
      console.log(`  ${u.count}  ${u.city} | ${u.country || '(no country)'}`);
    }
    if (unresolved.length > 20) console.log('  ...');
    return;
  }

  const toProcess = limit ? unresolved.slice(0, limit) : unresolved;
  const added = {};
  const failures = [];

  for (let i = 0; i < toProcess.length; i++) {
    const { city, country, count } = toProcess[i];
    process.stdout.write(`[${i + 1}/${toProcess.length}] ${city} | ${country || '(no country)'} ... `);
    const coords = await geocodeWithNominatim(city, country);
    if (coords) {
      const countriesForCity = cityToCountries.get(city);
      const needsCountryKey = countriesForCity && countriesForCity.size > 1;
      const key = needsCountryKey && country ? `${city}|${country}` : city;
      if (!coordsData[key]) {
        coordsData[key] = { lat: coords.lat, lng: coords.lng };
        added[key] = coords;
        console.log(`OK -> ${key}`);
      } else {
        console.log('skip (already exists)');
      }
    } else {
      console.log('FAIL');
      failures.push({ city, country, count });
    }
    if (i < toProcess.length - 1) await sleep(delayMs);
  }

  const addedKeys = Object.keys(added);
  if (addedKeys.length > 0) {
    fs.writeFileSync(COORDS_PATH, JSON.stringify(coordsData, null, 2), 'utf-8');
    console.log(`\n✅ Added ${addedKeys.length} new entries to city-coordinates.json`);
  } else {
    console.log('\n⚠️  No new entries to add.');
  }

  if (failures.length > 0) {
    fs.writeFileSync(FAILURES_PATH, JSON.stringify(failures, null, 2), 'utf-8');
    console.log(`⚠️  ${failures.length} failures logged to data/geocode-failures.json`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
