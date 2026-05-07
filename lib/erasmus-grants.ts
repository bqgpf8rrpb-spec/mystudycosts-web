/**
 * Erasmus+ Grant Logic - Single Source of Truth
 *
 * Official Erasmus+ country groups and monthly grant amounts (2026).
 * Group 1: 600€ | Group 2: 540€ | Group 3: 490€
 */

export type ErasmusGroup = 1 | 2 | 3;

export interface ErasmusGrantResult {
  amount: number;
  group: ErasmusGroup;
}

/** Normalize country strings to handle synonyms (e.g. UK -> United Kingdom) */
const COUNTRY_SYNONYMS: Record<string, string> = {
  UK: 'United Kingdom',
  'Great Britain': 'United Kingdom',
  England: 'United Kingdom',
  Wales: 'United Kingdom',
  Scotland: 'United Kingdom',
  'Czechia': 'Czech Republic',
  'The Netherlands': 'Netherlands',
  Holland: 'Netherlands',
};

function normalizeCountryName(country: string): string {
  if (!country || typeof country !== 'string') return '';
  const trimmed = country.trim();
  if (!trimmed) return '';
  // Check exact synonym match (case-insensitive)
  const key = Object.keys(COUNTRY_SYNONYMS).find(
    (k) => k.toLowerCase() === trimmed.toLowerCase()
  );
  return key ? COUNTRY_SYNONYMS[key] : trimmed;
}

// Group 1: 600€/month (highest living cost)
const GROUP_1_COUNTRIES: readonly string[] = [
  'Denmark',
  'United Kingdom',
  'Norway',
  'Switzerland',
  'Iceland',
  'Liechtenstein',
  'Luxembourg',
];

// Group 2: 540€/month
const GROUP_2_COUNTRIES: readonly string[] = [
  'Spain',
  'Italy',
  'France',
  'Netherlands',
  'Belgium',
  'Austria',
  'Sweden',
  'Finland',
  'Ireland',
];

// Group 3: 490€/month (default fallback)
const GROUP_3_COUNTRIES: readonly string[] = [
  'Poland',
  'Portugal',
  'Czech Republic',
  'Greece',
  'Hungary',
  'Romania',
  'Bulgaria',
  'Croatia',
  'Slovakia',
  'Slovenia',
  'Estonia',
  'Latvia',
  'Lithuania',
  'Cyprus',
  'Malta',
];

const GRANT_BY_GROUP: Record<ErasmusGroup, number> = {
  1: 600,
  2: 540,
  3: 490,
};

/** Lookup map: normalized country name -> group */
const COUNTRY_TO_GROUP = new Map<string, ErasmusGroup>([
  ...GROUP_1_COUNTRIES.map((c) => [c, 1] as const),
  ...GROUP_2_COUNTRIES.map((c) => [c, 2] as const),
  ...GROUP_3_COUNTRIES.map((c) => [c, 3] as const),
]);

/**
 * Get Erasmus+ grant amount and group for a destination country.
 * Uses string normalizer for synonyms (UK -> United Kingdom, etc.).
 */
export function getErasmusGrant(country?: string): ErasmusGrantResult {
  const normalized = normalizeCountryName(country || '');
  const group: ErasmusGroup = (COUNTRY_TO_GROUP.get(normalized) as ErasmusGroup) ?? 3;
  return {
    amount: GRANT_BY_GROUP[group],
    group,
  };
}

/** Get only the grant amount (for backwards compatibility where only the number is needed) */
export function getErasmusGrantAmount(country?: string): number {
  return getErasmusGrant(country).amount;
}
