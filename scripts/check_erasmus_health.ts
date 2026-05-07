import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

type ErasmusHealthRow = {
  id: string | number;
  partner_university_name?: string | null;
  partner_city?: string | null;
  city?: string | null;
  partner_country?: string | null;
  country?: string | null;
  subject_area?: string | null;
  website_url?: string | null;
  partner_link?: string | null;
};

type BrokenLinkReport = {
  id: string;
  university: string;
  url: string;
  status: number | null;
  error: string | null;
};

type DuplicateReport = {
  rowAId: string;
  rowBId: string;
  city: string;
  nameA: string;
  nameB: string;
  similarity: number;
};

type IncompleteRowReport = {
  id: string;
  university: string;
  missingFields: string[];
};

type HealthReport = {
  generatedAt: string;
  scannedRows: number;
  brokenLinks: BrokenLinkReport[];
  potentialDuplicates: DuplicateReport[];
  incompleteRows: IncompleteRowReport[];
};

const TABLE_NAME = 'erasmus_partners';
const DUPLICATE_SIMILARITY_THRESHOLD = 0.86;
const LINK_CHECK_TIMEOUT_MS = 7000;
const LINK_CONCURRENCY = 10;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, () => 0)
  );

  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function similarityScore(a: string, b: string): number {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return 0;
  const distance = levenshtein(left, right);
  const maxLen = Math.max(left.length, right.length);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

function asId(value: string | number | undefined | null): string {
  return value == null ? 'unknown' : String(value);
}

function getUniversityName(row: ErasmusHealthRow): string {
  return (row.partner_university_name ?? '').trim() || 'Unknown University';
}

function getCity(row: ErasmusHealthRow): string {
  return (row.partner_city ?? row.city ?? '').trim();
}

function getCountry(row: ErasmusHealthRow): string {
  return (row.partner_country ?? row.country ?? '').trim();
}

function getSubjectArea(row: ErasmusHealthRow): string {
  return (row.subject_area ?? '').trim();
}

function getLink(row: ErasmusHealthRow): string {
  return (row.website_url ?? row.partner_link ?? '').trim();
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    }),
  ]);
}

async function checkSingleLink(url: string): Promise<{ status: number | null; error: string | null }> {
  if (!/^https?:\/\//i.test(url)) {
    return { status: null, error: 'Invalid URL (must start with http/https)' };
  }

  try {
    const headRes = await withTimeout(
      fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
      }),
      LINK_CHECK_TIMEOUT_MS
    );

    if (headRes.ok) {
      return { status: headRes.status, error: null };
    }

    // Some servers block HEAD; retry with GET to avoid false positives.
    if (headRes.status === 405 || headRes.status === 403) {
      const getRes = await withTimeout(
        fetch(url, {
          method: 'GET',
          redirect: 'follow',
        }),
        LINK_CHECK_TIMEOUT_MS
      );
      return getRes.ok
        ? { status: getRes.status, error: null }
        : { status: getRes.status, error: `HTTP ${getRes.status}` };
    }

    return { status: headRes.status, error: `HTTP ${headRes.status}` };
  } catch (error) {
    return { status: null, error: error instanceof Error ? error.message : 'Unknown fetch error' };
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex;
      currentIndex += 1;
      results[idx] = await mapper(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return results;
}

async function fetchErasmusRows(): Promise<ErasmusHealthRow[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  // Probe the schema with one row to discover which columns exist.
  const probe = await supabase.from(TABLE_NAME).select('*').limit(1);
  if (probe.error) {
    throw new Error(`Failed to probe ${TABLE_NAME} schema: ${probe.error.message}`);
  }

  const discoveredColumns = new Set<string>();
  (probe.data ?? []).forEach((row) => {
    Object.keys(row ?? {}).forEach((key) => discoveredColumns.add(key));
  });

  // If table is empty, we cannot infer from data keys. Use likely columns and let query validate.
  const has = (column: string): boolean => {
    if ((probe.data ?? []).length === 0) {
      return true;
    }
    return discoveredColumns.has(column);
  };

  const pick = (primary: string, fallback?: string): string | null => {
    if (has(primary)) return primary;
    if (fallback && has(fallback)) return fallback;
    return null;
  };

  const selectedColumns = new Set<string>();
  const addColumn = (column: string | null) => {
    if (column) selectedColumns.add(column);
  };

  addColumn(pick('id'));
  addColumn(pick('partner_university_name'));
  addColumn(pick('partner_city', 'city'));
  addColumn(pick('city', 'partner_city'));
  addColumn(pick('partner_country', 'country'));
  addColumn(pick('country', 'partner_country'));
  addColumn(pick('subject_area'));
  addColumn(pick('website_url', 'partner_link'));
  addColumn(pick('partner_link', 'website_url'));

  if (!selectedColumns.has('id')) {
    throw new Error(`Failed to fetch ${TABLE_NAME}: required column "id" is missing`);
  }

  const selectClause = Array.from(selectedColumns).join(',');
  const response = await supabase.from(TABLE_NAME).select(selectClause);

  if (response.error) {
    throw new Error(`Failed to fetch ${TABLE_NAME}: ${response.error.message}`);
  }

  return (response.data ?? []) as unknown as ErasmusHealthRow[];
}

function findIncompleteRows(rows: ErasmusHealthRow[]): IncompleteRowReport[] {
  return rows
    .map((row) => {
      const missingFields: string[] = [];
      if (!getCity(row)) missingFields.push('city');
      if (!getCountry(row)) missingFields.push('country');
      if (!getSubjectArea(row)) missingFields.push('subject_area');

      return {
        id: asId(row.id),
        university: getUniversityName(row),
        missingFields,
      };
    })
    .filter((item) => item.missingFields.length > 0);
}

function findPotentialDuplicates(rows: ErasmusHealthRow[]): DuplicateReport[] {
  const byCity = new Map<string, ErasmusHealthRow[]>();
  rows.forEach((row) => {
    const cityKey = normalizeText(getCity(row));
    if (!cityKey) return;
    const list = byCity.get(cityKey) ?? [];
    list.push(row);
    byCity.set(cityKey, list);
  });

  const duplicates: DuplicateReport[] = [];

  byCity.forEach((cityRows) => {
    for (let i = 0; i < cityRows.length; i += 1) {
      for (let j = i + 1; j < cityRows.length; j += 1) {
        const rowA = cityRows[i];
        const rowB = cityRows[j];
        const nameA = getUniversityName(rowA);
        const nameB = getUniversityName(rowB);
        if (!nameA || !nameB) continue;

        const similarity = similarityScore(nameA, nameB);
        if (similarity >= DUPLICATE_SIMILARITY_THRESHOLD) {
          duplicates.push({
            rowAId: asId(rowA.id),
            rowBId: asId(rowB.id),
            city: getCity(rowA),
            nameA,
            nameB,
            similarity: Number(similarity.toFixed(3)),
          });
        }
      }
    }
  });

  return duplicates;
}

async function findBrokenLinks(rows: ErasmusHealthRow[]): Promise<BrokenLinkReport[]> {
  const rowsWithLinks = rows.filter((row) => getLink(row).length > 0);

  const checks = await mapWithConcurrency(rowsWithLinks, LINK_CONCURRENCY, async (row) => {
    const url = getLink(row);
    const result = await checkSingleLink(url);
    return {
      id: asId(row.id),
      university: getUniversityName(row),
      url,
      ...result,
    };
  });

  return checks.filter((entry) => entry.error !== null);
}

async function main(): Promise<void> {
  console.log('Running Erasmus health audit...');
  const rows = await fetchErasmusRows();

  const [brokenLinks, potentialDuplicates, incompleteRows] = await Promise.all([
    findBrokenLinks(rows),
    Promise.resolve(findPotentialDuplicates(rows)),
    Promise.resolve(findIncompleteRows(rows)),
  ]);

  const report: HealthReport = {
    generatedAt: new Date().toISOString(),
    scannedRows: rows.length,
    brokenLinks,
    potentialDuplicates,
    incompleteRows,
  };

  const reportPath = path.resolve(process.cwd(), 'health_report.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`Found ${brokenLinks.length} broken links`);
  console.log(`Found ${potentialDuplicates.length} potential duplicates`);
  console.log(`Found ${incompleteRows.length} incomplete rows`);
  console.log(`Health report saved to: ${reportPath}`);
}

main().catch((error) => {
  console.error('Erasmus health check failed:', error);
  process.exit(1);
});
