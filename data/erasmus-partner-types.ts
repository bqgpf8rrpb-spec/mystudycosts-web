/**
 * Erasmus Partner Data Types
 *
 * Schema for Erasmus partnerships between German universities and partner universities.
 * Supports two data sources: EU Open Data (historical mobilities) and MoveOn portals
 * (current agreements), with confidence scoring for verification status.
 */

export type ErasmusSource = 'eu_opendata' | 'moveon' | 'both';

export type ErasmusConfidence =
  | 'verified_active'   // Appears in both MoveOn AND EU data
  | 'moveon_only'       // Only in MoveOn (new agreement or no EU data for this uni)
  | 'likely_active'     // Only in EU data, last mobility 2022
  | 'possibly_active'   // Only in EU data, last mobility 2021
  | 'historical'        // Only in EU data, last mobility 2019-2020
  | 'traineeship';      // SMT entry -- not a university partnership

export interface ErasmusPartner {
  id: string;
  german_uni_id: string;
  partner_uni_name: string;
  partner_city: string;
  partner_country: string;
  subject_area: string;

  source: ErasmusSource;
  confidence: ErasmusConfidence;
  activity_type?: 'study' | 'traineeship';
  last_verified?: string;
  last_mobility_year?: number;
  faculty_department?: string;
  study_levels?: string[];
  spots_per_year?: number;
  spots_per_semester?: number;
  moveon_id?: string;

  erasmus_code?: string;
  partner_semester_fee?: number;
  cost_index?: number;
  lat?: number;
  lng?: number;
}

/**
 * Erasmus Partner Database Structure
 * Groups partners by German university
 */
export interface ErasmusPartnerDatabase {
  universities: {
    [germanUniversityId: string]: {
      name: string;
      city: string;
      partners: ErasmusPartner[];
    };
  };
}

/**
 * MoveOn portal registry entry
 */
export interface MoveOnPortal {
  university_id: string;
  university_name: string;
  portal_url: string;
  portal_type: 'standard_publisher' | 'advanced_publisher';
  slug: string;
  source: 'known' | 'discovered' | 'not_found';
  discovered_at: string;
  last_scraped?: string;
  partner_count?: number;
}

/**
 * Partner University - UI/display type for Erasmus partner institutions.
 * Used in selector, calculator, and map components.
 */
export interface PartnerUniversity {
  name: string;
  city: string;
  country: string;
  monthlyLivingCost: number;
  travelCost: number;
  insuranceCost: number;
  id?: string;
  confidence?: ErasmusConfidence;
  lastVerified?: string;
  facultyDepartment?: string;
  activity_type?: 'study' | 'traineeship';
  spotsPerYear?: number;
  spotsPerSemester?: number;
  subject_area?: string;
  erasmus_code?: string;
  cost_index?: number;
  lat?: number;
  lng?: number;
}

/**
 * Erasmus Partner Data Entry - Maps German university + degree program to partners.
 * Canonical type for erasmus-partners.json and erasmus-partners.json (legacy format).
 */
export interface ErasmusPartnerData {
  germanUniversity: string;
  courseOfStudy: string;
  partners: PartnerUniversity[] | 'no_partners_available';
}

export type ErasmusPartnersDataset = ErasmusPartnerData[];

/**
 * Helper type for backwards compatibility with old structure
 */
export interface LegacyErasmusPartnerData {
  germanUniversity: string;
  courseOfStudy: string;
  partners: Array<{
    name: string;
    city: string;
    country: string;
    monthlyLivingCost: number;
    travelCost: number;
    insuranceCost: number;
  }> | 'no_partners_available';
}

