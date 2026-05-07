const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeFU() {
  console.log('🎯 Starting FU Berlin Final Data Extraction...');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

  try {
    // 1. Setup & Navigation
    console.log('🌐 Navigating to report page...');
    await page.goto('https://fuberlin.adv-pub.moveon4.de/report-page-1606/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    // Wait for window.moreinformatics to populate
    console.log('⏳ Waiting 10 seconds for window.moreinformatics...');
    await new Promise(r => setTimeout(r, 10000));

    // 2. Get total length safely
    const dataLength = await page.evaluate(() => {
      try {
        return window.moreinformatics ? window.moreinformatics.length : 0;
      } catch (e) {
        return 0;
      }
    });

    if (dataLength === 0) {
      console.log('❌ window.moreinformatics not found or empty');
      return;
    }

    console.log(`📊 Found ${dataLength} items in window.moreinformatics`);

    // 3. Chunked Extraction (500 items at a time)
    const allPartners = [];
    const chunkSize = 500;

    for (let i = 0; i < dataLength; i += chunkSize) {
      const end = Math.min(i + chunkSize, dataLength);
      console.log(`⬇️ Fetching chunk ${i} - ${end - 1}...`);

      // Fetch chunk and map data
      const chunk = await page.evaluate((start, end) => {
        const partners = [];

        try {
          const data = window.moreinformatics.slice(start, end);

          data.forEach(item => {
            if (!item || typeof item !== 'object') return;

            // Map according to identified structure
            const name = item.universityname || '';
            const country = item.country_fullname || '';

            // Extract city from informatics array
            let city = 'Unknown';

            // Robust city extraction logic
            if (item.informatics && Array.isArray(item.informatics)) {
              // Loop through each informatics entry
              for (const infoEntry of item.informatics) {
                if (infoEntry && typeof infoEntry === 'object' && infoEntry.institutions && Array.isArray(infoEntry.institutions)) {
                  // Look inside institutions array for city
                  const cityInstitution = infoEntry.institutions.find(inst =>
                    inst && typeof inst === 'object' && (inst.shortname === 'City' || inst.shortname === 'Stadt')
                  );

                  if (cityInstitution && cityInstitution.fullname) {
                    city = cityInstitution.fullname;
                    break; // Found it, exit loops
                  }
                }
              }
            }

            // Fallback: Check direct city properties
            if (city === 'Unknown') {
              city = item.city || item.stadt || 'Unknown';
            }

            // Extract subject areas
            let subjectAreas = [];

            if (item.informatics && Array.isArray(item.informatics)) {
              for (const infoEntry of item.informatics) {
                if (infoEntry && typeof infoEntry === 'object' && infoEntry.relations && Array.isArray(infoEntry.relations)) {
                  // Look for subject area relation
                  const subjectRelation = infoEntry.relations.find(relation =>
                    relation &&
                    typeof relation === 'object' &&
                    relation.shortname &&
                    (relation.shortname.includes('Fachrichtung') || relation.shortname.includes('subject area')) &&
                    relation.fullname &&
                    relation.fullname.trim() !== '' &&
                    relation.fullname.trim() !== '-'
                  );

                  if (subjectRelation && subjectRelation.fullname) {
                    const subjectString = subjectRelation.fullname.trim();

                    // Handle special cases (Direktaustausch, alle Fächer)
                    if (subjectString.includes('Direktaustausch') || subjectString.includes('alle Fächer')) {
                      subjectAreas = [subjectString];
                    } else {
                      // Split by "||" delimiter and clean up
                      subjectAreas = subjectString
                        .split('||')
                        .map(area => area.trim())
                        .filter(area => area.length > 0);
                    }
                    break; // Found subject areas, exit loops
                  }
                }
              }
            }

            const lat = item.latitude ? parseFloat(item.latitude) : null;
            const lng = item.longitude ? parseFloat(item.longitude) : null;
            const moveonId = item.relation_id || item.id || `temp_${index}`;

            // Only add if we have a valid name
            if (name && typeof name === 'string' && name.trim().length > 2) {
              partners.push({
                moveon_id: moveonId,
                name: name.trim(),
                city: city,
                country: country ? country.trim() : '',
                website: '', // Not available in map data
                lat: lat,
                lng: lng,
                subject_areas: subjectAreas,
                home_university: 'FU Berlin'
              });
            }
          });
        } catch (e) {
          console.log(`Error processing chunk ${start}-${end}:`, e.message);
        }

        return partners;
      }, i, end);

      allPartners.push(...chunk);
      console.log(`✅ Processed chunk: ${chunk.length} partners (total: ${allPartners.length})`);
    }

    // 4. Final Processing & Output
    if (allPartners.length > 0) {
      console.log(`✅ Success: Extracted ${allPartners.length} FU Berlin partners (no deduplication)`);
      fs.writeFileSync('partners_fu.json', JSON.stringify(allPartners, null, 2));
      console.log('💾 Results saved to partners_fu.json');

      // Show sample
      if (allPartners.length > 0) {
        console.log('📊 Sample partners:');
        for (let i = 0; i < Math.min(5, allPartners.length); i++) {
          const p = allPartners[i];
          console.log(`  ${i + 1}: "${p.name}" (${p.city}, ${p.country}) - ID: ${p.moveon_id}`);
        }
      }
    } else {
      console.log('❌ No valid partners extracted');
    }

  } catch (error) {
    console.error('❌ Scraper failed:', error.message);
  } finally {
    await browser.close();
    console.log('🔚 Browser closed');
  }
}

// Run the scraper
scrapeFU();