console.log("🎯 FINAL TUM ERASMUS PARTNER SCRAPER");
console.log("===================================");

// Load dependencies
console.log("📦 Loading dependencies...");
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Use stealth plugin to avoid bot detection
puppeteer.use(StealthPlugin());
console.log('🕵️  Stealth Mode activated');

// Helper function to extract field values from the university block
function extractFieldValue($, $block, fieldLabel) {
  try {
    // Find the row containing the field label
    const fieldRow = $block.find('.university_stats').filter((i, el) => {
      return $(el).text().trim() === fieldLabel;
    }).first().parent().parent(); // Go up to the row

    if (fieldRow.length > 0) {
      // Find the second column in the row (contains the value)
      const valueCell = fieldRow.find('.university_stats').eq(1);
      if (valueCell.length > 0) {
        // Handle links specially
        const link = valueCell.find('a').first();
        if (link.length > 0) {
          return {
            text: link.text().trim(),
            href: link.attr('href')
          };
        }
        return valueCell.text().trim();
      }
    }
  } catch (error) {
    // Silently continue if field extraction fails
  }
  return null;
}

// Main scraping function
async function scrapeTUMPartners() {
  console.log("🌐 Starting final TUM Erasmus partner scraper...");
  console.log("🎯 Target URL: https://tum.adv-pub.moveon4.de/global-experiences/");

  let browser;
  let partners = [];

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

    console.log("🔗 Navigating to TUM MoveOn page...");
    await page.goto('https://tum.adv-pub.moveon4.de/global-experiences/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    console.log("✅ Page loaded successfully");

    // Wait for initial page load
    console.log("⏳ Waiting for initial page load...");
    await new Promise(r => setTimeout(r, 5000));

    // FILTER INTERACTION: Select Program -> Erasmus
    console.log("🔍 Setting up Erasmus filter...");

    // Wait for fSelect dropdowns
    console.log("⏳ Waiting for filter dropdowns...");
    await page.waitForSelector('.fs-label-wrap, .fs-label, .fs-dropdown', { timeout: 15000 });
    console.log("✅ Found fSelect filter elements");

    // Find the Program dropdown (usually contains Erasmus options)
    const dropdowns = await page.$$('.fs-wrap');
    console.log(`📋 Found ${dropdowns.length} fSelect dropdowns`);

    let erasmusDropdown = null;

    // Try to identify the Program dropdown by checking options
    for (let i = 0; i < dropdowns.length; i++) {
      try {
        const dropdown = dropdowns[i];
        await dropdown.click(); // Open dropdown
        await new Promise(r => setTimeout(r, 500)); // Wait for options

        // Check if this dropdown contains Erasmus options
        const hasErasmus = await page.evaluate(() => {
          const options = Array.from(document.querySelectorAll('.fs-option'));
          return options.some(option =>
            option.textContent.toLowerCase().includes('erasmus')
          );
        });

        if (hasErasmus) {
          console.log(`🎯 Found Erasmus dropdown at index ${i}`);
          erasmusDropdown = dropdown;
          break;
        }

        // Close dropdown if not the right one
        await dropdown.click();
        await new Promise(r => setTimeout(r, 300));

      } catch (error) {
        console.log(`⚠️  Error checking dropdown ${i}: ${error.message}`);
      }
    }

    if (!erasmusDropdown) {
      console.log("⚠️  Could not find Erasmus dropdown, trying first dropdown as fallback...");
      erasmusDropdown = dropdowns[0];
    }

    // Open the Erasmus/Program dropdown
    console.log("🔽 Opening Program dropdown...");
    await erasmusDropdown.click();
    await new Promise(r => setTimeout(r, 500));

    // Select Erasmus option
    console.log("📋 Selecting Erasmus option...");
    const erasmusClicked = await page.evaluate(() => {
      const options = Array.from(document.querySelectorAll('.fs-option'));
      for (const option of options) {
        const text = option.textContent.toLowerCase();
        if (text.includes('erasmus')) {
          option.click();
          return true;
        }
      }
      return false;
    });

    if (erasmusClicked) {
      console.log("✅ Selected Erasmus option");
    } else {
      console.log("⚠️  Could not find Erasmus option, continuing anyway");
    }

    // Wait for selection to register
    await new Promise(r => setTimeout(r, 1000));

    // CLICK SEARCH BUTTON using text-based XPath
    console.log("🔍 Clicking search button...");
    let searchClicked = false;

    try {
      const searchButton = await page.waitForSelector(
        'xpath/.//*[contains(text(), "Search") or contains(text(), "Suchen") or contains(text(), "Find") or contains(text(), "Suche") or contains(@value, "Search") or contains(@value, "Suchen")]',
        { timeout: 5000 }
      );
      if (searchButton) {
        await searchButton.click();
        console.log("✅ Clicked search button via XPath");
        searchClicked = true;
      }
    } catch (xpathError) {
      console.log("⚠️  XPath search failed, trying fallback methods...");
    }

    // Fallback: btn-primary
    if (!searchClicked) {
      try {
        const primaryBtn = await page.$('.btn-primary');
        if (primaryBtn) {
          await primaryBtn.click();
          console.log("✅ Clicked .btn-primary button");
          searchClicked = true;
        }
      } catch (primaryError) {
        console.log("⚠️  .btn-primary not found");
      }
    }

    // Final fallback: Enter key
    if (!searchClicked) {
      await page.keyboard.press('Enter');
      console.log("✅ Pressed Enter key as final fallback");
    }

    // WAIT FOR RESULTS
    console.log("⏳ Waiting for search results to load...");
    await new Promise(r => setTimeout(r, 5000));

    // SWITCH TO LIST VIEW
    console.log("📋 Switching to list view...");
    const listSelectors = [
      'a[title="Liste"]',
      'a[title="List"]',
      'a[title="List view"]',
      'a .fa-list',
      'a .icon-list',
      'button[title*="list" i]',
      '.list-toggle a'
    ];

    let listViewClicked = false;

    for (const selector of listSelectors) {
      try {
        const listBtn = await page.$(selector);
        if (listBtn) {
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
            console.log(`✅ Switched to list view: ${selector}`);
            listViewClicked = true;
            break;
          }
        }
      } catch (e) {
        // Continue
      }
    }

    if (!listViewClicked) {
      console.log("⚠️  Could not find list view toggle");
    }

    // Wait for list view to load
    await new Promise(r => setTimeout(r, 3000));

    // INFINITE SCROLL: Load all results
    console.log("📜 Loading all results with infinite scroll...");

    let previousCount = 0;
    let currentCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 20;

    while (scrollAttempts < maxScrollAttempts) {
      // Scroll to bottom
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Wait for potential new content
      await new Promise(r => setTimeout(r, 2000));

      // Count current university blocks
      currentCount = await page.$$eval('div[class*="_university_block"]', blocks => blocks.length);

      console.log(`📊 Scroll attempt ${scrollAttempts + 1}: Found ${currentCount} university blocks`);

      if (currentCount > previousCount) {
        // New content loaded, continue scrolling
        previousCount = currentCount;
        scrollAttempts++;
      } else if (currentCount === previousCount && scrollAttempts > 2) {
        // No new content for 3 attempts, stop scrolling
        console.log("✅ No more content loading, stopping infinite scroll");
        break;
      } else {
        // Continue trying
        scrollAttempts++;
      }
    }

    console.log(`🎉 Loaded ${currentCount} university blocks total`);

    // CAPTURE AND PARSE HTML
    console.log("📄 Capturing final HTML for parsing...");
    const html = await page.content();

    console.log("🔧 Parsing HTML with Cheerio...");
    const $ = cheerio.load(html);

    // Extract all university blocks
    const universityBlocks = $('div[class*="_university_block"]');
    console.log(`📊 Found ${universityBlocks.length} university blocks to parse`);

    // Parse each university block
    universityBlocks.each((index, element) => {
      try {
        const $block = $(element);

        // Extract university name
        const name = $block.find('._univname').first().text().trim();

        if (!name) {
          console.log(`⚠️  Skipping block ${index + 1}: No university name found`);
          return;
        }

        // Extract other fields using helper function
        const city = extractFieldValue($, $block, 'City');
        const website = extractFieldValue($, $block, 'Website');
        const program = extractFieldValue($, $block, 'Program');
        const level = extractFieldValue($, $block, 'Level');
        const subjectArea = extractFieldValue($, $block, 'Subject Area');

        // Create partner object
        const partner = {
          id: `tum-erasmus-${index + 1}`,
          home_university: 'TUM',
          partner_university_name: name,
          partner_city: typeof city === 'string' ? city : '',
          partner_country: 'Various', // Will be determined from context or additional parsing
          subject_area: typeof subjectArea === 'string' ? subjectArea : '',
          erasmus_code: '',
          cost_index: 0,
          website_url: typeof website === 'object' && website.href ? website.href : '',
          program: typeof program === 'string' ? program : '',
          academic_level: typeof level === 'string' ? level : '',
          scraped_at: new Date().toISOString(),
          source: 'TUM MoveOn Erasmus Filter'
        };

        partners.push(partner);
        console.log(`✅ Parsed: ${name}`);

      } catch (error) {
        console.log(`❌ Error parsing block ${index + 1}: ${error.message}`);
      }
    });

    // SAVE RESULTS
    console.log(`💾 Saving ${partners.length} partners to final_partners.json...`);
    const outputPath = path.join(__dirname, '..', 'final_partners.json');
    fs.writeFileSync(outputPath, JSON.stringify(partners, null, 2), 'utf8');
    console.log("✅ Saved partners to final_partners.json");

    console.log(`🎉 Successfully scraped ${partners.length} Erasmus partners from TUM MoveOn!`);

    return partners;

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
  console.log("🎯 Starting final Erasmus partner scraping...");
  console.log("📝 This script will:");
  console.log("  - Navigate to TUM MoveOn");
  console.log("  - Select Erasmus program filter");
  console.log("  - Click search and switch to list view");
  console.log("  - Load all results with infinite scroll");
  console.log("  - Parse all university data");
  console.log("  - Save to final_partners.json");
  console.log("");

  try {
    const partners = await scrapeTUMPartners();
    console.log(`🎉 Final scraping completed! Extracted ${partners.length} Erasmus partners.`);
  } catch (error) {
    console.error('💥 Main execution error:', error.message);
    process.exit(1);
  }

  console.log("🏁 Final scraping completed!");
}

// Run the main function
main().catch(error => {
  console.error('💥 Fatal error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});