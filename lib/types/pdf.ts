/**
 * Type definitions for jsPDF with jspdf-autotable plugin
 */

import type { jsPDF } from 'jspdf';

/** AutoTable draw/parse callback data (simplified for our usage) */
export interface AutoTableDrawData {
  pageNumber?: number;
  cursor?: { y?: number };
}

export interface AutoTableParseData {
  column: { index: number };
  row: { index: number };
  cell: {
    text: string[];
    styles: {
      textColor?: number[];
      fontStyle?: string;
      fillColor?: number[];
      fontSize?: number;
      [key: string]: unknown;
    };
  };
}

/** AutoTable options used in StudyCostCalculator */
export interface AutoTableOptions {
  startY?: number;
  head?: string[][];
  body?: string[][];
  foot?: string[][];
  theme?: 'striped' | 'grid' | 'plain';
  didDrawPage?: (data: AutoTableDrawData) => void;
  didParseCell?: (data: AutoTableParseData) => void;
  headStyles?: Record<string, unknown>;
  bodyStyles?: Record<string, unknown>;
  footStyles?: Record<string, unknown>;
  alternateRowStyles?: Record<string, unknown>;
  margin?: { left?: number; right?: number };
  styles?: Record<string, unknown>;
}

/** jsPDF extended with autoTable plugin */
export interface JsPDFWithAutoTable extends jsPDF {
  autoTable: (options: AutoTableOptions) => void;
  lastAutoTable?: { finalY: number };
}
