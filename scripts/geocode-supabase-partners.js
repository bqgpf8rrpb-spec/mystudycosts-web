#!/usr/bin/env node

/**
 * Batch Geocoding for Supabase Erasmus Partners
 *
 * Fetches partners from Supabase erasmus_partners where latitude or longitude
 * is null. Uses Nominatim to geocode each (city, country) and updates the
 * row in Supabase with the new coordinates.
 *
 * Usage: node scripts/geocode-supabase-partners.js [options]
 *   --dry-run    Preview without updating Supabase
 *   --limit N    Process only first N partners (default: all)
 *   --delay MS   Delay between Nominatim requests in ms (default: 1100, requires 1/sec)
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const INVALID_CITIES = new Set(['', 'Unknown', 'Various']);

async function geocodeWithNominatim(city, country) {
  if (!city || INVALID_CITIES.has((city || '').trim())) return null;

  const countryVal = country && country !== 'Various' && country !== 'Unknown' ? country : null;

  try {
    const q = countryVal
      ? `${encodeURIComponent(city)}, ${encodeURIComponent(countryVal)}`
      : encodeURIComponent(city);
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MyStudyCosts-Bot/1.0 (Supabase Geocoding)' },
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

  console.log('=== Geocode Supabase Erasmus Partners (Missing Coordinates) ===\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and');
    console.error('   SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: partners, error: fetchError } = await supabase
    .from('erasmus_partners')
    .select('id, partner_city, partner_country')
    .or('latitude.is.null,longitude.is.null')
    .not('partner_city', 'is', null);

  if (fetchError) {
    console.error('❌ Failed to fetch partners:', fetchError.message);
    process.exit(1);
  }

  const toProcess = limit ? (partners || []).slice(0, limit) : partners || [];
  console.log(`Partners without coordinates: ${(partners || []).length}`);
  console.log(`To process: ${toProcess.length}`);
  if (dryRun) {
    console.log('\n[DRY RUN] Would geocode and update:');
    toProcess.slice(0, 15).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.partner_city} | ${p.partner_country || '(no country)'}`);
    });
    if (toProcess.length > 15) console.log(`  ... and ${toProcess.length - 15} more`);
    return;
  }

  let updated = 0;
  const failures = [];

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i];
    const city = (p.partner_city || '').trim();
    const country = (p.partner_country || '').trim() || null;

    process.stdout.write(`[${i + 1}/${toProcess.length}] ${city} | ${country || '(no country)'} ... `);

    const coords = await geocodeWithNominatim(city, country);
    if (coords) {
      const { error: updateError } = await supabase
        .from('erasmus_partners')
        .update({ latitude: coords.lat, longitude: coords.lng })
        .eq('id', p.id);

      if (updateError) {
        console.log(`FAIL (update: ${updateError.message})`);
        failures.push({ id: p.id, city, country, error: updateError.message });
      } else {
        updated++;
        console.log(`OK -> (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
      }
    } else {
      console.log('FAIL (geocode)');
      failures.push({ id: p.id, city, country });
    }

    if (i < toProcess.length - 1) await sleep(delayMs);
  }

  console.log(`\n✅ Updated ${updated} partners in Supabase`);
  if (failures.length > 0) {
    const fs = require('fs');
    const path = require('path');
    const outPath = path.join(__dirname, '..', 'data', 'geocode-supabase-failures.json');
    fs.writeFileSync(outPath, JSON.stringify(failures, null, 2), 'utf-8');
    console.log(`⚠️  ${failures.length} failures logged to data/geocode-supabase-failures.json`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
