console.log("🔍 FINDING VALID TUM MOVEON URL");
console.log("=================================");

// Load dependencies
console.log("📦 Loading dependencies...");
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

// Use stealth plugin to avoid bot detection
puppeteer.use(StealthPlugin());
console.log('🕵️  Stealth Mode activated');

// Array of potential URLs to test
const urlsToTest = [
  'https://tum.adv-pub.moveon4.de/global-experiences/', // New system, likely candidate
  'https://tum.adv-pub.moveon4.de/austauschmoeglichkeiten/', // Standard naming
  'https://tum.moveon4.de/publisher/6/deu', // Common alternative ID
  'https://tum.moveon4.de/publisher/2/deu',
  'https://tum.moveon4.de/publisher/4/deu',
  'https://tum.moveon4.de/publisher/5/deu',
  'https://tum.moveon4.de/publisher/7/deu'
];

console.log(`🎯 Testing ${urlsToTest.length} potential URLs...`);
console.log("");

// Main function to test URLs
async function testUrl(url, index) {
  let browser;
  let status = 'Unknown';
  let reason = '';

  try {
    console.log(`🌐 Testing URL ${index + 1}/${urlsToTest.length}: ${url}`);

    // Launch browser
    browser = await puppeteer.launch({
      headless: true, // Headless for speed
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Navigate to URL
    console.log(`  📡 Navigating...`);
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait a bit for dynamic content
    await new Promise(r => setTimeout(r, 2000));

    // Check for disabled/deactivated text
    const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const hasDisabledText = pageText.includes('disabled') ||
                           pageText.includes('deactivated') ||
                           pageText.includes('deaktiviert') ||
                           pageText.includes('nicht verfügbar');

    if (hasDisabledText) {
      status = 'Dead';
      reason = 'Contains disabled/deactivated text';
    } else {
      // Check for search functionality
      const hasSearchButton = await page.evaluate(() => {
        const searchSelectors = [
          'input[type="submit"]',
          'button[type="submit"]',
          'input[value*="suchen" i]',
          'input[value*="search" i]',
          '.btn-search',
          'button[class*="search"]',
          '.search-btn'
        ];

        for (const selector of searchSelectors) {
          const element = document.querySelector(selector);
          if (element) return true;
        }
        return false;
      });

      if (hasSearchButton) {
        status = 'Alive';
        reason = 'Has search functionality';
      } else {
        status = 'Maybe';
        reason = 'No obvious disabled text, but no search button found';
      }
    }

    // Take screenshot for debugging
    const screenshotPath = path.join(__dirname, '..', `debug_url_${index + 1}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    console.log(`  📸 Screenshot saved: debug_url_${index + 1}.png`);

  } catch (error) {
    status = 'Error';
    reason = error.message;
    console.log(`  ❌ Error: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Log result
  const statusEmoji = status === 'Alive' ? '✅' : status === 'Dead' ? '❌' : status === 'Maybe' ? '❓' : '💥';
  console.log(`  ${statusEmoji} URL ${url}: STATUS ${status} - ${reason}`);
  console.log('');

  return { url, status, reason, index };
}

// Main execution
async function main() {
  console.log("🚀 Starting URL validation process...");
  console.log('');

  const results = [];
  let bestCandidate = null;

  // Test each URL
  for (let i = 0; i < urlsToTest.length; i++) {
    const result = await testUrl(urlsToTest[i], i);
    results.push(result);

    // Keep track of the best candidate (Alive > Maybe > others)
    if (result.status === 'Alive') {
      bestCandidate = result;
    } else if (result.status === 'Maybe' && (!bestCandidate || bestCandidate.status !== 'Alive')) {
      bestCandidate = result;
    }
  }

  // Print summary
  console.log("📊 SUMMARY");
  console.log("=========");
  console.log(`Total URLs tested: ${results.length}`);

  const aliveCount = results.filter(r => r.status === 'Alive').length;
  const maybeCount = results.filter(r => r.status === 'Maybe').length;
  const deadCount = results.filter(r => r.status === 'Dead').length;
  const errorCount = results.filter(r => r.status === 'Error').length;

  console.log(`✅ Alive: ${aliveCount}`);
  console.log(`❓ Maybe: ${maybeCount}`);
  console.log(`❌ Dead: ${deadCount}`);
  console.log(`💥 Error: ${errorCount}`);
  console.log('');

  // Print best candidate
  if (bestCandidate) {
    console.log("🎯 RECOMMENDED URL:");
    console.log(`   ${bestCandidate.url}`);
    console.log(`   Status: ${bestCandidate.status}`);
    console.log(`   Reason: ${bestCandidate.reason}`);
    console.log('');
    console.log("💡 Use this URL in your scraper script!");
  } else {
    console.log("❌ No promising URLs found. All seem to be dead or have errors.");
  }

  console.log('');
  console.log("🏁 URL validation completed!");
}

// Run the main function
main().catch(error => {
  console.error('💥 Fatal error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});