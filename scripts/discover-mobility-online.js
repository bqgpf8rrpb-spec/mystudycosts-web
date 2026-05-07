#!/usr/bin/env node

/**
 * Mobility Online Discovery
 *
 * Systematically discovers German universities using service4mobility.com / Mobility Online
 * by testing Erasmus code patterns (e.g. BERLIN01-20, MUNCHEN01-10) against
 * MobilitySearchServlet and PortalServlet endpoints.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'mobility_online_registry.json');
const PARTNERS_DB = path.join(__dirname, '..', 'data', 'erasmus_partners.json');

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const GERMAN_CITIES = [
  'AACHEN', 'AALEN', 'AMBERG', 'ANSBACH', 'ASCHAFFENB', 'AUGSBUR',
  'BAMBERG', 'BAYREUT', 'BERLIN', 'BIELEFE', 'BINGEN', 'BOCHUM',
  'BONN', 'BRANDEN', 'BRAUNSC', 'BREMEN', 'BREMERHAV',
  'CHEMNIT', 'CLAUSTH', 'COBURG', 'COTTBUS',
  'DARMSTA', 'DEGGENB', 'DETMOLD', 'DORTMUN', 'DRESDEN', 'DUSSELD',
  'EICHSTA', 'EMDEN', 'ERFURT', 'ERLANGE', 'ESSEN', 'ESSLING',
  'FLENSBU', 'FRANKFU', 'FREIBUR', 'FRIEDRI', 'FULDA', 'FURTWANG',
  'GELSENK', 'GIESSEN', 'GOTTING', 'GREIFSW',
  'HAGEN', 'HALLE', 'HAMBURG', 'HAMM', 'HANNOVE', 'HEIDELB',
  'HEILBRO', 'HILDESHE', 'HOF', 'IDSTEIN', 'ILMENAU', 'INGOLST', 'ISERLOH', 'ISNY',
  'JENA', 'KAISERS', 'KARLSRU', 'KASSEL', 'KEMPTEN', 'KIEL',
  'KOBLENZ', 'KOLN', 'KONSTAN', 'KREFELD',
  'LANDAU', 'LANDSHU', 'LEIPZIG', 'LEMGO', 'LUBECK', 'LUDWIGS', 'LUNEBUR',
  'MAGDEBU', 'MAINZ', 'MANNHEI', 'MARBURG', 'MERSEBUR', 'MITTWEI',
  'MONCHEN', 'MOSBACH', 'MULHEIM', 'MUNCHEN', 'MUNSTER',
  'NEUBRA', 'NEU-ULM', 'NORDHAU', 'NURNBER', 'NYMBUR',
  'OFENBA', 'OFFENBU', 'OLDENBU', 'OSNABRU',
  'PADERBOR', 'PASSAU', 'PFORZHE', 'POTSDAM',
  'RAVENSB', 'REGENSB', 'REUTLIN', 'ROSENHE', 'ROSTOCK',
  'SAARBRU', 'SCHWABI', 'SCHWERI', 'SIEGEN', 'SPEYER', 'STRALSUN', 'STUTTGA',
  'TRIER', 'TUBING', 'TUEBINGE',
  'ULM', 'VECHTA', 'VILLINGE', 'WEDEL', 'WEIMAR', 'WIESBAD', 'WILDAU',
  'WISMAR', 'WITTENBE', 'WOLFENBU', 'WORMS', 'WUPPERT', 'WURZBUR', 'WUERZBU',
  'ZITTAU', 'ZWICKAU',
];

// Phase 3: City-specific max suffix (Erasmus code suffix range 01..N)
// Larger cities may have more institutions (BERLIN01–25, etc.)
const MAX_SUFFIX_BY_CITY = {
  BERLIN: 25, MUNCHEN: 25, HAMBURG: 25, KOLN: 25, FRANKFU: 22,
  BREMEN: 20, DUSSELD: 20, DORTMUN: 20, ESSEN: 20, STUTTGA: 20,
  LEIPZIG: 20, DRESDEN: 20, HANNOVE: 20, NURNBER: 20, BONN: 15,
  AUGSBUR: 15, MUNSTER: 15, KARLSRU: 15, MANNHEI: 15, WUERZBU: 15,
};

const BASE_URLS = [
  'https://www.service4mobility.com/europe/MobilitySearchServlet',
  'https://www.service4mobility.com/europe/PortalServlet',
];

function fetchPage(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 15000, headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    }}, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve({ ok: false, status: res.statusCode, redirect: res.headers.location, body: '' });
        res.resume();
        return;
      }
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({ ok: res.statusCode === 200, status: res.statusCode, body, redirect: null });
      });
    });
    req.on('error', () => resolve({ ok: false, status: 0, body: '', redirect: null }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0, body: '', redirect: null }); });
    req.end();
  });
}

function countDropdownPartners(html) {
  const selectMatch = html.match(/<select[^>]*name=["']inst_id_partner["'][^>]*>([\s\S]*?)<\/select>/i);
  if (!selectMatch) return 0;
  const options = selectMatch[1].match(/<option[^>]*>/gi) || [];
  return Math.max(0, options.length - 1);
}

function hasPortalContent(html) {
  return html.includes('MobilitySearchServlet') ||
         html.includes('inst_id_partner') ||
         html.includes('kz_bew_art') ||
         html.includes('Exchange possibilities') ||
         html.includes('Austauschmöglichkeiten') ||
         html.includes('result_table');
}

async function main() {
  console.log('=== Mobility Online Discovery ===\n');

  let existing = { portals: [] };
  if (fs.existsSync(OUTPUT_PATH)) {
    existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
    console.log(`Existing registry: ${existing.portals.length} portals\n`);
  }
  const existingCodes = new Set(existing.portals.map(p => p.erasmus_code));

  const found = [];
  let tested = 0;
  let totalCodes = 0;

  for (const city of GERMAN_CITIES) {
    const maxSuffix = MAX_SUFFIX_BY_CITY[city] ?? (city.length <= 4 ? 5 : 20);
    for (let i = 1; i <= maxSuffix; i++) {
      const code = `${city}${String(i).padStart(2, '0')}`;
      totalCodes++;

      if (existingCodes.has(code)) continue;

      tested++;
      const searchUrl = `${BASE_URLS[0]}?identifier=${code}&kz_bew_art=OUT&kz_bew_pers=S&sprache=en`;

      const result = await fetchPage(searchUrl);

      if (result.ok && hasPortalContent(result.body)) {
        const partnerCount = countDropdownPartners(result.body);
        const titleMatch = result.body.match(/<title[^>]*>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';

        found.push({
          erasmus_code: code,
          url: searchUrl,
          type: 'MobilitySearchServlet',
          partner_count: partnerCount,
          title,
          discovered_at: new Date().toISOString(),
        });

        console.log(`  FOUND: ${code} (${partnerCount} partners) - ${title}`);
      } else if (result.redirect) {
        const redirectResult = await fetchPage(result.redirect);
        if (redirectResult.ok && hasPortalContent(redirectResult.body)) {
          const partnerCount = countDropdownPartners(redirectResult.body);
          found.push({
            erasmus_code: code,
            url: result.redirect,
            type: 'redirect',
            partner_count: partnerCount,
            discovered_at: new Date().toISOString(),
          });
          console.log(`  FOUND (redirect): ${code} (${partnerCount} partners)`);
        }
      }

      if (tested % 100 === 0) {
        console.log(`  [${tested} tested, ${found.length} found]`);
      }

      await delay(300 + Math.random() * 200);
    }
  }

  // Also test PortalServlet for found codes
  console.log('\nTesting PortalServlet for found codes...');
  for (const portal of found) {
    if (portal.partner_count === 0) {
      const portalUrl = `${BASE_URLS[1]}?identifier=${portal.erasmus_code}&kz_bew_art=OUT&kz_bew_pers=S&sprache=en`;
      const result = await fetchPage(portalUrl);
      if (result.ok && hasPortalContent(result.body)) {
        portal.portal_servlet_url = portalUrl;
        portal.type = 'PortalServlet';
        console.log(`  PortalServlet available: ${portal.erasmus_code}`);
      }
      await delay(500);
    }
  }

  const allPortals = [...existing.portals, ...found];

  const registry = {
    last_updated: new Date().toISOString(),
    total_codes_tested: totalCodes,
    portals_found: allPortals.length,
    portals: allPortals,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(registry, null, 2));

  console.log(`\n=== Discovery Complete ===`);
  console.log(`Codes tested: ${tested}`);
  console.log(`New portals found: ${found.length}`);
  console.log(`Total portals: ${allPortals.length}`);
  console.log(`Output: ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
