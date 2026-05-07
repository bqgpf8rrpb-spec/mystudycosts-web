const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeFU() {
  console.log('🎯 Starting FU Berlin scraper...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();

  try {
    // 1. Setup - Navigate to FU Berlin portal
    console.log('🌐 Navigating to FU Berlin portal...');
    try {
      await page.goto('https://fuberlin.adv-pub.moveon4.de/austauschmoeglichkeiten/', {
        waitUntil: 'networkidle2',
        timeout: 60000 // Increased timeout
      });
      console.log('✅ Page loaded successfully');
    } catch (navError) {
      console.log('⚠️ Initial navigation timeout, trying with domcontentloaded...');
      await page.goto('https://fuberlin.adv-pub.moveon4.de/austauschmoeglichkeiten/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      console.log('✅ Page loaded with domcontentloaded');
    }

    // 2. Navigation - Look for tab/link with "Suche" or "Austausch"
    console.log('🔍 Looking for navigation tab...');

    // First, let's understand what interactive elements are on the page
    const allInteractive = await page.$$eval('a, button, input[type="submit"]', elements =>
      elements.slice(0, 15).map(el => ({
        tag: el.tagName,
        text: el.innerText?.trim().substring(0, 50),
        href: el.href?.substring(0, 50),
        class: el.className
      }))
    );
    console.log('🔍 Interactive elements found:', allInteractive);

    const navSelectors = [
      'a[href*="suche"]',
      'a[href*="austausch"]'
    ];

    let tabClicked = false;
    for (const selector of navSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`🎯 Found navigation element: ${selector}`);
          await element.click();
          tabClicked = true;
          await new Promise(r => setTimeout(r, 2000)); // Wait for content to load
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!tabClicked) {
      console.log('⚠️ No navigation tab found, proceeding with current page');
    }

    // Wait for search input to appear
    console.log('⏳ Waiting for search input...');
    await page.waitForSelector('input[type="text"], input[type="search"]', { timeout: 10000 });
    console.log('✅ Search input found');

    // 3. Interaction - Find and click actual search button
    console.log('🔍 Looking for search button to trigger search...');
    const searchSelectors = [
      'button.irm_filter_btn',  // FU Berlin specific search button
      'a#search_button',
      'input[type="submit"]',
      'button.btn-search',
      '.fa-search',
      'button.fa-search',
      'a.fa-search',
      'input[value="Suche"]',
      'input[value="Search"]',
      'button[type="submit"]'
    ];

    let searchClicked = false;
    for (const selector of searchSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`🎯 Found search button: ${selector}`);

          // Get more info about the element before clicking
          const elementInfo = await element.evaluate(el => ({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            innerText: el.innerText?.trim(),
            outerHTML: el.outerHTML.substring(0, 200)
          }));
          console.log(`📋 Element info: ${elementInfo.tagName}.${elementInfo.className}#${elementInfo.id} "${elementInfo.innerText}"`);

          // Use page.evaluate to force click and handle potential navigation
          await Promise.all([
            page.evaluate(el => el.click(), element),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {
              console.log('⚠️ No navigation occurred after click');
            })
          ]);
          console.log('✅ Clicked search button and handled navigation');

          // Wait for page to stabilize after potential navigation
          await new Promise(r => setTimeout(r, 3000));

          // Check current URL and page state
          const currentUrl = page.url();
          console.log(`📍 Current URL after click: ${currentUrl}`);

          const pageTitle = await page.title();
          console.log(`📄 Page title after click: ${pageTitle}`);

          // Check if any new content appeared
          const newElements = await page.$$eval('tr, .result, .partner, div, body *', els => ({
            totalElements: els.length,
            bodyChildren: document.body.children.length,
            hasContent: document.body.textContent.length > 100
          }));
          console.log(`📊 Page state after click:`, newElements);

          // If page seems empty, wait a bit more
          if (!newElements.hasContent) {
            console.log('⚠️ Page appears empty, waiting longer...');
            await new Promise(r => setTimeout(r, 5000));
            const retryElements = await page.$$eval('body *', els => els.length);
            console.log(`📊 After longer wait: ${retryElements} elements`);
          }

          searchClicked = true;
          break;
        }
      } catch (e) {
        console.log(`⚠️ Failed to click ${selector}: ${e.message}`);
        // Continue to next selector
      }
    }

    // Reset timeout
    await page.setDefaultTimeout(30000);

    // Fallback: Focus input and press Enter if no button found
    if (!searchClicked) {
      console.log('⚠️ No search button found, trying keyboard Enter...');
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
        console.log('✅ Pressed Enter on search input');
        searchClicked = true;
      } else {
        console.log('❌ No search input found either');
        return;
      }
    }

    // Wait 5 seconds for results to load
    console.log('⏳ Waiting 5 seconds for results...');
    await new Promise(r => setTimeout(r, 5000));

    // 3.5. Handle Pagination - Try to show ALL results
    console.log('🔢 Looking for pagination controls...');
    const paginationSelectors = [
      'select.irm_paginator_limit',
      'select[name="limit"]',
      'select[name*="limit"]',
      '.pagination select',
      'select.form-control',
      'select[name="per_page"]',
      'select[name*="per_page"]'
    ];

    let paginationChanged = false;
    for (const selector of paginationSelectors) {
      try {
        const selectElement = await page.$(selector);
        if (selectElement) {
          console.log(`🎯 Found pagination select: ${selector}`);

          // Get all options and find the one with highest value (All, 1000, 500, etc.)
          const options = await page.$$eval(`${selector} option`, opts =>
            opts.map(opt => ({
              value: opt.value,
              text: opt.textContent.trim()
            })).sort((a, b) => {
              // Sort by numeric value descending, prefer "All" or "-1"
              if (a.value === '-1' || a.text.toLowerCase().includes('all')) return -1;
              if (b.value === '-1' || b.text.toLowerCase().includes('all')) return 1;
              return parseInt(b.value || 0) - parseInt(a.value || 0);
            })
          );

          if (options.length > 0) {
            const bestOption = options[0];
            console.log(`📊 Selecting option: "${bestOption.text}" (value: ${bestOption.value})`);

            // Select the option
            await page.select(selector, bestOption.value);
            console.log('✅ Changed pagination to show all results');

            // Wait for the page to reload with more results
            await page.waitForTimeout(3000);

            // Take debug screenshot after pagination change
            try {
              await page.screenshot({ path: 'debug-fu-list-view.png', fullPage: false });
              console.log('📸 Debug screenshot saved: debug-fu-list-view.png');
            } catch (screenshotError) {
              console.log(`⚠️ Pagination screenshot failed: ${screenshotError.message}`);
            }

            paginationChanged = true;
            break;
          }
        }
      } catch (e) {
        console.log(`⚠️ Failed to handle pagination ${selector}: ${e.message}`);
      }
    }

    if (!paginationChanged) {
      console.log('ℹ️ No pagination controls found, proceeding with current results');
    }

    // 3.6. Expand Country Sections (Crucial for seeing individual partners)
    console.log('🔄 Expanding country sections to reveal individual partners...');
    const expandableSections = await page.$$('.navigation-list li, [class*="expandable"], [class*="collapsible"]');
    console.log(`🎯 Found ${expandableSections.length} potentially expandable sections`);

    for (let i = 0; i < expandableSections.length; i++) {
      try {
        const section = expandableSections[i];
        // Check if this section has partner count text
        const sectionText = await section.evaluate(el => el.textContent?.trim() || '');
        if (sectionText.includes('Partnerhochschulen') || sectionText.includes('Institutions')) {
          console.log(`📂 Expanding section ${i + 1}/${expandableSections.length}: ${sectionText.substring(0, 50)}...`);
          await section.click();

          // Wait longer for AJAX content to load
          await new Promise(r => setTimeout(r, 1000));

          // Check if new content appeared
          const newElements = await page.$$eval('li, div, a', els => els.length);
          console.log(`📊 Elements after expanding section ${i + 1}: ${newElements}`);
        }
      } catch (e) {
        console.log(`⚠️ Failed to expand section ${i + 1}: ${e.message}`);
      }
    }

    console.log('✅ Finished expanding country sections');

    // Wait for all AJAX requests to complete after expansions
    console.log('⏳ Waiting for AJAX content to load after expansions...');
    await new Promise(r => setTimeout(r, 3000));

    // Check final page state
    const finalState = await page.evaluate(() => {
      const allText = document.body.textContent;
      const universityCount = (allText.match(/\buniversity\b/gi) || []).length +
                             (allText.match(/\buniversität\b/gi) || []).length +
                             (allText.match(/\bhochschule\b/gi) || []).length;
      return {
        totalTextLength: allText.length,
        universityMentions: universityCount,
        totalElements: document.querySelectorAll('*').length
      };
    });
    console.log('📊 Final page state after expansions:', finalState);

    // Note: List view switching removed - expansion logic handles the display

    // 3.7. Maximize Pagination (NOW that we're in list view)
    console.log('🔢 Looking for pagination controls in list view...');
    let maxPaginationChanged = false;
    for (const selector of paginationSelectors) {
      try {
        const selectElement = await page.$(selector);
        if (selectElement) {
          console.log(`🎯 Found pagination select in list view: ${selector}`);

          // Get all options
          const options = await page.$$eval(`${selector} option`, opts =>
            opts.map(opt => ({
              value: opt.value,
              text: opt.textContent.trim()
            })).sort((a, b) => {
              // Prioritize "All" options, then highest numeric values
              if (a.value === '0' || a.value === '-1' || a.text.toLowerCase().includes('all')) return -1;
              if (b.value === '0' || b.value === '-1' || b.text.toLowerCase().includes('all')) return 1;
              return parseInt(b.value || 0) - parseInt(a.value || 0);
            })
          );

          if (options.length > 0) {
            const bestOption = options[0];
            console.log(`📊 Selecting maximum pagination: "${bestOption.text}" (value: ${bestOption.value})`);

            // Select the option
            await page.select(selector, bestOption.value);
            console.log('✅ Changed pagination to maximum results');

            // Wait for the table to reload with all results
            await new Promise(r => setTimeout(r, 5000)); // Longer wait for large result sets

            // Take debug screenshot of the full list
            try {
              await page.screenshot({ path: 'debug-fu-list-view.png', fullPage: false });
              console.log('📸 Full list screenshot saved: debug-fu-list-view.png');
            } catch (screenshotError) {
              console.log(`⚠️ List view screenshot failed: ${screenshotError.message}`);
            }

            maxPaginationChanged = true;
            break;
          }
        }
      } catch (e) {
        console.log(`⚠️ Failed to handle pagination ${selector}: ${e.message}`);
      }
    }

    if (!maxPaginationChanged) {
      console.log('ℹ️ No pagination controls found in list view');
    }

    // 4. Visual Debugging - Take screenshot before extraction
    console.log('📸 Taking screenshot before extraction...');
    try {
      await page.screenshot({ path: 'debug-fu-before-extract.png', fullPage: false });
      console.log('✅ Screenshot saved: debug-fu-before-extract.png');
    } catch (screenshotError) {
      console.log(`⚠️ Screenshot failed: ${screenshotError.message}`);
    }

    // 5. Extraction - First, analyze page structure
    console.log('🔍 Analyzing page structure after search...');
    const pageAnalysis = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      const tableRows = document.querySelectorAll('tr');
      const divs = document.querySelectorAll('div');
      const lists = document.querySelectorAll('ul, ol');
      const buttons = document.querySelectorAll('button, a[role="button"]');

      // Look for specific MoveOn elements
      const irmElements = document.querySelectorAll('[class*="irm"]');
      const resultElements = document.querySelectorAll('[class*="result"]');
      const partnerElements = document.querySelectorAll('[class*="partner"]');

      // Check for specific text content
      const bodyText = document.body.textContent;
      const hasPartners = bodyText.toLowerCase().includes('university') ||
                         bodyText.toLowerCase().includes('universität') ||
                         bodyText.toLowerCase().includes('college') ||
                         bodyText.toLowerCase().includes('school');

      return {
        tables: tables.length,
        tableRows: tableRows.length,
        divs: divs.length,
        lists: lists.length,
        buttons: buttons.length,
        irmElements: irmElements.length,
        resultElements: resultElements.length,
        partnerElements: partnerElements.length,
        bodyTextLength: bodyText.length,
        hasPartners: hasPartners,
        url: window.location.href,
        title: document.title
      };
    });

    console.log('📊 Page analysis:', pageAnalysis);

    // Look for any view toggle buttons
    console.log('🔍 Looking for view toggle buttons...');
    const toggleButtons = await page.$$eval('button, a', elements =>
      elements.map(el => ({
        tag: el.tagName,
        text: el.innerText?.trim().substring(0, 30),
        class: el.className,
        title: el.title,
        href: el.href?.substring(0, 50)
      })).filter(btn =>
        btn.text?.toLowerCase().includes('list') ||
        btn.text?.toLowerCase().includes('table') ||
        btn.text?.toLowerCase().includes('map') ||
        btn.text?.toLowerCase().includes('karte') ||
        btn.class?.includes('fa-list') ||
        btn.class?.includes('fa-table') ||
        btn.class?.includes('fa-map')
      )
    );

    if (toggleButtons.length > 0) {
      console.log('🎯 Found potential view toggle buttons:', toggleButtons);
    } else {
      console.log('ℹ️ No obvious view toggle buttons found');
    }

    // 5. Panic Save - Save full HTML for debugging
    console.log('💾 Saving full HTML for debugging...');
    const fullHtml = await page.content();
    fs.writeFileSync('debug-fu-full.html', fullHtml);
    console.log('✅ Full HTML saved to debug-fu-full.html');

    // 5. Extraction - Combined Anchor + Class Strategy
    console.log('🔍 Extracting partners using combined strategy...');
    const partners = await page.evaluate(() => {
      const results = [];

      // Strategy 1: Anchor-based extraction - find university links
      const allLinks = document.querySelectorAll('a[href]');
      console.log(`🔗 Found ${allLinks.length} total links`);

      // Filter for external university website links (exclude internal/navigation links)
      allLinks.forEach(link => {
        const href = link.href || '';
        const text = link.textContent?.trim() || '';

        // Skip internal links
        if (!href.includes('moveon4.de') &&
            !href.includes('fu-berlin.de') &&
            !href.includes('google') &&
            !href.includes('facebook') &&
            !href.includes('twitter') &&
            !href.includes('javascript:') &&
            !href.startsWith('#') &&
            href.length > 10 &&
            text.length > 3 &&
            text.length < 200) {

          // Look for university-like names
          const isUniversityLink = text.toLowerCase().includes('university') ||
                                  text.toLowerCase().includes('universität') ||
                                  text.toLowerCase().includes('universidad') ||
                                  text.toLowerCase().includes('université') ||
                                  text.toLowerCase().includes('università') ||
                                  text.toLowerCase().includes('college') ||
                                  text.toLowerCase().includes('school') ||
                                  text.toLowerCase().includes('institute') ||
                                  text.toLowerCase().includes('hochschule') ||
                                  text.toLowerCase().includes('technische') ||
                                  text.toLowerCase().includes('polytechnic') ||
                                  text.toLowerCase().includes('academy') ||
                                  text.toLowerCase().includes('facult') ||
                                  // Check for common university indicators
                                  /\b(universit|universidad|université|università|hochschule|technische|polytechn|academy|facult)\b/i.test(text);

          if (isUniversityLink) {
            results.push({
              name: text,
              country: 'N/A',
              city: 'N/A',
              website: href,
              home_university: 'FU Berlin'
            });
          }
        }
      });

      // Strategy 2: Class-based extraction for any remaining content
      if (results.length < 10) {
        // Look for generic report classes
        const classSelectors = [
          'div.irm_org_list_item',
          'div.institution',
          'div.report-row',
          'div[class*="result"]',
          'div[class*="partner"]',
          'div[class*="university"]',
          'div[class*="item"]'
        ];

        for (const selector of classSelectors) {
          try {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              console.log(`🎯 Found ${elements.length} elements with selector: ${selector}`);
              elements.forEach((element, index) => {
                try {
                  const text = element.textContent?.trim() || '';
                  const links = element.querySelectorAll('a[href]');

                  if (text.length > 5 && text.length < 300 &&
                      (text.toLowerCase().includes('university') ||
                       text.toLowerCase().includes('universität') ||
                       text.toLowerCase().includes('hochschule'))) {
                    results.push({
                      name: text.split(',')[0]?.trim() || text.split('\n')[0]?.trim() || 'N/A',
                      country: 'N/A',
                      city: 'N/A',
                      website: links.length > 0 ? links[0].href : '',
                      home_university: 'FU Berlin'
                    });
                  }
                } catch (error) {
                  // Skip problematic elements
                }
              });
              break;
            }
          } catch (e) {
            // Invalid selector, continue
          }
        }
      }

      // Remove duplicates and filter
      const uniqueResults = results.filter((item, index, self) =>
        index === self.findIndex(other =>
          other.name.toLowerCase() === item.name.toLowerCase()
        )
      );

      console.log(`✅ Extracted ${uniqueResults.length} partners from combined strategy`);
      return uniqueResults.filter(p =>
        p.name !== 'N/A' &&
        p.name.length > 2 &&
        !p.name.toLowerCase().includes('select') &&
        !p.name.toLowerCase().includes('filter')
      );
    });


    // 5. Output
    console.log(`✅ Success: Found ${partners.length} partners`);
    fs.writeFileSync('partners_fu.json', JSON.stringify(partners, null, 2));
    console.log('💾 Results saved to partners_fu.json');

  } catch (error) {
    console.error('❌ Scraper failed:', error.message);
  } finally {
    await browser.close();
    console.log('🔚 Browser closed');
  }
}

// Run the scraper
scrapeFU();