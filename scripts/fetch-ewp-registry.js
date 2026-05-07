#!/usr/bin/env node

/**
 * EWP Registry Fetcher
 *
 * Fetches the Erasmus Without Paper (EWP) registry and cross-references
 * German HEIs with our Erasmus partner database.
 *
 * The EWP registry contains all institutions participating in the EWP network,
 * confirming they are active Erasmus participants.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const REGISTRY_URL = 'https://registry.erasmuswithoutpaper.eu/catalogue-v1.xml';
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'ewp_registry.json');
const PARTNERS_DB = path.join(__dirname, '..', 'data', 'erasmus_partners.json');

function fetchXml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 60000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        res.resume();
        return;
      }
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

function extractGermanHeis(xml) {
  const heis = [];
  const heiIdPattern = /<hei-id>([^<]+\.de)<\/hei-id>/g;
  let match;
  const deduped = new Set();

  while ((match = heiIdPattern.exec(xml)) !== null) {
    const heiId = match[1];
    if (!deduped.has(heiId)) {
      deduped.add(heiId);
      heis.push(heiId);
    }
  }

  return heis;
}

function extractAllHeis(xml) {
  const heis = [];
  const heiIdPattern = /<hei-id>([^<]+)<\/hei-id>/g;
  let match;
  const deduped = new Set();

  while ((match = heiIdPattern.exec(xml)) !== null) {
    const heiId = match[1];
    if (!deduped.has(heiId)) {
      deduped.add(heiId);
      heis.push(heiId);
    }
  }

  return heis;
}

function normalizeForComparison(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/ae/g, 'ä')
    .replace(/oe/g, 'ö')
    .replace(/ue/g, 'ü')
    .replace(/ss/g, 'ß');
}

const DOMAIN_TO_UNI = {
  'uni-bamberg': 'OTTO_FRIEDRICH_UNIVERSITAET_BAMBERG',
  'uni-koeln': 'UNIVERSITAET_ZU_KOELN',
  'ruhr-uni-bochum': 'RUHR_UNIVERSITAET_BOCHUM',
  'uni-due': 'UNIVERSITAET_DUISBURG_ESSEN',
  'htw-dresden': 'HOCHSCHULE_FUER_TECHNIK_UND_WIRTSCHAFT_DRESDEN',
  'tu-braunschweig': 'TECHNISCHE_UNIVERSITAET_BRAUNSCHWEIG',
  'tu-clausthal': 'TECHNISCHE_UNIVERSITAET_CLAUSTHAL',
  'fh-muenster': 'FACHHOCHSCHULE_MUENSTER',
  'th-nuernberg': 'TECHNISCHE_HOCHSCHULE_NUERNBERG_GEORG_SIMON_OHM',
  'hs-koblenz': 'HOCHSCHULE_KOBLENZ',
  'hs-offenburg': 'HOCHSCHULE_OFFENBURG',
  'uni-hannover': 'GOTTFRIED_WILHELM_LEIBNIZ_UNIVERSITAET_HANNOVER',
  'uni-rostock': 'UNIVERSITAET_ROSTOCK',
  'uni-saarland': 'UNIVERSITAET_DES_SAARLANDES',
  'uni-weimar': 'BAUHAUS_UNIVERSITAET_WEIMAR',
  'uni-trier': 'UNIVERSITAET_TRIER',
  'uni-flensburg': 'EUROPA_UNIVERSITAET_FLENSBURG',
  'uni-vechta': 'UNIVERSITAET_VECHTA',
  'uni-speyer': 'DEUTSCHE_UNIVERSITAET_FUER_VERWALTUNGSWISSENSCHAFTEN_SPEYER',
  'tu-dortmund': 'TECHNISCHE_UNIVERSITAT_DORTMUND',
  'hwr-berlin': 'HOCHSCHULE_FUER_WIRTSCHAFT_UND_RECHT_BERLIN',
  'hs-rm': 'HOCHSCHULE_RHEINMAIN',
  'hs-augsburg': 'HOCHSCHULE_FUER_ANGEWANDTE_WISSENSCHAFTEN_AUGSBURG',
  'hs-neu-ulm': 'HOCHSCHULE_FUER_ANGEWANDTE_WISSENSCHAFTEN_NEU_ULM',
  'hs-schmalkalden': 'HOCHSCHULE_SCHMALKALDEN',
  'jade-hs': 'JADE_HOCHSCHULE_WILHELMSHAVEN_OLDENBURG_ELSFLETH',
  'dshs-koeln': 'DEUTSCHE_SPORTHOCHSCHULE_KOELN',
  'khsb-berlin': 'KATHOLISCHE_HOCHSCHULE_FUER_SOZIALWESEN_BERLIN_KHSB',
  'ksh-muenchen': 'KATHOLISCHE_STIFTUNGSHOCHSCHULE_MUENCHEN',
  'hszg': 'HOCHSCHULE_ZITTAU_GOERLITZ',
  'hshl': 'HOCHSCHULE_HAMM_LIPPSTADT',
  'ph-heidelberg': 'PAEDAGOGISCHE_HOCHSCHULE_HEIDELBERG',
  'hs-albsig': 'HOCHSCHULE_ALBSTADT_SIGMARINGEN',
  'hs-merseburg': 'HOCHSCHULE_MERSEBURG',
  'hs-rottenburg': 'HOCHSCHULE_FUER_FORSTWIRTSCHAFT_ROTTENBURG',
  'mhh': 'MEDIZINISCHE_HOCHSCHULE_HANNOVER',
  'burg-halle': 'BURG_GIEBICHENSTEIN_KUNSTHOCHSCHULE_HALLE',
  'heilbronn.dhbw': 'DUALE_HOCHSCHULE_BADEN_WUERTTEMBERG_HEILBRONN',
  'mosbach.dhbw': 'DUALE_HOCHSCHULE_BADEN_WUERTTEMBERG_MOSBACH',
  'dhbw-ravensburg': 'DUALE_HOCHSCHULE_BADEN_WUERTTEMBERG_RAVENSBURG',
  'ba-sachsen': 'BERUFSAKADEMIE_SACHSEN',
  'hfm.saarland': 'HOCHSCHULE_FUER_MUSIK_SAAR',
  'hmtm': 'HOCHSCHULE_FUER_MUSIK_UND_THEATER_MUENCHEN',
  'hs-gm': 'HOCHSCHULE_FUER_GESTALTUNG_SCHWAEBISCH_GMUEND',
  'thu': 'TECHNISCHE_HOCHSCHULE_ULM',
  'hfph': 'HOCHSCHULE_FUER_PHILOSOPHIE_MUENCHEN',
};

function matchHeiToUni(heiId, uniIds, uniNames) {
  const domain = heiId.replace(/\.de$/, '');

  // Direct domain mapping
  if (DOMAIN_TO_UNI[domain]) return DOMAIN_TO_UNI[domain];

  // Handle subdomain patterns (e.g., heilbronn.dhbw.de)
  const domainWithDot = domain.replace(/\./g, '.');
  for (const [key, val] of Object.entries(DOMAIN_TO_UNI)) {
    if (domain === key || domain.includes(key)) return val;
  }

  const domainClean = domain.replace(/[.-]/g, '').toLowerCase();

  // Match against university IDs (normalized)
  for (const uniId of uniIds) {
    const uniClean = uniId.replace(/_/g, '').toLowerCase();

    // Check if domain is a substring of uni ID or vice versa
    if (uniClean.includes(domainClean) && domainClean.length >= 6) {
      return uniId;
    }

    // Check domain tokens against uni ID
    const domainTokens = domain.split(/[.-]/).filter(t => t.length > 2);
    const uniTokens = uniId.toLowerCase().split('_').filter(t => t.length > 2);

    const matchingTokens = domainTokens.filter(dt =>
      uniTokens.some(ut => ut.includes(dt) || dt.includes(ut))
    );
    if (matchingTokens.length >= 2 || (matchingTokens.length === 1 && domainTokens.length === 1 && matchingTokens[0].length >= 5)) {
      return uniId;
    }
  }

  return null;
}

async function main() {
  console.log('=== EWP Registry Fetch ===\n');

  console.log('Downloading EWP catalogue...');
  const xml = await fetchXml(REGISTRY_URL);
  console.log(`  Downloaded ${(xml.length / 1024 / 1024).toFixed(1)} MB XML\n`);

  const allHeis = extractAllHeis(xml);
  const germanHeis = extractGermanHeis(xml);
  console.log(`Total HEIs in EWP: ${allHeis.length}`);
  console.log(`German HEIs (.de): ${germanHeis.length}\n`);

  const db = JSON.parse(fs.readFileSync(PARTNERS_DB, 'utf-8'));
  const uniIds = Object.keys(db.universities);
  const uniNames = {};
  for (const id of uniIds) {
    uniNames[id] = db.universities[id].name;
  }

  console.log(`Our database: ${uniIds.length} universities\n`);

  const matched = [];
  const unmatched = [];

  for (const hei of germanHeis) {
    const uniId = matchHeiToUni(hei, uniIds, uniNames);
    if (uniId) {
      matched.push({ hei_id: hei, university_id: uniId, university_name: uniNames[uniId] });
    } else {
      unmatched.push(hei);
    }
  }

  // Find which of our universities are NOT in EWP
  const ewpUniIds = new Set(matched.map(m => m.university_id));
  const notInEwp = uniIds.filter(id => !ewpUniIds.has(id));

  const output = {
    fetched_at: new Date().toISOString(),
    total_ewp_heis: allHeis.length,
    german_ewp_heis: germanHeis.length,
    matched_to_our_db: matched.length,
    unmatched_german_heis: unmatched.length,
    our_unis_not_in_ewp: notInEwp.length,
    matches: matched,
    unmatched_heis: unmatched,
    not_in_ewp_sample: notInEwp.slice(0, 50),
    all_german_hei_ids: germanHeis.sort(),
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

  console.log(`=== Results ===`);
  console.log(`German HEIs in EWP:     ${germanHeis.length}`);
  console.log(`Matched to our DB:      ${matched.length}`);
  console.log(`Unmatched German HEIs:  ${unmatched.length}`);
  console.log(`Our unis not in EWP:    ${notInEwp.length}`);
  console.log(`\nOutput: ${OUTPUT_PATH}`);

  if (unmatched.length > 0) {
    console.log(`\nSample unmatched German HEIs:`);
    unmatched.slice(0, 15).forEach(h => console.log(`  ${h}`));
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
