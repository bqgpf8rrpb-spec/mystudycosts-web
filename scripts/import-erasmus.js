#!/usr/bin/env node

/**
 * Erasmus Partner Import Script
 * 
 * This script imports Erasmus partnership data from JSON/CSV exports (e.g., from Moveon)
 * and creates a standardized database structure.
 * 
 * Usage:
 *   node scripts/import-erasmus.js [input-file.json|csv]
 * 
 * If no input file is provided, the script will generate sample data for the 5 largest
 * German universities (TUM, LMU, HU Berlin, RWTH Aachen, Köln) with 50-100 partners each.
 * 
 * Output:
 *   Creates/updates src/data/erasmus_partners.json
 */

const fs = require('fs');
const path = require('path');

// Cost index mapping for major European cities (base monthly living cost index)
// Higher index = more expensive city
const COST_INDEX_BY_CITY = {
  // Switzerland (very expensive)
  'Zurich': 1400,
  'Geneva': 1350,
  'Basel': 1200,
  'Lausanne': 1250,
  'Bern': 1150,
  
  // UK (expensive)
  'London': 1300,
  'Oxford': 1150,
  'Cambridge': 1100,
  'Edinburgh': 1000,
  'Manchester': 900,
  'Birmingham': 850,
  'Bristol': 950,
  'Glasgow': 900,
  'Leeds': 850,
  
  // Scandinavia (expensive)
  'Copenhagen': 1200,
  'Oslo': 1300,
  'Stockholm': 1150,
  'Helsinki': 1050,
  'Gothenburg': 1000,
  'Aarhus': 950,
  
  // Netherlands (moderate-high)
  'Amsterdam': 1100,
  'Rotterdam': 950,
  'Utrecht': 900,
  'The Hague': 1000,
  'Groningen': 800,
  'Eindhoven': 850,
  'Leiden': 950,
  'Delft': 900,
  
  // France (moderate-high)
  'Paris': 1200,
  'Lyon': 900,
  'Toulouse': 850,
  'Nice': 1000,
  'Nantes': 800,
  'Montpellier': 850,
  'Strasbourg': 850,
  'Bordeaux': 900,
  'Marseille': 850,
  'Grenoble': 850,
  
  // Belgium (moderate-high)
  'Brussels': 1000,
  'Ghent': 850,
  'Antwerp': 900,
  'Leuven': 900,
  'Louvain': 900,
  
  // Austria (moderate-high)
  'Vienna': 1000,
  'Graz': 800,
  'Innsbruck': 850,
  'Salzburg': 900,
  
  // Italy (moderate)
  'Milan': 1100,
  'Rome': 1000,
  'Florence': 950,
  'Bologna': 850,
  'Turin': 800,
  'Naples': 750,
  'Venice': 1000,
  'Padua': 850,
  'Pisa': 850,
  'Siena': 900,
  'Verona': 850,
  
  // Spain (moderate)
  'Madrid': 900,
  'Barcelona': 950,
  'Valencia': 750,
  'Seville': 700,
  'Bilbao': 800,
  'Granada': 650,
  'Salamanca': 700,
  'Santiago de Compostela': 700,
  
  // Portugal (moderate-low)
  'Lisbon': 800,
  'Porto': 700,
  'Coimbra': 650,
  'Braga': 600,
  
  // Germany (for reference)
  'Munich': 850,
  'Berlin': 750,
  'Hamburg': 750,
  'Frankfurt': 800,
  'Cologne': 700,
  'Stuttgart': 750,
  'Aachen': 650,
  
  // Czech Republic (low-moderate)
  'Prague': 700,
  'Brno': 600,
  'Olomouc': 550,
  
  // Poland (low)
  'Warsaw': 650,
  'Krakow': 600,
  'Wroclaw': 550,
  'Gdansk': 550,
  'Poznan': 550,
  'Lublin': 500,
  
  // Hungary (low)
  'Budapest': 650,
  'Debrecen': 500,
  'Szeged': 550,
  
  // Romania (low)
  'Bucharest': 550,
  'Cluj-Napoca': 500,
  'Timisoara': 450,
  
  // Bulgaria (low)
  'Sofia': 500,
  'Plovdiv': 450,
  
  // Croatia (low-moderate)
  'Zagreb': 650,
  'Split': 600,
  'Rijeka': 550,
  
  // Greece (low-moderate)
  'Athens': 700,
  'Thessaloniki': 650,
  
  // Cyprus (moderate)
  'Nicosia': 750,
  'Limassol': 800,
  
  // Malta (moderate)
  'Valletta': 850,
  'Msida': 850,
  
  // Ireland (moderate-high)
  'Dublin': 1100,
  'Cork': 900,
  'Galway': 850,
  
  // Estonia (moderate)
  'Tallinn': 700,
  'Tartu': 600,
  
  // Latvia (low-moderate)
  'Riga': 650,
  
  // Lithuania (low-moderate)
  'Vilnius': 600,
  'Kaunas': 550,
  
  // Slovenia (moderate)
  'Ljubljana': 750,
  'Maribor': 650,
  
  // Slovakia (low-moderate)
  'Bratislava': 650,
  'Kosice': 550,
  
  // Luxembourg (expensive)
  'Luxembourg': 1200,
  
  // Iceland (expensive)
  'Reykjavik': 1100,
  
  // Denmark (for reference)
  'Aalborg': 900,
  'Odense': 900,
  
  // Finland (for reference)
  'Tampere': 950,
  'Turku': 900,
  'Oulu': 850,
  
  // Sweden (for reference)
  'Uppsala': 1000,
  'Lund': 950,
  'Linköping': 900,
  
  // Norway (for reference)
  'Bergen': 1200,
  'Trondheim': 1100,
};

// Major European universities by city
const UNIVERSITIES_BY_CITY = {
  'Zurich': ['ETH Zurich', 'University of Zurich'],
  'Geneva': ['University of Geneva'],
  'London': ['University College London', 'Imperial College London', 'King\'s College London', 'London School of Economics'],
  'Oxford': ['University of Oxford'],
  'Cambridge': ['University of Cambridge'],
  'Edinburgh': ['University of Edinburgh', 'Heriot-Watt University'],
  'Paris': ['Sorbonne University', 'Paris-Saclay University', 'Sciences Po', 'École Polytechnique'],
  'Amsterdam': ['University of Amsterdam', 'VU Amsterdam'],
  'Copenhagen': ['University of Copenhagen'],
  'Stockholm': ['Stockholm University', 'KTH Royal Institute of Technology'],
  'Vienna': ['University of Vienna', 'Vienna University of Technology'],
  'Milan': ['Bocconi University', 'University of Milan', 'Politecnico di Milano'],
  'Madrid': ['Complutense University of Madrid', 'Autonomous University of Madrid', 'IE University'],
  'Barcelona': ['University of Barcelona', 'Autonomous University of Barcelona', 'Pompeu Fabra University'],
  // ... add more as needed
};

// Subject areas
const SUBJECT_AREAS = [
  'Computer Science',
  'Business Administration',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Medicine',
  'Law',
  'Economics',
  'International Relations',
  'Psychology',
  'Biology',
  'Chemistry',
  'Physics',
  'Mathematics',
  'Architecture',
  'Civil Engineering',
  'Political Science',
  'Sociology',
  'History',
  'Philosophy',
  'Linguistics',
  'Art History',
  'Design',
  'Media Studies',
  'Environmental Science',
  'Biotechnology',
];

// German universities (top 5)
const GERMAN_UNIVERSITIES = {
  'TUM': {
    name: 'Technical University of Munich (TUM)',
    city: 'Munich',
    id: 'TUM',
  },
  'LMU': {
    name: 'Ludwig Maximilian University of Munich (LMU)',
    city: 'Munich',
    id: 'LMU',
  },
  'HU_BERLIN': {
    name: 'Humboldt University of Berlin',
    city: 'Berlin',
    id: 'HU_BERLIN',
  },
  'RWTH_AACHEN': {
    name: 'RWTH Aachen University',
    city: 'Aachen',
    id: 'RWTH_AACHEN',
  },
  'UNI_KOELN': {
    name: 'University of Cologne',
    city: 'Cologne',
    id: 'UNI_KOELN',
  },
};

/**
 * Generate sample data for a German university
 */
function generateSamplePartners(germanUniId, count = 75) {
  const partners = [];
  const cities = Object.keys(COST_INDEX_BY_CITY).filter(city => 
    !['Munich', 'Berlin', 'Aachen', 'Cologne'].includes(city) // Exclude German cities
  );
  
  // Get subset of cities (diverse selection)
  const selectedCities = [];
  const cityIndices = new Set();
  while (selectedCities.length < Math.min(count, cities.length)) {
    const index = Math.floor(Math.random() * cities.length);
    if (!cityIndices.has(index)) {
      cityIndices.add(index);
      selectedCities.push(cities[index]);
    }
  }
  
  selectedCities.forEach((city, index) => {
    const country = getCountryFromCity(city);
    const unis = UNIVERSITIES_BY_CITY[city] || [`University of ${city}`];
    const uniName = unis[Math.floor(Math.random() * unis.length)];
    const subject = SUBJECT_AREAS[Math.floor(Math.random() * SUBJECT_AREAS.length)];
    const costIndex = COST_INDEX_BY_CITY[city];
    
    partners.push({
      id: `${germanUniId}_${index + 1}`,
      german_uni_id: germanUniId,
      partner_uni_name: uniName,
      partner_city: city,
      partner_country: country,
      subject_area: subject,
      erasmus_code: generateErasmusCode(country, city),
      cost_index: costIndex,
    });
  });
  
  return partners;
}

/**
 * Get country name from city name
 */
function getCountryFromCity(city) {
  const mapping = {
    'Zurich': 'Switzerland',
    'Geneva': 'Switzerland',
    'Basel': 'Switzerland',
    'Lausanne': 'Switzerland',
    'Bern': 'Switzerland',
    'London': 'United Kingdom',
    'Oxford': 'United Kingdom',
    'Cambridge': 'United Kingdom',
    'Edinburgh': 'United Kingdom',
    'Manchester': 'United Kingdom',
    'Birmingham': 'United Kingdom',
    'Bristol': 'United Kingdom',
    'Glasgow': 'United Kingdom',
    'Leeds': 'United Kingdom',
    'Copenhagen': 'Denmark',
    'Oslo': 'Norway',
    'Stockholm': 'Sweden',
    'Helsinki': 'Finland',
    'Amsterdam': 'Netherlands',
    'Rotterdam': 'Netherlands',
    'Utrecht': 'Netherlands',
    'Paris': 'France',
    'Lyon': 'France',
    'Toulouse': 'France',
    'Brussels': 'Belgium',
    'Vienna': 'Austria',
    'Milan': 'Italy',
    'Rome': 'Italy',
    'Madrid': 'Spain',
    'Barcelona': 'Spain',
    'Lisbon': 'Portugal',
    'Prague': 'Czech Republic',
    'Warsaw': 'Poland',
    'Budapest': 'Hungary',
    'Bucharest': 'Romania',
    'Sofia': 'Bulgaria',
    'Zagreb': 'Croatia',
    'Athens': 'Greece',
    'Dublin': 'Ireland',
    'Tallinn': 'Estonia',
    'Riga': 'Latvia',
    'Vilnius': 'Lithuania',
    'Ljubljana': 'Slovenia',
    'Bratislava': 'Slovakia',
    'Luxembourg': 'Luxembourg',
    'Reykjavik': 'Iceland',
    'Nicosia': 'Cyprus',
    'Valletta': 'Malta',
  };
  
  // Try direct mapping first
  if (mapping[city]) return mapping[city];
  
  // Fallback: try to infer from common patterns
  if (city.includes('London') || city.includes('Manchester') || city.includes('Birmingham')) return 'United Kingdom';
  if (city.includes('Paris') || city.includes('Lyon') || city.includes('Nice')) return 'France';
  if (city.includes('Madrid') || city.includes('Barcelona') || city.includes('Valencia')) return 'Spain';
  if (city.includes('Rome') || city.includes('Milan') || city.includes('Florence')) return 'Italy';
  if (city.includes('Warsaw') || city.includes('Krakow') || city.includes('Poznan')) return 'Poland';
  
  return 'Unknown';
}

/**
 * Generate a realistic Erasmus code (format: Country code + city initials)
 */
function generateErasmusCode(country, city) {
  const countryCodes = {
    'Switzerland': 'CH',
    'United Kingdom': 'UK',
    'France': 'FR',
    'Netherlands': 'NL',
    'Denmark': 'DK',
    'Sweden': 'SE',
    'Norway': 'NO',
    'Finland': 'FI',
    'Austria': 'AT',
    'Belgium': 'BE',
    'Italy': 'IT',
    'Spain': 'ES',
    'Portugal': 'PT',
    'Czech Republic': 'CZ',
    'Poland': 'PL',
    'Hungary': 'HU',
    'Romania': 'RO',
    'Bulgaria': 'BG',
    'Croatia': 'HR',
    'Greece': 'GR',
    'Cyprus': 'CY',
    'Malta': 'MT',
    'Ireland': 'IE',
    'Estonia': 'EE',
    'Latvia': 'LV',
    'Lithuania': 'LT',
    'Slovenia': 'SI',
    'Slovakia': 'SK',
    'Luxembourg': 'LU',
    'Iceland': 'IS',
  };
  
  const code = countryCodes[country] || 'XX';
  const cityInit = city.substring(0, 3).toUpperCase();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `${code} ${cityInit}${random}`;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const inputFile = args[0];
  
  const outputPath = path.join(__dirname, '../src/data/erasmus_partners.json');
  const outputDir = path.dirname(outputPath);
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  let database = {
    universities: {},
  };
  
  if (inputFile && fs.existsSync(inputFile)) {
    // TODO: Import from JSON/CSV file
    console.log(`Importing from ${inputFile}...`);
    console.log('CSV/JSON import not yet implemented. Generating sample data instead.');
  }
  
  // Generate sample data for top 5 German universities
  console.log('Generating sample data for top 5 German universities...');
  
  Object.values(GERMAN_UNIVERSITIES).forEach(uni => {
    const partnerCount = 50 + Math.floor(Math.random() * 51); // 50-100 partners
    const partners = generateSamplePartners(uni.id, partnerCount);
    
    database.universities[uni.id] = {
      name: uni.name,
      city: uni.city,
      partners: partners,
    };
    
    console.log(`  ✓ ${uni.name}: ${partners.length} partners`);
  });
  
  // Write to file
  fs.writeFileSync(outputPath, JSON.stringify(database, null, 2), 'utf8');
  console.log(`\n✓ Database created: ${outputPath}`);
  console.log(`✓ Total universities: ${Object.keys(database.universities).length}`);
  
  const totalPartners = Object.values(database.universities).reduce(
    (sum, uni) => sum + uni.partners.length, 0
  );
  console.log(`✓ Total partners: ${totalPartners}`);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { 
  generateSamplePartners, 
  COST_INDEX_BY_CITY, 
  getCountryFromCity,
  GERMAN_UNIVERSITIES,
  SUBJECT_AREAS,
};

