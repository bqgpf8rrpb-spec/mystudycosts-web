/**
 * Admission Probability Calculation
 * 
 * Calculates admission chances based on user GPA and NC threshold
 */

export interface AdmissionChance {
  score: number; // 0-100 for speedometer position
  label: string; // Human-readable label
  color: string; // Tailwind color class or hex
}

/**
 * Calculate admission chance for public universities
 * 
 * @param userGpa - User's GPA (e.g., 1.5, 2.3, 3.0)
 * @param ncThreshold - NC threshold (lower is better, e.g., 1.2, 2.5, or null if no NC)
 * @returns Admission chance with score, label, and color
 */
export function calculateAdmissionChance(
  userGpa: number,
  ncThreshold: number | null
): AdmissionChance {
  // Case 1: No NC threshold (open admission)
  if (ncThreshold === null) {
    return {
      score: 95,
      label: 'Very High',
      color: 'emerald', // Green
    };
  }

  // Case 2: User GPA is better than or equal to threshold (safe admission)
  if (userGpa <= ncThreshold) {
    // Calculate score based on how much better (0.0 to 0.5+ better)
    const margin = ncThreshold - userGpa;
    const score = Math.min(100, 90 + Math.min(10, margin * 20)); // 90-100 range
    
    return {
      score: Math.round(score),
      label: 'Safe',
      color: 'emerald', // Green
    };
  }

  // Case 3: User GPA is up to 0.3 worse (waiting semester possible)
  const gap = userGpa - ncThreshold;
  if (gap <= 0.3) {
    // Score decreases linearly from 70 to 40 as gap increases from 0 to 0.3
    const score = 70 - (gap / 0.3) * 30; // 70 down to 40
    
    return {
      score: Math.round(score),
      label: 'Waiting Semester Possible',
      color: gap <= 0.15 ? 'yellow' : 'orange', // Yellow for small gap, orange for larger gap
    };
  }

  // Case 4: User GPA is more than 0.3 worse (unlikely)
  // Score decreases from 30 to 5 as gap increases from 0.3 to 1.0+
  const excessGap = Math.min(1.0, gap - 0.3); // Cap at 1.0 for calculation
  const score = 30 - (excessGap / 0.7) * 25; // 30 down to 5
  
  return {
    score: Math.max(5, Math.round(score)), // Minimum 5
    label: 'Unlikely',
    color: 'red', // Red
  };
}

/**
 * Get color class for Tailwind CSS based on color name
 */
export function getColorClass(color: string): string {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-400',
    yellow: 'text-yellow-400',
    orange: 'text-orange-400',
    red: 'text-red-400',
  };
  
  return colorMap[color] || 'text-slate-400';
}

/**
 * Get stroke color for SVG based on color name
 */
export function getStrokeColor(color: string): string {
  const colorMap: Record<string, string> = {
    emerald: '#34d399', // emerald-400
    yellow: '#fbbf24', // yellow-400
    orange: '#fb923c', // orange-400
    red: '#f87171', // red-400
  };
  
  return colorMap[color] || '#94a3b8'; // slate-400
}

