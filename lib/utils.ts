import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Translation mapping for German program names to English
 * Maps the top 20+ most common German study program names to their English equivalents
 */
const PROGRAM_NAME_TRANSLATIONS: Record<string, string> = {
  // Business & Economics
  'Betriebswirtschaftslehre': 'Business Administration',
  'BWL': 'Business Administration',
  'Volkswirtschaftslehre': 'Economics',
  'VWL': 'Economics',
  'Wirtschaftswissenschaften': 'Economics',
  'Wirtschaftsinformatik': 'Business Informatics',
  'Internationale Betriebswirtschaftslehre': 'International Business Administration',
  'International Business Administration': 'International Business Administration',
  
  // Law
  'Rechtswissenschaften': 'Law',
  'Jura': 'Law',
  'Recht': 'Law',
  
  // Medicine & Health
  'Medizin': 'Medicine',
  'Humanmedizin': 'Human Medicine',
  'Zahnmedizin': 'Dentistry',
  'Pharmazie': 'Pharmacy',
  'Psychologie': 'Psychology',
  
  // Computer Science & IT
  'Informatik': 'Computer Science',
  'Informationstechnik': 'Information Technology',
  'Angewandte Informatik': 'Applied Computer Science',
  
  // Engineering
  'Maschinenbau': 'Mechanical Engineering',
  'Elektrotechnik': 'Electrical Engineering',
  'Bauingenieurwesen': 'Civil Engineering',
  'Ingenieurwesen': 'Engineering',
  'Wirtschaftsingenieurwesen': 'Industrial Engineering',
  
  // Natural Sciences
  'Biologie': 'Biology',
  'Chemie': 'Chemistry',
  'Physik': 'Physics',
  'Mathematik': 'Mathematics',
  
  // Social Sciences
  'Soziologie': 'Sociology',
  'Politikwissenschaft': 'Political Science',
  'Politikwissenschaften': 'Political Science',
  'Sozialwissenschaften': 'Social Sciences',
  
  // Humanities
  'Geschichte': 'History',
  'Philosophie': 'Philosophy',
  'Germanistik': 'German Studies',
  'Anglistik': 'English Studies',
  'Romanistik': 'Romance Studies',
  
  // Arts & Design
  'Kunst': 'Art',
  'Design': 'Design',
  'Architektur': 'Architecture',
  'Musik': 'Music',
  'Musikwissenschaft': 'Musicology',
  
  // Education
  'Lehramt': 'Teaching',
  'Pädagogik': 'Education',
  'Erziehungswissenschaften': 'Education',
  
  // Additional common terms
  'Wirtschaft': 'Economics',
  'Technik': 'Engineering',
  'Ingenieurwissenschaften': 'Engineering Sciences',
  'Naturwissenschaften': 'Natural Sciences',
  'Geisteswissenschaften': 'Humanities',
};

/**
 * Translates German program names to English
 * 
 * @param germanName - The German program name (e.g., "Betriebswirtschaftslehre")
 * @returns The English translation (e.g., "Business Administration") or the original name if no translation exists
 * 
 * @example
 * getEnglishProgramName("Betriebswirtschaftslehre") // Returns "Business Administration"
 * getEnglishProgramName("Informatik") // Returns "Computer Science"
 * getEnglishProgramName("Unknown Program") // Returns "Unknown Program" (fallback)
 */
export function getEnglishProgramName(germanName: string): string {
  if (!germanName || typeof germanName !== 'string') {
    return germanName || '';
  }

  // Trim whitespace
  const trimmed = germanName.trim();
  if (!trimmed) return germanName;

  // Direct lookup (case-insensitive)
  const normalized = trimmed.toLowerCase();
  for (const [german, english] of Object.entries(PROGRAM_NAME_TRANSLATIONS)) {
    if (normalized === german.toLowerCase() || normalized.includes(german.toLowerCase())) {
      // If it's an exact match or the German term is contained, return the English translation
      if (normalized === german.toLowerCase()) {
        return english;
      }
      // For partial matches, try to replace the German term with English
      const regex = new RegExp(german, 'gi');
      return trimmed.replace(regex, english);
    }
  }

  // Fallback: Check if the name already contains English terms (common abbreviations)
  const englishIndicators = ['bachelor', 'master', 'b.sc', 'm.sc', 'b.a', 'm.a', 'mba', 'll.m'];
  const hasEnglishIndicator = englishIndicators.some(indicator => 
    normalized.includes(indicator)
  );
  
  if (hasEnglishIndicator) {
    // Likely already in English or mixed, return as-is
    return trimmed;
  }

  // Final fallback: return original name
  return trimmed;
}
