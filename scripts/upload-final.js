// Main async execution function
async function main() {
  console.log("📤 UPLOADING FINAL ERASMUS PARTNERS TO SUPABASE");
  console.log("=================================================");

  // CRITICAL: Load environment variables explicitly from .env.local
  console.log("📋 Loading environment variables from .env.local...");
  require('dotenv').config({ path: '.env.local' });

  // HARDCODED FALLBACKS: Use environment variables or demo credentials
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Use hardcoded fallbacks if env vars are missing or are placeholder values
  const SUPABASE_URL = (envUrl && !envUrl.includes('your_') && !envUrl.includes('placeholder')) ?
    envUrl : 'https://pwxkvtmtehutnckzxkaq.supabase.co';

  const SUPABASE_KEY = (envKey && !envKey.includes('your_') && !envKey.includes('placeholder')) ?
    envKey : 'sb_publishable_S8o3Kwp7iQuQFgjdemsXNw__01WLGEZ';

  // LOG CONNECTION INFO
  const usingEnvVars = envUrl && envKey && !envUrl.includes('your_') && !envKey.includes('your_');
  if (usingEnvVars) {
    console.log('🔗 Using Supabase credentials from environment variables');
  } else {
    console.log('🔗 Using hardcoded demo Supabase credentials');
  }
  console.log("🔗 Connecting to Supabase at:", SUPABASE_URL);

  // BASIC VALIDATION
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials');
    console.error('💡 Check your .env.local file or hardcoded fallbacks');
    process.exit(1);
  }

  console.log('✅ Supabase credentials configured successfully');

  // Load dependencies
  console.log("📦 Loading dependencies...");
  const fs = require('fs');
  const path = require('path');
  const { createClient } = require('@supabase/supabase-js');

  // Initialize Supabase client with validated constants
  console.log("🔗 Initializing Supabase client...");
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Test Supabase connection and check table schema
  console.log("🧪 Testing Supabase connection...");
  try {
    const { data, error } = await supabase.from('erasmus_partners').select('count', { count: 'exact', head: true });
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      console.error('💡 This might mean the erasmus_partners table does not exist');
      console.error('💡 Please create the table in your Supabase database first');
      process.exit(1);
    }
    console.log("✅ Supabase connection successful");

    // Check if we can access a few columns to understand the schema
    try {
      const { data: schemaTest, error: schemaError } = await supabase
        .from('erasmus_partners')
        .select('home_university, partner_university_name, partner_city')
        .limit(1);

      if (schemaError) {
        console.log("⚠️  Schema check failed, but continuing with upload...");
        console.log("Schema error:", schemaError.message);
      } else {
        console.log("✅ Table schema appears compatible");
      }
    } catch (schemaCheckError) {
      console.log("⚠️  Could not verify schema, but continuing with upload...");
    }

  } catch (err) {
    console.error('❌ Supabase connection test failed:', err.message);
    process.exit(1);
  }

  // Load the partners data (try all_partners_temp first, then multi-universities, then final)
  let dataFilePath = path.join(__dirname, '..', 'all_partners_temp.json');
  let dataFileName = 'all_partners_temp.json';

  if (!fs.existsSync(dataFilePath)) {
    dataFilePath = path.join(__dirname, '..', 'multi_universities_partners.json');
    dataFileName = 'multi_universities_partners.json';
  }

  if (!fs.existsSync(dataFilePath)) {
    dataFilePath = path.join(__dirname, '..', 'final_partners.json');
    dataFileName = 'final_partners.json';
  }

  console.log(`📄 Loading ${dataFileName}...`);

  if (!fs.existsSync(dataFilePath)) {
    console.error(`❌ No partner data files found`);
    console.error("💡 Run scrape-multi-universities.js or scrape-final.js first to generate data.");
    process.exit(1);
  }

  let partnersData;
  try {
    partnersData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    console.log(`✅ Loaded ${partnersData.length} partners from ${dataFileName}`);
  } catch (parseError) {
    console.error(`❌ Failed to parse ${dataFileName}:`, parseError.message);
    process.exit(1);
  }

  // CLEAN IMPORT: Truncate existing data
  console.log("🧹 Performing clean import - truncating existing data...");
  try {
    const { error: truncateError } = await supabase
      .from('erasmus_partners')
      .delete()
      .neq('home_university', 'NONEXISTENT'); // This will delete all rows

    if (truncateError) {
      console.error('❌ Failed to truncate table:', truncateError.message);
      console.error('💡 Continuing with upload anyway...');
    } else {
      console.log("✅ Existing data cleared from erasmus_partners table");
    }
  } catch (truncateErr) {
    console.error('❌ Truncate operation failed:', truncateErr.message);
    console.error('💡 Continuing with upload anyway...');
  }

  // Data mapping function - only include columns that exist in the database
  function mapPartnerForDatabase(partner) {
    // Handle subject area arrays (join with comma)
    let subjectArea = partner.subject_area;
    if (Array.isArray(subjectArea)) {
      subjectArea = subjectArea.join(', ');
    }

    // Handle website URL
    let websiteUrl = partner.website_url || partner.website || '';

    // Handle program type
    let programType = partner.program || partner.program_type || 'Erasmus';

    // Ensure required fields exist
    if (!partner.partner_university_name) {
      console.warn(`⚠️  Skipping partner without university name:`, partner.id || 'unknown');
      return null;
    }

    // CORE FIELDS ONLY: Minimal mapping to ensure compatibility
    const mappedData = {
      home_university: 'TUM', // Always TUM for this dataset
      partner_university_name: partner.partner_university_name,
      partner_city: partner.partner_city || '',
      partner_country: partner.partner_country || null,
      subject_area: subjectArea || ''
    };

    // Note: Using only the absolute minimum fields to avoid any schema conflicts
    // Excluding: website_url, program_type, academic_level, cost_index, erasmus_code, scraped_at, source
    // These can be added later once the exact database schema is known

    return mappedData;
  }

  // Main upload function
  async function uploadPartners() {
    console.log("🔄 Processing and validating data...");

    // DE-DUPLICATE: Remove duplicates based on university name + subject area
    console.log("🔧 De-duplicating data based on university name + subject area...");
    const seen = new Set();
    const deduplicatedData = [];

    for (const partner of partnersData) {
      const key = `${partner.partner_university_name || ''}|${partner.subject_area || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicatedData.push(partner);
      }
    }

    console.log(`✅ De-duplicated from ${partnersData.length} to ${deduplicatedData.length} unique partners`);

    // Map and validate all partners
    const validPartners = [];
    let skippedCount = 0;

    for (const partner of deduplicatedData) {
      const mappedPartner = mapPartnerForDatabase(partner);
      if (mappedPartner) {
        validPartners.push(mappedPartner);
      } else {
        skippedCount++;
      }
    }

    console.log(`✅ Validated ${validPartners.length} partners for upload`);
    if (skippedCount > 0) {
      console.log(`⚠️  Skipped ${skippedCount} invalid partners`);
    }

    if (validPartners.length === 0) {
      console.error("❌ No valid partners to upload");
      return;
    }

    // Upload in batches of 50 to prevent timeouts
    const batchSize = 50;
    const totalBatches = Math.ceil(validPartners.length / batchSize);

    console.log(`📤 Starting batch upload (${batchSize} per batch, ${totalBatches} batches total)...`);

    for (let i = 0; i < validPartners.length; i += batchSize) {
      const batch = validPartners.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

    console.log(`📤 Uploading batch ${batchNumber}/${totalBatches} (${batch.length} partners)...`);

    try {
      const { data, error } = await supabase
        .from('erasmus_partners')
        .upsert(batch, {
          onConflict: 'home_university,partner_university_name,subject_area'
        });

      if (error) {
        console.error(`❌ Batch ${batchNumber} failed:`, error.message);
        // Continue with next batch despite errors
      }

      // Small delay between batches to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (err) {
      console.error(`💥 Batch ${batchNumber} error:`, err.message);
      // Continue with next batch
    }
    }

    // Final verification
    console.log("🔍 Verifying upload...");

    try {
      const { count, error } = await supabase
        .from('erasmus_partners')
        .select('*', { count: 'exact', head: true })
        .eq('home_university', 'TUM');

      if (error) {
        console.error('❌ Verification failed:', error.message);
      } else {
        console.log(`✅ Verification complete: ${count} TUM partners in database`);
        console.log(`🎉 Success: Uploaded ${validPartners.length} partners to Supabase!`);
      }
    } catch (verifyError) {
      console.error('❌ Verification error:', verifyError.message);
    }
  }

  console.log("🎯 Starting final partners upload to Supabase...");
  console.log("");

  try {
    await uploadPartners();
  } catch (error) {
    console.error('💥 Upload failed:', error.message);
    process.exit(1);
  }

  console.log("🏁 Upload script completed!");
}

// Run the main async function
main().catch(error => {
  console.error('💥 Fatal error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});