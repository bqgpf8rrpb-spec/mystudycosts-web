/**
 * Dynamic Cost Calculation System
 * 
 * Calculates monthly living costs based on city price indices for 2026
 */

// Base rent per square meter for a typical WG room (20 sqm) in a reference city (Leipzig = 1.0)
// This is the baseline for calculating all other cities
const BASE_RENT_PER_SQM = 15; // €/sqm/month for Leipzig (price_factor = 0.9)
const TYPICAL_WG_ROOM_SIZE = 20; // sqm

// Base monthly rent for Leipzig (reference city)
const BASE_MONTHLY_RENT = BASE_RENT_PER_SQM * TYPICAL_WG_ROOM_SIZE; // 300€

// City price factors (relative to Leipzig = 0.9)
// Munich is the most expensive (1.8), Leipzig is the cheapest (0.9)
export const CITY_PRICE_FACTORS: Record<string, number> = {
  // Major cities (high cost)
  'Munich': 1.8,
  'München': 1.8,
  'Frankfurt': 1.6,
  'Stuttgart': 1.5,
  'Düsseldorf': 1.5,
  'Heidelberg': 1.5,
  'Darmstadt': 1.5,
  'Hamburg': 1.4,
  'Berlin': 1.3,
  'Cologne': 1.3,
  'Köln': 1.3,
  'Bonn': 1.3,
  'Freiburg': 1.3,
  'Tübingen': 1.3,
  'Konstanz': 1.3,
  'Mannheim': 1.2,
  'Augsburg': 1.2,
  'Karlsruhe': 1.2,
  'Münster': 1.2,
  'Potsdam': 1.2,
  'Mainz': 1.2,
  'Erlangen': 1.2,
  'Regensburg': 1.1,
  'Würzburg': 1.1,
  'Aachen': 1.1,
  'Bremen': 1.1,
  'Hannover': 1.1,
  'Hanover': 1.1,
  'Lübeck': 1.1,
  'Ulm': 1.1,
  'Nuremberg': 1.1,
  'Nürnberg': 1.1,
  'Oldenburg': 1.0,
  'Osnabrück': 1.0,
  'Passau': 1.0,
  'Kiel': 1.0,
  'Rostock': 1.0,
  'Trier': 1.0,
  'Göttingen': 1.0,
  'Marburg': 1.0,
  'Kassel': 0.95,
  'Siegen': 0.95,
  'Wuppertal': 0.95,
  'Bochum': 0.95,
  'Dortmund': 0.95,
  'Essen': 0.95,
  'Duisburg': 0.95,
  'Bielefeld': 0.95,
  'Leipzig': 0.9,
  'Dresden': 0.9,
  'Jena': 0.9,
  'Halle': 0.9,
  'Magdeburg': 0.9,
  'Erfurt': 0.9,
  'Weimar': 0.9,
  'Chemnitz': 0.85,
  'Cottbus': 0.85,
  'Greifswald': 0.85,
  'Bayreuth': 0.9,
  'Bamberg': 0.95,
  'Gießen': 1.0,
  'Koblenz': 0.95,
  'Kaiserslautern': 0.95,
  'Saarbrücken': 0.95,
  'Saarbrucken': 0.95,
  'Flensburg': 0.9,
  'Braunschweig': 0.95,
  'Lüneburg': 0.95,
};

// Fixed monthly costs (same for all cities)
const FIXED_MONTHLY_COSTS = {
  // Utilities (included in rent estimate, but separated for transparency)
  electricity: 35, // €/month
  internet: 25, // €/month
  heating: 50, // €/month (average, varies by season)
  
  // Living expenses
  groceries: 200, // €/month (basic student diet)
  healthInsurance: 120, // €/month (public health insurance)
  publicTransport: 50, // €/month (semester ticket or monthly pass)
  phone: 15, // €/month
  leisure: 100, // €/month (entertainment, going out)
  clothing: 30, // €/month (average)
  personalCare: 25, // €/month
  miscellaneous: 50, // €/month (unexpected expenses)
};

/**
 * Calculate monthly rent for a city based on price factor
 * 
 * @param city - City name
 * @param roomSize - Room size in square meters (default: 20 sqm for typical WG room)
 * @returns Monthly rent in euros
 */
export function calculateMonthlyRent(city: string, roomSize: number = TYPICAL_WG_ROOM_SIZE): number {
  // Normalize city name (handle variations)
  const normalizedCity = normalizeCityName(city);
  
  // Get price factor (default to 1.0 if city not found)
  const priceFactor = CITY_PRICE_FACTORS[normalizedCity] || 1.0;
  
  // Calculate rent: base rent * price factor * (room size / base room size)
  const monthlyRent = BASE_MONTHLY_RENT * priceFactor * (roomSize / TYPICAL_WG_ROOM_SIZE);
  
  return Math.round(monthlyRent);
}

/**
 * Calculate total monthly living costs for a city
 * Includes rent, utilities, groceries, insurance, transport, etc.
 * 
 * @param city - City name
 * @param roomSize - Room size in square meters (default: 20 sqm)
 * @param includeUtilities - Whether to include utilities in rent (default: true)
 * @returns Object with breakdown of monthly costs
 */
export function calculateMonthlyCosts(
  city: string,
  roomSize: number = TYPICAL_WG_ROOM_SIZE,
  includeUtilities: boolean = true
): {
  rent: number;
  utilities: number;
  livingExpenses: number;
  total: number;
  breakdown: {
    rent: number;
    electricity: number;
    internet: number;
    heating: number;
    groceries: number;
    healthInsurance: number;
    publicTransport: number;
    phone: number;
    leisure: number;
    clothing: number;
    personalCare: number;
    miscellaneous: number;
  };
} {
  const rent = calculateMonthlyRent(city, roomSize);
  
  // Utilities (if not included in rent)
  const utilities = includeUtilities ? 0 : (
    FIXED_MONTHLY_COSTS.electricity +
    FIXED_MONTHLY_COSTS.internet +
    FIXED_MONTHLY_COSTS.heating
  );
  
  // Living expenses (fixed for all cities)
  const livingExpenses = 
    FIXED_MONTHLY_COSTS.groceries +
    FIXED_MONTHLY_COSTS.healthInsurance +
    FIXED_MONTHLY_COSTS.publicTransport +
    FIXED_MONTHLY_COSTS.phone +
    FIXED_MONTHLY_COSTS.leisure +
    FIXED_MONTHLY_COSTS.clothing +
    FIXED_MONTHLY_COSTS.personalCare +
    FIXED_MONTHLY_COSTS.miscellaneous;
  
  const total = rent + utilities + livingExpenses;
  
  return {
    rent,
    utilities: includeUtilities ? (FIXED_MONTHLY_COSTS.electricity + FIXED_MONTHLY_COSTS.internet + FIXED_MONTHLY_COSTS.heating) : utilities,
    livingExpenses,
    total: Math.round(total),
    breakdown: {
      rent,
      electricity: FIXED_MONTHLY_COSTS.electricity,
      internet: FIXED_MONTHLY_COSTS.internet,
      heating: FIXED_MONTHLY_COSTS.heating,
      groceries: FIXED_MONTHLY_COSTS.groceries,
      healthInsurance: FIXED_MONTHLY_COSTS.healthInsurance,
      publicTransport: FIXED_MONTHLY_COSTS.publicTransport,
      phone: FIXED_MONTHLY_COSTS.phone,
      leisure: FIXED_MONTHLY_COSTS.leisure,
      clothing: FIXED_MONTHLY_COSTS.clothing,
      personalCare: FIXED_MONTHLY_COSTS.personalCare,
      miscellaneous: FIXED_MONTHLY_COSTS.miscellaneous,
    },
  };
}

import { normalizeCityName } from './city-utils';

/**
 * Get price factor for a city
 * 
 * @param city - City name
 * @returns Price factor (1.0 = average, >1.0 = expensive, <1.0 = cheap)
 */
export function getCityPriceFactor(city: string): number {
  const normalizedCity = normalizeCityName(city);
  return CITY_PRICE_FACTORS[normalizedCity] || 1.0;
}

/**
 * Get cost transparency text
 */
export function getCostTransparencyText(locale: string = 'en'): string {
  if (locale === 'de') {
    return 'Geschätzte Kosten für 2026 basierend auf aktuellen Stadtpreisindizes.';
  }
  return 'Estimated costs for 2026 based on current city price indices.';
}

