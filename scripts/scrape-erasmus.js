console.log("🚀 STARTING SCRAPER...");

// Error handling for crash visibility
process.on('uncaughtException', (err) => {
  console.error('💥 CRASH:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION:', reason);
  process.exit(1);
});

// Load environment variables
console.log("📋 Loading environment variables...");
require('dotenv').config({ path: '.env.local' });

// Validate required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

// Initialize Supabase client
console.log("🔗 Initializing Supabase client...");
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test Supabase connection
console.log("🧪 Testing Supabase connection...");
supabase.from('erasmus_partners').select('count', { count: 'exact', head: true })
  .then(() => console.log("✅ Supabase connection successful"))
  .catch(err => {
    console.error('❌ Supabase connection failed:', err.message);
    process.exit(1);
  });

// Load dependencies
console.log("📦 Loading dependencies...");
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Use stealth plugin to avoid bot detection
puppeteer.use(StealthPlugin());
console.log('🕵️  Stealth Mode activated');

// Parse command line arguments
console.log("⚙️  Parsing command line arguments...");
const args = process.argv.slice(2);
let testMode = false;
let limit = null;
let targetUrl = null;

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--test':
      testMode = true;
      console.log("🧪 Test mode enabled");
      break;
    case '--limit':
      limit = parseInt(args[i + 1]);
      console.log(`📊 Limit set to: ${limit}`);
      i++; // Skip next arg
      break;
    default:
      if (!args[i].startsWith('--')) {
        targetUrl = args[i];
        console.log(`🎯 Target URL: ${targetUrl}`);
      }
      break;
  }
}

// Test mode implementation
async function runTestMode() {
  console.log("🧪 RUNNING TEST MODE");
  console.log("📝 Generating 5 mock Erasmus partners...");

  const mockPartners = [
    {
      id: 'test-1',
      german_uni_id: 'TUM_TEST',
      partner_uni_name: 'University of Paris',
      partner_city: 'Paris',
      partner_country: 'France',
      subject_area: 'Computer Science',
      erasmus_code: 'F PARIS01',
      cost_index: 1200
    },
    {
      id: 'test-2',
      german_uni_id: 'TUM_TEST',
      partner_uni_name: 'Technical University of Vienna',
      partner_city: 'Vienna',
      partner_country: 'Austria',
      subject_area: 'Electrical Engineering',
      erasmus_code: 'A WIEN01',
      cost_index: 1100
    },
    {
      id: 'test-3',
      german_uni_id: 'TUM_TEST',
      partner_uni_name: 'University of Barcelona',
      partner_city: 'Barcelona',
      partner_country: 'Spain',
      subject_area: 'Business Administration',
      erasmus_code: 'E BARCEL01',
      cost_index: 950
    },
    {
      id: 'test-4',
      german_uni_id: 'TUM_TEST',
      partner_uni_name: 'University of Copenhagen',
      partner_city: 'Copenhagen',
      partner_country: 'Denmark',
      subject_area: 'Environmental Science',
      erasmus_code: 'DK KOBENH01',
      cost_index: 1300
    },
    {
      id: 'test-5',
      german_uni_id: 'TUM_TEST',
      partner_uni_name: 'ETH Zurich',
      partner_city: 'Zurich',
      partner_country: 'Switzerland',
      subject_area: 'Physics',
      erasmus_code: 'CH ZURICH01',
      cost_index: 1400
    }
  ];

  console.log("💾 Upserting mock partners to Supabase...");

  try {
    const { data, error } = await supabase
      .from('erasmus_partners')
      .upsert(mockPartners, { onConflict: 'id' });

    if (error) {
      console.error('❌ Supabase upsert error:', error);
      return false;
    }

    console.log("✅ Successfully upserted mock partners!");
    console.log(`📊 Upserted ${mockPartners.length} partners`);
    console.log("🔍 Sample data:", JSON.stringify(mockPartners[0], null, 2));

    return true;
  } catch (err) {
    console.error('❌ Test mode error:', err.message);
    return false;
  }
}

// Main scraping function for TUM MoveOn page
async function scrapeErasmusData(url) {
  console.log(`🌐 Starting TUM MoveOn scraper for URL: ${url}`);

  let browser;
  let partners = [];

  try {
    console.log("🚀 Launching browser...");
    browser = await puppeteer.launch({
      headless: false, // Keep visible for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();
    console.log("📄 Created new page");

    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    console.log("🔗 Navigating to TUM MoveOn URL...");
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log("✅ Page loaded successfully");

    // 1. Handle iFrames: Check for iFrame presence and switch context
    console.log("🔍 Checking for iFrames...");
    const frames = page.frames();
    let targetFrame = page;

    // Look for iFrame that might contain the data
    for (const frame of frames) {
      try {
        const frameUrl = frame.url();
        console.log(`📋 Found frame: ${frameUrl}`);

        // Check if this frame contains MoveOn content
        if (frameUrl.includes('moveon') || frameUrl.includes('publisher') || frameUrl.includes('tum')) {
          const hasContent = await frame.evaluate(() => {
            return document.querySelector('.search-bar, .advanced-search, button[type="submit"], .well-result, .search-result-item') !== null;
          });

          if (hasContent) {
            console.log("✅ Found content-bearing iFrame, switching context");
            targetFrame = frame;
            break;
          }
        }
      } catch (e) {
        console.log("⚠️  Could not check frame:", e.message);
      }
    }

    // Wait for search elements in the target frame
    console.log("🔍 Waiting for search elements...");
    await targetFrame.waitForSelector('.search-bar, .advanced-search, button[type="submit"]', {
      timeout: 15000
    });
    console.log("✅ Search elements found");

    // 2. Search Trigger: Find "Search" button by text or IDs like 'btnSearch'
    console.log("🔘 Attempting to trigger search...");
    let searchTriggered = false;

    // Try multiple strategies to find and click the search button
    const searchStrategies = [
      // Strategy 1: Direct selectors
      async () => {
        const selectors = ['button[type="submit"]', '#btnSearch', '.btn-search', '.search-btn', 'button.search'];
        for (const selector of selectors) {
          try {
            await targetFrame.waitForSelector(selector, { timeout: 2000 });
            await targetFrame.click(selector);
            console.log(`✅ Search button clicked using selector: ${selector}`);
            return true;
          } catch (e) {
            // Continue to next selector
          }
        }
        return false;
      },
      // Strategy 2: Text-based search for "Suchen" or "Search"
      async () => {
        try {
          const clicked = await targetFrame.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], [role="button"]'));
            for (const button of buttons) {
              const text = (button.textContent || button.innerText || button.value || '').toLowerCase().trim();
              if (text.includes('suchen') || text.includes('search') || text === 'suchen' || text === 'search') {
                button.click();
                return true;
              }
            }
            return false;
          });

          if (clicked) {
            console.log("✅ Search button clicked using text-based search");
            return true;
          }
        } catch (e) {
          console.log("⚠️  Text-based search failed:", e.message);
        }
        return false;
      },
      // Strategy 3: Press Enter key
      async () => {
        console.log("⚠️  No search button found, trying Enter key...");
        await targetFrame.keyboard.press('Enter');
        console.log("✅ Enter key pressed");
        return true;
      }
    ];

    // Try each strategy until one works
    for (const strategy of searchStrategies) {
      if (await strategy()) {
        searchTriggered = true;
        break;
      }
    }

    if (!searchTriggered) {
      console.log("⚠️  Could not trigger search, proceeding anyway...");
    }

    // 3. Wait for Results: Increase wait time to 30 seconds for specific selectors
    console.log("⏳ Waiting for search results (30 seconds)...");
    try {
      await targetFrame.waitForSelector('.list-item, .well-result, .search-result-item', {
        visible: true,
        timeout: 30000
      });
      console.log("✅ Search results loaded");
    } catch (e) {
      console.log("⚠️  Results selector not found within 30 seconds, proceeding with extraction attempt");
    }

    // Gentle scrolling for lazy loading
    console.log("📜 Triggering lazy loading with gentle scrolling...");
    await targetFrame.evaluate(async () => {
      const scrollDelay = 500;
      const maxScrolls = 30; // More scrolls for potentially large datasets
      let lastHeight = document.body.scrollHeight;

      for (let i = 0; i < maxScrolls; i++) {
        window.scrollBy(0, 500);
        await new Promise(resolve => setTimeout(resolve, scrollDelay));

        // Check if new content loaded
        const newHeight = document.body.scrollHeight;
        if (newHeight === lastHeight) {
          // Wait a bit more for potential delayed loading
          await new Promise(resolve => setTimeout(resolve, 1000));
          const finalHeight = document.body.scrollHeight;
          if (finalHeight === lastHeight) break;
          lastHeight = finalHeight;
        } else {
          lastHeight = newHeight;
        }
      }

      // Scroll back to top for consistent extraction
      window.scrollTo(0, 0);
    });
    console.log("✅ Lazy loading completed");

    // 4. Data Mapping: Extract and map data to specific fields
    console.log("📊 Extracting partner data from TUM MoveOn...");
    const extractedPartners = await targetFrame.evaluate(() => {
      const results = [];

      // Try different selectors for result items
      const selectors = ['.well-result', '.search-result-item', '.list-item', '[class*="result"]'];
      let elements = [];

      for (const selector of selectors) {
        elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) {
          console.log(`Found ${elements.length} elements with selector: ${selector}`);
          break;
        }
      }

      elements.forEach((element, index) => {
        try {
          // Extract institution/university name
          const institutionSelectors = [
            'h1', 'h2', 'h3', 'h4',
            '[class*="name"]', '[class*="university"]', '[class*="title"]',
            '.partner-name', '.institution', '.university',
            'strong', 'a[href]'
          ];

          let partner_university_name = '';
          for (const sel of institutionSelectors) {
            const el = element.querySelector(sel);
            if (el) {
              partner_university_name = (el.textContent || el.innerText || '').trim();
              if (partner_university_name.length > 3) break;
            }
          }

          // Extract country
          const countrySelectors = [
            '[class*="country"]', '[class*="land"]', '[data-country]',
            '.country', '.land'
          ];

          let partner_country = '';
          for (const sel of countrySelectors) {
            const el = element.querySelector(sel);
            if (el) {
              partner_country = (el.textContent || el.innerText || '').trim();
              if (partner_country.length > 2) break;
            }
          }

          // Extract city
          const citySelectors = [
            '[class*="city"]', '[class*="stadt"]', '[data-city]',
            '.city', '.stadt'
          ];

          let partner_city = '';
          for (const sel of citySelectors) {
            const el = element.querySelector(sel);
            if (el) {
              partner_city = (el.textContent || el.innerText || '').trim();
              if (partner_city.length > 2) break;
            }
          }

          // Extract subject area
          const subjectSelectors = [
            '[class*="subject"]', '[class*="fach"]', '[class*="field"]',
            '[class*="study"]', '[class*="discipline"]', '[class*="bereich"]',
            '[data-subject]', '[data-field]', '[data-fach]'
          ];

          let subject_area = '';
          for (const sel of subjectSelectors) {
            const el = element.querySelector(sel);
            if (el) {
              subject_area = (el.textContent || el.innerText || '').trim();
              if (subject_area.length > 2) break;
            }
          }

          // Fallback: Try to extract from text content if specific selectors don't work
          if (!partner_university_name || !partner_country) {
            const textContent = element.textContent || '';
            const lines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 2);

            // Look for patterns like "University Name, City, Country"
            if (lines.length > 0) {
              const firstLine = lines[0];

              // Try to extract university name (usually the first meaningful text)
              if (!partner_university_name && firstLine.length > 10) {
                partner_university_name = firstLine;
              }

              // Look for country in the text
              const countryMatch = textContent.match(/\b(France|Germany|Spain|Italy|Netherlands|Belgium|Switzerland|Austria|Sweden|Denmark|Norway|Finland|Portugal|Greece|Poland|Czech Republic|Hungary|Slovakia|Slovenia|Croatia|Estonia|Latvia|Lithuania|Romania|Bulgaria|Malta|Cyprus|Ireland|United Kingdom|Iceland|Liechtenstein|Luxembourg|Monaco)\b/i);
              if (countryMatch && !partner_country) {
                partner_country = countryMatch[1];
              }

              // Look for city pattern (word followed by comma and country)
              const cityMatch = textContent.match(/([A-ZÄÖÜ][a-zäöüß\s-]+),\s*([A-ZÄÖÜ][a-zäöüß\s-]+)/);
              if (cityMatch && !partner_city && !partner_country) {
                partner_city = cityMatch[1].trim();
                partner_country = cityMatch[2].trim();
              }
            }
          }

          // Set defaults
          if (!subject_area || subject_area.length < 3) {
            subject_area = 'General';
          }

          // Only add if we have minimum required data
          if (partner_university_name && partner_country && partner_university_name.length > 3 && partner_country.length > 2) {
            results.push({
              id: `tum-moveon-${Date.now()}-${index}`,
              home_university: 'TUM', // Always set to TUM for this scraper
              partner_university_name: partner_university_name,
              partner_city: partner_city || '',
              partner_country: partner_country,
              subject_area: subject_area,
              erasmus_code: '',
              cost_index: 0,
              scraped_at: new Date().toISOString()
            });
          }
        } catch (e) {
          console.log(`⚠️  Error extracting data from element ${index}:`, e.message);
        }
      });

      return results;
    });

    partners = extractedPartners;
    console.log(`📈 Extracted ${partners.length} partners from TUM MoveOn`);

    // 5. Batch Upsert: Upload all found partners to Supabase in one batch
    if (partners.length > 0) {
      console.log("💾 Performing batch upsert to Supabase...");
      try {
        const { data, error } = await supabase
          .from('erasmus_partners')
          .upsert(partners, {
            onConflict: 'id',
            ignoreDuplicates: false
          });

        if (error) {
          console.error('❌ Supabase batch upsert error:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
        } else {
          console.log("✅ Successfully saved partners to database!");
          console.log(`📊 Upserted ${partners.length} partners`);
          console.log("🔍 Sample partner:", JSON.stringify(partners[0], null, 2));
        }
      } catch (err) {
        console.error('❌ Batch upsert failed:', err.message);
      }
    } else {
      console.log("⚠️  No partners found to save");
    }

    return partners;

  } catch (error) {
    console.error('❌ Scraping error:', error.message);
    console.error('Stack trace:', error.stack);
    return [];
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

  if (testMode) {
    console.log("🧪 Running in test mode");
    const success = await runTestMode();
    if (success) {
      console.log("🎉 Test completed successfully!");
    } else {
      console.log("❌ Test failed!");
      process.exit(1);
    }
  } else if (targetUrl) {
    console.log(`🌐 Scraping URL: ${targetUrl}`);
    const partners = await scrapeErasmusData(targetUrl);
    console.log(`📊 Scraped ${partners.length} partners`);
    if (partners.length > 0) {
      console.log("🎉 Scraping completed successfully!");
    } else {
      console.log("⚠️  No partners found");
    }
  } else {
    console.log("❓ No URL provided and not in test mode");
    console.log("Usage:");
    console.log("  node scripts/scrape-erasmus.js <URL>");
    console.log("  node scripts/scrape-erasmus.js --test");
    console.log("  node scripts/scrape-erasmus.js <URL> --limit 100");
    process.exit(1);
  }

  console.log("🏁 Script execution completed!");
}

// Run the main function
main().catch(error => {
  console.error('💥 Main execution error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});