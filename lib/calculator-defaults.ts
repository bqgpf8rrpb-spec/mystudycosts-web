/**
 * Default values for the Study Cost Calculator.
 * Extracted from StudyCostCalculator to centralize financial constants.
 */

/** Blocked account amounts (€) */
export const BLOCKED_ACCOUNT_MONTHLY = 992;
export const BLOCKED_ACCOUNT_YEARLY = 11904;

/** Health insurance (€/month) */
export const HEALTH_INSURANCE_PUBLIC = 120;
export const HEALTH_INSURANCE_PRIVATE = 80;

/** Living expenses component in calculator (€/month) */
export const CALCULATOR_LIVING_EXPENSES = 400;

/** Blocked account provider fees */
export const BLOCKED_ACCOUNT_PROVIDERS = [
  { name: 'Fintiba', setupFee: 89, monthlyFee: 4.9 },
  { name: 'Expatrio', setupFee: 49, monthlyFee: 4.9 },
  { name: 'Coracle', setupFee: 99, monthlyFee: 5.0 },
] as const;

/** Rundfunkbeitrag (broadcasting fee) */
export const RUNDFUNKBEITRAG_QUARTERLY = 55.08;
export const RUNDFUNKBEITRAG_MONTHLY = 18.36;

/** Arrival costs */
export const SECURITY_DEPOSIT_MULTIPLIER = 3; // 3 months' rent
export const INITIAL_HOUSEHOLD_SETUP = 650; // Basic furniture/kitchenware (€)

/** Language course (€/month) */
export const LANGUAGE_COURSE_MONTHLY = 550;

/** Housing type multipliers (relative to base rent) */
export const HOUSING_MULTIPLIER_DORM = 0.6;
export const HOUSING_MULTIPLIER_PRIVATE = 1.5;
