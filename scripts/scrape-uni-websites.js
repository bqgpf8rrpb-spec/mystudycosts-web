#!/usr/bin/env node

/**
 * Generic University Website Scraper
 *
 * Scrapes Erasmus partner lists from individual university websites.
 * Each university has a config specifying URLs and extraction methods.
 *
 * Supports: HTML tables, accordion lists, link lists, JSON-LD, and
 * custom CSS selectors.
 *
 * Usage:
 *   node scripts/scrape-uni-websites.js
 *   node scripts/scrape-uni-websites.js --uni=UNIVERSITAET_HAMBURG
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const MOVEON_DIR = path.join(__dirname, '..', 'data', 'moveon');
const delay = (ms) => new Promise(r => setTimeout(r, ms));
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const UNI_CONFIGS = [
  {
    id: 'JOHANN_WOLFGANG_GOETHE_UNIVERSITAET_FRANKFURT_AM_MAIN',
    name: 'Goethe-Universität Frankfurt',
    slug: 'uni-frankfurt',
    pages: [
      { url: 'https://www.uni-frankfurt.de/35791816/Erasmus_Partneruniversitäten', type: 'html_table' },
    ],
  },
  {
    id: 'UNIVERSITAET_HAMBURG',
    name: 'Universität Hamburg',
    slug: 'uni-hamburg',
    pages: [
      { url: 'https://www.uni-hamburg.de/internationales/studieren-im-ausland/erasmus/partnerhochschulen.html', type: 'html_table' },
    ],
  },
  {
    id: 'UNIVERSITAET_KONSTANZ',
    name: 'Universität Konstanz',
    slug: 'uni-konstanz',
    pages: [
      { url: 'https://www.uni-konstanz.de/international-office/studium-im-ausland/erasmus/partneruniversitaeten/', type: 'html_table' },
    ],
  },
  {
    id: 'UNIVERSITAET_BAMBERG',
    name: 'Universität Bamberg',
    slug: 'uni-bamberg',
    pages: [
      { url: 'https://www.uni-bamberg.de/auslandsamt/studium-im-ausland/erasmus-aufenthalte/partneruniversitaeten/', type: 'html_table' },
    ],
  },
  {
    id: 'UNIVERSITAET_DES_SAARLANDES',
    name: 'Universität des Saarlandes',
    slug: 'uni-saarland',
    pages: [
      { url: 'https://www.uni-saarland.de/studium/international/auslandsaufenthalt/erasmus/partneruniversitaeten.html', type: 'html_table' },
    ],
  },
  {
    id: 'UNIVERSITAET_PADERBORN',
    name: 'Universität Paderborn',
    slug: 'uni-paderborn',
    pages: [
      { url: 'https://www.uni-paderborn.de/studium/erasmus/partnerhochschulen', type: 'html_table' },
    ],
  },
  {
    id: 'TECHNISCHE_UNIVERSITAET_DARMSTADT',
    name: 'TU Darmstadt',
    slug: 'tu-darmstadt',
    pages: [
      { url: 'https://www.tu-darmstadt.de/studieren/studieninteressierte/internationale_studieninteressierte/erasmus_incoming/erasmus_kooperationen/index.de.jsp', type: 'html_table' },
    ],
  },
  {
    id: 'UNIVERSITAET_ROSTOCK',
    name: 'Universität Rostock',
    slug: 'uni-rostock',
    pages: [
      { url: 'https://www.uni-rostock.de/internationales/wege-ins-ausland/erasmus/partnerhochschulen/', type: 'html_table' },
    ],
  },
  {
    id: 'UNIVERSITAET_BAYREUTH',
    name: 'Universität Bayreuth',
    slug: 'uni-bayreuth',
    pages: [
      { url: 'https://www.international-office.uni-bayreuth.de/de/Studium-im-Ausland/erasmus/partneruniversitaeten/index.html', type: 'html_table' },
    ],
  },
  {
    id: 'UNIVERSITAET_GREIFSWALD',
    name: 'Universität Greifswald',
    slug: 'uni-greifswald',
    pages: [
      { url: 'https://www.uni-greifswald.de/international/outgoing/erasmus/partneruniversitaeten/', type: 'html_table' },
    ],
  },
  {
    id: 'HOCHSCHULE_FUER_TECHNIK_UND_WIRTSCHAFT_BERLIN',
    name: 'HTW Berlin',
    slug: 'htw-berlin',
    pages: [
      { url: 'https://www.htw-berlin.de/studium/internationales/wege-ins-ausland/erasmus-studium/partnerhochschulen/', type: 'html_table' },
    ],
  },
  {
    id: 'HOCHSCHULE_FUER_WIRTSCHAFT_UND_RECHT_BERLIN',
    name: 'HWR Berlin',
    slug: 'hwr-berlin',
    pages: [
      { url: 'https://www.hwr-berlin.de/international/wege-ins-ausland/partnerhochschulen/', type: 'html_table' },
    ],
  },

  // Phase 2: Top priority not_found (from identify-priority-not-found.js)
  {
    id: 'RHEINISCHE_FRIEDRICH_WILHELMS_UNIVERSITAT_BONN',
    name: 'Universität Bonn',
    slug: 'uni-bonn',
    pages: [
      { url: 'https://www.uni-bonn.de/de/studium/studium-und-praktikum-im-ausland/studium-im-ausland/partnerhochschulen', type: 'html_table' },
    ],
  },
  {
    id: 'FRANKFURT_UNIVERSITY_OF_APPLIED_SCIENCES',
    name: 'Frankfurt University of Applied Sciences',
    slug: 'frankfurt-uas',
    pages: [
      { url: 'https://www.frankfurt-university.de/de/studium/internationales/erasmus/partnerhochschulen', type: 'html_table' },
    ],
  },
  {
    id: 'HAW_HAMBURG',
    name: 'HAW Hamburg',
    slug: 'haw-hamburg',
    pages: [
      { url: 'https://www.haw-hamburg.de/international/partnerhochschulen-a-z/', type: 'html_table' },
    ],
  },
  {
    id: 'BREMEN_UNIVERSITY_OF_APPLIED_SCIENCES',
    name: 'Hochschule Bremen',
    slug: 'hs-bremen',
    pages: [
      { url: 'https://www.hs-bremen.de/en/study/during-your-studies/going-abroad/partner-universities/', type: 'html_table' },
    ],
  },
  {
    id: 'FH_MUENSTER_UNIVERSITY_OF_APPLIED_SCIENCES',
    name: 'FH Münster',
    slug: 'fh-muenster',
    pages: [
      { url: 'https://www.fh-muenster.de/internationaloffice/partnerhochschulen/index.php?fachbereichId=&landId=&stadtId=&erasmus=1', type: 'html_table' },
    ],
  },
  {
    id: 'JULIUS_MAXIMILIANS_UNIVERSITAT_WUERZBURG',
    name: 'Universität Würzburg',
    slug: 'uni-wuerzburg',
    pages: [
      { url: 'https://www.uni-wuerzburg.de/studium/studieninteressierte/studium-im-ausland/erasmus/partneruniversitaeten/', type: 'html_table' },
    ],
  },
  {
    id: 'ISM_INTERNATIONAL_SCHOOL_OF_MANAGEMENT_GMBH_GEMEINNUETZIGE_G',
    name: 'ISM International School of Management',
    slug: 'ism-dortmund',
    pages: [
      { url: 'https://www.ism.de/international/partnerhochschulen', type: 'html_table' },
    ],
  },
  {
    id: 'OSNABRUECK_UNIVERSITY_OF_APPLIED_SCIENCES',
    name: 'Hochschule Osnabrück',
    slug: 'hs-osnabrueck',
    pages: [
      { url: 'https://www.hs-osnabrueck.de/vernetzung/internationale-partner/partnerhochschulen/', type: 'html_table' },
    ],
  },
  {
    id: 'WHU_OTTO_BEISHEIM_SCHOOL_OF_MANAGEMENT',
    name: 'WHU Vallendar',
    slug: 'whu',
    pages: [
      { url: 'https://www.whu.edu/studium/auslandssemester/partneruniversitaeten/', type: 'html_table' },
    ],
  },
  {
    id: 'CBS_COLOGNE_BUSINESS_SCHOOL_GMBH',
    name: 'CBS Cologne Business School',
    slug: 'cbs-koeln',
    pages: [
      { url: 'https://www.cbs.de/en/studies/international/partner-universities', type: 'html_table' },
    ],
  },
  {
    id: 'TRIER_UNIVERSITY_OF_APPLIED_SCIENCES_IFAS',
    name: 'Hochschule Trier',
    slug: 'hochschule-trier',
    pages: [
      { url: 'https://www.hochschule-trier.de/index.php?id=5593', type: 'html_table' },
    ],
  },
  {
    id: 'MAINZ_UNIVERSITY_OF_APPLIED_SCIENCES',
    name: 'Hochschule Mainz',
    slug: 'hs-mainz',
    pages: [
      { url: 'https://www.hs-mainz.de/international/profil/partnerhochschulen/', type: 'html_table' },
    ],
  },
  {
    id: 'UNIVERSITY_OF_APPLIED_SCIENCES_WUERZBURG_SCHWEINFURT',
    name: 'FHWS Würzburg-Schweinfurt',
    slug: 'fhws',
    pages: [
      { url: 'https://www.fhws.de/studium/internationales/partnerhochschulen/', type: 'html_table' },
    ],
  },
  {
    id: 'HTW_SAAR_UNIVERSITY_OF_APPLIED_SCIENCES',
    name: 'HTW Saar',
    slug: 'htw-saar',
    pages: [
      { url: 'https://www.htwsaar.de/studium/international/partnerhochschulen', type: 'html_table' },
    ],
  },
  {
    id: 'BERLIN_UNIVERSITY_OF_APPLIED_SCIENCES_AND_TECHNOLOGY',
    name: 'Berliner Hochschule für Technik',
    slug: 'bht-berlin',
    pages: [
      { url: 'https://www.bht-berlin.de/studium/international/partnerhochschulen', type: 'html_table' },
    ],
  },
  {
    id: 'FRANKFURT_SCHOOL_OF_FINANCE_MANAGEMENT_GEMEINNUETZIGE_GMBH',
    name: 'Frankfurt School of Finance',
    slug: 'frankfurt-school',
    pages: [
      { url: 'https://www.frankfurt-school.de/en/study/international/partner-universities', type: 'html_table' },
    ],
  },
  {
    id: 'MUTHESIUS_UNIVERSITY_OF_FINE_ARTS_AND_DESIGN',
    name: 'Muthesius Kunsthochschule Kiel',
    slug: 'muthesius-kiel',
    pages: [
      { url: 'https://www.muthesius.de/hochschule/internationales/partnerhochschulen', type: 'html_table' },
    ],
  },
  {
    id: 'OSTFALIA_UNIVERSITY_OF_APPLIED_SCIENCES',
    name: 'Ostfalia Hochschule',
    slug: 'ostfalia',
    pages: [
      { url: 'https://www.ostfalia.de/cms/de/io/partnerhochschulen/', type: 'html_table' },
    ],
  },
  {
    id: 'BADEN_WUERTTEMBERG_COOPERATIVE_STATE_UNIVERSITY_RAVENSBURG',
    name: 'DHBW Ravensburg',
    slug: 'dhbw-ravensburg',
    pages: [
      { url: 'https://www.dhbw-ravensburg.de/studium/internationales/partnerhochschulen', type: 'html_table' },
    ],
  },

  // Phase 4: multi_page_faculty – Groß-Unis mit fakultätsspezifischen Partnerlisten
  {
    id: 'UNIVERSITAET_ZU_KOELN',
    name: 'Universität zu Köln',
    slug: 'uni-koeln-faculties',
    type: 'multi_page_faculty',
    pages: [
      { faculty: 'Philosophische Fakultät - Englisches Seminar', url: 'https://zib.phil-fak.uni-koeln.de/koelner-studierende/erasmus/erasmus-partnerschaften/englisches-seminar-i-und-ii', type: 'html_table' },
      { faculty: 'Philosophische Fakultät - Romanisches Seminar', url: 'https://zib.phil-fak.uni-koeln.de/koelner-studierende/erasmus/erasmus-partnerschaften/romanisches-seminar-franzoesische-und-italienische-philologie', type: 'html_table' },
      { faculty: 'Philosophische Fakultät - Slavistik', url: 'https://zib.phil-fak.uni-koeln.de/koelner-studierende/erasmus/erasmus-partnerschaften/slavisches-institut', type: 'html_table' },
      { faculty: 'Philosophische Fakultät - Kunstgeschichte', url: 'https://zib.phil-fak.uni-koeln.de/koelner-studierende/erasmus/erasmus-partnerschaften/kunsthistorisches-institut', type: 'html_table' },
      { faculty: 'Philosophische Fakultät - Historisches Institut', url: 'https://zib.phil-fak.uni-koeln.de/koelner-studierende/erasmus/erasmus-partnerschaften/historisches-institut', type: 'html_table' },
      { faculty: 'Philosophische Fakultät - Philosophisches Seminar', url: 'https://zib.phil-fak.uni-koeln.de/koelner-studierende/erasmus/erasmus-partnerschaften/philosophisches-seminar', type: 'html_table' },
      { faculty: 'Philosophische Fakultät - Deutsche Sprache I', url: 'https://zib.phil-fak.uni-koeln.de/koelner-studierende/erasmus/erasmus-partnerschaften/institut-fuer-deutsche-sprache-und-literatur-i', type: 'html_table' },
      { faculty: 'Philosophische Fakultät - Linguistik', url: 'https://zib.phil-fak.uni-koeln.de/koelner-studierende/erasmus/erasmus-partnerschaften/institut-fuer-linguistik-und-phonetik', type: 'html_table' },
      { faculty: 'Philosophische Fakultät - Romanisches Seminar Spanisch', url: 'https://zib.phil-fak.uni-koeln.de/koelner-studierende/erasmus/erasmus-partnerschaften/romanisches-seminar-spanische-philologie', type: 'html_table' },
      { faculty: 'Juristische Fakultät - ZIB Jura', url: 'https://zib.jura.uni-koeln.de/erasmus-exchange/erasmus-exchange-law-outgoings-studium-praktika/partneruniversitaeten-und-erfahrungsberichte', type: 'html_table' },
      { faculty: 'Medizinische Fakultät - ZIB Med', url: 'https://medfak.uni-koeln.de/studium-lehre/studium-international/partneruniversitaeten', type: 'html_table' },
      { faculty: 'Wirtschafts- und Sozialwissenschaftliche Fakultät - WiSo', url: 'https://wiso.uni-koeln.de/de/studium/international/incoming-exchange-at-wiso/semester-exchange', type: 'html_table' },
      { faculty: 'Mathematisch-Naturwissenschaftliche Fakultät', url: 'https://mathnat.uni-koeln.de/international/fakultaetseigene-partnerschaften', type: 'html_table' },
      { faculty: 'Humanwissenschaftliche Fakultät - ZiB', url: 'https://www.hf.uni-koeln.de/40045', type: 'html_table' },
    ],
  },
];

async function extractFromPage(page, config) {
  const partners = [];

  switch (config.type) {
    case 'html_table': {
      const extracted = await page.evaluate(() => {
        const results = [];
        const tables = document.querySelectorAll('table');
        for (const table of tables) {
          const rows = table.querySelectorAll('tr');
          for (const row of rows) {
            const cells = row.querySelectorAll('td, th');
            if (cells.length >= 1) {
              const text = cells[0].textContent.trim();
              if (text.length > 3 && !text.match(/^(Land|Country|Universit|Partner|Name|Stadt|City|Nr)/i)) {
                const country = cells.length >= 2 ? cells[1].textContent.trim() : '';
                const city = cells.length >= 3 ? cells[2].textContent.trim() : '';
                results.push({
                  partner_name: text,
                  country: country,
                  city: city || 'Unknown',
                  faculty_department: cells.length >= 4 ? cells[3].textContent.trim() : null,
                });
              }
            }
          }
        }

        // Fallback: extract from lists if no tables found
        if (results.length === 0) {
          const lists = document.querySelectorAll('ul li, ol li, .accordion-item, details');
          for (const item of lists) {
            const text = item.textContent.trim().split('\n')[0].trim();
            if (text.length > 5 && text.length < 200) {
              const countryMatch = text.match(/[,(]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[,)]/);
              results.push({
                partner_name: text.replace(/[,(].*$/, '').trim(),
                country: countryMatch ? countryMatch[1] : '',
                city: 'Unknown',
                faculty_department: null,
              });
            }
          }
        }

        return results;
      });
      partners.push(...extracted);
      break;
    }

    case 'link_list': {
      const extracted = await page.evaluate((selector) => {
        const results = [];
        const links = document.querySelectorAll(selector || 'a[href]');
        for (const link of links) {
          const text = link.textContent.trim();
          if (text.length > 3 && text.length < 200 && !text.match(/^(Home|Back|Next|Menu|Login|Search)/i)) {
            results.push({
              partner_name: text,
              country: '',
              city: 'Unknown',
              faculty_department: null,
            });
          }
        }
        return results;
      }, config.selector);
      partners.push(...extracted);
      break;
    }

    default:
      console.log(`  Unknown extractor type: ${config.type}`);
  }

  return partners;
}

async function scrapeUniversity(uniConfig) {
  const outputFile = path.join(MOVEON_DIR, `${uniConfig.slug}.json`);

  if (fs.existsSync(outputFile) && !process.argv.includes('--rescrape')) {
    const existing = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
    if (existing.partners && existing.partners.length > 0) {
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
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    let allPartners = [];

    for (const pageConfig of uniConfig.pages) {
      console.log(`  Navigating to ${pageConfig.url}...`);
      try {
        await page.goto(pageConfig.url, { waitUntil: 'networkidle2', timeout: 30000 });
        await delay(randInt(2000, 5000));

        // Handle cookie consent if present
        const cookieBtn = await page.$('button[id*="cookie"], button[class*="cookie"], .cc-btn, .accept-cookies, button[data-cookie]');
        if (cookieBtn) {
          await cookieBtn.click().catch(() => {});
          await delay(1000);
        }

        let partners = await extractFromPage(page, pageConfig);
        if (pageConfig.faculty && partners.length > 0) {
          partners = partners.map(p => ({ ...p, faculty_department: p.faculty_department || pageConfig.faculty }));
        }
        console.log(`  Extracted ${partners.length} entries from ${pageConfig.type}${pageConfig.faculty ? ` (${pageConfig.faculty})` : ''}`);
        allPartners.push(...partners);
      } catch (err) {
        console.log(`  Error on ${pageConfig.url}: ${err.message}`);
      }
    }

    // Deduplicate: merge faculty_department when same partner appears in multiple faculties
    const byKey = new Map();
    for (const p of allPartners) {
      const key = p.partner_name.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!key) continue;
      const existing = byKey.get(key);
      if (existing) {
        const fac = p.faculty_department || p.faculty;
        if (fac && (!existing.faculty_department || !existing.faculty_department.includes(fac))) {
          existing.faculty_department = [existing.faculty_department, fac].filter(Boolean).join('|| ');
        }
      } else {
        byKey.set(key, { ...p });
      }
    }
    const deduped = Array.from(byKey.values());

    const output = {
      university_id: uniConfig.id,
      university_name: uniConfig.name,
      portal_url: uniConfig.pages[0]?.url,
      portal_type: 'university_website',
      scraped_at: new Date().toISOString(),
      strategy: 'custom_scraper',
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
  console.log('=== University Website Scraper ===\n');

  const args = process.argv.slice(2);
  let singleUni = null;
  for (const arg of args) {
    if (arg.startsWith('--uni=')) singleUni = arg.split('=')[1];
  }

  let batch = UNI_CONFIGS;
  if (singleUni) {
    batch = batch.filter(u => u.id === singleUni || u.slug === singleUni);
    if (batch.length === 0) {
      console.error(`University ${singleUni} not found in configs.`);
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
      const wait = randInt(10000, 25000);
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
