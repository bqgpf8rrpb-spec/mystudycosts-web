#!/usr/bin/env node

/**
 * Database Validation Script for NC-Checker 2026
 * 
 * Validates the university_programs.json database to ensure:
 * - Sufficient data coverage
 * - No data loss during import
 * - Proper distribution across institution types
 */

const fs = require('fs');
const path = require('path');

// File paths
const UNIVERSITY_PROGRAMS_PATH = path.join(__dirname, '../data/university_programs.json');
const UNIVERSITIES_PATH = path.join(__dirname, '../data/universities.json');

// Thresholds for warnings
const MIN_BWL_ENTRIES = 100;
const MIN_FH_ENTRIES = 150;

/**
 * Main validation function
 */
function validateDatabase() {
  console.log('🔍 Validating NC-Checker Database...\n');
  console.log('=' .repeat(60));

  try {
    // Read university programs data
    const programsData = JSON.parse(fs.readFileSync(UNIVERSITY_PROGRAMS_PATH, 'utf-8'));
    
    // Read universities data for institution type mapping
    const universitiesData = JSON.parse(fs.readFileSync(UNIVERSITIES_PATH, 'utf-8'));
    
    // Create a map of university name -> institution type
    const universityTypeMap = new Map();
    universitiesData.forEach(uni => {
      universityTypeMap.set(uni.name, uni.institutionType || 'University');
    });
    
    // Track missing universities for debugging
    const missingUniversities = new Set();

    // Statistics
    let totalEntries = 0;
    let uniEntries = 0;
    let fhEntries = 0;
    let unknownTypeEntries = 0;
    let bwlEntries = 0;
    
    // Process each university
    Object.entries(programsData).forEach(([universityName, programs]) => {
      let institutionType = universityTypeMap.get(universityName);
      
      // If not found, try to find a similar match (case-insensitive)
      if (!institutionType) {
        for (const [uniName, type] of universityTypeMap.entries()) {
          if (uniName.toLowerCase() === universityName.toLowerCase()) {
            institutionType = type;
            break;
          }
        }
      }
      
      // If still not found, mark as unknown
      if (!institutionType) {
        institutionType = 'Unknown';
        missingUniversities.add(universityName);
      }
      
      // Handle both old format (string[]) and new format (StudyProgram[])
      const programList = Array.isArray(programs) ? programs : [];
      
      programList.forEach(program => {
        totalEntries++;
        
        // Count by institution type
        if (institutionType === 'University') {
          uniEntries++;
        } else if (institutionType === 'FH') {
          fhEntries++;
        } else {
          unknownTypeEntries++;
        }
        
        // Extract program name (handle both string and object format)
        const programName = typeof program === 'string' ? program : program.name || '';
        const programNameLower = programName.toLowerCase();
        
        // Count BWL entries
        if (programNameLower.includes('bwl') || 
            programNameLower.includes('betriebswirtschaft') ||
            programNameLower.includes('business administration') ||
            programNameLower.includes('management')) {
          bwlEntries++;
        }
      });
    });

    // Display statistics
    console.log('\n📊 Database Statistics:\n');
    console.log(`Total Entries: ${totalEntries.toLocaleString()}`);
    console.log(`  ├─ University (Uni): ${uniEntries.toLocaleString()}`);
    console.log(`  ├─ FH (Fachhochschule): ${fhEntries.toLocaleString()}`);
    if (unknownTypeEntries > 0) {
      console.log(`  └─ Unknown Type: ${unknownTypeEntries.toLocaleString()}`);
    } else {
      console.log(`  └─ Unknown Type: 0`);
    }
    
    console.log(`\nBWL-Related Entries: ${bwlEntries.toLocaleString()}`);
    console.log(`  (Includes: BWL, Betriebswirtschaft, Business Administration, Management)`);

    // Validation checks
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  Validation Results:\n');
    
    let hasWarnings = false;
    
    // Check BWL entries
    if (bwlEntries < MIN_BWL_ENTRIES) {
      console.log(`❌ WARNING: BWL entries (${bwlEntries}) is below threshold (${MIN_BWL_ENTRIES})`);
      console.log(`   This may indicate data loss or incomplete import.`);
      hasWarnings = true;
    } else {
      console.log(`✅ BWL entries: ${bwlEntries} (threshold: ${MIN_BWL_ENTRIES})`);
    }
    
    // Check FH entries
    if (fhEntries < MIN_FH_ENTRIES) {
      console.log(`❌ WARNING: FH entries (${fhEntries}) is below threshold (${MIN_FH_ENTRIES})`);
      console.log(`   This may indicate missing Fachhochschule data.`);
      hasWarnings = true;
    } else {
      console.log(`✅ FH entries: ${fhEntries} (threshold: ${MIN_FH_ENTRIES})`);
    }
    
    // Additional checks
    if (unknownTypeEntries > 0) {
      console.log(`⚠️  WARNING: ${unknownTypeEntries} entries have unknown institution type`);
      console.log(`   These universities may not be properly categorized.`);
      if (missingUniversities.size > 0 && missingUniversities.size <= 10) {
        console.log(`   Missing universities (first 10):`);
        Array.from(missingUniversities).slice(0, 10).forEach(name => {
          console.log(`     - ${name}`);
        });
      } else if (missingUniversities.size > 10) {
        console.log(`   Missing universities: ${missingUniversities.size} total`);
        console.log(`   First 5 examples:`);
        Array.from(missingUniversities).slice(0, 5).forEach(name => {
          console.log(`     - ${name}`);
        });
      }
      hasWarnings = true;
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    if (hasWarnings) {
      console.log('⚠️  Validation completed with warnings. Please review the data.');
      process.exit(1);
    } else {
      console.log('✅ Database validation passed! All thresholds met.');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Error reading database files:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run validation
validateDatabase();

