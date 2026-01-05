/**
 * NC (Numerus Clausus) Filtering Logic
 * 
 * This module provides utilities for filtering and categorizing study programs
 * based on user's GPA and program NC thresholds.
 */

import { StudyProgram } from '@/data/university-program-types';

export type ProgramMatchType = 'safe' | 'reach' | 'available' | 'unlikely';

export interface ProgramWithMatch {
  program: StudyProgram | string; // Supports both new format (StudyProgram) and old format (string)
  matchType: ProgramMatchType;
  ncThreshold: number;
  waitingSemesters: number;
  isNCFree: boolean;
}

/**
 * Buffer threshold for "Reach/Possible" programs
 * If user grade is within this range above NC, it's considered a reach
 */
const REACH_BUFFER = 0.2;

/**
 * Determines the match type for a program based on user's grade
 */
export function getProgramMatchType(
  userGrade: number | null,
  ncThreshold: number,
  isNCFree: boolean
): ProgramMatchType {
  // NC-free programs are always available
  if (isNCFree) {
    return 'available';
  }

  // If no user grade provided, show all programs
  if (userGrade === null) {
    return 'available';
  }

  // Safe match: user grade is equal to or better than NC
  if (userGrade <= ncThreshold) {
    return 'safe';
  }

  // Reach/Possible: user grade is slightly above NC (within buffer)
  if (userGrade <= ncThreshold + REACH_BUFFER) {
    return 'reach';
  }

  // Unlikely: user grade is significantly above NC
  return 'unlikely';
}

/**
 * Filters and categorizes programs based on user's grade
 */
export function filterProgramsByNC(
  programs: (StudyProgram | string)[],
  userGrade: number | null
): ProgramWithMatch[] {
  return programs.map((program) => {
    // Handle old format (string) - treat as NC-free
    if (typeof program === 'string') {
      return {
        program,
        matchType: 'available',
        ncThreshold: 0.0,
        waitingSemesters: 0,
        isNCFree: true,
      };
    }

    // Handle new format (StudyProgram)
    const ncThreshold = program.nc_threshold;
    const waitingSemesters = program.waiting_semesters;
    const isNCFree = ncThreshold === 0.0;

    const matchType = getProgramMatchType(userGrade, ncThreshold, isNCFree);

    return {
      program,
      matchType,
      ncThreshold,
      waitingSemesters,
      isNCFree,
    };
  });
}

/**
 * Gets the display name for a program (works with both formats)
 */
export function getProgramDisplayName(program: StudyProgram | string): string {
  return typeof program === 'string' ? program : program.name;
}

/**
 * Gets styling classes for a program match type
 */
export function getMatchTypeStyles(matchType: ProgramMatchType): {
  container: string;
  badge: string;
  icon: string;
  label: string;
} {
  switch (matchType) {
    case 'safe':
      return {
        container: 'border-green-500/40 bg-green-950/30 shadow-green-500/10',
        badge: 'bg-green-500/30 text-green-300 border-green-500/50 font-semibold',
        icon: 'text-green-400',
        label: 'High chance of admission',
      };
    case 'reach':
      return {
        container: 'border-yellow-500/40 bg-yellow-950/30 shadow-yellow-500/10',
        badge: 'bg-yellow-500/30 text-yellow-300 border-yellow-500/50 font-semibold',
        icon: 'text-yellow-400',
        label: 'Potential chance',
      };
    case 'available':
      return {
        container: 'border-blue-500/40 bg-blue-950/30 shadow-blue-500/10',
        badge: 'bg-blue-500/30 text-blue-300 border-blue-500/50 font-semibold',
        icon: 'text-blue-400',
        label: 'Available (NC-free)',
      };
    case 'unlikely':
      return {
        container: 'border-red-500/30 bg-red-950/20 shadow-red-500/10 opacity-70',
        badge: 'bg-red-500/20 text-red-300 border-red-500/40 font-semibold',
        icon: 'text-red-400',
        label: 'Unlikely',
      };
  }
}

/**
 * Gets the label text for a match type
 */
export function getMatchTypeLabel(matchType: ProgramMatchType, t: (key: string) => string): string {
  switch (matchType) {
    case 'safe':
      return t('safeMatch');
    case 'reach':
      return t('reachMatch');
    case 'available':
      return t('available');
    case 'unlikely':
      return t('unlikely');
  }
}

/**
 * Calculates the "match score" for sorting programs by best match
 * Lower score = better match (closer to user's grade)
 */
export function getMatchScore(
  userGrade: number | null,
  program: ProgramWithMatch
): number {
  // If no user grade, sort by match type priority
  if (userGrade === null) {
    const priority: Record<ProgramMatchType, number> = {
      available: 0,
      safe: 1,
      reach: 2,
      unlikely: 3,
    };
    return priority[program.matchType];
  }

  // NC-free programs get highest priority
  if (program.isNCFree) {
    return -1;
  }

  // Calculate distance from user's grade to NC threshold
  // For safe matches (userGrade <= ncThreshold), use negative distance (better)
  // For reach/unlikely (userGrade > ncThreshold), use positive distance (worse)
  const distance = userGrade - program.ncThreshold;
  
  // Add match type priority as secondary sort
  const typePriority: Record<ProgramMatchType, number> = {
    safe: 0,
    reach: 100,
    available: -50, // NC-free should be first
    unlikely: 200,
  };

  return distance + typePriority[program.matchType];
}

/**
 * Sorts programs by best match (closest to user's grade)
 */
export function sortByBestMatch(
  programs: ProgramWithMatch[],
  userGrade: number | null
): ProgramWithMatch[] {
  return [...programs].sort((a, b) => {
    const scoreA = getMatchScore(userGrade, a);
    const scoreB = getMatchScore(userGrade, b);
    return scoreA - scoreB;
  });
}

