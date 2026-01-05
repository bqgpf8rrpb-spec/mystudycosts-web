/**
 * TypeScript Type Definitions for University Program Data
 * 
 * This file defines the data structure for university programs including NC (Numerus Clausus) values.
 */

/**
 * Study Program with NC Data
 */
export interface StudyProgram {
  name: string;
  nc_threshold: number; // NC threshold (0.0 = NC-frei/open admission)
  waiting_semesters: number; // Number of waiting semesters required (0 = no waiting list)
}

/**
 * University Programs Data
 * Maps university name to array of study programs
 * Supports both old format (string[]) and new format (StudyProgram[])
 */
export type UniversityProgramsData = Record<string, string[] | StudyProgram[]>;

/**
 * Helper function to check if a program entry is in the new format
 */
export function isStudyProgram(program: string | StudyProgram): program is StudyProgram {
  return typeof program === 'object' && 'name' in program && 'nc_threshold' in program;
}

/**
 * Helper function to get program name (works with both formats)
 */
export function getProgramName(program: string | StudyProgram): string {
  return typeof program === 'string' ? program : program.name;
}

/**
 * Helper function to get NC threshold (returns 0.0 for old format or NC-frei programs)
 */
export function getNCThreshold(program: string | StudyProgram): number {
  return typeof program === 'string' ? 0.0 : program.nc_threshold;
}

/**
 * Helper function to get waiting semesters (returns 0 for old format)
 */
export function getWaitingSemesters(program: string | StudyProgram): number {
  return typeof program === 'string' ? 0 : program.waiting_semesters;
}

