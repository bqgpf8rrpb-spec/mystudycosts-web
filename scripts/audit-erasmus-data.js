#!/usr/bin/env node

/**
 * Erasmus Data Audit Script
 * 
 * Analyzes the quality of scraped Erasmus partner data:
 * - Statistics per university
 * - Subject area analysis
 * - Cost matching check
 * - Integrity warnings
 * 
 * Usage:
 *   node scripts/audit-erasmus-data.js [--output <file>]
 * 
 * Output:
 *   - Terminal table with statistics
 *   - Optional JSON report file
 */

const fs = require('fs');
const path = require('path');

// ============================================
// Configuration
// ============================================

const DATA_FILE = path.join(__dirname, '../data/erasmus-partners.json');
const COST_INDEX_FILE = path.join(__dirname, '../lib/costs.ts');

// Subject area mapping (from scrape-erasmus.js)
const SUBJECT_MAPPING = {
  // Computer Science
  'Informatik': 'Computer Science',
  'Computerwissenschaften': 'Computer Science',
  'Computerwissenschaft': 'Computer Science',
  'Angewandte Informatik': 'Computer Science',
  'Wirtschaftsinformatik': 'Computer Science',
  'Medieninformatik': 'Computer Science',
  'Informationssysteme': 'Computer Science',
  
  // Business Administration
  'Betriebswirtschaftslehre': 'Business Administration',
  'BWL': 'Business Administration',
  'Wirtschaftswissenschaften': 'Business Administration',
  'Business Administration': 'Business Administration',
  'Management': 'Business Administration',
  'Betriebswirtschaft': 'Business Administration',
  
  // Mechanical Engineering
  'Maschinenbau': 'Mechanical Engineering',
  'Mechanical Engineering': 'Mechanical Engineering',
  'Maschinenwesen': 'Mechanical Engineering',
  
  // Electrical Engineering
  'Elektrotechnik': 'Electrical Engineering',
  'Elektroingenieurwesen': 'Electrical Engineering',
  'Electrical Engineering': 'Electrical Engineering',
  
  // Medicine
  'Medizin': 'Medicine',
  'Humanmedizin': 'Medicine',
  'Medizinische Wissenschaft': 'Medicine',
  
  // Law
  'Rechtswissenschaften': 'Law',
  'Recht': 'Law',
  'Jura': 'Law',
  
  // Economics
  'Volkswirtschaftslehre': 'Economics',
  'VWL': 'Economics',
  'Wirtschaft': 'Economics',
  'Ökonomie': 'Economics',
  
  // International Relations
  'Internationale Beziehungen': 'International Relations',
  'International Relations': 'International Relations',
  'Politikwissenschaften': 'International Relations',
  'Politikwissenschaft': 'International Relations',
  
  // Psychology
  'Psychologie': 'Psychology',
  
  // Biology
  'Biologie': 'Biology',
  'Biowissenschaften': 'Biology',
  'Life Sciences': 'Biology',
  
  // Chemistry
  'Chemie': 'Chemistry',
  
  // Physics
  'Physik': 'Physics',
  
  // Mathematics
  'Mathematik': 'Mathematics',
  'Math': 'Mathematics',
  
  // Architecture
  'Architektur': 'Architecture',
  
  // Civil Engineering
  'Bauingenieurwesen': 'Civil Engineering',
  'Bauwesen': 'Civil Engineering',
  'Civil Engineering': 'Civil Engineering',
  
  // Political Science
  'Politikwissenschaft': 'Political Science',
  'Politikwissenschaften': 'Political Science',
  
  // Sociology
  'Soziologie': 'Sociology',
  
  // History
  'Geschichte': 'History',
  'Historische Wissenschaften': 'History',
  
  // Philosophy
  'Philosophie': 'Philosophy',
  
  // Linguistics
  'Sprachwissenschaften': 'Linguistics',
  'Linguistik': 'Linguistics',
  
  // Art History
  'Kunstgeschichte': 'Art History',
  
  // Design
  'Design': 'Design',
  'Gestaltung': 'Design',
  
  // Media Studies
  'Medienwissenschaften': 'Media Studies',
  'Medienwissenschaft': 'Media Studies',
  
  // Environmental Science
  'Umweltwissenschaften': 'Environmental Science',
  'Umweltingenieurwesen': 'Environmental Science',
  
  // Biotechnology
  'Biotechnologie': 'Biotechnology',
  
  // General fallbacks
  'Allgemein': 'General',
  'General': 'General',
  'Sonstiges': 'General',
};

// City price factors from lib/costs.ts (for German cities - used as reference)
const CITY_PRICE_FACTORS = {
  'Munich': 1.8, 'München': 1.8,
  'Frankfurt': 1.6,
  'Stuttgart': 1.5, 'Düsseldorf': 1.5, 'Heidelberg': 1.5, 'Darmstadt': 1.5,
  'Hamburg': 1.4,
  'Berlin': 1.3, 'Cologne': 1.3, 'Köln': 1.3, 'Bonn': 1.3,
  'Freiburg': 1.3, 'Tübingen': 1.3, 'Konstanz': 1.3,
  'Mannheim': 1.2, 'Augsburg': 1.2, 'Karlsruhe': 1.2, 'Münster': 1.2,
  'Potsdam': 1.2, 'Mainz': 1.2, 'Erlangen': 1.2,
  // ... we'll use these as reference for European cities
};

// ============================================
// Utility Functions
// ============================================

/**
 * Extract base subject area from formatted string (e.g., "Computer Science (B.Sc.)" -> "Computer Science")
 */
function extractBaseSubjectArea(subjectArea) {
  if (!subjectArea) return '';
  
  // Remove degree types in parentheses: (B.Sc.), (M.Sc.), (B.A.), (M.A.), (State Examination), etc.
  let base = subjectArea.trim().replace(/\s*\([^)]*\)\s*$/g, '').trim();
  
  return base;
}

/**
 * Check if a subject area is mapped (normalized)
 */
function isSubjectMapped(subjectArea) {
  if (!subjectArea) return false;
  
  const normalized = subjectArea.trim();
  const baseSubject = extractBaseSubjectArea(normalized);
  
  // Direct match with original
  if (SUBJECT_MAPPING[normalized]) {
    return true;
  }
  
  // Direct match with base (without degree type)
  if (baseSubject && SUBJECT_MAPPING[baseSubject]) {
    return true;
  }
  
  // Case-insensitive match with original
  for (const [german, english] of Object.entries(SUBJECT_MAPPING)) {
    if (german.toLowerCase() === normalized.toLowerCase() || 
        english.toLowerCase() === normalized.toLowerCase()) {
      return true;
    }
  }
  
  // Case-insensitive match with base
  for (const [german, english] of Object.entries(SUBJECT_MAPPING)) {
    if (baseSubject && (
        german.toLowerCase() === baseSubject.toLowerCase() || 
        english.toLowerCase() === baseSubject.toLowerCase())) {
      return true;
    }
  }
  
  // Partial match (e.g., "Computer Science (B.Sc.)" contains "Computer Science")
  if (baseSubject) {
    for (const [german, english] of Object.entries(SUBJECT_MAPPING)) {
      if (baseSubject.toLowerCase().includes(german.toLowerCase()) || 
          baseSubject.toLowerCase().includes(english.toLowerCase()) ||
          german.toLowerCase().includes(baseSubject.toLowerCase()) ||
          english.toLowerCase().includes(baseSubject.toLowerCase())) {
        return true;
      }
    }
  }
  
  // Check if it's already a mapped value
  const mappedValues = new Set(Object.values(SUBJECT_MAPPING));
  if (mappedValues.has(normalized) || (baseSubject && mappedValues.has(baseSubject))) {
    return true;
  }
  
  return false;
}

/**
 * Normalize city name for comparison
 */
function normalizeCityName(city) {
  if (!city) return '';
  const cityMap = {
    'München': 'Munich',
    'Köln': 'Cologne',
    'Hannover': 'Hanover',
    'Nürnberg': 'Nuremberg',
    'Saarbrucken': 'Saarbrücken',
  };
  return cityMap[city] || city;
}

/**
 * Check if city has cost data
 * Note: We consider a partner to have cost data if monthlyLivingCost is present and > 0
 * This is different from checking if the city is in our cost_index system
 */
function hasCostData(partner) {
  // Check if monthlyLivingCost is present and valid
  if (partner.monthlyLivingCost && partner.monthlyLivingCost > 0) {
    return true;
  }
  
  // If no monthlyLivingCost, check if city is in our reference list (for German cities)
  // This is less relevant for Erasmus partners, but we include it for completeness
  if (partner.city) {
    const normalized = normalizeCityName(partner.city);
    return CITY_PRICE_FACTORS[normalized] !== undefined;
  }
  
  return false;
}

/**
 * Check if city is missing cost data (needs to be added to cost_index)
 * This checks if the partner has a city/country but we don't have cost data for it
 */
function isCityMissingFromCostIndex(partner) {
  // If no city/country, can't check
  if (!partner.city || !partner.country) {
    return false;
  }
  
  // If monthlyLivingCost is present, consider it as having cost data
  if (partner.monthlyLivingCost && partner.monthlyLivingCost > 0) {
    return false;
  }
  
  // City is present but no cost data - needs to be added to cost_index
  return true;
}

// ============================================
// Main Audit Function
// ============================================

function auditErasmusData() {
  console.log('🔍 Erasmus Data Audit\n');
  console.log('=' .repeat(80) + '\n');
  
  // Load data
  let data;
  try {
    const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
    data = JSON.parse(fileContent);
    console.log(`✓ Loaded ${data.length} entries from ${path.basename(DATA_FILE)}\n`);
  } catch (error) {
    console.error(`❌ Error loading data file: ${error.message}`);
    process.exit(1);
  }
  
  // Collect statistics
  const universityStats = new Map();
  const subjectAreaCounts = new Map();
  const citiesWithoutCostData = new Map();
  const allPartners = [];
  
  // Process all entries
  for (const entry of data) {
    const uniName = entry.germanUniversity || 'Unknown';
    const subjectArea = entry.courseOfStudy || 'Unknown';
    const partners = entry.partners || [];
    
    // Initialize university stats
    if (!universityStats.has(uniName)) {
      universityStats.set(uniName, {
        totalPartners: 0,
        partnersWithSubject: 0,
        partnersWithoutCity: 0,
        partnersWithoutCountry: 0,
        partnersWithoutCityOrCountry: 0,
        partnersWithoutCostData: 0,
      });
    }
    
    const stats = universityStats.get(uniName);
    
    // Process partners
    for (const partner of partners) {
      stats.totalPartners++;
      allPartners.push({ ...partner, sourceUni: uniName, subjectArea });
      
      // Count subject area
      if (subjectArea && subjectArea !== 'Unknown') {
        const currentCount = subjectAreaCounts.get(subjectArea) || 0;
        subjectAreaCounts.set(subjectArea, currentCount + 1);
        stats.partnersWithSubject++;
      }
      
      // Check for missing city/country
      if (!partner.city || !partner.city.trim()) {
        stats.partnersWithoutCity++;
      }
      if (!partner.country || !partner.country.trim()) {
        stats.partnersWithoutCountry++;
      }
      if ((!partner.city || !partner.city.trim()) && (!partner.country || !partner.country.trim())) {
        stats.partnersWithoutCityOrCountry++;
      }
      
      // Check for cost data (using the stricter check for cost_index)
      if (isCityMissingFromCostIndex(partner)) {
        stats.partnersWithoutCostData++;
        const cityKey = `${partner.city || 'Unknown'}, ${partner.country || 'Unknown'}`;
        const currentCount = citiesWithoutCostData.get(cityKey) || 0;
        citiesWithoutCostData.set(cityKey, currentCount + 1);
      }
    }
  }
  
  // ============================================
  // 1. Statistics per University
  // ============================================
  
  console.log('📊 STATISTICS PER UNIVERSITY\n');
  console.log('-'.repeat(80));
  console.log(
    'University'.padEnd(35) +
    'Total'.padStart(10) +
    'With Subject'.padStart(15) +
    'Missing City/Country'.padStart(20)
  );
  console.log('-'.repeat(80));
  
  const sortedUnis = Array.from(universityStats.entries()).sort(
    (a, b) => b[1].totalPartners - a[1].totalPartners
  );
  
  for (const [uniName, stats] of sortedUnis) {
    const missingInfo = stats.partnersWithoutCity + stats.partnersWithoutCountry;
    const missingPercentage = stats.totalPartners > 0 
      ? ((missingInfo / stats.totalPartners) * 100).toFixed(1) + '%'
      : '0%';
    
    console.log(
      uniName.substring(0, 34).padEnd(35) +
      stats.totalPartners.toString().padStart(10) +
      stats.partnersWithSubject.toString().padStart(15) +
      `${missingInfo} (${missingPercentage})`.padStart(20)
    );
  }
  
  console.log('-'.repeat(80));
  const totalStats = {
    totalPartners: Array.from(universityStats.values()).reduce((sum, s) => sum + s.totalPartners, 0),
    partnersWithSubject: Array.from(universityStats.values()).reduce((sum, s) => sum + s.partnersWithSubject, 0),
    partnersWithoutCity: Array.from(universityStats.values()).reduce((sum, s) => sum + s.partnersWithoutCity, 0),
    partnersWithoutCountry: Array.from(universityStats.values()).reduce((sum, s) => sum + s.partnersWithoutCountry, 0),
  };
  
  const totalMissing = totalStats.partnersWithoutCity + totalStats.partnersWithoutCountry;
  const totalMissingPercentage = totalStats.totalPartners > 0
    ? ((totalMissing / totalStats.totalPartners) * 100).toFixed(1) + '%'
    : '0%';
  
  console.log(
    'TOTAL'.padEnd(35) +
    totalStats.totalPartners.toString().padStart(10) +
    totalStats.partnersWithSubject.toString().padStart(15) +
    `${totalMissing} (${totalMissingPercentage})`.padStart(20)
  );
  console.log('\n');
  
  // ============================================
  // 2. Subject Area Analysis
  // ============================================
  
  console.log('📚 SUBJECT AREA ANALYSIS\n');
  console.log('Top 20 most common subject areas:\n');
  console.log('-'.repeat(80));
  console.log(
    'Subject Area'.padEnd(40) +
    'Count'.padStart(10) +
    'Status'.padStart(30)
  );
  console.log('-'.repeat(80));
  
  const sortedSubjects = Array.from(subjectAreaCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  
  let mappedCount = 0;
  let unmappedCount = 0;
  
  for (const [subjectArea, count] of sortedSubjects) {
    const isMapped = isSubjectMapped(subjectArea);
    const status = isMapped ? '✓ Mapped' : '⚠️  Raw (not in SUBJECT_MAPPING)';
    
    if (isMapped) {
      mappedCount++;
    } else {
      unmappedCount++;
    }
    
    console.log(
      subjectArea.substring(0, 39).padEnd(40) +
      count.toString().padStart(10) +
      status.padStart(30)
    );
  }
  
  console.log('-'.repeat(80));
  console.log(`\nMapped: ${mappedCount}/${sortedSubjects.length} (${((mappedCount / sortedSubjects.length) * 100).toFixed(1)}%)`);
  console.log(`Unmapped: ${unmappedCount}/${sortedSubjects.length} (${((unmappedCount / sortedSubjects.length) * 100).toFixed(1)}%)\n`);
  
  // ============================================
  // 3. Cost Matching Check
  // ============================================
  
  console.log('💰 COST MATCHING CHECK\n');
  
  const totalPartnersWithCostData = totalStats.totalPartners - 
    Array.from(universityStats.values()).reduce((sum, s) => sum + s.partnersWithoutCostData, 0);
  const costDataCoverage = totalStats.totalPartners > 0
    ? ((totalPartnersWithCostData / totalStats.totalPartners) * 100).toFixed(1)
    : '0';
  
  console.log(`Partners with cost data: ${totalPartnersWithCostData}/${totalStats.totalPartners} (${costDataCoverage}%)\n`);
  
  // Top 10 cities without cost data
  console.log('Top 10 cities without cost data:\n');
  console.log('-'.repeat(80));
  console.log(
    'City, Country'.padEnd(50) +
    'Count'.padStart(10) +
    'Missing'.padStart(20)
  );
  console.log('-'.repeat(80));
  
  const sortedCitiesWithoutCost = Array.from(citiesWithoutCostData.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  for (const [cityKey, count] of sortedCitiesWithoutCost) {
    console.log(
      cityKey.substring(0, 49).padEnd(50) +
      count.toString().padStart(10) +
      'monthlyLivingCost'.padStart(20)
    );
  }
  
  console.log('-'.repeat(80));
  console.log('\n');
  
  // ============================================
  // 4. Integrity Warnings
  // ============================================
  
  console.log('⚠️  INTEGRITY WARNINGS\n');
  
  const warnings = [];
  
  // Check for universities with 0 partners
  for (const [uniName, stats] of universityStats.entries()) {
    if (stats.totalPartners === 0) {
      warnings.push({
        level: 'ERROR',
        message: `${uniName}: 0 partners found (scraping may have failed)`,
      });
    }
  }
  
  // Check for universities with >50% missing subject areas
  for (const [uniName, stats] of universityStats.entries()) {
    if (stats.totalPartners > 0) {
      const missingSubjectPercentage = ((stats.totalPartners - stats.partnersWithSubject) / stats.totalPartners) * 100;
      if (missingSubjectPercentage > 50) {
        warnings.push({
          level: 'WARNING',
          message: `${uniName}: ${missingSubjectPercentage.toFixed(1)}% of partners missing subject area`,
        });
      }
    }
  }
  
  // Check for universities with >50% missing city/country
  for (const [uniName, stats] of universityStats.entries()) {
    if (stats.totalPartners > 0) {
      const missingInfo = stats.partnersWithoutCity + stats.partnersWithoutCountry;
      const missingInfoPercentage = (missingInfo / stats.totalPartners) * 100;
      if (missingInfoPercentage > 50) {
        warnings.push({
          level: 'WARNING',
          message: `${uniName}: ${missingInfoPercentage.toFixed(1)}% of partners missing city/country`,
        });
      }
    }
  }
  
  if (warnings.length === 0) {
    console.log('✓ No integrity warnings found. Data quality looks good!\n');
  } else {
    // Sort warnings by level (ERROR first)
    warnings.sort((a, b) => {
      if (a.level === 'ERROR' && b.level !== 'ERROR') return -1;
      if (a.level !== 'ERROR' && b.level === 'ERROR') return 1;
      return 0;
    });
    
    for (const warning of warnings) {
      const icon = warning.level === 'ERROR' ? '❌' : '⚠️ ';
      console.log(`${icon} ${warning.level}: ${warning.message}`);
    }
    console.log('\n');
  }
  
  // ============================================
  // Summary
  // ============================================
  
  console.log('📈 SUMMARY\n');
  console.log('-'.repeat(80));
  console.log(`Total Universities: ${universityStats.size}`);
  console.log(`Total Partner Entries: ${totalStats.totalPartners}`);
  console.log(`Partners with Subject Area: ${totalStats.partnersWithSubject} (${((totalStats.partnersWithSubject / totalStats.totalPartners) * 100).toFixed(1)}%)`);
  console.log(`Partners with Cost Data: ${totalPartnersWithCostData} (${costDataCoverage}%)`);
  console.log(`Unique Subject Areas: ${subjectAreaCounts.size}`);
  console.log(`Mapped Subject Areas (Top 20): ${mappedCount}/${sortedSubjects.length} (${((mappedCount / sortedSubjects.length) * 100).toFixed(1)}%)`);
  console.log(`Integrity Warnings: ${warnings.length}`);
  console.log('-'.repeat(80));
  console.log('\n');
  
  // Return data for potential JSON export
  return {
    timestamp: new Date().toISOString(),
    universities: Array.from(universityStats.entries()).map(([name, stats]) => ({
      name,
      ...stats,
    })),
    subjectAreas: Array.from(subjectAreaCounts.entries()).map(([subject, count]) => ({
      subject,
      count,
      isMapped: isSubjectMapped(subject),
    })),
    citiesWithoutCostData: Array.from(citiesWithoutCostData.entries()).map(([city, count]) => ({
      city,
      count,
    })),
    warnings,
    summary: {
      totalUniversities: universityStats.size,
      totalPartners: totalStats.totalPartners,
      partnersWithSubject: totalStats.partnersWithSubject,
      partnersWithCostData: totalPartnersWithCostData,
      uniqueSubjectAreas: subjectAreaCounts.size,
      mappedSubjectAreas: mappedCount,
      unmappedSubjectAreas: unmappedCount,
      integrityWarnings: warnings.length,
    },
  };
}

// ============================================
// Main Execution
// ============================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const outputFileIndex = args.indexOf('--output');
  const outputFile = outputFileIndex >= 0 ? args[outputFileIndex + 1] : null;
  
  const auditResults = auditErasmusData();
  
  // Export to JSON if requested
  if (outputFile) {
    try {
      fs.writeFileSync(outputFile, JSON.stringify(auditResults, null, 2), 'utf8');
      console.log(`\n✓ Audit report saved to: ${outputFile}\n`);
    } catch (error) {
      console.error(`\n❌ Error saving audit report: ${error.message}\n`);
      process.exit(1);
    }
  }
}

module.exports = { auditErasmusData };

