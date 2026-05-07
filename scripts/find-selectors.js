console.log("🔍 FINDING UNIVERSITY LIST ITEM SELECTORS");
console.log("==========================================");

// Load dependencies
console.log("📦 Loading dependencies...");
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

console.log("📄 Reading debug_list_view.html...");
const htmlFilePath = path.join(__dirname, '..', 'debug_list_view.html');

if (!fs.existsSync(htmlFilePath)) {
  console.error(`❌ File not found: ${htmlFilePath}`);
  console.error("💡 Make sure to run step1-scrape-local.js first to generate the HTML.");
  process.exit(1);
}

const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
console.log(`✅ Loaded ${htmlContent.length} characters of HTML`);

// Load HTML into cheerio
console.log("🔧 Loading HTML into cheerio parser...");
const $ = cheerio.load(htmlContent);

console.log("🔍 Analyzing HTML structure for university list items...");

// STRATEGY: Find elements containing "University" or "Australia", then traverse up to find the list item container
console.log("🎯 Looking for elements containing 'University' or 'Australia'...");

// Find elements containing university-related text
const universityElements = $('*').filter((i, el) => {
  const text = $(el).text().toLowerCase();
  return text.includes('university') ||
         text.includes('universität') ||
         text.includes('australia');
});

console.log(`📍 Found ${universityElements.length} elements containing university/country text`);

if (universityElements.length === 0) {
  console.log("❌ No elements found containing university or country text");
  process.exit(1);
}

// Find the list item container by traversing up from university elements
console.log("🔍 Traversing up to find list item container...");

let listItemContainer = null;

universityElements.each((i, el) => {
  if (listItemContainer) return; // Already found

  let current = $(el);
  let depth = 0;

  // Traverse up the DOM tree (max 8 levels)
  while (current.length > 0 && depth < 8) {
    const tagName = current.prop('tagName');
    const className = current.attr('class') || '';

    // Look for container patterns that indicate a list item
    if (tagName === 'DIV' &&
        (className.includes('_university_block') ||
         className.includes('university') ||
         className.includes('card') ||
         className.includes('item') ||
         className.includes('media') ||
         className.includes('row'))) {

      // Check if this element contains university data and has reasonable size
      const textContent = current.text();
      const hasUniversityData = textContent.toLowerCase().includes('university') ||
                               textContent.toLowerCase().includes('universität');

      if (hasUniversityData && textContent.length > 100 && textContent.length < 5000) {
        listItemContainer = current;
        console.log(`✅ Found list item container: ${tagName}.${className} (depth: ${depth})`);
        break;
      }
    }

    current = current.parent();
    depth++;
  }
});

// OUTPUT: Show the list item container structure
console.log("\n📊 ANALYSIS RESULTS");
console.log("==================");

if (listItemContainer) {
  const className = listItemContainer.attr('class') || 'none';
  console.log(`🔎 Found potential item container with class: ${className}`);

  console.log("\n📄 HTML Structure:");
  console.log("==================");

  // Show the full HTML of the container
  const html = listItemContainer.html();
  console.log(html);

  // Also show some key information about the structure
  console.log("\n📋 STRUCTURE ANALYSIS:");
  console.log("=====================");

  const textContent = listItemContainer.text();
  console.log(`Text length: ${textContent.length} characters`);
  console.log(`Child elements: ${listItemContainer.children().length}`);

  // Look for university name
  const univName = listItemContainer.find('._univname, .university-name, [class*="name"]').first();
  if (univName.length > 0) {
    console.log(`🏛️  University Name: "${univName.text().trim()}"`);
  }

  // Look for city
  const cityElements = listItemContainer.find('*').filter((i, el) => {
    return $(el).text().toLowerCase().includes('sydney') ||
           $(el).text().toLowerCase().includes('canberra') ||
           $(el).parent().text().toLowerCase().includes('city');
  });

  if (cityElements.length > 0) {
    console.log(`🏙️  City found in element: ${cityElements.first().text().trim()}`);
  }

} else {
  console.log("❌ No suitable list item container found");
  console.log("💡 The HTML structure might be different than expected");
}

// Additional analysis
console.log("\n📈 ADDITIONAL ANALYSIS");
console.log("=====================");

// Count total university blocks
const universityBlocks = $('div[class*="_university_block"]');
console.log(`🏛️  University blocks found: ${universityBlocks.length}`);

// Count elements with university text
const universityTextElements = $('*').filter((i, el) => {
  const text = $(el).text().toLowerCase();
  return text.includes('university') || text.includes('universität');
});
console.log(`📝 Elements with university text: ${universityTextElements.length}`);

console.log("\n🎯 USAGE");
console.log("=======");
console.log("Use the class name and HTML structure above to create your final parser.");
console.log("Example selector: $('." + (listItemContainer ? listItemContainer.attr('class').split(' ')[0] : '_university_block') + "')");

console.log("\n🏁 Selector analysis completed!");