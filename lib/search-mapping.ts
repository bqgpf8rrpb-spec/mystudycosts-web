/**
 * Search Mapping for Study Programs
 * 
 * Maps abbreviations and common terms to their full-text synonyms
 * to improve search accuracy in university_programs.json
 */

/**
 * Mapping of abbreviations and common terms to their synonyms
 * Key: Common abbreviation or term (case-insensitive)
 * Value: Array of full-text synonyms and related terms
 */
export const STUDY_SYNONYMS: Record<string, string[]> = {
  // Business & Economics
  'BWL': ['Betriebswirtschaftslehre', 'Business Administration', 'Management', 'Wirtschaftswissenschaften', 'Wirtschaft', 'Business'],
  'VWL': ['Volkswirtschaftslehre', 'Economics', 'Wirtschaftswissenschaften', 'Ökonomie'],
  'WiWi': ['Wirtschaftswissenschaften', 'Betriebswirtschaftslehre', 'Volkswirtschaftslehre', 'BWL', 'VWL'],
  'Wirtschaft': ['Wirtschaftswissenschaften', 'Betriebswirtschaftslehre', 'Volkswirtschaftslehre', 'BWL', 'VWL'],
  
  // Computer Science & IT
  'Informatik': ['Computer Science', 'Software Engineering', 'Information Technology', 'IT', 'Computing'],
  'CS': ['Computer Science', 'Informatik', 'Software Engineering', 'Information Technology'],
  'IT': ['Information Technology', 'Informatik', 'Computer Science', 'Informationstechnik'],
  'Software Engineering': ['Informatik', 'Computer Science', 'Softwareentwicklung', 'Programmierung'],
  
  // Engineering
  'Maschinenbau': ['Mechanical Engineering', 'Maschinenwesen', 'Mechanik'],
  'Elektrotechnik': ['Electrical Engineering', 'Elektronik', 'E-Technik'],
  'Bauingenieurwesen': ['Civil Engineering', 'Bauwesen', 'Bauingenieur'],
  'Ingenieurwesen': ['Engineering', 'Ingenieurwissenschaften'],
  
  // Medicine & Health
  'Medizin': ['Medicine', 'Humanmedizin', 'Human Medicine'],
  'Zahnmedizin': ['Dentistry', 'Dental Medicine', 'Zahnheilkunde'],
  'Pharmazie': ['Pharmacy', 'Pharmaceutical Sciences'],
  'Psychologie': ['Psychology', 'Psychologie'],
  
  // Law & Social Sciences
  'Jura': ['Rechtswissenschaften', 'Law', 'Jurisprudence', 'Recht'],
  'Recht': ['Rechtswissenschaften', 'Law', 'Jurisprudence', 'Jura'],
  'Soziologie': ['Sociology', 'Sozialwissenschaften'],
  'Politikwissenschaft': ['Political Science', 'Politikwissenschaften', 'Politologie'],
  'Politik': ['Political Science', 'Politikwissenschaften', 'Politologie'],
  
  // Natural Sciences
  'Biologie': ['Biology', 'Biowissenschaften', 'Life Sciences'],
  'Chemie': ['Chemistry', 'Chemie'],
  'Physik': ['Physics', 'Physik'],
  'Mathematik': ['Mathematics', 'Math', 'Maths'],
  'Math': ['Mathematics', 'Mathematik', 'Maths'],
  
  // Humanities
  'Geschichte': ['History', 'Historie'],
  'Philosophie': ['Philosophy', 'Philosophie'],
  'Germanistik': ['German Studies', 'Deutsche Sprache und Literatur', 'German Literature'],
  'Anglistik': ['English Studies', 'Anglistik', 'English Literature'],
  'Romanistik': ['Romance Studies', 'Romanistik', 'Romance Languages'],
  
  // Arts & Design
  'Kunst': ['Art', 'Fine Arts', 'Bildende Kunst'],
  'Design': ['Design', 'Gestaltung'],
  'Architektur': ['Architecture', 'Architektur'],
  'Musik': ['Music', 'Musikwissenschaft', 'Musicology'],
  
  // Education
  'Lehramt': ['Teaching', 'Education', 'Pädagogik', 'Teacher Training'],
  'Pädagogik': ['Education', 'Pedagogy', 'Erziehungswissenschaften', 'Lehramt'],
  'Erziehungswissenschaften': ['Education', 'Pedagogy', 'Pädagogik', 'Erziehungswissenschaft'],
  
  // Additional common abbreviations
  'B.A.': ['Bachelor of Arts', 'BA'],
  'B.Sc.': ['Bachelor of Science', 'BSc'],
  'M.A.': ['Master of Arts', 'MA'],
  'M.Sc.': ['Master of Science', 'MSc'],
  'MBA': ['Master of Business Administration', 'Business Administration'],
  'LL.M.': ['Master of Laws', 'LLM'],
};

/**
 * Get search terms including synonyms for a given input
 * 
 * @param input - User search input (case-insensitive)
 * @returns Array of search terms including the original input and all synonyms (all lowercase)
 * 
 * @example
 * getSearchTerms('BWL') 
 * // Returns: ['bwl', 'betriebswirtschaftslehre', 'business administration', 'management', 'wirtschaftswissenschaften', 'wirtschaft', 'business']
 * 
 * @example
 * getSearchTerms('Informatik')
 * // Returns: ['informatik', 'computer science', 'software engineering', 'information technology', 'it', 'computing']
 */
export function getSearchTerms(input: string): string[] {
  if (!input || typeof input !== 'string') {
    return [];
  }

  // Normalize input: trim and convert to lowercase
  const normalizedInput = input.trim().toLowerCase();
  
  if (!normalizedInput) {
    return [];
  }

  // Start with the original input
  const searchTerms = new Set<string>([normalizedInput]);

  // Check if input matches any key in the mapping (case-insensitive)
  const matchingKey = Object.keys(STUDY_SYNONYMS).find(
    key => key.toLowerCase() === normalizedInput
  );

  if (matchingKey) {
    // Add all synonyms to the search terms
    STUDY_SYNONYMS[matchingKey].forEach(synonym => {
      searchTerms.add(synonym.toLowerCase());
    });
  }

  // Also check if any synonym matches the input (reverse lookup)
  Object.entries(STUDY_SYNONYMS).forEach(([key, synonyms]) => {
    synonyms.forEach(synonym => {
      if (synonym.toLowerCase() === normalizedInput) {
        // Add the key and all other synonyms
        searchTerms.add(key.toLowerCase());
        synonyms.forEach(s => searchTerms.add(s.toLowerCase()));
      }
    });
  });

  return Array.from(searchTerms);
}

/**
 * Check if a program name matches any of the search terms
 * 
 * @param programName - The program name to check
 * @param searchTerms - Array of search terms (from getSearchTerms)
 * @returns true if the program name contains any of the search terms
 */
export function matchesSearchTerms(programName: string, searchTerms: string[]): boolean {
  if (!programName || !searchTerms || searchTerms.length === 0) {
    return false;
  }

  const normalizedProgramName = programName.toLowerCase();
  
  return searchTerms.some(term => normalizedProgramName.includes(term));
}

