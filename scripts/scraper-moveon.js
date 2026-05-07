const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

// Use stealth plugin to avoid bot detection
puppeteer.use(StealthPlugin());

console.log("🎯 MOVECON MULTI-UNIVERSITY SCRAPER");
console.log("==================================");

// Read university configuration
const universitiesPath = path.join(__dirname, '..', 'universities.json');

// Validation: Check if universities.json exists
if (!fs.existsSync(universitiesPath)) {
  console.error('❌ Missing universities.json in scripts folder.');
  console.error('💡 Please ensure universities.json exists in the scripts directory.');
  process.exit(1);
}

const universities = JSON.parse(fs.readFileSync(universitiesPath, 'utf8'));

console.log(`📄 Loaded ${universities.length} universities from universities.json`);

// Initialize results array
let allPartners = [];

// Delay helper function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// STRATEGY PATTERN: Portal-specific scraping strategies
// All strategies return uniform data: {name, city, country, website, subjectArea, home_university}

/**
 * Strategy for Modern Direct portals (TU München style)
 * Features: fSelect filters, direct search button access
 */
async function scrapeModernDirect(page, university) {
  console.log(`🔍 Executing MODERN-DIRECT strategy for ${university.name}`);

  try {
    // SOFT FILTER LOGIC: Check if fSelect filters exist
    const fSelectFilterExists = await page.$('.fs-label-wrap, .fs-label, .fs-dropdown');
    let filtersApplied = false;

    if (fSelectFilterExists) {
      console.log("✅ Found fSelect filter elements");
      // FILTER INTERACTION: Try to find and select Erasmus filter
      const erasmusClicked = await page.evaluate(() => {
        const options = Array.from(document.querySelectorAll('.fs-option'));
        for (const option of options) {
          const text = option.textContent.toLowerCase();
          if (text.includes('erasmus')) {
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
        console.log("✅ Selected Erasmus option from fSelect");
        filtersApplied = true;
        await delay(1000);
      } else {
        console.log("⚠️  Erasmus option not found in fSelect, continuing without filter");
      }
    } else {
      console.log("ℹ️  No fSelect filters found, proceeding directly to search");
    }

    // AGGRESSIVE SEARCH BUTTON DISCOVERY
    console.log("🔍 Looking for search button...");
    let searchSelectors = [
      'xpath/.//*[contains(text(), "Search") or contains(text(), "Suchen") or contains(text(), "Finden") or contains(text(), "Start search")]',
      'button:contains("Search")',
      'button:contains("Suchen")',
      'button.btn-search',
      '.search-button',
      'button[type="submit"]',
      // FU Berlin specific: input-based submit buttons
      'input[type="submit"]',
      'input[value="Suche"]',
      'input[value="Search"]',
      'input[value="Suchen"]',
      'button[title="Suche"]',
      'button[title="Search"]'
    ];

    // Add fallback for any button that looks like search (magnifying glass icon, etc.)
    searchSelectors = searchSelectors.concat([
      '.fa-search',
      'button .fa-search',
      'a .fa-search',
      '[class*="search"]',
      'button:contains("Find")',
      'button:contains("Suchen")'
    ]);

    let searchClicked = false;
    for (const selector of searchSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          console.log(`🖱️  Clicked search button: ${selector}`);
          searchClicked = true;
          console.log("⏳ Waiting 10 seconds for results to load...");
          await delay(10000); // Increased wait time for AJAX loading
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!searchClicked) {
      console.log("⚠️  No search button found, trying keyboard Enter...");
      await page.keyboard.press('Enter');
      await delay(5000);
    }

    // HANDLE "SHOW ALL" BUTTONS
    const showAllSelectors = [
      'button:contains("Show all")',
      'button:contains("Alle anzeigen")',
      'a:contains("List")',
      'a:contains("Liste")',
      '.fa-list',
      '.icon-list'
    ];

    for (const selector of showAllSelectors) {
      try {
        const showButton = await page.$(selector);
        if (showButton) {
          await showButton.click();
          console.log(`📋 Clicked show all button: ${selector}`);
          await delay(2000);
          break;
        }
      } catch (e) {
        // Continue
      }
    }

    // WAIT FOR RESULTS
    console.log("⏳ Waiting for results to load...");
    try {
      await page.waitForSelector(
        'div[class*="results"], .table-responsive, table, .search-results, .partner-list, tbody tr',
        { timeout: 20000 }
      );
      console.log("✅ Results container/table detected");
    } catch (tableWaitError) {
      console.log("⚠️  No results container found within 20 seconds");
    }

    // EXTRACT PARTNERS
    return await page.evaluate((homeUniversity) => {
      const partners = [];

      // MODERN PORTAL: Look for _university_block elements (TUM style)
      let partnerElements = document.querySelectorAll('div[class*="_university_block"]');
      console.log(`📊 Found ${partnerElements.length} university blocks`);

      if (partnerElements.length === 0) {
        // RESILIENT FALLBACK: Look for ALL table rows, filter by content
        const allRows = document.querySelectorAll('tr');
        console.log(`📊 Found ${allRows.length} total table rows`);

        // Filter rows that have at least 3 columns (td elements) - filters out headers/footers
        partnerElements = Array.from(allRows).filter(row => {
          const cells = row.querySelectorAll('td');
          return cells.length >= 3;
        });

        console.log(`🎯 Filtered to ${partnerElements.length} data rows (with ≥3 columns)`);

        // DEBUG: If still no rows found, log the HTML structure
        if (partnerElements.length === 0) {
          const resultsContainer = document.querySelector('div[class*="results"], .table-responsive, table, tbody') ||
                                   document.body;
          const htmlSnippet = resultsContainer.innerHTML.substring(0, 500);
          console.log(`🔍 DEBUG: No data rows found. Results container HTML: ${htmlSnippet}...`);
        }
      }

      partnerElements.forEach((element, index) => {
        try {
          // Extract from table cells if this is a table row
          const cells = element.querySelectorAll('td');
          if (cells.length >= 3) {
            partners.push({
              name: cells[0]?.textContent?.trim() || '',
              city: cells[1]?.textContent?.trim() || '',
              country: cells[2]?.textContent?.trim() || '',
              website: element.querySelector('a[href]')?.href || '',
              subjectArea: cells[3]?.textContent?.trim() || '',
              home_university: homeUniversity
            });
          } else {
            // Non-table format: use text matching
            const text = element.textContent || '';
            // Skip if it's just header or empty
            if (text.length > 10 && !text.toLowerCase().includes('university') && !text.toLowerCase().includes('hochschule')) {
              partners.push({
                name: text.split(',')[0]?.trim() || '',
                city: '',
                country: '',
                website: '',
                subjectArea: '',
                home_university: homeUniversity
              });
            }
          }
        } catch (error) {
          // Skip this partner entry
        }
      });

      return partners;
    }, university.name);

  } catch (error) {
    console.log(`❌ MODERN-DIRECT strategy failed for ${university.name}: ${error.message}`);
    return [];
  }
}

/**
 * Strategy for Modern Tab portals (LMU/RWTH style)
 * Features: Requires tab navigation first, then search
 */
async function scrapeModernTab(page, university) {
  console.log(`🔍 Executing MODERN-TAB strategy for ${university.name}`);

  try {
    // Keep config for search button selector (even though we don't use tabText anymore)
    const config = university.interactionConfig || {};

    // FU BERLIN SPECIFIC NAVIGATION: Wait for navigation and click "Suche" tab
    console.log("🔍 Starting FU Berlin specific navigation...");

    // FIRST: Check if we already have search interface (like FU Berlin)
    const existingFSelect = await page.$('.fs-label-wrap, .fs-label, .fs-dropdown');
    if (existingFSelect) {
      console.log("✅ Search interface already available - skipping navigation step");
      tabClicked = true; // Mark as successful to proceed to search
    } else {
      console.log("🔍 Search interface not found, proceeding with navigation");
    }

    let actualTabClicked = false;

    if (!tabClicked) {
      try {
      // STEP 1: Wait for navigation elements to appear
      console.log("⏳ Waiting for navigation elements...");
      await page.waitForSelector('.nav-tabs, .menu, nav, .navbar', { timeout: 10000 });
      console.log("✅ Navigation elements found");

      // STEP 2: Look specifically for links containing "Suche" or "Search"
      const searchLinks = await page.$$('a');
      const searchDescription = config.tabText ? `"${config.tabText}" or keywords` : `"Suche"/"Search"`;
      console.log(`📊 Found ${searchLinks.length} links to check for ${searchDescription}`);

      // For FU Berlin, also check for "Austausch" links since that's what worked before
      const targetKeywords = ['suche', 'search', 'austausch', 'exchange'];

      for (const link of searchLinks) {
        try {
          const linkInfo = await link.evaluate(el => ({
            text: el.innerText || el.textContent || '',
            href: el.href || '',
            className: el.className || '',
            tagName: el.tagName || ''
          }));

          // Skip external links, branding links, and navigation toggles
          // Only skip links that clearly point to external domains (not fuberlin.adv-pub.moveon4.de)
          const isExternalLink = linkInfo.href &&
                                (linkInfo.href.includes('www.fu-berlin.de') ||
                                 (linkInfo.href.includes('http') && !linkInfo.href.includes('fuberlin.adv-pub.moveon4.de') && !linkInfo.href.startsWith('/')));

          // Skip external links and navigation toggles, but allow configured tabText even if it's branded
          let skipReason = null;
          if (isExternalLink) skipReason = 'external link';
          else if (linkInfo.className.includes('navbar-toggler')) skipReason = 'navbar-toggler class';
          else if (linkInfo.text.includes('Skip to content')) skipReason = 'accessibility link';
          // Allow navbar-brand links if they contain the configured tabText (branding might be the nav tab)
          else if (linkInfo.className.includes('navbar-brand') && !(config.tabText && linkInfo.text.toLowerCase().includes(config.tabText.toLowerCase()))) {
            skipReason = 'navbar-brand class';
          }

          if (skipReason) {
            console.log(`⏭️  Skipping link (${skipReason}): "${linkInfo.text.trim()}" (${linkInfo.href}) [class: ${linkInfo.className}]`);
            continue; // Skip this link
          }

          console.log(`🔍 Checking link: "${linkInfo.text.trim()}" (href: ${linkInfo.href})`);

          // Check for the configured tabText OR any of the target keywords (case-insensitive)
          let matchingKeyword = null;

          // FIRST PRIORITY: Exact match with configured tabText (strict equality for FU Berlin)
          if (config.tabText && linkInfo.text.trim().toLowerCase() === config.tabText.toLowerCase()) {
            matchingKeyword = config.tabText;
            console.log(`🎯 Exact match found for configured tabText: "${config.tabText}"`);
          }
          // SECOND PRIORITY: Contains configured tabText (for partial matches)
          else if (config.tabText && linkInfo.text.toLowerCase().includes(config.tabText.toLowerCase())) {
            matchingKeyword = config.tabText;
            console.log(`🎯 Partial match found for configured tabText: "${config.tabText}"`);
          }
          // THIRD PRIORITY: Any of the fallback keywords
          else {
            matchingKeyword = targetKeywords.find(keyword =>
              linkInfo.text.toLowerCase().includes(keyword)
            );
          }

          if (matchingKeyword) {
            console.log(`🎯 Found "${matchingKeyword}" link: "${linkInfo.text.trim()}" (href: ${linkInfo.href})`);

            // Skip if this would navigate away from the MoveON portal (root domain redirect)
            if (linkInfo.href === 'https://fuberlin.adv-pub.moveon4.de/' && page.url().includes('austauschmoeglichkeiten')) {
              console.log(`⏭️  Skipping navigation away from current portal page`);
              continue;
            }

            // Click the link and wait for navigation
            try {
              await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {
                  console.log(`⚠️  Navigation timeout or no navigation occurred`);
                }),
                link.click()
              ]);

              console.log(`🖱️ Clicked '${matchingKeyword}' tab and waited for navigation`);
              tabClicked = true;
            } catch (clickError) {
              console.log(`⚠️  Failed to click '${matchingKeyword}' link: ${clickError.message}`);
              continue; // Try next link
            }

            // STEP 3: Wait for search form or content to become visible
            console.log("⏳ Waiting for search form or content to appear...");
            try {
              await page.waitForSelector('input[type="submit"], .btn-search, button[type="submit"], .search-form, .fSelect, select', {
                timeout: 10000,
                visible: true
              });
              console.log("✅ Search form or interactive content appeared!");
            } catch (formError) {
              console.log("⚠️ No search form appeared, but continuing with available content...");

              // Check if we have any interactive elements now
              const interactiveElements = await page.$$('select, input, button, .fSelect');
              console.log(`📊 Found ${interactiveElements.length} interactive elements after navigation`);
            }

            break; // Stop after clicking the first matching link
          }
        } catch (linkError) {
          // Skip problematic links
          continue;
        }
      }

      if (!tabClicked) {
        const searchDescription = config.tabText ? `"${config.tabText}"` : "'Suche'";
        console.log(`⚠️ No ${searchDescription} tab found. Available links:`);

        // Debug: Show all available link texts
        try {
          const allLinkTexts = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            return links.map(link => link.innerText || link.textContent || '').filter(text => text.trim());
          });
          console.log(`🔍 Available link texts: ${allLinkTexts.slice(0, 10).join(', ')}`);
        } catch (debugError) {
          console.log("⚠️ Could not extract link texts for debugging");
        }
      }

    } catch (navError) {
      console.log(`⚠️ FU Berlin navigation failed: ${navError.message}`);
    }

    // RESILIENT FILTER DETECTION
    const fSelectFilterExists = await page.$('.fs-label-wrap, .fs-label, .fs-dropdown');
    const anyFilterExists = await page.$('select, input[type="text"], .filter, .dropdown');

    if (fSelectFilterExists) {
      console.log("✅ Found fSelect filter elements");
      // Try Erasmus selection in fSelect
      const erasmusClicked = await page.evaluate(() => {
        const options = Array.from(document.querySelectorAll('.fs-option'));
        for (const option of options) {
          const text = option.textContent.toLowerCase();
          if (text.includes('erasmus')) {
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
        console.log("✅ Selected Erasmus option from fSelect");
        await delay(1000);
      }
    } else if (anyFilterExists) {
      console.log("🔍 Found alternative filter elements, attempting Erasmus selection...");
      // Try Erasmus in regular selects
      const erasmusSelected = await page.evaluate(() => {
        const selects = document.querySelectorAll('select');
        for (const select of selects) {
          const options = Array.from(select.options);
          for (let i = 0; i < options.length; i++) {
            if (options[i].textContent.toLowerCase().includes('erasmus')) {
              select.selectedIndex = i;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
        }
        return false;
      });

      if (erasmusSelected) {
        console.log("✅ Selected Erasmus option from alternative filter");
        await delay(1000);
      }
    } else {
      console.log("ℹ️  No filter elements found, proceeding directly to search");
    }

    // SEARCH BUTTON DISCOVERY: Use config-specific selector if available
    console.log("🔍 Looking for search button...");
    let searchSelectors = [];

    if (config.searchButtonSelector) {
      // Use the specific selector from config first
      searchSelectors.push(config.searchButtonSelector);
      console.log(`🎯 Using config search button selector: ${config.searchButtonSelector}`);
    }

    // Add fallback selectors (including FU Berlin input-based)
    searchSelectors = searchSelectors.concat([
      'xpath/.//*[contains(text(), "Search") or contains(text(), "Suchen") or contains(text(), "Finden") or contains(text(), "Start search")]',
      'button:contains("Search")',
      'button:contains("Suchen")',
      'button.btn-search',
      '.search-button',
      'button[type="submit"]',
      // FU Berlin specific: input-based submit buttons
      'input[type="submit"]',
      'input[value="Suche"]',
      'input[value="Search"]',
      'input[value="Suchen"]',
      'button[title="Suche"]',
      'button[title="Search"]'
    ]);

    let searchClicked = false;
    for (const selector of searchSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          console.log(`🖱️  Clicked search button: ${selector}`);
          searchClicked = true;
          console.log("⏳ Waiting 10 seconds for results to load...");
          await delay(10000); // Increased wait time for AJAX loading
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    // Debug: Log all available buttons and inputs if search wasn't clicked
    if (!searchClicked) {
      console.log("🔍 Debug: Search button not found. Available interactive elements:");
      const allButtons = await page.$$eval('button, input[type="submit"], input[type="button"]', elements =>
        elements.map(el => ({
          tag: el.tagName,
          type: el.type,
          value: el.value,
          class: el.className,
          text: el.innerText?.trim()
        }))
      );
      console.log(`Found ${allButtons.length} interactive elements:`, allButtons.slice(0, 10));
    }

    if (!searchClicked) {
      console.log("⚠️  No search button found, trying input field focus + Enter...");
      const inputFound = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="search"]');
        if (inputs.length > 0) {
          inputs[0].focus();
          return true;
        }
        return false;
      });

      if (inputFound) {
        await page.keyboard.press('Enter');
        console.log("⌨️  Pressed Enter on input field");
        await delay(5000);
      }
    }

    // WAIT FOR RESULTS
    console.log("⏳ Waiting for results to load...");
    try {
      await page.waitForSelector(
        'div[class*="results"], .table-responsive, table, .search-results, .partner-list, tbody tr',
        { timeout: 20000 }
      );
      console.log("✅ Results container/table detected");
    } catch (tableWaitError) {
      console.log("⚠️  No results container found within 20 seconds");
    }

    // EXTRACT PARTNERS (same logic as modern-direct)
    return await page.evaluate((homeUniversity) => {
      try {
        const partners = [];

      // UNIVERSAL ROW EXTRACTION: Look for ALL table rows, filter by content
      // First check if table is inside #list-collection (FU Berlin specific)
      let allRows;
      const listCollection = document.querySelector('#list-collection');
      if (listCollection) {
        console.log("🎯 Found #list-collection container, extracting from there");
        allRows = listCollection.querySelectorAll('tr');
      } else {
        console.log("🔍 No #list-collection found, searching globally");
        allRows = document.querySelectorAll('tr');
      }
      console.log(`📊 Found ${allRows.length} total table rows`);

        // Filter rows that have at least 3 columns (td elements) - filters out headers/footers
        const partnerElements = Array.from(allRows).filter(row => {
          const cells = row.querySelectorAll('td');
          return cells.length >= 3;
        });

        console.log(`🎯 Filtered to ${partnerElements.length} data rows (with ≥3 columns)`);

        // PANIC DEBUGGING: If no rows extracted, dump HTML for analysis
        if (partnerElements.length === 0) {
          console.log("⚠️ No rows extracted. Dumping HTML for debugging...");
          // This will be handled by the main script to save debug-[slug]-table-dump.html
          return { debugDumpNeeded: true, containerHTML: document.body.innerHTML };
        }

        partnerElements.forEach((element, index) => {
          try {
            const cells = element.querySelectorAll('td');
            if (cells.length >= 3) {
              // Defensive data extraction
              const partner = {
                name: cells[0]?.textContent?.trim() || 'N/A',
                city: cells[1]?.textContent?.trim() || 'N/A',
                country: cells[2]?.textContent?.trim() || 'N/A',
                website: element.querySelector('a[href]')?.href || '',
                subjectArea: cells[3]?.textContent?.trim() || 'N/A',
                home_university: homeUniversity
              };

              // Only add if we have a meaningful name
              if (partner.name !== 'N/A' && partner.name.length > 2) {
                partners.push(partner);
              }
            } else {
              // Fallback for non-table structures
              const text = element.textContent || '';
              if (text.length > 10 && !text.toLowerCase().includes('university') && !text.toLowerCase().includes('hochschule')) {
                partners.push({
                  name: text.split(',')[0]?.trim() || 'N/A',
                  city: 'N/A',
                  country: 'N/A',
                  website: '',
                  subjectArea: 'N/A',
                  home_university: homeUniversity
                });
              }
            }
          } catch (error) {
            console.log(`⚠️ Error processing row ${index}: ${error.message}`);
          }
        });

        console.log(`✅ Extracted ${partners.length} partners from ${partnerElements.length} rows`);
        return partners;

      } catch (extractionError) {
        console.log(`❌ Data extraction failed: ${extractionError.message}`);
        return []; // Always return an array
      }
    }, university.name);
    }

  } catch (error) {
    console.log(`❌ MODERN-TAB strategy failed for ${university.name}: ${error.message}`);
    return [];
  }
}

/**
 * Strategy for Classic Publisher portals (iframe-based)
 * Features: Mandatory iframe switching, table-based results
 */
async function scrapeClassic(page, university) {
  console.log(`🔍 Executing CLASSIC strategy for ${university.name}`);

  try {
    // IFRAME DETECTION: Content is ALWAYS inside an iframe for Classic portals
    let activePage = null;
    let iframeFound = false;

    try {
      // Wait for any iframe to load (generic selector for loose coupling)
      await page.waitForSelector('iframe', { timeout: 15000 });
      console.log("✅ Iframe element found on page");

      // Try to get iframe content frame (loose coupling - no specific ID required)
      let iframeElement = await page.$('iframe');
      if (iframeElement) {
        const frame = await iframeElement.contentFrame();
        if (frame) {
          activePage = frame;
          iframeFound = true;
          console.log("🔄 Switched to iframe context (generic iframe)");
        }
      }

      // FALLBACK: If element handle fails, try page.frames() approach
      if (!iframeFound) {
        console.log("⚠️ Element handle failed, trying page.frames() fallback...");
        const frames = page.frames();
        const contentFrame = frames.find(f => f !== page.mainFrame());
        if (contentFrame) {
          activePage = contentFrame;
          iframeFound = true;
          console.log("🔄 Switched to iframe context (frames.find fallback)");
        }
      }
    } catch (iframeWaitError) {
      console.log("❌ No iframe found within 15 seconds (Classic)");
      // Take debug screenshot
      try {
        await page.screenshot({
          path: `debug-${university.slug}-no-iframe.png`,
          fullPage: true
        });
        console.log(`📸 Debug screenshot saved: debug-${university.slug}-no-iframe.png`);
      } catch (debugError) {
        console.log("⚠️  Could not save debug screenshot");
      }
      return [];
    }

    if (!iframeFound) {
      console.log("❌ Found iframe element but could not access content frame");
      return [];
    }

    // SEARCH TRIGGER: Look for submit button inside the iframe
    const searchSelectors = [
      'input[type="submit"]',
      'button.btn-search',
      'button[type="submit"]',
      'button[id="search_button"]',
      'input[value*="Suche"]',
      'input[value*="Suchen"]'
    ];

    let searchClicked = false;
    for (const selector of searchSelectors) {
      try {
        const element = await activePage.$(selector);
        if (element) {
          // Click and wait for navigation within the iframe
          await Promise.all([
            activePage.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
            element.click()
          ]);
          console.log(`🖱️  Clicked search button in iframe: ${selector}`);
          searchClicked = true;
          await delay(3000); // Wait for results to load
          break;
        }
      } catch (e) {
        console.log(`⚠️  Failed to click search button ${selector}: ${e.message}`);
      }
    }

    if (!searchClicked) {
      console.log("⚠️  No search button found in iframe, trying keyboard Enter...");
      await activePage.keyboard.press('Enter');
      await delay(3000);
    }

    // TABLE EXTRACTION: Look for results table in the iframe
    try {
      await activePage.waitForSelector('.table-publisher tr, table tr, tbody tr', {
        timeout: 20000
      });
      console.log("✅ Classic Publisher results table loaded");
    } catch (tableError) {
      console.log("❌ Table empty (Classic) - no results found after search");
      return [];
    }

    // EXTRACT PARTNERS FROM CLASSIC TABLES
    return await activePage.evaluate((homeUniversity) => {
      const partners = [];

      // UNIVERSAL ROW EXTRACTION: Look for ALL table rows, filter by content
      const allRows = document.querySelectorAll('tr');
      console.log(`📊 Found ${allRows.length} total table rows in Classic Publisher`);

      // Filter rows that have at least 3 columns (td elements) - filters out headers/footers
      const dataRows = Array.from(allRows).filter(row => {
        const cells = row.querySelectorAll('td');
        return cells.length >= 3;
      });

      console.log(`🎯 Filtered to ${dataRows.length} data rows (with ≥3 columns)`);

      // PANIC DEBUGGING: If no rows extracted, dump HTML for analysis
      if (dataRows.length === 0) {
        console.log("⚠️ No rows extracted. Dumping HTML for debugging...");
        return { debugDumpNeeded: true, containerHTML: document.body.innerHTML };
      }

      dataRows.forEach((row, index) => {
        try {
          const cells = row.querySelectorAll('td');

          // Extract data according to Classic MoveOn format
          const partner = {
            name: cells[0]?.textContent?.trim() || '', // Column 1: Partnerhochschule
            country: cells[1]?.textContent?.trim() || '', // Column 2: Country/Land
            city: cells[2]?.textContent?.trim() || '', // Column 3: City/Ort
            subjectArea: cells[3]?.textContent?.trim() || '', // Column 4: Subject Area/Fach
            website: '', // Will extract from links
            home_university: homeUniversity
          };

          // Extract website from any links in the row
          const link = row.querySelector('a[href]');
          if (link) {
            partner.website = link.href;
          }

          // Only add if we have a valid name
          if (partner.name && partner.name.length > 2) {
            partners.push(partner);
          }
        } catch (error) {
          // Skip problematic rows
        }
      });

      return partners;
    }, university.name);

  } catch (error) {
    console.log(`❌ CLASSIC strategy failed for ${university.name}: ${error.message}`);
    return [];
  }
}

// STRATEGY PATTERN: Main scraping function for a single university
async function scrapeUniversityPartners(university) {
  console.log(`\n🏛️  Scraping: ${university.name}`);
  console.log(`🌐 URL: ${university.moveonUrl}`);

  let browser;
  try {
    // Launch browser in headless mode
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set realistic User-Agent and viewport to avoid anti-bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    // Navigate to university's MoveOn portal
    await page.goto(university.moveonUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log("✅ Page loaded successfully");

    // Wait for initial load
    await delay(2000);

    // STRATEGY PATTERN: Execute the appropriate scraping strategy based on portalType
    let partners = [];
    switch (university.portalType) {
      case 'modern-direct':
        partners = await scrapeModernDirect(page, university);
        break;
      case 'modern-tab':
        partners = await scrapeModernTab(page, university);
        break;
      case 'classic':
        partners = await scrapeClassic(page, university);
        break;
      default:
        console.log(`❌ Unknown portal type: ${university.portalType}`);
        partners = [];
    }

    // Handle debug dump case where extraction returns an object instead of array
    if (partners && typeof partners === 'object' && partners.debugDumpNeeded) {
      console.log("🔍 Debug dump requested - saving HTML for analysis");
      fs.writeFileSync(`debug-${university.slug}-table-dump.html`, partners.containerHTML);
      console.log(`📸 Debug HTML dump saved: debug-${university.slug}-table-dump.html`);
      console.log("🔍 Check this file to see why no table rows were extracted");
      partners = []; // Set to empty array for consistent handling
    }

    // Ensure partners is always an array
    if (!Array.isArray(partners)) {
      console.log(`⚠️ Partners result was not an array, setting to empty array`);
      partners = [];
    }

    console.log(`✅ Scraped ${partners.length} partners from ${university.name}`);
    return partners;

  } catch (error) {
    console.error(`❌ Strategy failed for ${university.name}:`, error.message);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Main execution
async function main() {
  console.log("🎯 Starting MoveOn multi-university scraping...");

  for (let i = 0; i < universities.length; i++) {
    const university = universities[i];

    console.log(`\n🔄 Processing university ${i + 1}/${universities.length}: ${university.name}`);

    try {
      const universityPartners = await scrapeUniversityPartners(university);

      if (universityPartners && universityPartners.debugDumpNeeded) {
        // PANIC DEBUGGING: Save HTML dump when no rows extracted
        const dumpPath = path.join(__dirname, '..', `debug-${university.slug}-table-dump.html`);
        fs.writeFileSync(dumpPath, universityPartners.containerHTML);
        console.log(`📸 Debug HTML dump saved: debug-${university.slug}-table-dump.html`);
        console.log(`🔍 Check this file to see why no table rows were extracted for ${university.name}`);
      } else if (universityPartners && universityPartners.length > 0) {
        // Append to results
        allPartners.push(...universityPartners);
        console.log(`📊 Total partners collected so far: ${allPartners.length}`);
      }

    } catch (error) {
      console.error(`💥 Critical error processing ${university.name}:`, error.message);
    }

    // 3-second delay between universities
    if (i < universities.length - 1) {
      console.log("⏳ Waiting 3 seconds before next university...");
      await delay(3000);
    }
  }

  // Final save
  const finalPath = path.join(__dirname, '..', 'all_partners_temp.json');
  fs.writeFileSync(finalPath, JSON.stringify(allPartners, null, 2));

  console.log("\n🎉 Scraping completed!");
  console.log(`📊 Total partners collected: ${allPartners.length}`);
  console.log(`💾 Results saved to: all_partners_temp.json`);

  // Summary by university
  const byUniversity = {};
  allPartners.forEach(partner => {
    byUniversity[partner.home_university] = (byUniversity[partner.home_university] || 0) + 1;
  });

  console.log("\n🏛️  Partners by university:");
  Object.entries(byUniversity).forEach(([university, count]) => {
    console.log(`   ${university}: ${count} partners`);
  });
}

// Run the scraper
main().catch(error => {
  console.error('💥 Fatal error:', error.message);
  process.exit(1);
});