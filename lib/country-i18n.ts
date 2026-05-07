/**
 * Country name i18n utilities for DE/EN locales.
 * Uses data/country-translations.json (DE -> EN) and derives reverse mappings.
 */

// @ts-ignore - JSON import
import countryTranslations from '@/data/country-translations.json';

type Locale = 'de' | 'en';

const deToEn = countryTranslations as Record<string, string>;

// Build reverse map EN -> DE (first DE key that maps to each EN value)
const enToDe: Record<string, string> = {};
for (const [de, en] of Object.entries(deToEn)) {
  if (en && !enToDe[en]) {
    enToDe[en] = de;
  }
}

// Countries that are identical in DE and EN (no translation needed)
const identicalCountries = new Set(
  Object.keys(deToEn).filter((k) => k === deToEn[k])
);

/**
 * Normalize country name to canonical English form for filtering/storage.
 * Input can be "Italy", "Italien", or any variant; output is "Italy".
 */
export function toCanonicalCountry(country: string): string {
  const t = (country || '').trim();
  if (!t) return t;
  // Already in EN form (either in deToEn values or identical)
  if (deToEn[t]) return deToEn[t];
  if (enToDe[t] || identicalCountries.has(t)) return t;
  // Might be EN form not in our map - return as-is
  return t;
}

/**
 * Get localized country name for display.
 * @param country - Raw country from data (DE or EN)
 * @param locale - 'de' | 'en'
 * @returns Localized name: "Italien" for de, "Italy" for en
 */
export function getLocalizedCountryName(
  country: string,
  locale: Locale
): string {
  const t = (country || '').trim();
  if (!t) return t;
  if (locale === 'en') {
    return deToEn[t] ?? t;
  }
  // locale === 'de': input can be "Italy" (EN) or "Italien" (DE)
  if (deToEn[t]) return t; // Already German (key in deToEn)
  return enToDe[t] ?? t;
}

/**
 * Check if a partner's country matches a selected country (handles DE/EN variants).
 * selectedCountry can be "Italien" or "Italy"; partnerCountry can be either.
 */
export function countryMatches(
  partnerCountry: string,
  selectedCountry: string
): boolean {
  const a = toCanonicalCountry(partnerCountry);
  const b = toCanonicalCountry(selectedCountry);
  return a === b;
}
