#!/usr/bin/env node

/**
 * Universal MoveOn Portal Scraper
 *
 * Extracts Erasmus partner data from MoveOn portals using three strategies:
 *   1. Global JS variable extraction (window.moreinformatics, etc.)
 *   2. XHR/API response interception
 *   3. HTML table parsing (fallback)
 *
 * Anti-bot: stealth plugin, random delays, random viewports, batch scheduling.
 *
 * Usage:
 *   node scripts/scrape-moveon-universal.js                     # Scrape first batch
 *   node scripts/scrape-moveon-universal.js --start=0 --size=10 # Specific batch
 *   node scripts/scrape-moveon-universal.js --uni=FREIE_UNIVERSITAET_BERLIN  # Single uni
 *   node scripts/scrape-moveon-universal.js --rescrape          # Re-scrape all
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const REGISTRY_PATH = path.join(__dirname, '..', 'data', 'moveon_registry.json');
const MOVEON_DIR = path.join(__dirname, '..', 'data', 'moveon');
const CACHE_MAX_AGE_DAYS = 30;

const delay = (ms) => new Promise(r => setTimeout(r, ms));
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
];

// ── Normalizers ──

function normalizePartner(raw, portalUrl) {
  const partner = {
    partner_name: (raw.name || raw.universityname || '').trim(),
    country: (raw.country_fullname || raw.country || '').trim(),
    country_code: (raw.country_code || raw.country_iso || raw.country || '').trim(),
    city: 'Unknown',
    lat: raw.latitude ? parseFloat(raw.latitude) : null,
    lng: raw.longitude ? parseFloat(raw.longitude) : null,
    exchange_type: null,
    spots: null,
    study_levels: [],
    isced_subject: null,
    faculty_department: null,
    moveon_id: raw.relation_id || raw.core_id || null,
  };

  if (!partner.partner_name || partner.partner_name.length < 2) return null;

  const informatics = raw.informatics || raw.details || [];
  if (Array.isArray(informatics)) {
    for (const entry of informatics) {
      if (!entry || typeof entry !== 'object') continue;

      if (entry.institutions && Array.isArray(entry.institutions)) {
        for (const inst of entry.institutions) {
          if (inst && (inst.shortname === 'City' || inst.shortname === 'Stadt') && inst.fullname) {
            partner.city = inst.fullname.trim();
          }
        }
      }

      if (entry.relations && Array.isArray(entry.relations)) {
        for (const rel of entry.relations) {
          if (!rel || !rel.shortname || !rel.fullname) continue;
          const sn = rel.shortname.toLowerCase();
          const fn = rel.fullname.trim();
          if (fn === '-' || fn === '') continue;

          if (sn.includes('austauschprogramm') || sn.includes('exchange program')) {
            partner.exchange_type = fn;
          } else if (sn.includes('fachrichtung') || sn.includes('subject area') || sn.includes('isced')) {
            if (sn.includes('isced')) {
              partner.isced_subject = fn;
            } else {
              partner.faculty_department = fn;
            }
          } else if (sn.includes('austauschplätze') || sn.includes('austauschplaetze') || sn.includes('places') || sn.includes('spots')) {
            const m = fn.match(/(\d+)/);
            if (m) partner.spots = parseInt(m[1], 10);
          } else if (sn.includes('studienniveau') || sn.includes('level of studies') || sn.includes('study level')) {
            partner.study_levels = fn.split('||').map(s => s.trim()).filter(Boolean);
          }
        }
      }
    }
  }

  if (partner.city === 'Unknown') {
    partner.city = raw.city || raw.stadt || 'Unknown';
  }

  return partner;
}

// ── Extraction Strategies ──

async function tryJsExtraction(page) {
  const result = await page.evaluate(() => {
    const candidates = [
      'moreinformatics', 'moreInformatics', 'partners', 'partnerData',
      'exchangeData', 'publisherData', 'mapData', 'markerData',
      'allData', 'universities', 'mobility_data', 'agreements',
      'tableData', 'reportData', 'wpAdvPubData',
    ];
    for (const name of candidates) {
      try {
        const val = window[name];
        if (val && Array.isArray(val) && val.length > 0) {
          return { variable: name, count: val.length, data: val };
        }
      } catch (e) { /* skip */ }
    }

    // Search all window properties for large arrays with university-like data
    try {
      for (const key of Object.keys(window)) {
        try {
          const val = window[key];
          if (val && Array.isArray(val) && val.length > 5) {
            const first = val[0];
            if (first && typeof first === 'object' &&
                (first.universityname || first.name || first.partner_name ||
                 first.institution || first.university || first.country_fullname)) {
              return { variable: key, count: val.length, data: val };
            }
          }
        } catch (e) { /* skip */ }
      }
    } catch (e) { /* skip */ }

    // Scan inline scripts for JSON arrays
    try {
      const scripts = document.querySelectorAll('script:not([src])');
      for (const script of scripts) {
        const text = script.textContent || '';
        // Look for variable assignments containing arrays
        const patterns = [
          /(?:var|let|const)\s+(\w+)\s*=\s*(\[[\s\S]*?\]);/g,
          /window\.(\w+)\s*=\s*(\[[\s\S]*?\]);/g,
        ];
        for (const pattern of patterns) {
          let match;
          while ((match = pattern.exec(text)) !== null) {
            if (match[2].length > 100) {
              try {
                const parsed = JSON.parse(match[2]);
                if (Array.isArray(parsed) && parsed.length > 0 &&
                    (parsed[0].universityname || parsed[0].name || parsed[0].country_fullname)) {
                  return { variable: match[1], count: parsed.length, data: parsed };
                }
              } catch (e) { /* not valid JSON */ }
            }
          }
        }
      }
    } catch (e) { /* skip */ }

    return null;
  });

  return result;
}

async function tryXhrInterception(page, interceptedData) {
  if (interceptedData.length === 0) return null;

  for (const data of interceptedData) {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const arr = Array.isArray(parsed) ? parsed : (parsed.data || parsed.results || parsed.items);
      if (Array.isArray(arr) && arr.length > 5) {
        const hasNames = arr.some(item =>
          item && (item.universityname || item.name || item.partner_name)
        );
        if (hasNames) return { data: arr, count: arr.length };
      }
    } catch (e) { /* not JSON */ }
  }

  return null;
}

async function tryHtmlExtraction(page) {
  const result = await page.evaluate(() => {
    const partners = [];

    const rows = document.querySelectorAll('table tbody tr, .partner-row, .result-item, .list-item');
    for (const row of rows) {
      const cells = row.querySelectorAll('td, .cell, .column');
      if (cells.length >= 2) {
        const name = (cells[0]?.textContent || '').trim();
        const country = cells.length >= 3 ? (cells[2]?.textContent || '').trim() : '';
        const city = cells.length >= 4 ? (cells[3]?.textContent || '').trim() : '';
        if (name && name.length > 3 && !name.match(/^(Nr|#|Name|University|Universität)/i)) {
          partners.push({
            universityname: name,
            country_fullname: country,
            city: city,
          });
        }
      }
    }

    if (partners.length === 0) {
      const cards = document.querySelectorAll('[class*="partner"], [class*="university"], [class*="result"]');
      for (const card of cards) {
        const name = card.querySelector('h2, h3, h4, .title, .name, strong')?.textContent?.trim();
        if (name && name.length > 3) {
          const details = card.textContent || '';
          partners.push({
            universityname: name,
            country_fullname: '',
            city: '',
          });
        }
      }
    }

    return partners.length > 0 ? { data: partners, count: partners.length } : null;
  });

  return result;
}

// ── Main Scraper ──

async function scrapePortal(portal) {
  const outputFile = path.join(MOVEON_DIR, `${portal.slug}.json`);

  if (fs.existsSync(outputFile)) {
    const existing = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
    const age = Date.now() - new Date(existing.scraped_at).getTime();
    if (age < CACHE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000 && !process.argv.includes('--rescrape')) {
      console.log(`  CACHED (${existing.partners.length} partners, ${Math.floor(age / 86400000)}d old)`);
      return { cached: true, count: existing.partners.length };
    }
  }

  const viewport = VIEWPORTS[randInt(0, VIEWPORTS.length - 1)];

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      `--window-size=${viewport.width},${viewport.height}`,
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport(viewport);

    const interceptedData = [];
    await page.setRequestInterception(true);

    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'font', 'media'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    page.on('response', async (response) => {
      try {
        const ct = response.headers()['content-type'] || '';
        if (ct.includes('application/json') && response.status() === 200) {
          const text = await response.text();
          if (text.length > 100) {
            interceptedData.push(text);
          }
        }
      } catch (e) { /* ignore */ }
    });

    console.log(`  Navigating to ${portal.portal_url}...`);
    await page.goto(portal.portal_url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await delay(randInt(3000, 6000));

    // Submit search form to load all data (common in advanced publisher)
    const searchResult = await page.evaluate(() => {
      // Try form submission first
      const forms = document.querySelectorAll('form');
      for (const form of forms) {
        const inputs = form.querySelectorAll('input, select');
        if (inputs.length > 0) {
          const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
          if (submitBtn) {
            submitBtn.click();
            return 'form_submit:' + (submitBtn.textContent || submitBtn.value || '').trim().substring(0, 30);
          }
        }
      }
      // Try standalone buttons
      const btns = Array.from(document.querySelectorAll('button, input[type="submit"], a.btn, .btn, [role="button"]'));
      for (const btn of btns) {
        const text = (btn.textContent || btn.value || '').toLowerCase().trim();
        if (text.includes('search') || text.includes('suchen') || text.includes('finden') ||
            text.includes('anzeigen') || text.includes('show all') || text.includes('alle anzeigen') ||
            text.includes('apply') || text.includes('filter') || text === 'suche') {
          btn.click();
          return 'button:' + text.substring(0, 30);
        }
      }
      return null;
    });
    if (searchResult) {
      console.log(`  Search triggered: ${searchResult}`);
      await delay(randInt(5000, 10000));
      // Wait for network to settle after form submission
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
      } catch (e) { /* navigation may not happen for SPA */ }
      await delay(randInt(2000, 4000));
    }

    // Try all extraction strategies
    let rawData = null;
    let strategy = null;

    // Strategy 1: JS global variables
    const jsResult = await tryJsExtraction(page);
    if (jsResult && jsResult.count > 0) {
      rawData = jsResult.data;
      strategy = `js_variable:${jsResult.variable}`;
      console.log(`  Strategy: JS variable (${jsResult.variable}) -> ${jsResult.count} items`);
    }

    // Strategy 2: Intercepted XHR responses
    if (!rawData) {
      const xhrResult = await tryXhrInterception(page, interceptedData);
      if (xhrResult) {
        rawData = xhrResult.data;
        strategy = 'xhr_interception';
        console.log(`  Strategy: XHR interception -> ${xhrResult.count} items`);
      }
    }

    // Advanced publisher retry: wait for SPA to render, then try again
    if (!rawData) {
      console.log(`  Waiting for SPA render...`);
      await delay(randInt(5000, 10000));

      // Try clicking any remaining search/filter UI
      await page.evaluate(() => {
        const selects = document.querySelectorAll('select');
        for (const sel of selects) {
          const opts = sel.querySelectorAll('option');
          if (opts.length > 1 && sel.value === '') {
            sel.value = opts[0].value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      });
      await delay(3000);

      const jsRetry = await tryJsExtraction(page);
      if (jsRetry && jsRetry.count > 0) {
        rawData = jsRetry.data;
        strategy = `js_variable_retry:${jsRetry.variable}`;
        console.log(`  Strategy: JS variable retry -> ${jsRetry.count} items`);
      }

      if (!rawData) {
        const xhrRetry = await tryXhrInterception(page, interceptedData);
        if (xhrRetry) {
          rawData = xhrRetry.data;
          strategy = 'xhr_interception_retry';
          console.log(`  Strategy: XHR interception retry -> ${xhrRetry.count} items`);
        }
      }
    }

    // Strategy 3: HTML parsing (last resort)
    if (!rawData) {
      const htmlResult = await tryHtmlExtraction(page);
      if (htmlResult) {
        rawData = htmlResult.data;
        strategy = 'html_parsing';
        console.log(`  Strategy: HTML parsing -> ${htmlResult.count} items`);
      }
    }

    if (!rawData || rawData.length === 0) {
      console.log(`  NO DATA FOUND`);
      const result = {
        university_id: portal.university_id,
        university_name: portal.university_name,
        portal_url: portal.portal_url,
        portal_type: portal.portal_type,
        scraped_at: new Date().toISOString(),
        strategy: 'none',
        partners: [],
        error: 'No data extracted',
      };
      fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
      return { cached: false, count: 0 };
    }

    const partners = rawData
      .map(item => normalizePartner(item, portal.portal_url))
      .filter(Boolean);

    // Deduplicate by partner_name + country
    const seen = new Set();
    const deduped = partners.filter(p => {
      const key = `${p.partner_name.toLowerCase()}|${p.country.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const output = {
      university_id: portal.university_id,
      university_name: portal.university_name,
      portal_url: portal.portal_url,
      portal_type: portal.portal_type,
      scraped_at: new Date().toISOString(),
      strategy,
      partner_count: deduped.length,
      partners: deduped,
    };

    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`  Saved ${deduped.length} partners to ${path.basename(outputFile)}`);
    return { cached: false, count: deduped.length };

  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
    const errOutput = {
      university_id: portal.university_id,
      university_name: portal.university_name,
      portal_url: portal.portal_url,
      scraped_at: new Date().toISOString(),
      strategy: 'error',
      partners: [],
      error: err.message,
    };
    const outputFile = path.join(MOVEON_DIR, `${portal.slug}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(errOutput, null, 2));
    return { cached: false, count: 0, error: err.message };
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('=== Universal MoveOn Scraper ===\n');

  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error('Registry not found. Run discover-moveon-portals.js first.');
    process.exit(1);
  }

  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
  const portals = registry.portals || [];
  console.log(`Registry: ${portals.length} portals\n`);

  // Parse args
  const args = process.argv.slice(2);
  let startIdx = 0;
  let batchSize = 10;
  let singleUni = null;

  for (const arg of args) {
    if (arg.startsWith('--start=')) startIdx = parseInt(arg.split('=')[1], 10);
    if (arg.startsWith('--size=')) batchSize = parseInt(arg.split('=')[1], 10);
    if (arg.startsWith('--uni=')) singleUni = arg.split('=')[1];
  }

  let batch;
  if (singleUni) {
    batch = portals.filter(p => p.university_id === singleUni);
    if (batch.length === 0) {
      console.error(`University ${singleUni} not found in registry.`);
      process.exit(1);
    }
  } else {
    batch = portals.slice(startIdx, startIdx + batchSize);
  }

  console.log(`Scraping batch: ${batch.length} universities (index ${startIdx}-${startIdx + batch.length - 1})\n`);

  let totalPartners = 0;
  let scraped = 0;
  let cached = 0;
  let errors = 0;

  for (let i = 0; i < batch.length; i++) {
    const portal = batch[i];
    console.log(`[${i + 1}/${batch.length}] ${portal.university_name} (${portal.portal_type})`);

    const result = await scrapePortal(portal);
    totalPartners += result.count;

    if (result.cached) {
      cached++;
    } else if (result.error) {
      errors++;
    } else {
      scraped++;
    }

    if (i < batch.length - 1 && !result.cached) {
      const waitTime = randInt(30000, 90000);
      console.log(`  Waiting ${Math.round(waitTime / 1000)}s...\n`);
      await delay(waitTime);
    }
  }

  console.log(`\n=== Scraping Complete ===`);
  console.log(`Scraped: ${scraped} | Cached: ${cached} | Errors: ${errors}`);
  console.log(`Total partners extracted: ${totalPartners}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
