/**
 * Program-to-Subject-Area Mapping
 *
 * Maps UI program names (e.g. "Informatik", "Computer Science") to possible
 * subject_area values in erasmus_partners.json. Used to filter partners and
 * available countries by study program.
 *
 * Based on scripts/map-partners-to-programs.js PROGRAM_TO_SUBJECTS,
 * extended with common subject_area variants from the data.
 */

// Program keywords -> possible subject_area values (EU format + common data variants)
const PROGRAM_TO_SUBJECTS: Record<string, string[]> = {
  'computer science': [
    'ICT',
    'Information & Communication Technologies',
    'Computer Science',
    'CIT-Informatics',
    'Computer Science/Telecommunications',
    'General',
  ],
  informatik: [
    'ICT',
    'Information & Communication Technologies',
    'Computer Science',
    'CIT-Informatics',
    'Computer Science/Telecommunications',
    'General',
  ],
  informatics: [
    'ICT',
    'Information & Communication Technologies',
    'Computer Science',
    'CIT-Informatics',
    'General',
  ],
  'data science': [
    'ICT',
    'Information & Communication Technologies',
    'Mathematics & Statistics',
    'Computer Science',
    'General',
  ],
  'data engineering': ['ICT', 'Information & Communication Technologies', 'Computer Science', 'General'],
  software: ['ICT', 'Information & Communication Technologies', 'Computer Science', 'General'],
  'information systems': [
    'ICT',
    'Information & Communication Technologies',
    'Business Administration',
    'Computer Science',
    'General',
  ],
  'business informatics': ['ICT', 'Business Administration', 'Computer Science', 'General'],
  wirtschaftsinformatik: ['ICT', 'Business Administration', 'Computer Science', 'General'],
  cybersecurity: ['ICT', 'Information & Communication Technologies', 'Computer Science', 'General'],

  'business administration': [
    'Business Administration',
    'Business & Law',
    'Business and Administration',
    'Economics/Business',
    'General',
  ],
  betriebswirtschaft: [
    'Business Administration',
    'Business & Law',
    'Business and Administration',
    'Economics/Business',
    'General',
  ],
  bwl: ['Business Administration', 'Business & Law', 'Business and Administration', 'General'],
  management: ['Business Administration', 'Business & Law', 'General'],
  economics: [
    'Business Administration',
    'Social Sciences',
    'Economics',
    'Economics/Business',
    'General',
  ],
  volkswirtschaft: ['Business Administration', 'Social Sciences', 'Economics', 'General'],
  vwl: ['Business Administration', 'Social Sciences', 'Economics', 'General'],
  finance: ['Business Administration', 'Business & Law', 'General'],
  accounting: ['Business Administration', 'General'],
  marketing: ['Business Administration', 'General'],
  'industrial engineering': ['Engineering', 'Business Administration', 'General'],
  wirtschaftsingenieur: ['Engineering', 'Business Administration', 'General'],

  'mechanical engineering': [
    'Engineering',
    'Manufacturing & Processing',
    'Mechanical Engineering',
    'Engineering/Planning',
    'General',
  ],
  maschinenbau: [
    'Engineering',
    'Manufacturing & Processing',
    'Mechanical Engineering',
    'General',
  ],
  'electrical engineering': ['Engineering', 'Electrical Engineering', 'General'],
  elektrotechnik: ['Engineering', 'Electrical Engineering', 'General'],
  'civil engineering': [
    'Engineering',
    'Architecture & Construction',
    'Civil Engineering',
    'General',
  ],
  bauingenieur: ['Engineering', 'Architecture & Construction', 'Civil Engineering', 'General'],
  'chemical engineering': ['Engineering', 'Physics & Chemistry', 'Chemistry', 'General'],
  bioengineering: ['Engineering', 'Biology', 'General'],
  'biomedical engineering': ['Engineering', 'Medicine', 'General'],
  automotive: ['Engineering', 'Manufacturing & Processing', 'General'],
  aerospace: ['Engineering', 'General'],
  'process engineering': ['Engineering', 'Manufacturing & Processing', 'General'],
  'materials science': ['Engineering', 'Physics & Chemistry', 'General'],
  'environmental engineering': ['Engineering', 'Environmental Sciences', 'General'],
  robotics: ['Engineering', 'ICT', 'General'],
  mechatronics: ['Engineering', 'General'],
  energy: ['Engineering', 'Environmental Sciences', 'Sustainable Energy/Physics', 'General'],
  transportation: ['Engineering', 'General'],

  medicine: ['Medicine', 'Health Sciences', 'General'],
  medizin: ['Medicine', 'Health Sciences', 'General'],
  pharmacy: ['Medicine', 'Health Sciences', 'Pharmacy', 'General'],
  pharmazie: ['Medicine', 'Health Sciences', 'Pharmacy', 'General'],
  health: ['Health Sciences', 'Medicine', 'General'],
  gesundheit: ['Health Sciences', 'Medicine', 'General'],
  nursing: ['Health Sciences', 'Social Services', 'General'],
  dental: ['Medicine', 'Health Sciences', 'General'],
  veterinary: ['Veterinary Medicine', 'General'],
  tiermedizin: ['Veterinary Medicine', 'General'],
  'nutritional science': ['Biology', 'Health Sciences', 'General'],

  law: ['Law', 'Business & Law', 'General'],
  jura: ['Law', 'Business & Law', 'General'],
  rechtswissenschaft: ['Law', 'Business & Law', 'General'],

  architecture: ['Architecture & Construction', 'Architecture', 'Architecture/Design', 'General'],
  architektur: ['Architecture & Construction', 'Architecture', 'Architecture/Design', 'General'],
  'urban planning': ['Architecture & Construction', 'Social Sciences', 'General'],
  stadtplanung: ['Architecture & Construction', 'Social Sciences', 'General'],

  mathematics: [
    'Mathematics & Statistics',
    'Natural Sciences',
    'Mathematics',
    'Mathematics/Physics',
    'General',
  ],
  mathematik: [
    'Mathematics & Statistics',
    'Natural Sciences',
    'Mathematics',
    'General',
  ],
  statistics: ['Mathematics & Statistics', 'General'],
  statistik: ['Mathematics & Statistics', 'General'],

  physics: [
    'Physics & Chemistry',
    'Natural Sciences',
    'Physics',
    'Physics/Optics',
    'Mathematics/Physics',
    'Sustainable Energy/Physics',
    'General',
  ],
  physik: [
    'Physics & Chemistry',
    'Natural Sciences',
    'Physics',
    'General',
  ],
  chemistry: ['Physics & Chemistry', 'Natural Sciences', 'Chemistry', 'General'],
  chemie: ['Physics & Chemistry', 'Natural Sciences', 'Chemistry', 'General'],
  geoscience: ['Environmental Sciences', 'Natural Sciences', 'General'],
  geowissenschaft: ['Environmental Sciences', 'Natural Sciences', 'General'],
  geology: ['Environmental Sciences', 'Natural Sciences', 'General'],
  meteorology: ['Environmental Sciences', 'Natural Sciences', 'General'],

  biology: ['Biology', 'Natural Sciences', 'Biology/Physics', 'General'],
  biologie: ['Biology', 'Natural Sciences', 'General'],
  biochemistry: ['Biology', 'Physics & Chemistry', 'General'],
  biotechnology: ['Biology', 'Engineering', 'General'],
  'life science': ['Biology', 'Natural Sciences', 'General'],
  molecular: ['Biology', 'General'],

  psychology: ['Social Sciences', 'Health Sciences', 'Psychology', 'General'],
  psychologie: ['Social Sciences', 'Health Sciences', 'Psychology', 'General'],
  sociology: ['Social Sciences', 'General'],
  soziologie: ['Social Sciences', 'General'],
  'political science': ['Social Sciences', 'General'],
  politikwissenschaft: ['Social Sciences', 'General'],
  political: ['Social Sciences', 'General'],
  'international relations': ['Social Sciences', 'General'],
  'public policy': ['Social Sciences', 'General'],
  'public administration': ['Social Sciences', 'Business Administration', 'General'],

  education: ['Education', 'General'],
  erziehungswissenschaft: ['Education', 'General'],
  pädagogik: ['Education', 'General'],
  paedagogik: ['Education', 'General'],
  lehramt: ['Education', 'General'],
  teaching: ['Education', 'General'],
  'sports science': ['Education', 'General'],
  sportwissenschaft: ['Education', 'General'],

  history: ['Humanities', 'Arts & Humanities', 'History', 'Medicine/History', 'General'],
  geschichte: ['Humanities', 'Arts & Humanities', 'History', 'General'],
  philosophy: ['Humanities', 'Arts & Humanities', 'Philosophy/Arts', 'Humanities/Philosophy', 'General'],
  philosophie: ['Humanities', 'Arts & Humanities', 'General'],
  theology: ['Humanities', 'Arts & Humanities', 'Theology', 'General'],
  theologie: ['Humanities', 'Arts & Humanities', 'General'],
  'cultural studies': ['Humanities', 'Arts & Humanities', 'Cultural Studies', 'General'],
  kulturwissenschaft: ['Humanities', 'Arts & Humanities', 'General'],
  linguistics: ['Languages', 'Humanities', 'General'],
  sprachwissenschaft: ['Languages', 'Humanities', 'General'],
  philology: ['Languages', 'Humanities', 'General'],
  philologie: ['Languages', 'Humanities', 'General'],
  literature: ['Languages', 'Humanities', 'General'],
  literaturwissenschaft: ['Languages', 'Humanities', 'General'],
  'german studies': ['Languages', 'Humanities', 'General'],
  germanistik: ['Languages', 'Humanities', 'General'],
  'english studies': ['Languages', 'Humanities', 'General'],
  anglistik: ['Languages', 'Humanities', 'General'],
  romance: ['Languages', 'Humanities', 'General'],
  romanistik: ['Languages', 'Humanities', 'General'],
  slavic: ['Languages', 'Humanities', 'General'],
  slawistik: ['Languages', 'Humanities', 'General'],

  art: ['Arts', 'Arts & Humanities', 'General'],
  kunst: ['Arts', 'Arts & Humanities', 'General'],
  music: ['Arts', 'General'],
  musik: ['Arts', 'General'],
  design: ['Arts', 'Architecture/Design', 'General'],
  film: ['Arts', 'Journalism & Media', 'General'],
  theater: ['Arts', 'General'],
  media: ['Journalism & Media', 'Arts', 'General'],
  kommunikation: ['Journalism & Media', 'Social Sciences', 'General'],
  journalism: ['Journalism & Media', 'General'],
  publizistik: ['Journalism & Media', 'General'],

  'social work': ['Social Work', 'Social Services', 'General'],
  'soziale arbeit': ['Social Work', 'Social Services', 'General'],

  agriculture: ['Agriculture', 'General'],
  agrarwissenschaft: ['Agriculture', 'General'],
  horticultural: ['Agriculture', 'General'],
  forest: ['Forestry', 'Agriculture', 'General'],
  forstwissenschaft: ['Forestry', 'Agriculture', 'General'],
  food: ['Agriculture', 'Biology', 'General'],
  lebensmittel: ['Agriculture', 'Biology', 'General'],

  geography: ['Environmental Sciences', 'Social Sciences', 'Geography', 'General'],
  geographie: ['Environmental Sciences', 'Social Sciences', 'Geography', 'General'],

  tourism: ['Services', 'Business Administration', 'General'],
  logistics: ['Engineering', 'Business Administration', 'General'],
};

/**
 * Returns possible subject_area values for a given program name.
 * Used to filter Erasmus partners by study program.
 *
 * @param programName - UI program name (e.g. "Informatik", "Computer Science")
 * @returns Array of subject_area strings that match this program
 */
export function getSubjectAreasForProgram(programName: string): string[] {
  if (!programName || !programName.trim()) {
    return ['General'];
  }

  const lower = programName.toLowerCase().trim();
  const matched = new Set<string>();

  for (const [keyword, subjects] of Object.entries(PROGRAM_TO_SUBJECTS)) {
    if (lower.includes(keyword)) {
      subjects.forEach((s) => matched.add(s));
    }
  }

  if (matched.size === 0) {
    matched.add('General');
    matched.add(programName);
  }

  return [...matched];
}

/**
 * Checks if a partner's subject_area matches the selected program.
 *
 * @param subjectArea - Partner's subject_area (can be undefined)
 * @param programName - Selected program name
 * @returns true if partner should be included for this program
 */
export function partnerMatchesProgram(
  subjectArea: string | undefined,
  programName: string
): boolean {
  if (!subjectArea || !subjectArea.trim()) {
    return true;
  }

  const subjectLower = subjectArea.toLowerCase().trim();
  const programLower = programName.toLowerCase().trim();
  const subjectAreas = getSubjectAreasForProgram(programName);

  if (subjectAreas.some((sa) => sa.toLowerCase() === subjectLower)) {
    return true;
  }

  if (subjectLower === 'general' || subjectLower.includes('general')) {
    return true;
  }

  if (programLower && subjectLower.includes(programLower)) {
    return true;
  }

  for (const sa of subjectAreas) {
    if (sa !== 'General' && subjectLower.includes(sa.toLowerCase())) {
      return true;
    }
  }

  return false;
}
