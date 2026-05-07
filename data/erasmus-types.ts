/**
 * Erasmus Type Definitions
 *
 * Re-exports canonical types from erasmus-partner-types.ts for backward compatibility.
 * New code should import directly from @/data/erasmus-partner-types.
 */

export type {
  PartnerUniversity,
  ErasmusPartnerData,
  ErasmusPartnersDataset,
} from '@/data/erasmus-partner-types';

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
