require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Pre-flight check for environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("🔍 Debugging Environment Variables:");
console.log(`- URL Found: ${supabaseUrl ? "YES" : "NO"} (${supabaseUrl ? supabaseUrl.substring(0, 10) + "..." : "Empty"})`);
console.log(`- Key Found: ${supabaseKey ? "YES" : "NO"}`);

if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  throw new Error("❌ Error: NEXT_PUBLIC_SUPABASE_URL is missing or invalid in .env.local");
}
if (!supabaseKey) {
  throw new Error("❌ Error: SUPABASE_SERVICE_ROLE_KEY is missing in .env.local");
}

// Setup Supabase client (only after validation)
const supabase = createClient(supabaseUrl, supabaseKey);
console.log("✅ Supabase client initialized successfully");

async function uploadFUData() {
  try {
    console.log('🚀 Starting FU Berlin data upload...');

    // Check if file exists
    if (!fs.existsSync('partners_fu.json')) {
      console.error('❌ partners_fu.json not found');
      process.exit(1);
    }

    // Read and parse JSON
    console.log('📖 Reading partners_fu.json...');
    const rawData = fs.readFileSync('partners_fu.json', 'utf8');
    const partners = JSON.parse(rawData);

    if (!Array.isArray(partners) || partners.length === 0) {
      console.error('❌ Invalid or empty data in partners_fu.json');
      process.exit(1);
    }

    console.log(`📊 Found ${partners.length} partners to upload`);

    // Map data to database schema
    const mappedData = partners.map(partner => ({
      moveon_id: partner.moveon_id || '',
      name: partner.name || '',
      city: partner.city || '',
      country: partner.country || '',
      website: partner.website || '',
      lat: partner.lat ? parseFloat(partner.lat) : null,
      lng: partner.lng ? parseFloat(partner.lng) : null,
      subject_areas: partner.subject_areas || [],
      home_university: partner.home_university || 'FU Berlin'
    }));

    // Upload in batches of 50
    const batchSize = 50;
    let uploadedCount = 0;

    console.log(`⬆️ Uploading ${mappedData.length} partners in batches of ${batchSize}...`);

    for (let i = 0; i < mappedData.length; i += batchSize) {
      const batch = mappedData.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(mappedData.length / batchSize);

      console.log(`📤 Uploading batch ${batchNumber}/${totalBatches} (${batch.length} items)...`);

      try {
        const { data, error } = await supabase
          .from('partners')
          .upsert(batch, {
            onConflict: 'moveon_id', // Use moveon_id as unique identifier
            ignoreDuplicates: false
          });

        if (error) {
          console.error(`❌ Error uploading batch ${batchNumber}:`, error.message);
          console.error('Failed batch data:', JSON.stringify(batch.slice(0, 3), null, 2));
        } else {
          uploadedCount += batch.length;
          console.log(`✅ Batch ${batchNumber}/${totalBatches} uploaded successfully`);
        }
      } catch (batchError) {
        console.error(`❌ Unexpected error in batch ${batchNumber}:`, batchError.message);
      }

      // Small delay between batches to be gentle on the API
      if (i + batchSize < mappedData.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`🎉 Upload complete! ${uploadedCount}/${mappedData.length} partners uploaded to Supabase`);

    // Show sample of uploaded data
    if (mappedData.length > 0) {
      console.log('📊 Sample uploaded partners:');
      for (let i = 0; i < Math.min(3, mappedData.length); i++) {
        const p = mappedData[i];
        console.log(`  ${i + 1}: "${p.name}" (${p.city}, ${p.country})`);
      }
    }

  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    process.exit(1);
  }
}

// Run the upload
uploadFUData();