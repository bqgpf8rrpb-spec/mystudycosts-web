#!/usr/bin/env node
/**
 * Crawls specified URLs and captures console errors for each page.
 * Run with: npm run dev (in another terminal) then: node scripts/crawl-for-errors.js
 * Output: data/crawl-errors.json
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.CRAWL_BASE_URL || 'http://localhost:3000';
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'crawl-errors.json');
const HYDRATION_WAIT_MS = process.env.CRAWL_QUICK ? 1500 : 3000;

// Slug helpers (mirrors lib/url-slug.ts)
function toSlug(text) {
  return String(text)
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function generateProgramId(university, programName) {
  const uniSlug = toSlug(university).substring(0, 50);
  const programSlug = toSlug(programName).substring(0, 50);
  return `${uniSlug}-${programSlug}`;
}

function buildUrlList() {
  const urls = [
    '/de',
    '/en',
    '/de/calculator',
    '/en/calculator',
    '/de/nc-checker',
    '/en/nc-checker',
    '/de/erasmus',
    '/en/erasmus',
    '/de/about',
    '/en/about',
    '/de/blog',
    '/en/blog',
    '/de/imprint',
    '/en/imprint',
    '/de/privacy',
    '/en/privacy',
    '/de/degree',
    '/en/degree',
    '/de/city/berlin',
    '/de/city/munich',
    '/de/city/hamburg',
    '/en/city/berlin',
    '/en/city/munich',
    '/test-map',
  ];

  // Add sample program URLs from nc_search_index
  try {
    const ncIndexPath = path.join(__dirname, '..', 'data', 'nc_search_index.json');
    const ncIndex = JSON.parse(fs.readFileSync(ncIndexPath, 'utf8'));
    const samples = ncIndex.slice(0, 5);
    samples.forEach((entry) => {
      const id = generateProgramId(entry.university, entry.programName);
      urls.push(`/de/program/${id}`);
      urls.push(`/en/program/${id}`);
    });
  } catch (err) {
    console.warn('Could not load nc_search_index for program URLs:', err.message);
  }

  // Quick mode: only first 10 URLs
  if (process.env.QUICK === '1') {
    return urls.slice(0, 10);
  }
  return urls;
}

async function crawlPage(page, url) {
  const fullUrl = BASE_URL + url;
  const errors = [];

  const IGNORED_PATTERNS = [
    /favicon\.ico/i,
    /Failed to load resource: the server responded with a status of 500.*favicon/i,
    /site\.webmanifest/i,
    /Manifest:.*Syntax error/i,
    // Dev-only: Supabase API unreachable when env not configured
    /ERR_NAME_NOT_RESOLVED/i,
    /supabase\.co/i,
    /Error fetching partners/i,
    /Failed to load resource:.*net::/i,
  ];

  const handler = (msg) => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      const text = msg.text();
      const location = msg.location();
      const errorUrl = location?.url || fullUrl;
      if (IGNORED_PATTERNS.some((p) => p.test(text) || p.test(errorUrl))) return;
      errors.push({ type, text, url: errorUrl });
    }
  };

  page.on('console', handler);

  try {
    const response = await page.goto(fullUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    if (!response || response.status() >= 400) {
      errors.push({
        type: 'error',
        text: `HTTP ${response?.status() || 'unknown'}`,
        url: fullUrl,
      });
    }

    // Wait for React hydration (errors often appear after load)
    await new Promise((r) => setTimeout(r, HYDRATION_WAIT_MS));
  } catch (err) {
    errors.push({
      type: 'error',
      text: err.message || String(err),
      url: fullUrl,
    });
  } finally {
    page.off('console', handler);
  }

  return errors;
}

async function main() {
  const urlList = buildUrlList();
  console.log(`Crawling ${urlList.length} URLs (base: ${BASE_URL})...\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = [];
  let totalErrors = 0;

  try {
    for (let i = 0; i < urlList.length; i++) {
      const url = urlList[i];
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      const errors = await crawlPage(page, url);
      await page.close();

      const entry = { url, errorCount: errors.length, errors };
      results.push(entry);
      totalErrors += errors.length;

      const status = errors.length > 0 ? `[${errors.length} errors]` : 'ok';
      console.log(`${i + 1}/${urlList.length} ${url} ${status}`);
    }
  } finally {
    await browser.close();
  }

  const output = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    totalUrls: urlList.length,
    totalErrors,
    results,
  };

  const dataDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  console.log(`\nDone. Total errors: ${totalErrors}`);
  console.log(`Report written to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
