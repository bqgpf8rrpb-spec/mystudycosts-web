console.log("🚀 STARTING STEP 1: COMBINED FILTER + NETWORK SCRAPER FOR TUM MOVEON");

// Load dependencies
console.log("📦 Loading dependencies...");
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

// Use stealth plugin to avoid bot detection
puppeteer.use(StealthPlugin());
console.log('🕵️  Stealth Mode activated');

// Main scraping function - Combined Filter Selection + Network Interception Strategy
async function scrapeTUMMoveOn() {
  console.log("🌐 Starting TUM MoveOn combined filter + network scraper...");
  console.log("🎯 Target URL: https://tum.adv-pub.moveon4.de/global-experiences/");

  let browser;
  let jsonCaptured = false;

  try {
    console.log("🚀 Launching browser (visual mode)...");
    browser = await puppeteer.launch({
      headless: false, // Visual mode for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
      defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();
    console.log("📄 Created new page");

    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // NETWORK INTERCEPTION: Set up response listener BEFORE navigation
    console.log("🔍 Setting up network response interceptor...");
    page.on('response', async (response) => {
      try {
        const url = response.url();
        const contentType = response.headers()['content-type'] || '';

        // Capture JSON responses > 2kb
        if (contentType.includes('application/json')) {
          console.log(`🎯 JSON Response detected: ${url}`);

          const responseText = await response.text();
          const responseSize = responseText.length;

          if (responseSize > 2000) {
            console.log(`📦 Captured substantial JSON (${responseSize} bytes) from: ${url}`);

            try {
              const jsonData = JSON.parse(responseText);
              console.log(`✅ Valid JSON data found at: ${url}`);

              // Save immediately when we find substantial JSON
              console.log("💾 Saving JSON data to temp_partners.json...");
              const outputPath = path.join(__dirname, '..', 'temp_partners.json');
              fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf8');
              console.log(`✅ Saved JSON data to temp_partners.json`);

              jsonCaptured = true;

              // Log data structure
              if (Array.isArray(jsonData)) {
                console.log(`📈 Array with ${jsonData.length} items`);
              } else if (typeof jsonData === 'object') {
                console.log(`📈 Object with keys: ${Object.keys(jsonData).join(', ')}`);
              }

            } catch (parseError) {
              console.log(`❌ Not valid JSON: ${parseError.message.substring(0, 100)}`);
            }
          }
        }
      } catch (error) {
        console.log(`⚠️  Error processing response: ${error.message}`);
      }
    });

    console.log("🔗 Navigating to TUM MoveOn page...");
    await page.goto('https://tum.adv-pub.moveon4.de/global-experiences/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    console.log("✅ Page loaded successfully");

    // Wait 5 seconds for initial page load
    console.log("⏳ Waiting 5 seconds for initial page load...");
    await new Promise(r => setTimeout(r, 5000));

    // FILTER SELECTION INTERACTION + TEXT-BASED SEARCH CLICKING
    console.log("🔍 Looking for fSelect filter dropdowns...");

    // Wait for fSelect elements to be ready
    console.log("⏳ Waiting for filter dropdowns...");
    await page.waitForSelector('.fs-label-wrap, .fs-label, .fs-dropdown', { timeout: 10000 });
    console.log("✅ Found fSelect filter elements");

    // Find all fSelect dropdowns
    const dropdowns = await page.$$('.fs-wrap');
    console.log(`📋 Found ${dropdowns.length} fSelect dropdowns`);

    if (dropdowns.length > 0) {
      // Click on the first dropdown to open it (usually Country filter)
      console.log("🔽 Clicking first dropdown to open it...");
      await dropdowns[0].click();
      console.log("✅ Opened first dropdown");

      // Wait for dropdown options to appear
      await new Promise(r => setTimeout(r, 500));

      // Find and click the second option (Australia or similar)
      const options = await page.$$('.fs-option:not(.selected)');
      if (options.length > 1) {
        console.log(`📋 Found ${options.length} selectable options, clicking second one...`);

        // Get the text of the second option to confirm it's Australia
        const optionText = await options[1].evaluate(el => el.textContent.trim());
        console.log(`🎯 Selecting option: "${optionText}"`);

        await options[1].click(); // Click second option
        console.log("✅ Selected option in dropdown");

        // Wait a bit for the selection to register
        await new Promise(r => setTimeout(r, 1000));

        // TEXT-BASED SEARCH BUTTON CLICKING (The Fix)
        console.log("🔍 Looking for search button by text content...");

        let searchClicked = false;

        // Try XPath to find button by text content
        try {
          const searchButton = await page.waitForSelector(
            'xpath/.//*[contains(text(), "Search") or contains(text(), "Suchen") or contains(text(), "Find") or contains(text(), "Suche")]', 
            { timeout: 5000 }
          );
          if (searchButton) {
            await searchButton.click();
            console.log("✅ Clicked search button by XPath text matching");
            searchClicked = true;
          }
        } catch (xpathError) {
          console.log("⚠️  XPath text search failed, trying backup methods...");
        }

        // BACKUP: Try .btn-primary (common MoveOn button class)
        if (!searchClicked) {
          try {
            const primaryBtn = await page.$('.btn-primary');
            if (primaryBtn) {
              await primaryBtn.click();
              console.log("✅ Clicked .btn-primary button");
              searchClicked = true;
            }
          } catch (primaryError) {
            console.log("⚠️  .btn-primary not found or clickable");
          }
        }

        // BACKUP 2: Try fa-search icon
        if (!searchClicked) {
          try {
            const searchIcon = await page.$('.fa-search');
            if (searchIcon) {
              // Click the parent element (usually a button)
              const parent = await searchIcon.evaluateHandle(el => el.parentElement);
              await parent.click();
              console.log("✅ Clicked fa-search icon parent");
              searchClicked = true;
            }
          } catch (iconError) {
            console.log("⚠️  fa-search icon not found or clickable");
          }
        }

        // FINAL BACKUP: Enter key
        if (!searchClicked) {
          console.log("⚠️  No search button found, trying Enter key...");
          await page.keyboard.press('Enter');
          console.log("✅ Pressed Enter key as final fallback");
        }

      } else {
        console.log("⚠️  Not enough options found in dropdown");
      }
    } else {
      console.log("❌ No fSelect dropdowns found");
    }

    // WAIT 5 seconds for map to update
    console.log("⏳ Waiting 5 seconds for map to update...");
    await new Promise(r => setTimeout(r, 5000));

    // SWITCH TO LIST VIEW (The Key Step)
    console.log("📋 Switching to list view...");

    let listViewClicked = false;

    // Try list view selectors in order of preference
    const listViewSelectors = [
      'a[title="Liste"]',           // German "List"
      'a[title="List"]',            // English "List"
      'a[title="List view"]',       // English "List view"
      'a .fa-list',                 // FontAwesome list icon inside anchor
      'a .icon-list',               // Generic list icon inside anchor
      'button[title*="list" i]',    // Button with list in title
      '.list-toggle',               // Common list toggle class
      '.view-switcher a'            // View switcher links
    ];

    for (const selector of listViewSelectors) {
      try {
        console.log(`🔘 Trying list view selector: ${selector}`);
        const listBtn = await page.$(selector);
        if (listBtn) {
          // Check if it's visible and clickable
          const isVisible = await listBtn.evaluate(el => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return style.display !== 'none' &&
                   style.visibility !== 'hidden' &&
                   rect.width > 0 &&
                   rect.height > 0;
          });

          if (isVisible) {
            await listBtn.click();
            console.log(`✅ Clicked List View button: ${selector}`);
            listViewClicked = true;
            break;
          }
        }
      } catch (e) {
        console.log(`⚠️  Selector ${selector} failed`);
      }
    }

    // Try XPath as final fallback
    if (!listViewClicked) {
      try {
        console.log(`🔘 Trying XPath for list button...`);
        const listBtn = await page.waitForSelector(
          'xpath/.//a[contains(., "Liste") or contains(., "List") or contains(@title, "Liste") or contains(@title, "List")]',
          { timeout: 3000 }
        );
        if (listBtn) {
          await listBtn.click();
          console.log(`✅ Clicked List View button via XPath`);
          listViewClicked = true;
        }
      } catch (xpathError) {
        console.log(`⚠️  XPath list view search failed`);
      }
    }

    if (!listViewClicked) {
      console.log("⚠️  Could not find list view toggle button");
    } else {
      // Wait 3 seconds for list to render
      console.log("⏳ Waiting 3 seconds for list view to render...");
      await new Promise(r => setTimeout(r, 3000));
    }

    // Wait a bit more for any list view changes
    await new Promise(r => setTimeout(r, 2000));

    // SCRAPE DATA: Parse the list view HTML with cheerio
    console.log("📄 Capturing and parsing list view HTML...");

    // Load cheerio for HTML parsing
    const cheerio = require('cheerio');

    const html = await page.content();
    const $ = cheerio.load(html);

    // Count universities using common list selectors
    let universityCount = 0;
    let usedSelector = 'none';

    const listSelectors = [
      '.cv_list_item',           // MoveOn standard
      '.search-result-item',     // Common search results
      '.list-group-item',        // Bootstrap list items
      '.card',                   // Card-based results
      '.result-item',            // Generic result items
      '.university-item',        // University-specific
      '.partner-item',           // Partner-specific
      '.institution-item',       // Institution-specific
      '.row:has(.university)',   // Rows containing university text
      '.row:has(.partner)'       // Rows containing partner text
    ];

    for (const selector of listSelectors) {
      const elements = $(selector);
      if (elements.length > 0 && elements.length < 200) { // Reasonable number
        universityCount = elements.length;
        usedSelector = selector;
        console.log(`📊 Found ${universityCount} universities using selector: ${selector}`);
        break;
      }
    }

    // If no specific selectors worked, count elements containing university keywords
    if (universityCount === 0) {
      const universityElements = $('*').filter((i, el) => {
        const text = $(el).text().toLowerCase();
        return text.includes('university') ||
               text.includes('universität') ||
               text.includes('school') ||
               text.includes('college') ||
               text.includes('institute') ||
               text.includes('hochschule');
      });

      universityCount = universityElements.length;
      usedSelector = 'keyword-search';
      console.log(`📊 Found ${universityCount} elements containing university keywords`);
    }

    // Save the list view HTML
    console.log("💾 Saving list view HTML to debug_list_view.html...");
    const htmlOutputPath = path.join(__dirname, '..', 'debug_list_view.html');
    fs.writeFileSync(htmlOutputPath, html, 'utf8');
    console.log("✅ Saved list view HTML to debug_list_view.html");

    // Take screenshot to confirm list view
    console.log("📸 Taking list view screenshot...");
    const screenshotPath = path.join(__dirname, '..', 'debug_list_mode.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    console.log("✅ Screenshot saved as debug_list_mode.png");

    // Summary
    console.log("\n📊 LIST VIEW SCRAPING RESULTS");
    console.log("============================");
    console.log(`✅ Found ${universityCount} universities using selector: ${usedSelector}`);
    console.log("📄 HTML saved to: debug_list_view.html");
    console.log("📸 Screenshot saved to: debug_list_mode.png");

    if (jsonCaptured) {
      console.log("🎉 BONUS: Also captured JSON data via network interception");
      console.log("📊 Check temp_partners.json for additional API data");
    }

    return {
      jsonCaptured,
      htmlCaptured: true,
      universityCount,
      selectorUsed: usedSelector,
      htmlSize: html.length
    };

  } catch (error) {
    console.error('❌ Scraping error:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    if (browser) {
      console.log("🔒 Closing browser...");
      await browser.close();
      console.log("✅ Browser closed");
    }
  }
}

// Main execution
async function main() {
  console.log("🎯 Starting main execution...");
  console.log("📝 This script will:");
  console.log("  - Open browser in visual mode");
  console.log("  - Intercept JSON API responses");
  console.log("  - Select 'Australia' from country filter");
  console.log("  - Click search button using text-based detection");
  console.log("  - Switch to list view for text data");
  console.log("  - Parse HTML with cheerio to count universities");
  console.log("  - Save list view HTML and screenshot");
  console.log("");

  try {
    const result = await scrapeTUMMoveOn();
    console.log(`🎉 List view scraping completed successfully!`);
    console.log(`📊 Found ${result.universityCount} universities using selector: ${result.selectorUsed}`);
    if (result.jsonCaptured) {
      console.log(`🎉 BONUS: Also captured JSON API data`);
    }
  } catch (error) {
    console.error('💥 Main execution error:', error.message);
    process.exit(1);
  }

  console.log("🏁 Script execution completed!");
}

// Run the main function
main().catch(error => {
  console.error('💥 Fatal error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});