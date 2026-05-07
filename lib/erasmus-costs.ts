/**
 * Erasmus Cost Calculation Utilities
 *
 * Functions to calculate living costs based on cost_index and partner city data.
 * Data source: EU Erasmus+ Mobility Raw Data (data.europa.eu),
 * transformed by scripts/transform-erasmus-data.js
 */

// @ts-ignore - JSON import
import erasmusPartnersData from '@/data/erasmus_partners.json';
import uniMapping from '@/data/german_uni_mapping.json';
import type { ErasmusPartner, ErasmusConfidence, ErasmusPartnerDatabase } from '@/data/erasmus-partner-types';

// JSON structure may have optional fields; use type assertion for compatibility
const erasmusDb = erasmusPartnersData as unknown as ErasmusPartnerDatabase;

interface CityCostData {
  cost_index: number;
  monthlyLivingCost: number;
  insuranceCost: number;
  travelCost: number;
}

/**
 * Calculate monthly living cost from cost_index
 * cost_index represents the base monthly living cost in EUR
 */
export function getMonthlyLivingCostFromIndex(costIndex: number): number {
  // cost_index is already the monthly living cost
  return costIndex || 850; // Default fallback
}

import { TRAVEL_COST_SHORT, TRAVEL_COST_MEDIUM, TRAVEL_COST_LONG } from './constants';

// Canonical EU member states (single source of truth)
const EU_COUNTRIES = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
  'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
  'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta',
  'Netherlands', 'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia',
  'Spain', 'Sweden',
] as const;

// EEA = EU + Norway, Iceland, Liechtenstein
const EEA_NON_EU = ['Norway', 'Iceland', 'Liechtenstein'] as const;
const EEA_COUNTRIES = [...EU_COUNTRIES, ...EEA_NON_EU];

// EU/EEA/Switzerland: no visa typically needed for Erasmus (EU students)
// UK excluded: post-Brexit requires visa. Turkey and other non-EU also require visa.
export const EU_EEA_SWISS_NO_VISA = [...EEA_COUNTRIES, 'Switzerland'] as const;

// EU + UK (for insurance; UK still has EHIC-relevant agreements)
const EU_PLUS_UK = [...EU_COUNTRIES, 'United Kingdom'];

// Nearby countries (train or short flight from Germany)
const NEARBY_COUNTRIES = [
  'Austria', 'Czech Republic', 'Poland', 'Netherlands', 'Belgium',
  'Luxembourg', 'Denmark', 'Switzerland', 'France',
];

// Medium distance (medium flight)
const MEDIUM_DISTANCE_COUNTRIES = [
  'Italy', 'Spain', 'Portugal', 'United Kingdom', 'Ireland',
  'Sweden', 'Norway', 'Finland', 'Hungary', 'Slovakia', 'Slovenia',
  'Croatia', 'Romania', 'Bulgaria', 'Greece',
];

/**
 * Returns true if the destination typically requires visa/document costs for Erasmus students.
 * Primarily relevant for non-EU destinations (e.g. UK post-Brexit, Turkey).
 */
export function isVisaRelevantDestination(country: string): boolean {
  if (!country) return false;
  return !(EU_EEA_SWISS_NO_VISA as readonly string[]).includes(country);
}

/**
 * Calculate insurance cost based on country
 */
export function getInsuranceCostByCountry(country: string): number {
  // Switzerland has special agreements
  if (country === 'Switzerland') {
    return 60; // Basic health insurance may be required
  }

  // EEA countries (EU + Norway, Iceland, Liechtenstein)
  if ((EEA_COUNTRIES as readonly string[]).includes(country)) {
    return 50; // European Health Insurance Card should cover, but travel insurance recommended
  }

  // EU + UK (special agreements)
  if ((EU_PLUS_UK as readonly string[]).includes(country)) {
    return 50;
  }

  // Non-EU countries need comprehensive travel/health insurance
  return 80;
}

/**
 * Calculate travel cost estimate based on distance from Germany
 */
export function getTravelCostByCountry(country: string): number {
  if ((NEARBY_COUNTRIES as readonly string[]).includes(country)) {
    return TRAVEL_COST_SHORT; // Train or short flight
  }

  if ((MEDIUM_DISTANCE_COUNTRIES as readonly string[]).includes(country)) {
    return TRAVEL_COST_MEDIUM; // Medium flight
  }
  
  // Further countries
  return TRAVEL_COST_LONG; // Long flight
}

/**
 * Get complete cost data for a partner city
 */
export function getCityCostData(
  partnerCity: string,
  partnerCountry: string,
  costIndex?: number
): CityCostData {
  // Try to get cost_index from partner data if not provided
  let monthlyLivingCost = costIndex || 850;
  
  // If we have a cost_index, use it directly
  if (costIndex) {
    monthlyLivingCost = getMonthlyLivingCostFromIndex(costIndex);
  } else {
    // Try to find in partner database
    const partner = findPartnerByCity(partnerCity);
    if (partner?.cost_index) {
      monthlyLivingCost = getMonthlyLivingCostFromIndex(partner.cost_index);
    }
  }
  
  return {
    cost_index: monthlyLivingCost,
    monthlyLivingCost,
    insuranceCost: getInsuranceCostByCountry(partnerCountry),
    travelCost: getTravelCostByCountry(partnerCountry),
  };
}

/**
 * Find a partner by city name in the database
 */
function findPartnerByCity(city: string): ErasmusPartner | null {
  try {
    const db = erasmusPartnersData as any;
    for (const uniKey in db.universities) {
      const uni = db.universities[uniKey];
      const partner = uni.partners.find((p: ErasmusPartner) => 
        p.partner_city.toLowerCase() === city.toLowerCase()
      );
      if (partner) return partner;
    }
  } catch (error) {
    console.error('Error finding partner by city:', error);
  }
  return null;
}

/**
 * Get all partners for a German university.
 * Optionally filter by minimum confidence level and activity type (study vs traineeship).
 */
export function getPartnersByGermanUniversity(
  germanUniId: string,
  minConfidence?: ErasmusConfidence,
  activityType?: 'study' | 'traineeship'
): ErasmusPartner[] {
  try {
    const db = erasmusPartnersData as any;
    const partners = db.universities[germanUniId]?.partners;
    if (!partners) return [];
    let mapped = partners.map((p: any) => ({
      ...p,
      german_uni_id: p.german_uni_id || germanUniId,
      source: p.source || 'eu_opendata',
      confidence: p.confidence || 'likely_active',
      activity_type: p.activity_type ?? (p.confidence === 'traineeship' ? 'traineeship' : 'study'),
    }));
    if (minConfidence) {
      mapped = filterByConfidence(mapped, minConfidence);
    }
    if (activityType) {
      mapped = mapped.filter((p: ErasmusPartner) => {
        const at = p.activity_type ?? (p.confidence === 'traineeship' ? 'traineeship' : 'study');
        return at === activityType;
      });
    }
    return mapped;
  } catch (error) {
    console.error('Error getting partners by university:', error);
    return [];
  }
}

const CONFIDENCE_RANK: Record<string, number> = {
  verified_active: 5,
  moveon_only: 4,
  likely_active: 3,
  possibly_active: 2,
  historical: 1,
  traineeship: 0,
};

function filterByConfidence(partners: ErasmusPartner[], minLevel: ErasmusConfidence): ErasmusPartner[] {
  const minRank = CONFIDENCE_RANK[minLevel] || 0;
  return partners.filter(p => (CONFIDENCE_RANK[p.confidence] || 0) >= minRank);
}

/**
 * Get all partners for a German university, filtered by subject area (optional)
 */
export function getPartnersByUniversityAndSubject(
  germanUniId: string,
  subjectArea?: string,
  minConfidence?: ErasmusConfidence
): ErasmusPartner[] {
  const partners = getPartnersByGermanUniversity(germanUniId, minConfidence);

  if (!subjectArea) {
    return partners;
  }

  return partners.filter(p =>
    p.subject_area.toLowerCase() === subjectArea.toLowerCase()
  );
}

/**
 * Convert German university name to ID.
 * Uses the auto-generated mapping from scripts/transform-erasmus-data.js,
 * plus common English/German name variants for the UI.
 */
export function getGermanUniversityId(universityName: string): string | null {
  const dynamicMapping = uniMapping as Record<string, string>;

  if (dynamicMapping[universityName]) {
    return dynamicMapping[universityName];
  }

  const db = erasmusPartnersData as any;
  if (db.universities?.[universityName]) {
    return universityName;
  }

  const nameLower = universityName.toLowerCase();
  for (const [name, id] of Object.entries(dynamicMapping)) {
    if (name.toLowerCase() === nameLower) return id;
  }

  for (const uniId of Object.keys(db.universities || {})) {
    const uni = db.universities[uniId];
    if (uni.name.toLowerCase() === nameLower) return uniId;
  }

  return null;
}

/**
 * Get German university name by ID
 */
export function getGermanUniversityName(uniId: string): string | null {
  try {
    const db = erasmusPartnersData as any;
    return db.universities[uniId]?.name || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get all German universities that have Erasmus partner data.
 * Returns sorted list of { id, name, city, partnerCount }.
 */
export function getAllGermanUniversities(): Array<{
  id: string;
  name: string;
  city: string;
  partnerCount: number;
}> {
  try {
    const db = erasmusPartnersData as any;
    if (!db.universities) return [];
    return Object.entries(db.universities)
      .map(([id, uni]: [string, any]) => ({
        id,
        name: uni.name,
        city: uni.city || '',
        partnerCount: uni.partners?.length || 0,
      }))
      .filter((u) => u.partnerCount > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    return [];
  }
}

