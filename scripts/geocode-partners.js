console.log("🗺️  GEOCODING ERASMUS PARTNERS");
console.log("==============================");

// Load environment variables explicitly
console.log("📋 Loading environment variables from .env.local...");
require('dotenv').config({ path: '.env.local' });

// HARDCODED FALLBACKS: Use environment variables or demo credentials
const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use hardcoded fallbacks if env vars are missing or are placeholder values
const SUPABASE_URL = (envUrl && !envUrl.includes('your_') && !envUrl.includes('placeholder')) ?
  envUrl : 'https://pwxkvtmtehutnckzxkaq.supabase.co';

const SUPABASE_KEY = (envKey && !envKey.includes('your_') && !envKey.includes('placeholder')) ?
  envKey : 'sb_publishable_S8o3Kwp7iQuQFgjdemsXNw__01WLGEZ';

// Basic validation
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('💡 Check hardcoded fallbacks or .env.local file');
  process.exit(1);
}

// LOG CONNECTION INFO
const usingEnvVars = envUrl && envKey && !envUrl.includes('your_') && !envKey.includes('your_');
if (usingEnvVars) {
  console.log('🔗 Using Supabase credentials from environment variables');
} else {
  console.log('🔗 Using hardcoded demo Supabase credentials');
}
console.log("🔗 Connecting to Supabase at:", SUPABASE_URL);

console.log('✅ Supabase credentials configured');

// Load dependencies
console.log("📦 Loading dependencies...");
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
console.log("🔗 Initializing Supabase client...");
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Test Supabase connection
console.log("🧪 Testing Supabase connection...");
supabase.from('erasmus_partners').select('count', { count: 'exact', head: true })
  .then(() => console.log("✅ Supabase connection successful"))
  .catch(err => {
    console.error('❌ Supabase connection failed:', err.message);
    process.exit(1);
  });

// Geocoding function using Nominatim
async function geocodeCity(city, country) {
  if (!city) {
    return null;
  }

  // Try with city + country first (if country is valid)
  if (country && country !== 'Various' && country !== null) {
    try {
      const query = `city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}`;
      const url = `https://nominatim.openstreetmap.org/search?${query}&format=json&limit=1`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'MyStudyCosts-Bot/1.0'
        }
      });

      if (!response.ok) {
        console.warn(`⚠️  Geocoding API error for ${city}, ${country}: ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon)
        };
      }
    } catch (error) {
      console.warn(`⚠️  Geocoding failed for ${city}, ${country}: ${error.message}`);
    }
  }

  // If city+country failed or country is invalid, try just the city
  if (country !== city) { // Avoid duplicate queries
    try {
      console.log(`🔄 Trying city-only geocoding for: ${city}`);
      const query = `q=${encodeURIComponent(city)}&format=json&limit=1`;
      const url = `https://nominatim.openstreetmap.org/search?${query}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'MyStudyCosts-Bot/1.0'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const result = data[0];
          return {
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon)
          };
        }
      }
    } catch (error) {
      console.warn(`⚠️  City-only geocoding also failed for ${city}: ${error.message}`);
    }
  }

  return null;
}

// Main geocoding function
async function geocodePartners() {
  console.log("🔍 Fetching partners without coordinates...");

  // Fetch partners without coordinates
  const { data: partners, error } = await supabase
    .from('erasmus_partners')
    .select('id, partner_city, partner_country, partner_university_name')
    .is('latitude', null)
    .not('partner_city', 'is', null);

  if (error) {
    console.error('❌ Failed to fetch partners:', error.message);
    return;
  }

  if (!partners || partners.length === 0) {
    console.log("✅ All partners already have coordinates!");
    return;
  }

  console.log(`📍 Found ${partners.length} partners to geocode`);

  let successCount = 0;
  let failCount = 0;

  // Process each partner
  for (let i = 0; i < partners.length; i++) {
    const partner = partners[i];

    const countryDisplay = partner.partner_country && partner.partner_country !== 'Various' ?
      partner.partner_country : '(country unknown)';
    console.log(`📍 [${i + 1}/${partners.length}] Geocoding: ${partner.partner_city}, ${countryDisplay} (${partner.partner_university_name})`);

    // Geocode the city/country
    const coordinates = await geocodeCity(partner.partner_city, partner.partner_country);

    if (coordinates) {
      // Update the database with coordinates
      const { error: updateError } = await supabase
        .from('erasmus_partners')
        .update({
          latitude: coordinates.latitude,
          longitude: coordinates.longitude
        })
        .eq('id', partner.id);

      if (updateError) {
        console.error(`❌ Failed to update ${partner.partner_city}: ${updateError.message}`);
        failCount++;
      } else {
        console.log(`✅ Updated: ${partner.partner_city} -> ${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`);
        successCount++;
      }
    } else {
      console.log(`⚠️  No coordinates found for: ${partner.partner_city}`);
      failCount++;
    }

    // Rate limiting: wait 1 second between requests (Nominatim requirement)
    if (i < partners.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Final summary
  console.log("\n📊 GEOCODING SUMMARY");
  console.log("===================");
  console.log(`✅ Successfully geocoded: ${successCount} partners`);
  console.log(`⚠️  Failed to geocode: ${failCount} partners`);
  console.log(`📍 Total processed: ${partners.length} partners`);

  if (successCount > 0) {
    console.log(`🎉 ${successCount} partners now have coordinates for mapping!`);
  }
}

// Main execution
async function main() {
  console.log("🎯 Starting Erasmus partners geocoding...");
  console.log("📋 This script will:");
  console.log("  - Find partners without coordinates");
  console.log("  - Geocode cities using Nominatim API");
  console.log("  - Update database with latitude/longitude");
  console.log("  - Respect rate limits (1 second between requests)");
  console.log("");

  try {
    await geocodePartners();
  } catch (error) {
    console.error('💥 Geocoding failed:', error.message);
    process.exit(1);
  }

  console.log("🏁 Geocoding script completed!");
}

// Run the main function
main().catch(error => {
  console.error('💥 Fatal error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});