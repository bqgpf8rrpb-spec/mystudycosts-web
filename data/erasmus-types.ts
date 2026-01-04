/**
 * TypeScript Type Definitions for Erasmus Partner Data
 * 
 * This file defines the data structure for German universities,
 * their degree programs, and Erasmus partner institutions.
 */

/**
 * Partner University - Represents an Erasmus partner institution
 */
export interface PartnerUniversity {
  name: string;
  city: string;
  country: string;
  monthlyLivingCost: number; // Estimated monthly living cost in EUR (2026 projected)
  travelCost: number; // One-time travel cost in EUR (flight/train)
  insuranceCost: number; // Monthly health insurance cost in EUR
}

/**
 * Erasmus Partner Data Entry - Maps a German university + degree program to partner universities
 */
export interface ErasmusPartnerData {
  germanUniversity: string; // Must match name from universities.json
  courseOfStudy: string; // Degree program name (Studiengang)
  partners: PartnerUniversity[];
}

/**
 * Complete Erasmus Partners Dataset
 */
export type ErasmusPartnersDataset = ErasmusPartnerData[];

/**
 * Helper type for country names (for type safety when adding new countries)
 */
export type ErasmusCountry = 
  | 'Austria' | 'Belgium' | 'Bulgaria' | 'Croatia' | 'Cyprus'
  | 'Czech Republic' | 'Denmark' | 'Estonia' | 'Finland' | 'France'
  | 'Greece' | 'Hungary' | 'Iceland' | 'Ireland' | 'Italy'
  | 'Latvia' | 'Liechtenstein' | 'Lithuania' | 'Luxembourg' | 'Malta'
  | 'Netherlands' | 'Norway' | 'Poland' | 'Portugal' | 'Romania'
  | 'Slovakia' | 'Slovenia' | 'Spain' | 'Sweden' | 'Switzerland'
  | 'United Kingdom';

