console.log("🔍 TESTING HTML PARSER FOR TUM MOVEON DATA");
console.log("=============================================");

// Load dependencies
console.log("📦 Loading dependencies...");
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

console.log("📄 Reading debug_page.html...");
const htmlFilePath = path.join(__dirname, '..', 'debug_page.html');

if (!fs.existsSync(htmlFilePath)) {
  console.error(`❌ File not found: ${htmlFilePath}`);
  console.error("💡 Make sure to run step1-scrape-local.js first to capture the HTML.");
  process.exit(1);
}

const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
console.log(`✅ Loaded ${htmlContent.length} characters of HTML`);

// Load HTML into cheerio
console.log("🔧 Loading HTML into cheerio parser...");
const $ = cheerio.load(htmlContent);

console.log("🔍 Analyzing HTML structure...");

// Try different selectors to find university data
const selectorsToTry = [
  '.cv_list_item',           // Very common for MoveOn
  '.search-result-item',     // Common search result item
  '.list-group-item',        // Bootstrap list group items
  '.card',                   // Card-based layouts
  '.university-item',        // University-specific class
  '.partner-item',          // Partner-specific class
  '.institution-item',      // Institution-specific class
  '[class*="university"]',  // Any class containing "university"
  '[class*="partner"]',     // Any class containing "partner"
  '[class*="institution"]', // Any class containing "institution"
  'div[class*="row"]',      // Row-based layouts
  '.col-md-12',             // Bootstrap columns
  '.col-lg-12'
];

let foundElements = [];
let usedSelector = 'none';

console.log("🔍 Trying different selectors to find university data...");

for (const selector of selectorsToTry) {
  const elements = $(selector);
  console.log(`🔘 Selector "${selector}": Found ${elements.length} elements`);

  if (elements.length > 0 && elements.length < 100) { // Reasonable number of results
    // Convert cheerio object to array of cheerio objects
    foundElements = elements.toArray().map(el => $(el));
    usedSelector = selector;
    console.log(`✅ Using selector "${selector}" with ${foundElements.length} elements`);
    break;
  }
}

// If no specific selectors worked, look for elements containing "University"
if (foundElements.length === 0) {
  console.log("🔍 No specific selectors worked, looking for elements containing 'University'...");

  // Find elements containing "University" text
  const universityElements = $('*').filter((i, el) => {
    const text = $(el).text().toLowerCase();
    return text.includes('university') ||
           text.includes('universität') ||
           text.includes('universite') ||
           text.includes('universidad') ||
           text.includes('università');
  });

  if (universityElements.length > 0) {
    console.log(`🎯 Found ${universityElements.length} elements containing university text`);

    // Get the closest meaningful parent containers
    const containers = new Set();
    universityElements.each((i, el) => {
      // Try to find a meaningful parent container
      let parent = $(el).parent();
      for (let depth = 0; depth < 5 && parent.length > 0; depth++) {
        const className = parent.attr('class') || '';
        if (className.includes('card') ||
            className.includes('item') ||
            className.includes('row') ||
            className.includes('col') ||
            parent.is('div, article, section')) {
          containers.add(parent);
          break;
        }
        parent = parent.parent();
      }
    });

    foundElements = Array.from(containers).map(el => $(el)); // Convert to cheerio objects
    usedSelector = 'university-text-containers';
    console.log(`✅ Found ${foundElements.length} university containers`);
  }
}

// Extract university names from found elements
console.log("📝 Extracting university names...");

const extractedNames = [];

foundElements.forEach((element, index) => {
  const $el = $(element);

  // Try different selectors for university names within each element
  const nameSelectors = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',  // Headings
    '.cv_title', '.title', '.name',       // Common title classes
    '.university-name', '.partner-name', // Specific name classes
    '.institution-name',                  // Institution name
    'strong', 'b',                       // Bold text
    '.card-title',                       // Card titles
    'a[href]'                            // Links (often contain names)
  ];

  let universityName = '';

  for (const nameSel of nameSelectors) {
    const nameElement = $el.find(nameSel).first();
    if (nameElement.length > 0) {
      const text = nameElement.text().trim();
      if (text.length > 3 && text.length < 200) { // Reasonable length
        universityName = text;
        break;
      }
    }
  }

  // Fallback: Use the element's own text if no specific selector worked
  if (!universityName) {
    const elementText = $el.text().trim();
    const lines = elementText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    for (const line of lines) {
      if (line.length > 10 && line.length < 150) {
        // Look for lines that might be university names
        if (line.toLowerCase().includes('university') ||
            line.toLowerCase().includes('universität') ||
            line.toLowerCase().includes('universite') ||
            line.toLowerCase().includes('universidad') ||
            line.toLowerCase().includes('università')) {
          universityName = line;
          break;
        }
      }
    }
  }

  if (universityName) {
    extractedNames.push({
      index: index + 1,
      name: universityName,
      html: $el.html().substring(0, 200) + '...' // First 200 chars of HTML
    });
  }
});

// Output results
console.log("\n📊 PARSER RESULTS");
console.log("=================");

if (foundElements.length === 0) {
  console.log("❌ No university data found with any selector");
  console.log("💡 The HTML might not contain rendered university lists yet.");
  console.log("💡 Try different search terms or check if the page needs more interaction.");
} else {
  console.log(`✅ Found ${foundElements.length} elements using selector: ${usedSelector}`);
  console.log(`✅ Extracted ${extractedNames.length} university names`);

  if (extractedNames.length > 0) {
    console.log("\n🔍 FIRST 3 EXTRACTED UNIVERSITY NAMES:");
    console.log("=====================================");

    extractedNames.slice(0, 3).forEach((item, i) => {
      console.log(`${i + 1}. ${item.name}`);
      console.log(`   HTML Preview: ${item.html}`);
      console.log('');
    });

    if (extractedNames.length > 3) {
      console.log(`📊 ... and ${extractedNames.length - 3} more universities found`);
    }
  } else {
    console.log("⚠️  Found containers but couldn't extract university names");
    console.log("💡 Try different name selectors or check the HTML structure manually");
  }
}

// Additional analysis
console.log("\n🔬 ADDITIONAL ANALYSIS");
console.log("=====================");

// Analyze script tags for university data
console.log("🔍 Analyzing script tags for university data...");
const scriptTags = $('script');
let largeArrays = [];
let potentialData = [];

scriptTags.each((i, script) => {
  const scriptContent = $(script).html();
  if (scriptContent && scriptContent.length > 100) { // Only check substantial scripts

    // Look for variable assignments that might contain university data
    const varMatches = scriptContent.match(/var\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*=\s*(\[[^\[\]]*\]|\{[^{}]*\})/g);
    if (varMatches) {
      varMatches.forEach(varMatch => {
        const varNameMatch = varMatch.match(/var\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
        const valueMatch = varMatch.match(/=\s*(\[.*\]|\{.*\})/s);

        if (varNameMatch && valueMatch) {
          const varName = varNameMatch[1];
          const value = valueMatch[1];

          try {
            const parsed = JSON.parse(value);
            const isArray = Array.isArray(parsed);

            if (isArray && parsed.length > 5) {
              largeArrays.push({
                scriptIndex: i + 1,
                varName: varName,
                array: parsed,
                length: parsed.length
              });
            } else if (!isArray && Object.keys(parsed).length > 3) {
              potentialData.push({
                scriptIndex: i + 1,
                varName: varName,
                object: parsed,
                keys: Object.keys(parsed)
              });
            }
          } catch (e) {
            // Not JSON, skip
          }
        }
      });
    }

    // Also look for potential data in the raw script content
    if (scriptContent.includes('university') || scriptContent.includes('partner') || scriptContent.includes('erasmus')) {
      console.log(`🎯 Script ${i + 1} contains university/partner/erasmus keywords!`);
      // Show a snippet of the relevant content
      const lines = scriptContent.split('\n');
      const relevantLines = lines.filter(line =>
        line.toLowerCase().includes('university') ||
        line.toLowerCase().includes('partner') ||
        line.toLowerCase().includes('erasmus')
      );
      relevantLines.slice(0, 3).forEach((line, idx) => {
        console.log(`   Line ${idx + 1}: ${line.trim().substring(0, 100)}...`);
      });
    }
  }
});

// Report findings
console.log(`\n📊 SCRIPT ANALYSIS RESULTS`);
console.log(`==========================`);
console.log(`📋 Found ${largeArrays.length} large arrays in script variables`);
console.log(`📋 Found ${potentialData.length} substantial objects in script variables`);

if (largeArrays.length > 0) {
  console.log(`\n📊 LARGE ARRAYS FOUND:`);
  largeArrays.forEach((arr, i) => {
    console.log(`   ${i + 1}. Script ${arr.scriptIndex}, var "${arr.varName}": ${arr.length} items`);

    // Try to identify if this looks like university data
    if (arr.array.length > 0 && typeof arr.array[0] === 'object') {
      const sampleKeys = Object.keys(arr.array[0]);
      console.log(`      Sample keys: ${sampleKeys.join(', ')}`);

      if (sampleKeys.some(key => key.toLowerCase().includes('name') || key.toLowerCase().includes('university'))) {
        console.log(`      🎯 LIKELY UNIVERSITY DATA!`);

        // Show first few universities
        arr.array.slice(0, 3).forEach((uni, idx) => {
          const name = uni.name || uni.university || uni.title || Object.values(uni)[0] || 'Unknown';
          console.log(`         ${idx + 1}. ${name}`);
        });
      }
    } else if (arr.array.length > 0 && typeof arr.array[0] === 'string') {
      console.log(`      String array: [${arr.array.slice(0, 3).join(', ')}${arr.array.length > 3 ? '...' : ''}]`);
    }
  });
}

if (potentialData.length > 0) {
  console.log(`\n📊 SUBSTANTIAL OBJECTS FOUND:`);
  potentialData.slice(0, 5).forEach((obj, i) => {
    console.log(`   ${i + 1}. Script ${obj.scriptIndex}, var "${obj.varName}": keys [${obj.keys.join(', ')}]`);
  });
}

// Check for data attributes
console.log("🔍 Checking for data attributes...");
let dataAttributeCount = 0;
$('*').each((i, el) => {
  const attrs = Object.keys($(el).attr() || {});
  const dataAttrs = attrs.filter(attr => attr.startsWith('data-'));
  if (dataAttrs.length > 0) {
    dataAttributeCount++;
  }
});
console.log(`📋 Found ${dataAttributeCount} elements with data attributes`);

// Look for potential AJAX endpoints or API calls
console.log("🔍 Looking for API endpoints or AJAX calls...");
const scriptContent = $('script').text();
const potentialUrls = scriptContent.match(/https?:\/\/[^\s"'<>]+/g) || [];
const apiUrls = potentialUrls.filter(url =>
  url.includes('api') ||
  url.includes('search') ||
  url.includes('partners') ||
  url.includes('universities') ||
  url.includes('data')
);

if (apiUrls.length > 0) {
  console.log(`🔗 Found ${apiUrls.length} potential API endpoints:`);
  apiUrls.slice(0, 5).forEach(url => console.log(`   ${url}`));
  if (apiUrls.length > 5) {
    console.log(`   ... and ${apiUrls.length - 5} more`);
  }
} else {
  console.log("🔗 No obvious API endpoints found in scripts");
}

console.log("\n🏁 Parser analysis completed!");
console.log("💡 If no universities were found, the search might not have triggered results.");
console.log("💡 Try modifying the search interaction in step1-scrape-local.js");