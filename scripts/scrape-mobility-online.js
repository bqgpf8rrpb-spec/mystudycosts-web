#!/usr/bin/env node

/**
 * Mobility Online / service4mobility.com Scraper
 *
 * Extracts Erasmus partner data from universities using Mobility Online.
 * These portals use server-side rendered HTML tables accessible via
 * MobilitySearchServlet endpoints.
 *
 * Usage:
 *   node scripts/scrape-mobility-online.js
 *   node scripts/scrape-mobility-online.js --uni=TU_DRESDEN
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const MOVEON_DIR = path.join(__dirname, '..', 'data', 'moveon');
const DEBUG_DIR = path.join(__dirname, '..', 'data', 'debug');
const COUNTRY_MAP_PATH = path.join(__dirname, '..', 'data', 'country-translations.json');

const delay = (ms) => new Promise(r => setTimeout(r, ms));
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Maps Erasmus codes from discovery registry to canonical university IDs in our DB */
const ERASMUS_CODE_TO_UNI = {
  AACHEN02: ['RHEINISCH_WESTFAELISCHE_TECHNISCHE_HOCHSCHULE_AACHEN', 'RWTH Aachen'],
  AALEN01: ['HOCHSCHULE_AALEN_TECHNIK_UND_WIRTSCHAFT', 'Hochschule Aalen'],
  BIELEFE02: ['FACHHOCHSCHULE_BIELEFELD', 'Fachhochschule Bielefeld'],
  BREMEN04: ['HOCHSCHULE_BREMEN', 'Hochschule Bremen'],
  CHEMNIT01: ['TECHNISCHE_UNIVERSITAET_CHEMNITZ', 'TU Chemnitz'],
  DARMSTA03: ['HOCHSCHULE_DARMSTADT', 'Hochschule Darmstadt'],
  DORTMUN02: ['FACHHOCHSCHULE_DORTMUND', 'Fachhochschule Dortmund'],
  DUSSELD03: ['HOCHSCHULE_DUESSELDORF', 'Hochschule Düsseldorf'],
  FLENSBU02: ['EUROPA_UNIVERSITAET_FLENSBURG', 'Europa-Universität Flensburg'],
  FRANKFU01: ['JOHANN_WOLFGANG_GOETHE_UNIVERSITAET_FRANKFURT_AM_MAIN', 'Goethe-Universität Frankfurt'],
  FRANKFU07: ['FRANKFURT_UNIVERSITY_OF_APPLIED_SCIENCES', 'Frankfurt UAS'],
  FREIBUR04: ['EVANGELISCHE_HOCHSCHULE_FREIBURG', 'Evangelische Hochschule Freiburg'],
  FRIEDRI01: ['FRIEDRICH_SCHILLER_UNIVERSITAET_JENA', 'Friedrich-Schiller-Universität Jena'],
  HAMBURG03: ['HAW_HAMBURG', 'HAW Hamburg'],
  HAMBURG06: ['HOCHSCHULE_FUER_MUSIK_UND_THEATER_HAMBURG', 'HfMT Hamburg'],
  HAMBURG12: ['HSBA_HAMBURG_SCHOOL_OF_BUSINESS_ADMINISTRATION', 'HSBA Hamburg'],
  HAMBURG19: ['KUEHNE_LOGISTICS_UNIVERSITY', 'KLU Hamburg'],
  KARLSRU05: ['HOCHSCHULE_KARLSRUHE', 'Hochschule Karlsruhe'],
  KEMPTEN01: ['HOCHSCHULE_FUER_ANGEWANDTE_WISSENSCHAFTEN_KEMPTEN', 'HS Kempten'],
  KIEL03: ['FACHHOCHSCHULE_KIEL', 'Fachhochschule Kiel'],
  KREFELD01: ['HOCHSCHULE_NIEDERRHEIN', 'Hochschule Niederrhein'],
  LANDSHU01: ['HOCHSCHULE_FUER_ANGEWANDTE_WISSENSCHAFTEN_LANDSHUT', 'HS Landshut'],
  LEIPZIG02: ['HOCHSCHULE_FUER_TECHNIK_WIRTSCHAFT_UND_KULTUR_LEIPZIG', 'HTWK Leipzig'],
  MAGDEBU04: ['HOCHSCHULE_MAGDEBURG_STENDAL', 'HS Magdeburg-Stendal'],
  MAINZ08: ['JOHANNES_GUTENBERG_UNIVERSITAET_MAINZ', 'JGU Mainz'],
  MANNHEI03: ['HOCHSCHULE_MANNHEIM', 'Hochschule Mannheim'],
  MULHEIM01: ['HOCHSCHULE_RUHR_WEST', 'Hochschule Ruhr West'],
  MUNCHEN04: ['HOCHSCHULE_FUER_ANGEWANDTE_WISSENSCHAFTEN_MUENCHEN', 'HM München'],
  NORDHAU01: ['NORDHAUSEN_UNIVERSITY_OF_APPLIED_SCIENCES', 'HS Nordhausen'],
  OFFENBU01: ['HOCHSCHULE_FUER_GESTALTUNG_OFFENBACH_AM_MAIN', 'HfG Offenbach'],
  OSNABRU02: ['HOCHSCHULE_OSNABRUECK', 'Hochschule Osnabrück'],
  PFORZHE01: ['HOCHSCHULE_PFORZHEIM', 'Hochschule Pforzheim'],
  ROSTOCK01: ['UNIVERSITAET_ROSTOCK', 'Universität Rostock'],
  STUTTGA04: ['HOCHSCHULE_FUER_TECHNIK_STUTTGART', 'HFT Stuttgart'],
  ULM01: ['UNIVERSITAET_ULM', 'Universität Ulm'],
  WIESBAD01: ['HOCHSCHULE_RHEIN_MAIN', 'HS RheinMain Wiesbaden'],
  ZITTAU01: ['HOCHSCHULE_ZITTAU_GOERLITZ', 'HS Zittau/Görlitz'],
  BERLIN04: ['TECHNISCHE_UNIVERSITAET_BERLIN', 'TU Berlin'],
  ISERLOH01: ['FACHHOCHSCHULE_SUDESTFALEN', 'FH Südwestfalen'],
};

const MOBILITY_ONLINE_UNIS = [
  {
    id: 'TECHNISCHE_UNIVERSITAET_DRESDEN',
    name: 'TECHNISCHE UNIVERSITAET DRESDEN',
    identifier: 'DRESDEN02',
    url: 'https://www.service4mobility.com/europe/MobilitySearchServlet?identifier=DRESDEN02&kz_bew_art=OUT&kz_bew_pers=S&sprache=en',
  },
  {
    id: 'EBERHARD_KARLS_UNIVERSITAET_TUEBINGEN',
    name: 'EBERHARD KARLS UNIVERSITAET TUEBINGEN',
    identifier: 'TUEBINGE01',
    url: 'https://www.service4mobility.com/europe/MobilitySearchServlet?identifier=TUEBINGE01&kz_bew_art=OUT&kz_bew_pers=S&sprache=en',
  },
  {
    id: 'ALBERT_LUDWIGS_UNIVERSITAET_FREIBURG',
    name: 'ALBERT-LUDWIGS-UNIVERSITAET FREIBURG',
    identifier: 'FREIBUR01',
    url: 'https://mobility.zv.uni-freiburg.de/mobility/MobilitySearchServlet?identifier=FREIBUR01&kz_bew_art=OUT&kz_bew_pers=S&sprache=en',
  },
  {
    id: 'RUPRECHT_KARLS_UNIVERSITAET_HEIDELBERG',
    name: 'RUPRECHT-KARLS-UNIVERSITAET HEIDELBERG',
    identifier: 'HEIDELB01',
    url: 'https://mobility.zuv.uni-heidelberg.de/mobility/MobilitySearchServlet?identifier=HEIDELB01&kz_bew_art=OUT&kz_bew_pers=S&sprache=en',
  },
  {
    id: 'UNIVERSITAET_MANNHEIM',
    name: 'UNIVERSITAET MANNHEIM',
    identifier: 'MANNHEI01',
    url: 'https://www.service4mobility.com/europe/MobilitySearchServlet?identifier=MANNHEI01&kz_bew_art=OUT&kz_bew_pers=S&sprache=en',
  },
  {
    id: 'UNIVERSITAET_STUTTGART',
    name: 'UNIVERSITAET STUTTGART',
    identifier: 'STUTTGA01',
    url: 'https://www.service4mobility.com/europe/MobilitySearchServlet?identifier=STUTTGA01&kz_bew_art=OUT&kz_bew_pers=S&sprache=en',
  },
  {
    id: 'CHRISTIAN_ALBRECHTS_UNIVERSITAET_ZU_KIEL',
    name: 'CHRISTIAN-ALBRECHTS-UNIVERSITAET ZU KIEL',
    identifier: 'KIEL01',
    url: 'https://www.service4mobility.com/europe/MobilitySearchServlet?identifier=KIEL01&kz_bew_art=OUT&kz_bew_pers=S&sprache=en',
  },
  {
    id: 'KARLSRUHER_INSTITUT_FUER_TECHNOLOGIE',
    name: 'KARLSRUHER INSTITUT FUER TECHNOLOGIE',
    identifier: 'KARLSRU01',
    url: 'https://www.service4mobility.com/europe/MobilitySearchServlet?identifier=KARLSRU01&kz_bew_art=OUT&kz_bew_pers=S&sprache=en',
  },
  {
    id: 'RHEINISCHE_FRIEDRICH_WILHELMS_UNIVERSITAT_BONN',
    name: 'RHEINISCHE FRIEDRICH-WILHELMS-UNIVERSITAET BONN',
    identifier: 'BONN01',
    url: 'https://mobility-international.uni-bonn.de/mobility/MobilitySearchServlet?identifier=BONN01&kz_bew_art=OUT&kz_bew_pers=S&sprache=en',
  },
  {
    id: 'PHILIPPS_UNIVERSITAET_MARBURG',
    name: 'PHILIPPS UNIVERSITAET MARBURG',
    identifier: 'MARBURG01',
    url: 'https://www.service4mobility.com/europe/MobilitySearchServlet?identifier=MARBURG01&kz_bew_art=OUT&kz_bew_pers=S&sprache=en',
  },
  {
    id: 'UNIVERSITAET_AUGSBURG',
    name: 'UNIVERSITAET AUGSBURG',
    identifier: 'AUGSBUR01',
    url: 'https://www.service4mobility.com/europe/MobilitySearchServlet?identifier=AUGSBUR01&kz_bew_art=OUT&kz_bew_pers=S&sprache=en',
  },
  {
    id: 'UNIVERSITAET_BIELEFELD',
    name: 'UNIVERSITAET BIELEFELD',
    identifier: 'BIELEFE01',
    url: 'https://www.service4mobility.com/europe/MobilitySearchServlet?identifier=BIELEFE01&kz_bew_art=OUT&kz_bew_pers=S&sprache=en',
  },
  {
    id: 'BERGISCHE_UNIVERSITAET_WUPPERTAL',
    name: 'BERGISCHE UNIVERSITAET WUPPERTAL',
    identifier: 'WUPPERT01',
    url: 'https://www.service4mobility.com/europe/MobilitySearchServlet?identifier=WUPPERT01&kz_bew_art=OUT&kz_bew_pers=S&sprache=en',
  },
  {
    id: 'UNIVERSITAET_HAMBURG',
    name: 'UNIVERSITAET HAMBURG',
    identifier: 'HAMBURG01',
    url: 'https://www.service4mobility.com/europe/MobilitySearchServlet?identifier=HAMBURG01&kz_bew_art=OUT&kz_bew_pers=S&sprache=en',
  },
  {
    id: 'UNIVERSITAET_BREMEN',
    name: 'UNIVERSITAET BREMEN',
    identifier: 'BREMEN01',
    url: 'https://www.service4mobility.com/europe/MobilitySearchServlet?identifier=BREMEN01&kz_bew_art=OUT&kz_bew_pers=S&sprache=en',
  },
  {
    id: 'MARTIN_LUTHER_UNIVERSITAET_HALLE_WITTENBERG',
    name: 'MARTIN-LUTHER-UNIVERSITAET HALLE-WITTENBERG',
    identifier: 'HALLE01',
    url: 'https://www.service4mobility.com/europe/MobilitySearchServlet?identifier=HALLE01&kz_bew_art=OUT&kz_bew_pers=S&sprache=en',
  },
  {
    id: 'FRIEDRICH_ALEXANDER_UNIVERSITAET_ERLANGEN_NUERNBERG',
    name: 'FRIEDRICH-ALEXANDER-UNIVERSITAET ERLANGEN NUERNBERG',
    identifier: 'ERLANGE01',
    url: 'https://www.service4mobility.com/europe/MobilitySearchServlet?identifier=ERLANGE01&kz_bew_art=OUT&kz_bew_pers=S&sprache=en',
  },
  {
    id: 'TECHNISCHE_UNIVERSITAT_DARMSTADT',
    name: 'TECHNISCHE UNIVERSITAT DARMSTADT',
    identifier: 'DARMSTA01',
    url: 'https://www.service4mobility.com/europe/MobilitySearchServlet?identifier=DARMSTA01&kz_bew_art=OUT&kz_bew_pers=S&sprache=en',
  },
];

async function extractFromSearchServlet(page) {
  return page.evaluate(() => {
    const results = [];
    const partnerSelect = document.querySelector('select[name="inst_id_partner"]');
    if (partnerSelect) {
      const opts = partnerSelect.querySelectorAll('option');
      for (const opt of opts) {
        const name = opt.textContent.trim();
        const value = opt.value;
        if (value === '-1' || !name || name.includes('Please select') || name.includes('Select all') ||
            name.includes('Bitte wählen') || name.includes('Alle auswählen')) continue;
        if (name.length > 3) {
          results.push({
            partner_name: name,
            country: '',
            city: 'Unknown',
            faculty_department: null,
            moveon_id: value,
          });
        }
      }
    }
    const text = document.body.innerText;
    const statsMatch = text.match(/(\d+)\s+(?:Exchange possibilities|Austauschmöglichkeiten)/);
    const countryMatch = text.match(/(\d+)\s+(?:Countries|Länder)/);
    return {
      partners: results,
      stats: {
        exchanges: statsMatch ? parseInt(statsMatch[1]) : null,
        countries: countryMatch ? parseInt(countryMatch[1]) : null,
      },
    };
  });
}

async function extractFromPortalServlet(page, opts = {}) {
  const { debug = false, identifier = 'portal' } = opts;
  try {
    await page.waitForSelector('body', { timeout: 10000 });
    await delay(2000);

    // Phase 1: Fill required dropdowns – prefer cpif_*, kz_bew_* patterns
    await page.evaluate(() => {
      const priorityNames = ['kz_bew_art', 'kz_bew_pers', 'cpif_studienjahr', 'cpif_studienniveau', 'inst_id_partner'];
      const allSelects = document.querySelectorAll('select[name], select[id]');
      const byName = {};
      allSelects.forEach(s => { if (s.name) byName[s.name] = s; });
      for (const name of priorityNames) {
        const sel = byName[name] || document.querySelector(`select[name="${name}"], select[id="${name}"], select[name*="cpif_"], select[name*="kz_bew_"]`);
        if (sel) {
          const opts = sel.querySelectorAll('option');
          for (let i = opts.length - 1; i >= 0; i--) {
            const val = opts[i].value;
            if (val && val !== '-1' && val !== '') {
              sel.value = val;
              sel.dispatchEvent(new Event('change', { bubbles: true }));
              break;
            }
          }
        }
      }
      for (const sel of allSelects) {
        if (sel.value === '-1' || sel.value === '') {
          const opts = sel.querySelectorAll('option');
          for (let i = opts.length - 1; i >= 0; i--) {
            const val = opts[i].value;
            if (val && val !== '-1' && val !== '') {
              sel.value = val;
              sel.dispatchEvent(new Event('change', { bubbles: true }));
              break;
            }
          }
        }
      }
    });
    await delay(1000);

    const clicked = await page.evaluate(() => {
      const btn = document.querySelector('input[name="search_button"], button[name="search_button"], .search_button, input[type="submit"], button[type="submit"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (!clicked) {
      console.log('  No search button found on PortalServlet');
      return { partners: [], stats: {} };
    }

    // Extended wait for AJAX-loaded tables (5–10s)
    const tableSelector = 'table.dataTable, table.result_table, .sop_portal_result, .modal_result_table, table.dataTableFullClass, .dataTables_wrapper table, #result_table, table[id*="result"]';
    await page.waitForSelector(tableSelector, { timeout: 15000 }).catch(() => null);
    await delay(5000);

    if (debug) {
      if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });
      const html = await page.content();
      const fn = `portal-${(identifier || 'portal').toLowerCase()}`;
      fs.writeFileSync(path.join(DEBUG_DIR, `${fn}.html`), html);
      await page.screenshot({ path: path.join(DEBUG_DIR, `${fn}.png`) });
      console.log(`  DEBUG: Saved ${fn}.html and ${fn}.png to data/debug/`);
    }

    await page.evaluate(() => {
      const lengthSelect = document.querySelector('select[name$="_length"], select.dataTables_length');
      if (lengthSelect) {
        const allOpt = lengthSelect.querySelector('option[value="-1"]');
        if (allOpt) {
          lengthSelect.value = '-1';
          lengthSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    await delay(3000);

    const extracted = await page.evaluate(() => {
      const results = [];
      const selectors = [
        'table.dataTable tbody', 'table.dataTableFullClass tbody', '.modal_result_table tbody',
        'table.result_table tbody', '.sop_portal_result tbody', '.dataTables_wrapper table tbody',
        '#result_table tbody', 'table[id*="result"] tbody'
      ];
      for (const sel of selectors) {
        const tbodies = document.querySelectorAll(sel);
        for (const tbody of tbodies) {
          const rows = tbody.querySelectorAll('tr');
          for (const row of rows) {
            if (row.classList.contains('dataTables_empty') || row.classList.contains('no-data')) continue;
            const cells = row.querySelectorAll('td');
            if (cells.length >= 1) {
              const partnerName = (cells[0].textContent || '').trim();
              const country = cells.length >= 2 ? (cells[1].textContent || '').trim() : '';
              const city = cells.length >= 3 ? (cells[2].textContent || '').trim() : 'Unknown';
              if (partnerName && partnerName.length > 3) {
                results.push({
                  partner_name: partnerName,
                  country: country,
                  city: city,
                  faculty_department: cells.length >= 4 ? (cells[3].textContent || '').trim() : null,
                });
              }
            }
          }
        }
      }
      return { partners: results, stats: { rows: results.length } };
    });
    return extracted;
  } catch (err) {
    console.log(`  PortalServlet extraction error: ${err.message}`);
    return { partners: [], stats: {} };
  }
}

async function scrapeUniversity(uni, debugMode = false) {
  const outputFile = path.join(MOVEON_DIR, `${uni.identifier.toLowerCase()}.json`);

  if (fs.existsSync(outputFile)) {
    const existing = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
    if (existing.partners && existing.partners.length > 0 && !process.argv.includes('--rescrape')) {
      const age = Date.now() - new Date(existing.scraped_at).getTime();
      if (age < 30 * 24 * 60 * 60 * 1000) {
        console.log(`  CACHED (${existing.partners.length} partners)`);
        return { cached: true, count: existing.partners.length };
      }
    }
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log(`  Navigating to ${uni.url}...`);
    await page.goto(uni.url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(randInt(2000, 4000));

    const isDebug = process.argv.includes('--debug');
    const portalOpts = isDebug ? { debug: true, identifier: uni.identifier } : {};
    const isPortalServlet = uni.url.includes('PortalServlet') || uni.type === 'PortalServlet';
    let partners;
    if (isPortalServlet) {
      console.log('  Using PortalServlet strategy...');
      partners = await extractFromPortalServlet(page, portalOpts);
    } else {
      partners = await extractFromSearchServlet(page);
    }

    // If SearchServlet yielded 0 partners, try PortalServlet fallback
    if ((!partners.partners || partners.partners.length === 0) && !isPortalServlet) {
      const portalUrl = uni.url.replace('MobilitySearchServlet', 'PortalServlet');
      console.log('  Trying PortalServlet fallback...');
      await page.goto(portalUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await delay(randInt(2000, 4000));
      partners = await extractFromPortalServlet(page, portalOpts);
    }

    if (partners.stats?.exchanges) {
      console.log(`  Portal: ${partners.stats.exchanges} exchanges, ${partners.partners.length} partner institutions`);
    }

    const partnerList = partners.partners || [];
    const seen = new Set();
    const deduped = partnerList.filter(p => {
      const key = p.partner_name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const output = {
      university_id: uni.id,
      university_name: uni.name,
      portal_url: uni.url,
      portal_type: 'mobility_online',
      scraped_at: new Date().toISOString(),
      strategy: isPortalServlet ? 'portal_servlet' : 'html_table',
      partner_count: deduped.length,
      partners: deduped,
    };

    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`  Saved ${deduped.length} partners to ${path.basename(outputFile)}`);
    return { cached: false, count: deduped.length };

  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
    return { cached: false, count: 0, error: err.message };
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('=== Mobility Online Scraper ===\n');

  const args = process.argv.slice(2);
  let singleUni = null;
  for (const arg of args) {
    if (arg.startsWith('--uni=')) singleUni = arg.split('=')[1];
  }
  const debugMode = args.includes('--debug');
  if (debugMode) console.log('  DEBUG mode: will save HTML + screenshot to data/debug/ for PortalServlet pages\n');

  // Merge hardcoded list with discovered portals from registry
  const registryPath = path.join(__dirname, '..', 'data', 'mobility_online_registry.json');
  let batch = [...MOBILITY_ONLINE_UNIS];
  const knownIdentifiers = new Set(batch.map(u => u.identifier));

  if (fs.existsSync(registryPath)) {
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
    for (const portal of registry.portals || []) {
      if (!knownIdentifiers.has(portal.erasmus_code) && portal.partner_count > 0) {
        batch.push({
          id: portal.erasmus_code,
          name: portal.title || portal.erasmus_code,
          identifier: portal.erasmus_code,
          url: portal.url,
          type: portal.type,
        });
        knownIdentifiers.add(portal.erasmus_code);
      }
    }
    console.log(`Registry added ${batch.length - MOBILITY_ONLINE_UNIS.length} new portals`);
  }

  if (singleUni) {
    batch = batch.filter(u => u.id === singleUni || u.identifier === singleUni);
    if (batch.length === 0) {
      console.error(`University ${singleUni} not found.`);
      process.exit(1);
    }
  }

  console.log(`Scraping ${batch.length} universities\n`);

  let total = 0;
  let scraped = 0;
  let cached = 0;
  let errors = 0;

  for (let i = 0; i < batch.length; i++) {
    const uni = batch[i];
    console.log(`[${i + 1}/${batch.length}] ${uni.name}`);

    const result = await scrapeUniversity(uni);
    total += result.count;

    if (result.cached) cached++;
    else if (result.error) errors++;
    else scraped++;

    if (i < batch.length - 1 && !result.cached) {
      const wait = randInt(15000, 40000);
      console.log(`  Waiting ${Math.round(wait / 1000)}s...\n`);
      await delay(wait);
    }
  }

  console.log(`\n=== Scraping Complete ===`);
  console.log(`Scraped: ${scraped} | Cached: ${cached} | Errors: ${errors}`);
  console.log(`Total partners extracted: ${total}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
