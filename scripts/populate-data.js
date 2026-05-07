#!/usr/bin/env node

/**
 * Populate University Programs Data Script
 * 
 * This script generates a comprehensive dataset of German university programs
 * covering all major cities and subjects. Programs are in GERMAN because the
 * API handles translation to English.
 * 
 * Usage:
 *   node scripts/populate-data.js
 * 
 * The script will:
 * 1. Generate 50-100+ programs per major German city
 * 2. Cover all major subjects (Medicine, Law, CS, Business, Engineering, etc.)
 * 3. Use realistic NC thresholds (1.0-3.5 or null)
 * 4. Use realistic semester fees (100-450€)
 * 5. Overwrite data/university_programs.json with the new dataset
 */

const fs = require('fs');
const path = require('path');

// Major German cities with their universities
const CITIES_DATA = [
  // Berlin
  {
    city: 'Berlin',
    universities: [
      'Humboldt-Universität zu Berlin',
      'Freie Universität Berlin',
      'Technische Universität Berlin',
      'Charité - Universitätsmedizin Berlin',
      'Hochschule für Technik und Wirtschaft Berlin',
      'Beuth Hochschule für Technik Berlin',
      'Berlin School of Economics and Law',
    ],
    state: 'Berlin',
    avgSemesterFee: 320,
  },
  // Munich
  {
    city: 'Munich',
    universities: [
      'Technische Universität München',
      'Ludwig-Maximilians-Universität München',
      'Hochschule München',
      'Munich University of Applied Sciences',
    ],
    state: 'Bavaria',
    avgSemesterFee: 387,
  },
  // Hamburg
  {
    city: 'Hamburg',
    universities: [
      'Universität Hamburg',
      'Technische Universität Hamburg',
      'Hochschule für Angewandte Wissenschaften Hamburg',
      'Hamburg University of Applied Sciences',
    ],
    state: 'Hamburg',
    avgSemesterFee: 340,
  },
  // Cologne
  {
    city: 'Cologne',
    universities: [
      'Universität zu Köln',
      'Technische Hochschule Köln',
      'Hochschule Fresenius Köln',
    ],
    state: 'North Rhine-Westphalia',
    avgSemesterFee: 318,
  },
  // Frankfurt
  {
    city: 'Frankfurt',
    universities: [
      'Goethe-Universität Frankfurt',
      'Frankfurt University of Applied Sciences',
      'Frankfurt School of Finance & Management',
    ],
    state: 'Hesse',
    avgSemesterFee: 395,
  },
  // Stuttgart
  {
    city: 'Stuttgart',
    universities: [
      'Universität Stuttgart',
      'Hochschule der Medien Stuttgart',
      'Hochschule für Technik Stuttgart',
    ],
    state: 'Baden-Württemberg',
    avgSemesterFee: 370,
  },
  // Leipzig
  {
    city: 'Leipzig',
    universities: [
      'Universität Leipzig',
      'Hochschule für Technik, Wirtschaft und Kultur Leipzig',
    ],
    state: 'Saxony',
    avgSemesterFee: 285,
  },
  // Dresden
  {
    city: 'Dresden',
    universities: [
      'Technische Universität Dresden',
      'Hochschule für Technik und Wirtschaft Dresden',
    ],
    state: 'Saxony',
    avgSemesterFee: 290,
  },
  // Bonn
  {
    city: 'Bonn',
    universities: [
      'Rheinische Friedrich-Wilhelms-Universität Bonn',
      'Hochschule Bonn-Rhein-Sieg',
    ],
    state: 'North Rhine-Westphalia',
    avgSemesterFee: 350,
  },
  // Aachen
  {
    city: 'Aachen',
    universities: [
      'RWTH Aachen University',
      'FH Aachen University of Applied Sciences',
    ],
    state: 'North Rhine-Westphalia',
    avgSemesterFee: 310,
  },
  // Heidelberg
  {
    city: 'Heidelberg',
    universities: [
      'Ruprecht-Karls-Universität Heidelberg',
    ],
    state: 'Baden-Württemberg',
    avgSemesterFee: 371,
  },
  // Freiburg
  {
    city: 'Freiburg',
    universities: [
      'Albert-Ludwigs-Universität Freiburg',
      'Hochschule Furtwangen University',
    ],
    state: 'Baden-Württemberg',
    avgSemesterFee: 370,
  },
  // Tübingen
  {
    city: 'Tübingen',
    universities: [
      'Eberhard Karls Universität Tübingen',
    ],
    state: 'Baden-Württemberg',
    avgSemesterFee: 370,
  },
  // Mannheim
  {
    city: 'Mannheim',
    universities: [
      'Universität Mannheim',
      'Hochschule Mannheim',
    ],
    state: 'Baden-Württemberg',
    avgSemesterFee: 370,
  },
  // Karlsruhe
  {
    city: 'Karlsruhe',
    universities: [
      'Karlsruher Institut für Technologie',
      'Hochschule Karlsruhe',
    ],
    state: 'Baden-Württemberg',
    avgSemesterFee: 365,
  },
  // Münster
  {
    city: 'Münster',
    universities: [
      'Westfälische Wilhelms-Universität Münster',
      'Fachhochschule Münster',
    ],
    state: 'North Rhine-Westphalia',
    avgSemesterFee: 335,
  },
  // Düsseldorf
  {
    city: 'Düsseldorf',
    universities: [
      'Heinrich-Heine-Universität Düsseldorf',
      'Hochschule Düsseldorf',
    ],
    state: 'North Rhine-Westphalia',
    avgSemesterFee: 330,
  },
  // Hannover
  {
    city: 'Hannover',
    universities: [
      'Leibniz Universität Hannover',
      'Hochschule Hannover',
    ],
    state: 'Lower Saxony',
    avgSemesterFee: 335,
  },
  // Nuremberg
  {
    city: 'Nuremberg',
    universities: [
      'Friedrich-Alexander-Universität Erlangen-Nürnberg',
      'Technische Hochschule Nürnberg',
    ],
    state: 'Bavaria',
    avgSemesterFee: 385,
  },
  // Würzburg
  {
    city: 'Würzburg',
    universities: [
      'Julius-Maximilians-Universität Würzburg',
    ],
    state: 'Bavaria',
    avgSemesterFee: 385,
  },
  // Göttingen
  {
    city: 'Göttingen',
    universities: [
      'Georg-August-Universität Göttingen',
    ],
    state: 'Lower Saxony',
    avgSemesterFee: 340,
  },
  // Regensburg
  {
    city: 'Regensburg',
    universities: [
      'Universität Regensburg',
      'Ostbayerische Technische Hochschule Regensburg',
    ],
    state: 'Bavaria',
    avgSemesterFee: 385,
  },
];

// German program names grouped by subject (these will be translated by the API)
const PROGRAMS_BY_SUBJECT = {
  // Medicine & Health
  medicine: [
    'Medizin',
    'Humanmedizin',
    'Zahnmedizin',
    'Veterinärmedizin',
    'Pharmazie',
    'Gesundheitswissenschaften',
    'Public Health',
    'Pflegewissenschaft',
    'Ernährungswissenschaft',
    'Sportwissenschaft',
  ],
  
  // Law
  law: [
    'Rechtswissenschaften',
    'Jura',
    'Recht',
    'Rechtswissenschaft',
    'Wirtschaftsrecht',
    'Steuerrecht',
    'Europarecht',
  ],
  
  // Computer Science & IT
  cs: [
    'Informatik',
    'Angewandte Informatik',
    'Wirtschaftsinformatik',
    'Medieninformatik',
    'Bioinformatik',
    'Informationstechnik',
    'Computervisualistik',
    'Künstliche Intelligenz',
    'Cybersecurity',
    'Software Engineering',
  ],
  
  // Business & Economics
  business: [
    'Betriebswirtschaftslehre',
    'BWL',
    'Volkswirtschaftslehre',
    'VWL',
    'Wirtschaftswissenschaften',
    'International Business Administration',
    'Wirtschaftsingenieurwesen',
    'Management',
    'Marketing',
    'Finance',
    'Accounting',
    'Controlling',
    'Logistik',
    'Handelsbetriebslehre',
  ],
  
  // Engineering
  engineering: [
    'Maschinenbau',
    'Elektrotechnik',
    'Bauingenieurwesen',
    'Ingenieurwesen',
    'Mechatronik',
    'Verfahrenstechnik',
    'Energietechnik',
    'Umwelttechnik',
    'Wirtschaftsingenieurwesen',
    'Automotive Engineering',
    'Aerospace Engineering',
    'Biomedical Engineering',
    'Industrielles Design',
  ],
  
  // Natural Sciences
  sciences: [
    'Biologie',
    'Chemie',
    'Physik',
    'Mathematik',
    'Biochemie',
    'Biotechnologie',
    'Umweltwissenschaften',
    'Geowissenschaften',
    'Meteorologie',
    'Astronomie',
  ],
  
  // Social Sciences
  social: [
    'Psychologie',
    'Soziologie',
    'Politikwissenschaft',
    'Politikwissenschaften',
    'Sozialwissenschaften',
    'Anthropologie',
    'Sozialarbeit',
    'Soziale Arbeit',
    'Pädagogik',
    'Erziehungswissenschaften',
  ],
  
  // Humanities
  humanities: [
    'Geschichte',
    'Philosophie',
    'Germanistik',
    'Anglistik',
    'Romanistik',
    'Linguistik',
    'Kulturwissenschaften',
    'Religionswissenschaft',
    'Theologie',
  ],
  
  // Arts & Design
  arts: [
    'Kunst',
    'Design',
    'Architektur',
    'Musik',
    'Musikwissenschaft',
    'Medienwissenschaft',
    'Kommunikationsdesign',
    'Produktdesign',
    'Graphic Design',
    'Film',
    'Theaterwissenschaft',
  ],
  
  // Education
  education: [
    'Lehramt',
    'Pädagogik',
    'Erziehungswissenschaften',
    'Bildungswissenschaften',
  ],
};

// Helper function to get a random value from an array
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to generate a random NC threshold
function generateNC(programName, subject) {
  // Some programs are typically NC-free (Master's, some specializations)
  if (Math.random() < 0.3) {
    return null;
  }
  
  // Subject-specific NC ranges (more competitive = lower NC = better grade needed)
  const ncRanges = {
    medicine: [1.0, 1.3], // Very competitive
    law: [1.5, 2.2], // Competitive
    cs: [1.8, 2.8], // Moderately competitive
    business: [2.0, 2.8], // Moderately competitive
    engineering: [1.9, 2.9], // Moderately competitive
    sciences: [2.2, 3.0], // Less competitive
    social: [2.0, 2.9], // Moderate
    humanities: [2.3, 3.2], // Less competitive
    arts: [2.5, 3.5], // Less competitive (often portfolio-based)
    education: [2.2, 3.0], // Moderate
  };
  
  const range = ncRanges[subject] || [2.0, 3.0];
  const nc = range[0] + Math.random() * (range[1] - range[0]);
  return Math.round(nc * 10) / 10; // Round to 1 decimal
}

// Helper function to generate semester fee with variation
function generateSemesterFee(baseFee) {
  const variation = baseFee * 0.1; // ±10% variation
  const fee = baseFee + (Math.random() * 2 - 1) * variation;
  return Math.round(fee);
}

// Helper function to determine instruction language
function determineInstructionLanguage(programName, university, city) {
  const programLower = programName.toLowerCase();
  const uniLower = university.toLowerCase();
  
  // Major universities more likely to offer English programs
  const majorUniversities = ['tum', 'rwth', 'tu berlin', 'hu berlin', 'fu berlin', 'heidelberg', 'munich', 'lmu', 'berlin', 'aachen'];
  const isMajorUniversity = majorUniversities.some(uni => uniLower.includes(uni));
  
  // Programs typically taught in English (both English and German keywords)
  const englishProgramKeywords = [
    // English keywords
    'computer science', 'software engineering', 'data science', 'cybersecurity',
    'artificial intelligence', 'machine learning', 'international business',
    'international management', 'global business', 'international economics',
    'computational', 'information systems', 'digital', 'information technology',
    // German keywords for programs often taught in English
    'informatik', 'wirtschaftsinformatik', 'data science', 'software engineering',
    'international', 'computational', 'bioinformatik', 'medieninformatik'
  ];
  
  // Check if program name contains English keywords (case-insensitive)
  const hasEnglishKeywords = englishProgramKeywords.some(keyword => programLower.includes(keyword.toLowerCase()));
  
  // Special check: Programs with "International" in the name are more likely English
  const hasInternational = programLower.includes('international');
  
  // For major universities with English-keyword programs, higher chance of English
  if (isMajorUniversity && (hasEnglishKeywords || hasInternational)) {
    // 70% English, 20% Bilingual, 10% German
    const rand = Math.random();
    if (rand < 0.7) return 'English';
    if (rand < 0.9) return 'Bilingual';
    return 'German';
  }
  
  // For major universities without specific keywords, still some English programs
  if (isMajorUniversity) {
    // 30% English/Bilingual, 70% German
    const rand = Math.random();
    if (rand < 0.2) return 'English';
    if (rand < 0.3) return 'Bilingual';
    return 'German';
  }
  
  // For other universities, mostly German
  if (hasEnglishKeywords || hasInternational) {
    // 20% English, 10% Bilingual, 70% German
    const rand = Math.random();
    if (rand < 0.2) return 'English';
    if (rand < 0.3) return 'Bilingual';
    return 'German';
  }
  
  // Default: German
  return 'German';
}

// Generate programs for a university
function generateProgramsForUniversity(university, cityData, programsPerUni = 15) {
  const programs = [];
  const subjects = Object.keys(PROGRAMS_BY_SUBJECT);
  
  // Ensure we get good coverage of all subjects
  const programsToGenerate = Math.max(programsPerUni, subjects.length * 2);
  
  for (let i = 0; i < programsToGenerate; i++) {
    const subject = randomChoice(subjects);
    const subjectPrograms = PROGRAMS_BY_SUBJECT[subject];
    const programName = randomChoice(subjectPrograms);
    
    // Determine degree level (B.Sc., M.Sc., B.A., M.A.)
    const degreeTypes = ['B.Sc.', 'M.Sc.', 'B.A.', 'M.A.', 'LL.B.', 'LL.M.', 'Staatsexamen'];
    const degreeType = randomChoice(degreeTypes);
    
    // Full program name with degree
    const fullProgramName = `${programName} (${degreeType})`;
    
    // Generate NC (Master's often have no NC)
    const hasNC = !fullProgramName.includes('M.') || Math.random() < 0.4;
    const nc = hasNC ? generateNC(programName, subject) : null;
    
    // Determine university type
    const uniType = university.toLowerCase().includes('hochschule') || 
                    university.toLowerCase().includes('fh') ||
                    university.toLowerCase().includes('applied')
                    ? 'FH' : 'Uni';
    
    // Determine instruction language
    const instructionLanguage = determineInstructionLanguage(
      programName, 
      university, 
      cityData.city
    );
    
    programs.push({
      name: fullProgramName, // German program name with degree
      nc_threshold: nc,
      waiting_semesters: nc ? Math.floor(Math.random() * 3) : 0,
      type: uniType,
      state: cityData.state,
      semester_fee: generateSemesterFee(cityData.avgSemesterFee),
      monthly_rent_estimate: Math.round(450 + Math.random() * 400), // 450-850€
      instructionLanguage: instructionLanguage, // 'German', 'English', or 'Bilingual'
      totalMonthlyCosts: 0, // Will be calculated after all programs are generated
    });
  }
  
  return programs;
}

// Main function to generate the dataset
function generateDataset() {
  console.log('🚀 Starting university programs data generation...\n');
  
  const dataset = {};
  let totalPrograms = 0;
  
  // Generate programs for each city
  for (const cityData of CITIES_DATA) {
    console.log(`📚 Processing ${cityData.city}...`);
    
    for (const university of cityData.universities) {
      const universityKey = `${university} (${cityData.city})`;
      const programs = generateProgramsForUniversity(university, cityData, 20);
      
      dataset[universityKey] = programs;
      totalPrograms += programs.length;
      
      console.log(`   ✓ ${university}: ${programs.length} programs`);
    }
  }
  
  // Calculate totalMonthlyCosts for each program
  for (const universityKey in dataset) {
    dataset[universityKey].forEach(program => {
      const monthlySemesterFee = program.semester_fee / 6; // Semester fee per month
      program.totalMonthlyCosts = Math.round(
        program.monthly_rent_estimate + monthlySemesterFee + 300 // +300 for living expenses
      );
    });
  }
  
  // Add metadata
  dataset.last_updated = new Date().toISOString();
  dataset.data_version = '2.0';
  dataset.total_programs = totalPrograms;
  dataset.total_universities = Object.keys(dataset).length - 3; // Exclude metadata fields
  
  console.log(`\n✅ Generated ${totalPrograms} programs across ${dataset.total_universities} universities\n`);
  
  return dataset;
}

// Save the dataset to file
function saveDataset(dataset) {
  const outputPath = path.join(process.cwd(), 'data', 'university_programs.json');
  const outputDir = path.dirname(outputPath);
  
  // Ensure directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write to file with pretty formatting
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2), 'utf-8');
  
  console.log(`💾 Saved dataset to: ${outputPath}`);
  console.log(`   Total size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB\n`);
}

// Main execution
try {
  const dataset = generateDataset();
  saveDataset(dataset);
  
  console.log('✨ Data population complete!');
  console.log('\nYou can now test the search API with queries like:');
  console.log('  - "Business" (should find BWL programs)');
  console.log('  - "Computer Science" (should find Informatik programs)');
  console.log('  - "Law" (should find Jura programs)');
  console.log('  - "Medicine" (should find Medizin programs)\n');
  
  process.exit(0);
} catch (error) {
  console.error('❌ Error generating dataset:', error);
  process.exit(1);
}

