/**
 * Shared city name normalization utilities.
 * Used by lib/costs.ts, city pages, and StudyCostCalculator for consistent city key mapping.
 */

/**
 * Map German city names to English/calculator keys.
 * Used for: costs calculation, city page calculator, locale-specific display.
 */
export const CITY_NAME_MAP: Record<string, string> = {
  'München': 'Munich',
  'Köln': 'Cologne',
  'Hannover': 'Hanover',
  'Nürnberg': 'Nuremberg',
  'Saarbrucken': 'Saarbrücken',
  'Düsseldorf': 'Dusseldorf',
  'Gießen': 'Giessen',
  'Göttingen': 'Gottingen',
  'Lübeck': 'Luebeck',
  'Münster': 'Muenster',
  'Osnabrück': 'Osnabrueck',
  'Saarbrücken': 'Saarbruecken',
  'Tübingen': 'Tuebingen',
  'Würzburg': 'Wuerzburg',
};

/**
 * Normalize city name to handle German/English variations.
 * E.g. "München" -> "Munich", "Köln" -> "Cologne"
 */
export function normalizeCityName(city: string): string {
  const trimmed = city.trim();
  if (CITY_NAME_MAP[trimmed]) {
    return CITY_NAME_MAP[trimmed];
  }
  // Check reverse mapping (value -> keep value for consistency)
  for (const value of Object.values(CITY_NAME_MAP)) {
    if (value === trimmed) return value;
  }
  return trimmed;
}

/**
 * Get calculator city key from city name.
 * Used when passing initialCity to StudyCostCalculator (e.g. from city page).
 * Supports case-insensitive match for CITY_NAME_MAP keys.
 */
export function getCalculatorCityKey(cityName: string): string {
  const trimmed = cityName.trim();
  if (CITY_NAME_MAP[trimmed]) {
    return CITY_NAME_MAP[trimmed];
  }
  const lowerCityName = trimmed.toLowerCase();
  for (const [key, value] of Object.entries(CITY_NAME_MAP)) {
    if (key.toLowerCase() === lowerCityName) {
      return value;
    }
  }
  return trimmed;
}

/**
 * Get localized city name for display (e.g. English locale: German umlauts to ASCII).
 * Used by StudyCostCalculator and city pages.
 */
export function getLocalizedCityName(cityName: string, locale: string): string {
  if (locale === 'en') {
    return CITY_NAME_MAP[cityName] ?? cityName;
  }
  return cityName;
}
