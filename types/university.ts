/**
 * Centralized university type definitions used across the application.
 */

import type { StudyProgram } from '@/data/university-program-types';
import type { ProgramMatchType } from '@/lib/nc-filter';

/**
 * University - Base structure for German universities
 * Fields are optional where different features use different subsets.
 */
export interface University {
  name: string;
  city: string;
  type: 'public' | 'private';
  semesterFee?: number;
  avgRent?: number;
  tuitionFee?: number;
  nonEUTuitionFee?: number;
  institutionType?: 'University' | 'FH';
  state?: string;
}

/**
 * University combined with NC program match result (used in NC checker)
 */
export interface UniversityWithMatch {
  university: University;
  program: StudyProgram;
  matchType: ProgramMatchType;
  ncThreshold: number;
  waitingSemesters: number;
  isNCFree: boolean;
}
