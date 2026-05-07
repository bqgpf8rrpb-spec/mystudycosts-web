/**
 * Central constants used across the application.
 * Avoid magic numbers in components and calculations.
 */

/** Standard semester duration in months (German university semester) */
export const SEMESTER_DURATION_MONTHS = 6;

/** Convert semester fee to monthly amount (fee / 6 months) */
export function getMonthlySemesterFee(semesterFee: number): number {
  return semesterFee / SEMESTER_DURATION_MONTHS;
}

/** Default monthly living expenses (utilities, food, etc.) when not specified */
export const DEFAULT_LIVING_EXPENSES = 200;

/** Fallback average rent (€/month) when university data is missing */
export const DEFAULT_AVG_RENT_FALLBACK = 600;

/** Threshold (€) below which a university is considered "public" for NC display (semester fee) */
export const PUBLIC_SEMESTER_FEE_THRESHOLD = 500;

/** Travel cost estimates for Erasmus (€) by distance category */
export const TRAVEL_COST_SHORT = 120; // Train or short flight (e.g. Austria, Netherlands)
export const TRAVEL_COST_MEDIUM = 180; // Medium flight (e.g. Italy, Spain)
export const TRAVEL_COST_LONG = 250; // Long flight (e.g. Iceland, Cyprus)

/** Frankfurter API for exchange rates */
export const FRANKFURTER_API_URL = 'https://api.frankfurter.app/latest?from=EUR';

/** Fallback semester fee (€) when university data is missing */
export const DEFAULT_SEMESTER_FEE_FALLBACK = 300;

/** Fallback non-EU tuition fee (€/semester) for Baden-Württemberg etc. when university data is missing */
export const DEFAULT_NON_EU_TUITION_FALLBACK = 1500;

/** Debounce delay (ms) for search inputs */
export const SEARCH_DEBOUNCE_MS = 300;

/** Living expense padding (€/month) when deriving rent from total costs (total - semester fee - this) */
export const LIVING_EXPENSE_PADDING = 300;
