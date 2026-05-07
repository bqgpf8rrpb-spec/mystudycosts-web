import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getEnglishProgramName } from '@/lib/utils';
import {
  calculateAdmissionChance,
  normalizeNcValue,
  isOpenAdmissionNc,
  type AdmissionBucket,
} from '@/lib/nc-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NC_TABLE_NAME = process.env.NC_TABLE_NAME || 'nc_search_index';

let cachedLocalIndex: NCIndexEntry[] | null = null;
let localIndexCacheTimestamp = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000;

interface NCSearchParams {
  q?: string; // Search query
  city?: string; // Filter by city
  type?: string; // Filter by type (Uni, FH, Privat)
  state?: string | string[]; // Filter by state(s)
  limit?: number; // Result limit (default: 20)
  offset?: number; // Pagination offset (default: 0)
  englishOnly?: string; // Filter for English-taught programs only ('true')
  userGpa?: string; // User's GPA for NC comparison (optional)
}

interface NCIndexEntry {
  programName: string;
  university: string;
  city: string;
  state: string;
  type: 'Uni' | 'FH' | 'Privat';
  nc: number | null;
  totalMonthlyCosts: number;
  semester_fee?: number;
  erasmusCount?: number;
  instructionLanguage?: string; // 'German', 'English', or 'Bilingual'
}

interface SupabaseNcRow {
  university: string;
  program_name: string;
  nc_value: string | null;
  nc_last_updated: string | null;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function stripDegreeSuffix(value: string): string {
  return value.replace(/\s*\([^)]*\)\s*$/g, '').trim();
}

function getProgramRelevanceRank(programName: string, queryText: string): number {
  const programNormalized = normalizeText(programName);
  const programWithoutDegree = normalizeText(stripDegreeSuffix(programName));
  const queryNormalized = normalizeText(queryText);
  const queryWithoutDegree = normalizeText(stripDegreeSuffix(queryText));

  // Rule A: Exact match (case-insensitive), including suffix-insensitive equality.
  if (
    programNormalized === queryNormalized ||
    programWithoutDegree === queryNormalized ||
    (queryWithoutDegree.length > 0 && programWithoutDegree === queryWithoutDegree)
  ) {
    return 0;
  }

  // Rule B: Query appears at start of program name.
  if (
    programNormalized.startsWith(queryNormalized) ||
    programWithoutDegree.startsWith(queryNormalized) ||
    (queryWithoutDegree.length > 0 && programWithoutDegree.startsWith(queryWithoutDegree))
  ) {
    return 1;
  }

  // Rule C: Partial match.
  if (
    programNormalized.includes(queryNormalized) ||
    programWithoutDegree.includes(queryNormalized) ||
    (queryWithoutDegree.length > 0 && programWithoutDegree.includes(queryWithoutDegree))
  ) {
    return 2;
  }

  return 3;
}

function loadLocalNcIndex(): NCIndexEntry[] {
  const now = Date.now();
  if (cachedLocalIndex && now - localIndexCacheTimestamp < CACHE_DURATION_MS) {
    return cachedLocalIndex;
  }

  try {
    const filePath = join(process.cwd(), 'data', 'nc_search_index.json');
    const fileContent = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent) as unknown;
    cachedLocalIndex = Array.isArray(data) ? (data as NCIndexEntry[]) : [];
    localIndexCacheTimestamp = now;
    return cachedLocalIndex;
  } catch (error) {
    console.error('Error loading nc_search_index.json:', error);
    return [];
  }
}

function classifyAdmissionBand(userGpa: number | undefined, nc: number | null): AdmissionBucket {
  return calculateAdmissionChance(userGpa ?? null, nc);
}

/**
 * Top Affiliate Fields - Fields that are good candidates for private university recommendations
 */
const TOP_AFFILIATE_FIELDS = [
  'business', 'betriebswirtschaft', 'bwl', 'wirtschaft',
  'computer science', 'informatik', 'informationstechnik', 'it',
  'psychology', 'psychologie',
  'health', 'medizin', 'healthcare', 'gesundheit',
  'medicine', 'humanmedizin',
];

/**
 * Check if search query matches top affiliate fields
 */
function isTopAffiliateField(query: string): boolean {
  const queryLower = query.toLowerCase().trim();
  return TOP_AFFILIATE_FIELDS.some(field => 
    queryLower.includes(field.toLowerCase()) || 
    field.toLowerCase().includes(queryLower)
  );
}

/**
 * Check if public university results have NC significantly above user GPA
 */
function shouldShowAffiliatePartner(
  results: NCIndexEntry[],
  userGpa?: number
): boolean {
  // If no user GPA provided, check if it's a top affiliate field
  if (!userGpa) {
    return false; // We'll check for top affiliate fields separately
  }

  // Filter to only public universities (Uni, FH, not Privat)
  const publicResults = results.filter(
    entry => entry.type !== 'Privat' && entry.nc !== null
  );

  if (publicResults.length === 0) {
    return false;
  }

  // Check if all public results have NC significantly above user GPA
  // "Significantly" means at least 0.5 points higher (stricter requirement)
  const allAboveThreshold = publicResults.every(
    entry => entry.nc !== null && entry.nc > userGpa + 0.5
  );

  return allAboveThreshold;
}

/**
 * Get featured partner data based on search query
 */
function getFeaturedPartner(query?: string): {
  name: string;
  program: string;
  url: string;
  advantages: string[];
  description: string;
} | null {
  if (!query) return null;

  const queryLower = query.toLowerCase().trim();

  // Business/Management programs
  if (
    queryLower.includes('business') ||
    queryLower.includes('bwl') ||
    queryLower.includes('betriebswirtschaft') ||
    queryLower.includes('wirtschaft') ||
    queryLower.includes('management')
  ) {
    return {
      name: 'IU International University',
      program: 'Business Administration (B.Sc.)',
      url: 'https://www.iu.de/en/study/bachelor/business-administration',
      advantages: [
        'No NC required',
        'Start anytime (flexible start dates)',
        '100% online or on-campus options',
        'English-taught programs available',
      ],
      description: 'Study Business Administration without NC restrictions. Flexible start dates and multiple study formats.',
    };
  }

  // IT/Computer Science programs
  if (
    queryLower.includes('computer') ||
    queryLower.includes('informatik') ||
    queryLower.includes('it') ||
    queryLower.includes('informationstechnik') ||
    queryLower.includes('software')
  ) {
    return {
      name: 'IU International University',
      program: 'Computer Science (B.Sc.)',
      url: 'https://www.iu.de/en/study/bachelor/computer-science',
      advantages: [
        'No NC required',
        'Start anytime',
        '100% online or on-campus',
        'Industry-relevant curriculum',
      ],
      description: 'Start your IT career without NC barriers. Modern curriculum aligned with industry needs.',
    };
  }

  // Psychology programs
  if (
    queryLower.includes('psychology') ||
    queryLower.includes('psychologie')
  ) {
    return {
      name: 'IU International University',
      program: 'Psychology (B.Sc.)',
      url: 'https://www.iu.de/en/study/bachelor/psychology',
      advantages: [
        'No NC required',
        'Start anytime',
        'Flexible study formats',
        'Accredited program',
      ],
      description: 'Study Psychology without waiting for NC. Accredited program with flexible options.',
    };
  }

  // Health/Medicine related
  if (
    queryLower.includes('health') ||
    queryLower.includes('gesundheit') ||
    queryLower.includes('medizin') ||
    queryLower.includes('medicine') ||
    queryLower.includes('healthcare')
  ) {
    return {
      name: 'IU International University',
      program: 'Health Management (B.Sc.)',
      url: 'https://www.iu.de/en/study/bachelor/health-management',
      advantages: [
        'No NC required',
        'Start anytime',
        'Combines health and business',
        'Career-focused curriculum',
      ],
      description: 'Combine health sciences with management. No NC restrictions, flexible start dates.',
    };
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const q = searchParams.get('q') || undefined;
    const params: NCSearchParams = {
      q,
      city: searchParams.get('city') || undefined,
      type: searchParams.get('type') || undefined,
      state: searchParams.getAll('state').length > 0
        ? searchParams.getAll('state')
        : undefined,
      // When program (q) is provided, use higher default limit for NC Checker (393 unis × programs)
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!, 10)
        : q ? 500 : 20,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!, 10)
        : 0,
      userGpa: searchParams.get('userGpa') || undefined,
    };

    const queryText = q?.trim() || '';
    if (!queryText) {
      return NextResponse.json({
        results: [],
        total: 0,
        query: params,
        userGpaProvided: false,
      });
    }

    const limit = params.limit ? Math.min(params.limit, 1000) : 500;
    const offset = params.offset || 0;

    // Global program search: fuzzy-match program_name across all universities.
    const { data: dbRows, error } = await supabase
      .from(NC_TABLE_NAME)
      .select('university, program_name, nc_value, nc_last_updated')
      .ilike('program_name', `%${queryText}%`)
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Supabase NC search error:', error);
      return NextResponse.json({ error: 'NC search failed' }, { status: 500 });
    }

    const rows = (dbRows ?? []) as SupabaseNcRow[];
    const localIndex = loadLocalNcIndex();
    const localMap = new Map<string, NCIndexEntry>();
    for (const entry of localIndex) {
      const key = `${normalizeText(entry.university)}::${normalizeText(entry.programName)}`;
      if (!localMap.has(key)) localMap.set(key, entry);
    }

    const queryNormalized = normalizeText(queryText);
    const queryWithoutDegree = normalizeText(stripDegreeSuffix(queryText));

    let results: NCIndexEntry[] = rows.map((row) => {
      const rowEnglishProgramName = getEnglishProgramName(row.program_name);
      const key = `${normalizeText(row.university)}::${normalizeText(rowEnglishProgramName)}`;
      const local = localMap.get(key);
      return {
        programName: rowEnglishProgramName,
        university: row.university,
        city: local?.city ?? '',
        state: local?.state ?? '',
        type: local?.type ?? 'Uni',
        nc: normalizeNcValue(row.nc_value),
        totalMonthlyCosts: local?.totalMonthlyCosts ?? 0,
        semester_fee: local?.semester_fee,
        erasmusCount: local?.erasmusCount,
        instructionLanguage: local?.instructionLanguage,
      };
    });

    // Fallback for cross-language and slightly imprecise queries:
    // if DB lookup (program_name ILIKE) returns no rows, search local index with normalized includes.
    if (results.length === 0) {
      const localFallback = localIndex.filter((entry) => {
        const nameNormalized = normalizeText(entry.programName);
        const nameNoDegree = normalizeText(stripDegreeSuffix(entry.programName));
        return (
          nameNormalized.includes(queryNormalized) ||
          queryNormalized.includes(nameNormalized) ||
          (queryWithoutDegree.length > 0 && nameNoDegree.includes(queryWithoutDegree))
        );
      });

      if (localFallback.length > 0) {
        results = localFallback.slice(offset, offset + limit);
      }
    }

    if (params.city?.trim()) {
      const cityLower = params.city.trim().toLowerCase();
      results = results.filter((entry) => entry.city.toLowerCase().includes(cityLower));
    }

    if (params.type && params.type !== 'Alle' && params.type !== 'All') {
      results = results.filter((entry) => entry.type === params.type);
    }

    if (params.state) {
      const states = Array.isArray(params.state) ? params.state : [params.state];
      results = results.filter((entry) => states.includes(entry.state));
    }

    if (params.englishOnly === 'true') {
      results = results.filter((entry) => entry.instructionLanguage === 'English');
    }

    const userGpa = params.userGpa ? Number.parseFloat(params.userGpa) : undefined;
    results.sort((a, b) => {
      const relevanceA = getProgramRelevanceRank(a.programName, queryText);
      const relevanceB = getProgramRelevanceRank(b.programName, queryText);
      if (relevanceA !== relevanceB) return relevanceA - relevanceB;

      const bandA = classifyAdmissionBand(userGpa, a.nc);
      const bandB = classifyAdmissionBand(userGpa, b.nc);
      if (bandA !== bandB) return bandA - bandB;
      if (a.totalMonthlyCosts !== b.totalMonthlyCosts) return a.totalMonthlyCosts - b.totalMonthlyCosts;
      return a.university.localeCompare(b.university);
    });

    const total = results.length;

    // Determine if we should show featured partner
    const showAffiliateForNC = shouldShowAffiliatePartner(results, userGpa);
    const showAffiliateForField = params.q ? isTopAffiliateField(params.q) : false;
    const shouldShowPartner = showAffiliateForNC || showAffiliateForField;

    // Get featured partner data if conditions are met
    const featuredPartner = shouldShowPartner
      ? getFeaturedPartner(params.q)
      : null;

    return NextResponse.json({
      results,
      total,
      query: params,
      userGpaProvided: params.userGpa != null && params.userGpa !== '',
      ...(featuredPartner && { featuredPartner }),
    });
  } catch (error) {
    console.error('NC Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

