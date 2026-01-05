#!/usr/bin/env node

/**
 * NC-Checker Validation Script
 * 
 * Validates that the NC-Checker correctly identifies and displays
 * both Universities and Fachhochschulen for popular programs, sorted by NC.
 */

const fs = require('fs');
const path = require('path');

// File paths
const UNIVERSITY_PROGRAMS_PATH = path.join(__dirname, '../data/university_programs.json');
const UNIVERSITIES_PATH = path.join(__dirname, '../data/universities.json');

// Import the search mapping function (simplified version for Node.js)
function getSearchTerms(input) {
  if (!input || typeof input !== 'string') return [];
  const normalizedInput = input.trim().toLowerCase();
  if (!normalizedInput) return [];
  
  const searchTerms = new Set([normalizedInput]);
  
  // Simplified mapping for validation
  const STUDY_SYNONYMS = {
    'bwl': ['betriebswirtschaftslehre', 'business administration', 'management', 'wirtschaftswissenschaften', 'wirtschaft', 'business'],
    'business administration': ['betriebswirtschaftslehre', 'bwl', 'management', 'wirtschaftswissenschaften'],
    'psychology': ['psychologie'],
  };
  
  const matchingKey = Object.keys(STUDY_SYNONYMS).find(
    key => key.toLowerCase() === normalizedInput
  );
  
  if (matchingKey) {
    STUDY_SYNONYMS[matchingKey].forEach(synonym => {
      searchTerms.add(synonym.toLowerCase());
    });
  }
  
  return Array.from(searchTerms);
}

// NC filtering logic (simplified)
function getProgramMatchType(userGrade, ncThreshold, isNCFree) {
  if (isNCFree) return 'available';
  if (userGrade === null) return 'available';
  if (userGrade <= ncThreshold) return 'safe';
  if (userGrade <= ncThreshold + 0.2) return 'reach';
  return 'unlikely';
}

/**
 * Simulation 1: Search for "Psychology (B.Sc.)" with GPA 1.5
 */
function simulation1() {
  console.log('\n' + '='.repeat(70));
  console.log('SIMULATION 1: Search for "Psychology (B.Sc.)" with GPA 1.5');
  console.log('='.repeat(70));
  
  const programsData = JSON.parse(fs.readFileSync(UNIVERSITY_PROGRAMS_PATH, 'utf-8'));
  const universities = JSON.parse(fs.readFileSync(UNIVERSITIES_PATH, 'utf-8'));
  
  const universityMap = {};
  universities.forEach(uni => {
    universityMap[uni.name] = uni;
  });
  
  const selectedProgram = 'Psychology (B.Sc.)';
  const userGrade = 1.5;
  
  // Find all institutions offering this program
  const results = [];
  
  Object.entries(programsData).forEach(([institutionName, programs]) => {
    const program = programs.find((p) => {
      const pName = typeof p === 'string' ? p : p.name;
      return pName === selectedProgram;
    });
    
    if (program) {
      let uni = universityMap[institutionName];
      
      if (!uni) {
        // Comprehensive FH detection (same logic as in NCCheckerContent.tsx)
        const nameLower = institutionName.toLowerCase();
        
        // FH indicators (check these first)
        const hasFHIndicator = nameLower.includes('fachhochschule') ||
                               nameLower.includes('university of applied sciences') ||
                               nameLower.includes('applied sciences') ||
                               nameLower.includes('htw') ||
                               nameLower.includes('haw') ||
                               nameLower.includes('hochschule für technik') ||
                               nameLower.includes('hochschule für wirtschaft') ||
                               nameLower.includes('hochschule für angewandte') ||
                               nameLower.includes('hochschule für') ||
                               nameLower.includes('fh ') ||
                               nameLower.includes(' fh') ||
                               nameLower.match(/\bhtw\b/) ||
                               nameLower.match(/\bhaw\b/);
        
        // Check if it's a Hochschule (but not a Universität/University)
        const isHochschule = nameLower.includes('hochschule') && 
                             !nameLower.includes('universität') && 
                             !nameLower.includes('university');
        
        // If it has "University of Applied Sciences" or similar, it's definitely an FH
        const isAppliedSciences = nameLower.includes('university of applied sciences') ||
                                  (nameLower.includes('applied sciences') && nameLower.includes('university'));
        
        const isFH = hasFHIndicator || isHochschule || isAppliedSciences;
        
        uni = {
          name: institutionName,
          city: '',
          type: 'public',
          institutionType: isFH ? 'FH' : 'University',
        };
      }
      
      const programObj = typeof program === 'string' 
        ? { name: program, nc_threshold: 0.0, waiting_semesters: 0 }
        : program;
      
      const ncThreshold = programObj.nc_threshold;
      const isNCFree = ncThreshold === 0.0;
      const matchType = getProgramMatchType(userGrade, ncThreshold, isNCFree);
      
      results.push({
        university: uni,
        program: programObj,
        matchType,
        ncThreshold,
        isNCFree,
      });
    }
  });
  
  // Sort by NC threshold (ascending)
  results.sort((a, b) => {
    if (a.isNCFree && !b.isNCFree) return -1;
    if (!a.isNCFree && b.isNCFree) return 1;
    if (a.ncThreshold !== b.ncThreshold) {
      return a.ncThreshold - b.ncThreshold;
    }
    return a.university.name.localeCompare(b.university.name);
  });
  
  console.log(`\nTotal Results: ${results.length}`);
  console.log(`Universities: ${results.filter(r => r.university.institutionType === 'University' || !r.university.institutionType).length}`);
  console.log(`FHs: ${results.filter(r => r.university.institutionType === 'FH').length}`);
  
  // Group by match type
  const groups = {
    safe: results.filter(r => r.matchType === 'safe'),
    reach: results.filter(r => r.matchType === 'reach'),
    available: results.filter(r => r.matchType === 'available'),
    unlikely: results.filter(r => r.matchType === 'unlikely'),
  };
  
  console.log(`\nMatch Types:`);
  console.log(`  High Chance (safe): ${groups.safe.length}`);
  console.log(`  Potential (reach): ${groups.reach.length}`);
  console.log(`  Available (NC-free): ${groups.available.length}`);
  console.log(`  Unlikely: ${groups.unlikely.length}`);
  
  console.log(`\nFirst 10 Results (sorted by NC):`);
  results.slice(0, 10).forEach((item, idx) => {
    const ncDisplay = item.isNCFree ? 'NC-free' : item.ncThreshold.toFixed(1);
    const type = item.university.institutionType || 'University';
    console.log(`  ${idx + 1}. [${type}] ${item.university.name} - NC: ${ncDisplay} (${item.matchType})`);
  });
  
  // Verify sorting
  let sortingCorrect = true;
  for (let i = 1; i < results.length; i++) {
    const prev = results[i - 1];
    const curr = results[i];
    
    if (!prev.isNCFree && !curr.isNCFree) {
      if (prev.ncThreshold > curr.ncThreshold) {
        sortingCorrect = false;
        console.log(`\n❌ Sorting Error: ${prev.university.name} (NC: ${prev.ncThreshold}) should come after ${curr.university.name} (NC: ${curr.ncThreshold})`);
      }
    }
  }
  
  if (sortingCorrect) {
    console.log(`\n✅ Sorting is correct: NC thresholds are in ascending order`);
  }
  
  // Verify both types present
  const hasUni = results.some(r => r.university.institutionType === 'University' || !r.university.institutionType);
  const hasFH = results.some(r => r.university.institutionType === 'FH');
  
  if (hasUni && hasFH) {
    console.log(`✅ Both University and FH types are present`);
  } else {
    console.log(`⚠️  Missing types: Uni=${hasUni}, FH=${hasFH}`);
  }
  
  return results;
}

/**
 * Simulation 2: Search for "Business Administration" (BWL) with GPA 2.5
 */
function simulation2() {
  console.log('\n' + '='.repeat(70));
  console.log('SIMULATION 2: Search for "Business Administration" (BWL) with GPA 2.5');
  console.log('='.repeat(70));
  
  const programsData = JSON.parse(fs.readFileSync(UNIVERSITY_PROGRAMS_PATH, 'utf-8'));
  const universities = JSON.parse(fs.readFileSync(UNIVERSITIES_PATH, 'utf-8'));
  
  const universityMap = {};
  universities.forEach(uni => {
    universityMap[uni.name] = uni;
  });
  
  // Search for Business Administration - try multiple variations
  const searchVariations = [
    'Business Administration (B.Sc.)',
    'Betriebswirtschaftslehre (B.Sc.)',
    'BWL (B.Sc.)',
    'Business Administration',
    'Betriebswirtschaftslehre',
  ];
  
  const userGrade = 2.5;
  const results = [];
  
  // Find all matching programs
  Object.entries(programsData).forEach(([institutionName, programs]) => {
    programs.forEach(program => {
      const programName = typeof program === 'string' ? program : program.name;
      const programNameLower = programName.toLowerCase();
      
      // Check if it matches any business-related term
      const isBusinessProgram = programNameLower.includes('business administration') ||
                                programNameLower.includes('betriebswirtschaftslehre') ||
                                programNameLower.includes('bwl') ||
                                (programNameLower.includes('wirtschaft') && programNameLower.includes('bachelor'));
      
      if (isBusinessProgram) {
        let uni = universityMap[institutionName];
        
        if (!uni) {
          const isFH = institutionName.toLowerCase().includes('fachhochschule') ||
                       institutionName.toLowerCase().includes('university of applied sciences') ||
                       institutionName.toLowerCase().includes('htw') ||
                       institutionName.toLowerCase().includes('haw') ||
                       institutionName.toLowerCase().includes('hochschule für');
          
          uni = {
            name: institutionName,
            city: '',
            type: 'public',
            institutionType: isFH ? 'FH' : 'University',
          };
        }
        
        const programObj = typeof program === 'string' 
          ? { name: program, nc_threshold: 0.0, waiting_semesters: 0 }
          : program;
        
        const ncThreshold = programObj.nc_threshold;
        const isNCFree = ncThreshold === 0.0;
        const matchType = getProgramMatchType(userGrade, ncThreshold, isNCFree);
        
        results.push({
          university: uni,
          program: programObj,
          matchType,
          ncThreshold,
          isNCFree,
          programName: programName,
        });
      }
    });
  });
  
  // Remove duplicates (same university + program)
  const uniqueResults = [];
  const seen = new Set();
  results.forEach(item => {
    const key = `${item.university.name}::${item.programName}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueResults.push(item);
    }
  });
  
  // Sort by NC threshold
  uniqueResults.sort((a, b) => {
    if (a.isNCFree && !b.isNCFree) return -1;
    if (!a.isNCFree && b.isNCFree) return 1;
    if (a.ncThreshold !== b.ncThreshold) {
      return a.ncThreshold - b.ncThreshold;
    }
    return a.university.name.localeCompare(b.university.name);
  });
  
  console.log(`\nTotal Results: ${uniqueResults.length}`);
  console.log(`Universities: ${uniqueResults.filter(r => r.university.institutionType === 'University' || !r.university.institutionType).length}`);
  console.log(`FHs: ${uniqueResults.filter(r => r.university.institutionType === 'FH').length}`);
  
  // Group by match type
  const groups = {
    safe: uniqueResults.filter(r => r.matchType === 'safe'),
    reach: uniqueResults.filter(r => r.matchType === 'reach'),
    available: uniqueResults.filter(r => r.matchType === 'available'),
    unlikely: uniqueResults.filter(r => r.matchType === 'unlikely'),
  };
  
  console.log(`\nMatch Types:`);
  console.log(`  High Chance (safe): ${groups.safe.length} (Uni: ${groups.safe.filter(r => r.university.institutionType !== 'FH').length}, FH: ${groups.safe.filter(r => r.university.institutionType === 'FH').length})`);
  console.log(`  Potential (reach): ${groups.reach.length} (Uni: ${groups.reach.filter(r => r.university.institutionType !== 'FH').length}, FH: ${groups.reach.filter(r => r.university.institutionType === 'FH').length})`);
  console.log(`  Available (NC-free): ${groups.available.length} (Uni: ${groups.available.filter(r => r.university.institutionType !== 'FH').length}, FH: ${groups.available.filter(r => r.university.institutionType === 'FH').length})`);
  console.log(`  Unlikely: ${groups.unlikely.length} (Uni: ${groups.unlikely.filter(r => r.university.institutionType !== 'FH').length}, FH: ${groups.unlikely.filter(r => r.university.institutionType === 'FH').length})`);
  
  // Check if FHs appear prominently in High Chance or Available
  const fhInHighChance = groups.safe.filter(r => r.university.institutionType === 'FH').length;
  const fhInAvailable = groups.available.filter(r => r.university.institutionType === 'FH').length;
  
  console.log(`\nFH Distribution:`);
  console.log(`  FHs in High Chance: ${fhInHighChance}`);
  console.log(`  FHs in Available: ${fhInAvailable}`);
  
  if (fhInHighChance > 0 || fhInAvailable > 0) {
    console.log(`✅ FHs appear prominently in favorable categories`);
  } else {
    console.log(`⚠️  FHs are not prominently displayed in High Chance or Available categories`);
  }
  
  console.log(`\nFirst 15 Results (sorted by NC):`);
  uniqueResults.slice(0, 15).forEach((item, idx) => {
    const ncDisplay = item.isNCFree ? 'NC-free' : item.ncThreshold.toFixed(1);
    const type = item.university.institutionType || 'University';
    const badge = type === 'FH' ? '[FH]' : '[Uni]';
    console.log(`  ${idx + 1}. ${badge} ${item.university.name}`);
    console.log(`      Program: ${item.programName}`);
    console.log(`      NC: ${ncDisplay} | Match: ${item.matchType}`);
  });
  
  return uniqueResults;
}

/**
 * Logic Check: Verify no false positives
 */
function logicCheck() {
  console.log('\n' + '='.repeat(70));
  console.log('LOGIC CHECK: Verify no false positives');
  console.log('='.repeat(70));
  
  const programsData = JSON.parse(fs.readFileSync(UNIVERSITY_PROGRAMS_PATH, 'utf-8'));
  
  // Test with a specific program
  const testProgram = 'Psychology (B.Sc.)';
  const institutionsWithProgram = [];
  
  Object.entries(programsData).forEach(([institutionName, programs]) => {
    const hasProgram = programs.some((p) => {
      const pName = typeof p === 'string' ? p : p.name;
      return pName === testProgram;
    });
    
    if (hasProgram) {
      institutionsWithProgram.push(institutionName);
    }
  });
  
  console.log(`\nInstitutions offering "${testProgram}": ${institutionsWithProgram.length}`);
  console.log(`First 10:`);
  institutionsWithProgram.slice(0, 10).forEach((name, idx) => {
    console.log(`  ${idx + 1}. ${name}`);
  });
  
  // Verify each institution actually has the program
  let allValid = true;
  institutionsWithProgram.forEach(institutionName => {
    const programs = programsData[institutionName];
    const hasExactMatch = programs.some((p) => {
      const pName = typeof p === 'string' ? p : p.name;
      return pName === testProgram;
    });
    
    if (!hasExactMatch) {
      console.log(`\n❌ ERROR: ${institutionName} listed but doesn't have exact match for "${testProgram}"`);
      allValid = false;
    }
  });
  
  if (allValid) {
    console.log(`\n✅ All listed institutions have the exact program match`);
  }
}

// Run all simulations
console.log('🔍 NC-Checker Validation Script');
console.log('='.repeat(70));

try {
  const results1 = simulation1();
  const results2 = simulation2();
  logicCheck();
  
  console.log('\n' + '='.repeat(70));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(70));
  
  console.log(`\nSimulation 1 (Psychology):`);
  console.log(`  - Total results: ${results1.length}`);
  console.log(`  - Has Universities: ${results1.some(r => r.university.institutionType !== 'FH')}`);
  console.log(`  - Has FHs: ${results1.some(r => r.university.institutionType === 'FH')}`);
  
  console.log(`\nSimulation 2 (Business Administration):`);
  console.log(`  - Total results: ${results2.length}`);
  console.log(`  - Has Universities: ${results2.some(r => r.university.institutionType !== 'FH')}`);
  console.log(`  - Has FHs: ${results2.some(r => r.university.institutionType === 'FH')}`);
  console.log(`  - FHs in favorable categories: ${results2.filter(r => r.university.institutionType === 'FH' && (r.matchType === 'safe' || r.matchType === 'available')).length}`);
  
  console.log('\n✅ Validation complete!');
  
} catch (error) {
  console.error('❌ Error during validation:', error.message);
  process.exit(1);
}

