console.log("🎯 MULTI-UNIVERSITY ERASMUS PARTNER SCRAPER");
console.log("===========================================");

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

// Load university configuration
console.log("📄 Loading university configurations...");
const universitiesConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'universities.json'), 'utf8'));

if (universitiesConfig.length === 0) {
  console.error('❌ No universities found in universities.json');
  process.exit(1);
}

console.log(`✅ Loaded ${universitiesConfig.length} universities to scrape:`);
universitiesConfig.forEach((uni, index) => {
  console.log(`  ${index + 1}. ${uni.name} (${uni.moveonUrl})`);
});

// Helper function to extract field values from the university block
function extractFieldValue($, $block, fieldLabel) {
  try {
    // Try different selector patterns for field extraction
    const selectors = [
      `.university_stats:contains('${fieldLabel}')`,
      `[class*="${fieldLabel.toLowerCase()}"]`,
      `.${fieldLabel.toLowerCase().replace(/\s+/g, '-')}`,
      `td:contains('${fieldLabel}')`,
      `th:contains('${fieldLabel}')`
    ];

    for (const selector of selectors) {
      const fieldElement = $block.find(selector).first();
      if (fieldElement.length > 0) {
        // Try to find the associated value (next element, parent row, etc.)
        let valueElement = fieldElement.next();
        if (valueElement.length === 0) {
          valueElement = fieldElement.parent().next();
        }
        if (valueElement.length === 0) {
          valueElement = fieldElement.parent().find('.value, .data');
        }

        if (valueElement.length > 0) {
          // Handle links specially
          const link = valueElement.find('a').first();
          if (link.length > 0) {
            return {
              text: link.text().trim(),
              href: link.attr('href')
            };
          }
          return valueElement.text().trim();
        }
      }
    }

    // Fallback: direct text search within the block
    const blockText = $block.text();
    const patterns = [
      new RegExp(`${fieldLabel}[:\\s]*([^\\n\\r;]+)`, 'i'),
      new RegExp(`${fieldLabel}[^:]*:\\s*([^\\n\\r;]+)`, 'i')
    ];

    for (const pattern of patterns) {
      const match = blockText.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

  } catch (error) {
    // Silently continue if field extraction fails
  }
  return null;
}

// Function to scrape a single university
async function scrapeUniversityPartners(universityConfig) {
  console.log(`\n🏛️  Starting scrape for: ${universityConfig.name}`);
  console.log(`🌐 URL: ${universityConfig.moveonUrl}`);

  let browser;
  let partners = [];

  try {
    browser = await puppeteer.launch({
      headless: false, // Visual mode for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
      defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    console.log(`🔗 Navigating to ${universityConfig.name}...`);
    await page.goto(universityConfig.moveonUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    console.log("✅ Page loaded successfully");

    // Wait for initial page load
    await new Promise(r => setTimeout(r, 5000));

    // FILTER INTERACTION: Try to find and select Erasmus filter
    try {
      console.log("🔍 Setting up Erasmus filter...");

      await page.waitForSelector('.fs-label-wrap, .fs-label, .fs-dropdown', { timeout: 15000 });

      // Try to find Erasmus dropdown
      const erasmusClicked = await page.evaluate(() => {
        const options = Array.from(document.querySelectorAll('.fs-option'));
        for (const option of options) {
          const text = option.textContent.toLowerCase();
          if (text.includes('erasmus')) {
            // Click the parent dropdown first
            const dropdown = option.closest('.fs-wrap');
            if (dropdown) {
              dropdown.click();
              setTimeout(() => option.click(), 500);
              return true;
            }
          }
        }
        return false;
      });

      if (erasmusClicked) {
        console.log("✅ Selected Erasmus option");
        await new Promise(r => setTimeout(r, 1000));
      } else {
        console.log("⚠️  Erasmus filter not found, continuing without filter");
      }

      // Click search button
      const searchSelectors = ['xpath/.//*[contains(text(), "Search") or contains(text(), "Suchen")]', '.btn-primary'];
      let searchClicked = false;

      for (const selector of searchSelectors) {
        try {
          const element = await page.waitForSelector(selector, { timeout: 5000 });
          if (element) {
            await element.click();
            console.log("✅ Clicked search button");
            searchClicked = true;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (searchClicked) {
        await new Promise(r => setTimeout(r, 5000));
      }

    } catch (filterError) {
      console.log("⚠️  Filter interaction failed, continuing with current page state");
    }

    // SWITCH TO LIST VIEW
    try {
      const listSelectors = [
        'a[title="Liste"]',
        'a[title="List"]',
        'a[title="List view"]',
        'a .fa-list',
        'a .icon-list'
      ];

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
              console.log("✅ Switched to list view");
              await new Promise(r => setTimeout(r, 3000));
              break;
            }
          }
        } catch (e) {
          // Continue
        }
      }
    } catch (listViewError) {
      console.log("⚠️  List view switch failed");
    }

    // INFINITE SCROLL: Load all results
    console.log("📜 Loading all results...");
    let previousCount = 0;
    let currentCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 10; // Reduced for multi-university scraping

    while (scrollAttempts < maxScrollAttempts) {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      await new Promise(r => setTimeout(r, 2000));

      // Try different selectors for university blocks
      const blockSelectors = [
        'div[class*="_university_block"]',
        '.partner-university',
        '.university-item',
        '.search-result-item'
      ];

      for (const selector of blockSelectors) {
        try {
          currentCount = await page.$$eval(selector, blocks => blocks.length);
          if (currentCount > 0) break;
        } catch (e) {
          // Continue to next selector
        }
      }

      if (currentCount > previousCount) {
        previousCount = currentCount;
        scrollAttempts++;
      } else {
        break;
      }
    }

    console.log(`📊 Found ${currentCount} university blocks`);

    // CAPTURE AND PARSE HTML
    const html = await page.content();
    const $ = cheerio.load(html);

    // Try different selectors for university blocks
    let universityBlocks = $('div[class*="_university_block"]');
    if (universityBlocks.length === 0) {
      universityBlocks = $('.partner-university');
    }
    if (universityBlocks.length === 0) {
      universityBlocks = $('.university-item');
    }
    if (universityBlocks.length === 0) {
      universityBlocks = $('.search-result-item');
    }

    universityBlocks.each((index, element) => {
      try {
        const $block = $(element);

        // Try different selectors for university name
        let name = '';
        const nameSelectors = [
          '._univname',
          '.university-name',
          '.partner-name',
          'h3',
          'h4',
          '.title'
        ];

        for (const selector of nameSelectors) {
          name = $block.find(selector).first().text().trim();
          if (name) break;
        }

        if (!name) {
          return; // Skip this block
        }

        // Extract other fields using flexible selectors
        const city = extractFieldValue($, $block, 'City') ||
                    extractFieldValue($, $block, 'Ort') ||
                    $block.find('.city, .location').first().text().trim();

        const country = extractFieldValue($, $block, 'Country') ||
                       extractFieldValue($, $block, 'Land') ||
                       $block.find('.country').first().text().trim();

        const subjectArea = extractFieldValue($, $block, 'Subject Area') ||
                           extractFieldValue($, $block, 'Fachbereich') ||
                           $block.find('.subject, .faculty').first().text().trim();

        const program = extractFieldValue($, $block, 'Program') ||
                       $block.find('.program').first().text().trim() ||
                       'Erasmus';

        // Extract website
        let websiteUrl = '';
        const websiteLink = $block.find('a[href]').first();
        if (websiteLink.length > 0) {
          websiteUrl = websiteLink.attr('href') || '';
        }

        // Create partner object with home_university field
        const partner = {
          id: `${universityConfig.slug}-partner-${index + 1}`,
          home_university: universityConfig.name, // Add the university name as home_university
          partner_university_name: name,
          partner_city: city || '',
          partner_country: country || '',
          subject_area: subjectArea || '',
          erasmus_code: '',
          cost_index: 0,
          website_url: websiteUrl,
          program_type: program || 'Erasmus',
          academic_level: '',
          scraped_at: new Date().toISOString(),
          source: `${universityConfig.name} MoveOn Scraper`
        };

        partners.push(partner);

      } catch (error) {
        console.log(`❌ Error parsing block ${index + 1}: ${error.message}`);
      }
    });

    console.log(`✅ Successfully scraped ${partners.length} partners from ${universityConfig.name}`);

  } catch (error) {
    console.error(`❌ Failed to scrape ${universityConfig.name}:`, error.message);
    console.log("⚠️  Continuing with next university...");
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return partners;
}

// Main execution function
async function main() {
  console.log("🎯 Starting multi-university Erasmus partner scraping...");

  const allPartners = [];
  let totalSuccessCount = 0;
  let totalFailCount = 0;

  // Process each university from the config
  for (let i = 0; i < universitiesConfig.length; i++) {
    const university = universitiesConfig[i];

    try {
      console.log(`\n🔄 Processing university ${i + 1}/${universitiesConfig.length}: ${university.name}`);
      const universityPartners = await scrapeUniversityPartners(university);

      if (universityPartners && universityPartners.length > 0) {
        // APPEND results to all_partners array
        allPartners.push(...universityPartners);
        totalSuccessCount++;
        console.log(`✅ ${university.name}: ${universityPartners.length} partners collected`);

        // Save intermediate results after each successful university
        const tempOutputPath = path.join(__dirname, '..', 'all_partners_temp.json');
        fs.writeFileSync(tempOutputPath, JSON.stringify(allPartners, null, 2), 'utf8');
        console.log(`💾 Intermediate save: ${allPartners.length} total partners so far`);
      } else {
        console.log(`⚠️  ${university.name}: No partners found`);
        totalFailCount++;
      }

      // DELAY between universities (2-3 seconds as requested)
      if (i < universitiesConfig.length - 1) {
        const delay = 2500 + Math.random() * 1000; // 2.5-3.5 seconds random delay
        console.log(`⏳ Waiting ${Math.round(delay/1000)}s before next university...`);
        await new Promise(r => setTimeout(r, delay));
      }

    } catch (error) {
      console.error(`💥 Critical error scraping ${university.name}:`, error.message);
      totalFailCount++;
      // Continue with next university despite critical errors
    }
  }

  // FINAL SAVE
  if (allPartners.length > 0) {
    console.log(`\n💾 Final save: ${allPartners.length} partners from ${totalSuccessCount} universities...`);
    const finalOutputPath = path.join(__dirname, '..', 'all_partners_temp.json');
    fs.writeFileSync(finalOutputPath, JSON.stringify(allPartners, null, 2), 'utf8');
    console.log("✅ All results saved to all_partners_temp.json");
  }

  // SUMMARY
  console.log("\n📊 SCRAPING SUMMARY");
  console.log("==================");
  console.log(`✅ Universities successfully scraped: ${totalSuccessCount}`);
  console.log(`❌ Universities failed: ${totalFailCount}`);
  console.log(`📍 Total partners collected: ${allPartners.length}`);
  console.log(`📄 Results appended to: all_partners_temp.json`);

  // Show sample of collected data
  if (allPartners.length > 0) {
    console.log("\n📋 SAMPLE PARTNERS:");
    console.log("==================");
    const samplePartners = allPartners.slice(0, 3);
    samplePartners.forEach((partner, index) => {
      console.log(`${index + 1}. ${partner.partner_university_name} (${partner.home_university})`);
    });

    console.log("\n🚀 NEXT STEPS:");
    console.log("1. Review all_partners_temp.json for data quality");
    console.log("2. Run scripts/geocode-partners.js to add coordinates");
    console.log("3. Run scripts/upload-final.js to upload to database");
  }
}

// Run the main function
main().catch(error => {
  console.error('💥 Fatal error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});