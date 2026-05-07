/**
 * BAföG Logic Utilities
 * 
 * Provides functions for calculating BAföG-related costs and gaps
 */

// BAföG maximum amount per month in 2026 (standard rate)
export const BAFOEG_MAX_2026 = 1004;

// Additional amount for Erasmus students receiving BAföG (Auslandszuschuss)
export const BAFOEG_ERASMUS_ADDON = 250;

/** Max tuition fee covered by BAföG for Erasmus (Auslands-BAföG) in EUR */
export const BAFOEG_ERASMUS_TUITION_MAX = 5600;

/** Travel cost allowance for Erasmus students (one-time, EU) in EUR */
export const BAFOEG_ERASMUS_TRAVEL_ALLOWANCE = 500;

// Total BAföG amount for Erasmus students (max + addon)
export const BAFOEG_MAX_ERASMUS_2026 = BAFOEG_MAX_2026 + BAFOEG_ERASMUS_ADDON; // 1254

/**
 * Calculate the net gap between monthly costs and BAföG coverage
 * 
 * @param totalMonthlyCosts - Total monthly costs (from our index)
 * @param isErasmus - Whether the student is studying abroad via Erasmus
 * @param receivesBafoeg - Whether the student receives BAföG
 * @returns Net gap (positive = remaining costs to cover, negative = surplus from BAföG)
 */
export function calculateNetGap(
  totalMonthlyCosts: number,
  isErasmus: boolean = false,
  receivesBafoeg: boolean = false
): number {
  // If student doesn't receive BAföG, net gap equals total costs
  if (!receivesBafoeg) {
    return totalMonthlyCosts;
  }

  // Calculate BAföG amount based on study type
  const bafoegAmount = isErasmus 
    ? BAFOEG_MAX_ERASMUS_2026  // 1254€ for Erasmus students
    : BAFOEG_MAX_2026;          // 1004€ for domestic students

  // Calculate net gap (costs - BAföG)
  // Positive result = remaining costs to cover
  // Negative result = surplus (more BAföG than costs)
  return totalMonthlyCosts - bafoegAmount;
}

/**
 * Check if BAföG covers all monthly costs
 * 
 * @param totalMonthlyCosts - Total monthly costs
 * @param isErasmus - Whether the student is studying abroad via Erasmus
 * @param receivesBafoeg - Whether the student receives BAföG
 * @returns True if BAföG covers all costs (surplus or break-even)
 */
export function isBafoegSufficient(
  totalMonthlyCosts: number,
  isErasmus: boolean = false,
  receivesBafoeg: boolean = false
): boolean {
  const netGap = calculateNetGap(totalMonthlyCosts, isErasmus, receivesBafoeg);
  return netGap <= 0;
}

/**
 * Get the BAföG amount for a given scenario
 * 
 * @param isErasmus - Whether the student is studying abroad via Erasmus
 * @param receivesBafoeg - Whether the student receives BAföG
 * @returns BAföG amount (0 if not receiving BAföG)
 */
export function getBafoegAmount(
  isErasmus: boolean = false,
  receivesBafoeg: boolean = false
): number {
  if (!receivesBafoeg) {
    return 0;
  }
  
  return isErasmus 
    ? BAFOEG_MAX_ERASMUS_2026
    : BAFOEG_MAX_2026;
}

