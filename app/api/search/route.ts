import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getSearchTerms } from '@/lib/search-mapping';
import { getEnglishProgramName } from '@/lib/utils';

/** Raw program entry from university_programs.json (can be string or object) */
type RawProgramEntry = string | {
  name?: string;
  programName?: string;
  nc_threshold?: number | null;
  nc?: number | null;
  state?: string;
  type?: string;
  totalMonthlyCosts?: number;
};

/** university_programs.json structure: "University Name (City)" -> programs[] */
export type UniversityProgramsData = Record<string, RawProgramEntry[] | string>;

// Global cache for university programs data
let cachedProgramsData: UniversityProgramsData | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface SearchParams {
  q?: string; // Search query
  city?: string; // Filter by city
  type?: string; // Filter by type (Uni, FH, Privat)
  state?: string; // Filter by state
  limit?: number; // Result limit (default: 20)
  offset?: number; // Pagination offset (default: 0)
}

/**
 * Program Name Mapping: German → English
 * This is the master mapping that defines how German program names are translated to English
 */
const PROGRAM_MAPPING: Record<string, string> = {
  // Business & Economics
  'Betriebswirtschaftslehre': 'Business Administration',
  'BWL': 'Business Administration',
  'Betriebswirtschaft': 'Business Administration',
  'Volkswirtschaftslehre': 'Economics',
  'VWL': 'Economics',
  'Volkswirtschaft': 'Economics',
  'Wirtschaftswissenschaften': 'Economics',
  'Wirtschaftsinformatik': 'Business Informatics',
  'Internationale Betriebswirtschaftslehre': 'International Business Administration',
  
  // Law
  'Rechtswissenschaften': 'Law',
  'Rechtswissenschaft': 'Law',
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
 * Reverse lookup: Find German terms from English query
 * User types "Business" → Returns ["Betriebswirtschaftslehre", "BWL", "Betriebswirtschaft"]
 */
function getGermanTermsFromEnglish(englishQuery: string): string[] {
  const normalized = englishQuery.toLowerCase().trim();
  const germanTerms = new Set<string>();
  
  // Reverse lookup: Find all German keys that map to this English term
  Object.entries(PROGRAM_MAPPING).forEach(([german, english]) => {
    const englishLower = english.toLowerCase();
    // Check if the English query matches the mapped English value
    if (englishLower.includes(normalized) || normalized.includes(englishLower)) {
      germanTerms.add(german);
      germanTerms.add(german.toLowerCase());
    }
  });
  
  // Also check common abbreviations and variations
  const searchTerms = getSearchTerms(englishQuery);
  searchTerms.forEach(term => {
    Object.entries(PROGRAM_MAPPING).forEach(([german, english]) => {
      if (english.toLowerCase().includes(term.toLowerCase())) {
        germanTerms.add(german);
        germanTerms.add(german.toLowerCase());
      }
    });
  });
  
  return Array.from(germanTerms);
}

/**
 * Load and cache university programs data
 */
function loadProgramsData() {
  const now = Date.now();
  
  // Return cached data if still valid
  if (cachedProgramsData && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedProgramsData;
  }

  try {
    // Load from data directory
    const filePath = join(process.cwd(), 'data', 'university_programs.json');
    const fileContent = readFileSync(filePath, 'utf-8');
    cachedProgramsData = JSON.parse(fileContent) as UniversityProgramsData;
    cacheTimestamp = now;
    
    return cachedProgramsData;
  } catch (error) {
    console.error('Error loading university_programs.json:', error);
    return null;
  }
}

/**
 * Flatten programs from nested structure to searchable array
 */
function flattenPrograms(programsData: UniversityProgramsData): Array<{
  programName: string;
  university: string;
  city: string;
  state?: string;
  type?: string;
  nc?: number | null;
  totalMonthlyCosts?: number;
  instructionLanguage?: string;
}> {
  const results: Array<{
    programName: string;
    university: string;
    city: string;
    state?: string;
    type?: string;
    nc?: number | null;
    totalMonthlyCosts?: number;
    instructionLanguage?: string;
  }> = [];

  Object.entries(programsData).forEach(([universityKey, programs]) => {
    // Skip metadata keys
    if (universityKey === 'last_updated' || universityKey === 'data_version') {
      return;
    }

    const programsArray = programs as RawProgramEntry[];
    if (!Array.isArray(programsArray)) return;

    programsArray.forEach((program) => {
      // Handle both string and object formats
      const programName = typeof program === 'string' ? program : program.name || program.programName;
      if (!programName) return;

      // Extract university name and city from key (format: "University Name (City)")
      const match = universityKey.match(/^(.+?)\s*\((.+?)\)$/);
      const university = match ? match[1] : universityKey;
      const city = match ? match[2] : '';

      results.push({
        programName,
        university,
        city,
        state: typeof program === 'object' ? program.state : undefined,
        type: typeof program === 'object' ? program.type : undefined,
        nc: typeof program === 'object' ? (program.nc_threshold ?? program.nc ?? null) : null,
        totalMonthlyCosts: typeof program === 'object' ? program.totalMonthlyCosts : undefined,
      });
    });
  });

  return results;
}

/**
 * Search and filter programs
 */
function searchPrograms(
  allPrograms: Array<{
    programName: string;
    university: string;
    city: string;
    state?: string;
    type?: string;
    nc?: number | null;
    totalMonthlyCosts?: number;
  }>,
  params: SearchParams
): {
  results: Array<{
    programName: string;
    university: string;
    city: string;
    state?: string;
    type?: string;
    nc?: number | null;
    totalMonthlyCosts?: number;
  }>;
  total: number;
} {
  let filtered = [...allPrograms];

  // Filter by search query (English input, search German data)
  if (params.q?.trim()) {
    const englishQuery = params.q.trim();
    const englishQueryLower = englishQuery.toLowerCase();
    
    // Reverse lookup: Find German terms from English query
    // Example: "Business" → ["Betriebswirtschaftslehre", "BWL", "Betriebswirtschaft"]
    const germanTerms = getGermanTermsFromEnglish(englishQuery);

    filtered = filtered.filter((program) => {
      const programNameLower = program.programName.toLowerCase(); // German name in data
      const universityLower = program.university.toLowerCase();
      const cityLower = program.city.toLowerCase();

      // Search using German terms (from reverse lookup)
      const matchesGerman = germanTerms.length > 0 && germanTerms.some(
        (term) =>
          programNameLower.includes(term.toLowerCase()) ||
          programNameLower === term.toLowerCase()
      );

      // Also search using the English query directly
      // (in case program name is already in English or matches partially)
      const englishProgramName = getEnglishProgramName(program.programName).toLowerCase();
      const matchesEnglish = 
        englishProgramName.includes(englishQueryLower) ||
        programNameLower.includes(englishQueryLower) ||
        universityLower.includes(englishQueryLower) ||
        cityLower.includes(englishQueryLower);

      return matchesGerman || matchesEnglish;
    });
  }

  // Filter by city
  if (params.city?.trim()) {
    const cityLower = params.city.trim().toLowerCase();
    filtered = filtered.filter((program) =>
      program.city.toLowerCase().includes(cityLower)
    );
  }

  // Filter by type
  if (params.type && params.type !== 'Alle' && params.type !== 'All') {
    filtered = filtered.filter((program) => program.type === params.type);
  }

  // Filter by state
  if (params.state?.trim()) {
    const stateLower = params.state.trim().toLowerCase();
    filtered = filtered.filter(
      (program) => program.state?.toLowerCase() === stateLower
    );
  }

  // Sort by relevance (exact matches first, then by totalMonthlyCosts if available)
  filtered.sort((a, b) => {
    if (params.q?.trim()) {
      const query = params.q.trim().toLowerCase();
      const aExact = a.programName.toLowerCase().includes(query);
      const bExact = b.programName.toLowerCase().includes(query);
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
    }

    // Then sort by totalMonthlyCosts (ascending) if available
    if (a.totalMonthlyCosts !== undefined && b.totalMonthlyCosts !== undefined) {
      return a.totalMonthlyCosts - b.totalMonthlyCosts;
    }

    return 0;
  });

  // Apply pagination
  const limit = params.limit ? Math.min(params.limit, 100) : 20; // Max 100 results
  const offset = params.offset || 0;
  const total = filtered.length;
  
  // **CRUCIAL STEP**: Rename programName from German to English before returning
  // This ensures the frontend only receives English names
  const results = filtered.slice(offset, offset + limit).map((program) => {
    // Use PROGRAM_MAPPING first, then fallback to getEnglishProgramName
    const germanName = program.programName;
    const englishName = PROGRAM_MAPPING[germanName] || 
                        PROGRAM_MAPPING[germanName.toLowerCase()] ||
                        getEnglishProgramName(germanName);
    
    return {
      ...program,
      programName: englishName, // Translated to English
    };
  });
  
  return {
    results,
    total,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const params: SearchParams = {
      q: searchParams.get('q') || undefined,
      city: searchParams.get('city') || undefined,
      type: searchParams.get('type') || undefined,
      state: searchParams.get('state') || undefined,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!, 10)
        : 20,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!, 10)
        : 0,
    };

    // Load programs data (with caching)
    const programsData = loadProgramsData();
    if (!programsData) {
      return NextResponse.json(
        { error: 'Failed to load programs data' },
        { status: 500 }
      );
    }

    // Flatten programs for searching
    const allPrograms = flattenPrograms(programsData);

    // Search and filter
    const { results, total } = searchPrograms(allPrograms, params);

    return NextResponse.json({
      results,
      total,
      query: params,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

