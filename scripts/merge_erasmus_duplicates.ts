import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const TABLE_NAME = 'erasmus_partners';
const DUPLICATE_SIMILARITY_THRESHOLD = 0.86;
const PREVIEW_FILE = 'merge_preview.json';

type ErasmusRow = Record<string, unknown> & {
  id: string | number;
};

type MergeClusterPreview = {
  city: string;
  normalizedCity: string;
  nameSimilarityThreshold: number;
  master: {
    id: string;
    name: string;
    completenessScore: number;
  };
  mergeIds: string[];
  mergedFromNames: string[];
  mergedSubjectAreas: string[];
  mergedDepartments: string[];
  websiteBefore: string | null;
  websiteAfter: string | null;
};

type MergePreview = {
  generatedAt: string;
  dryRun: boolean;
  table: string;
  scannedRows: number;
  candidateClusters: number;
  mergeRowsCount: number;
  updatesPlanned: number;
  deletesPlanned: number;
  executed: boolean;
  clusters: MergeClusterPreview[];
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function asId(value: string | number | null | undefined): string {
  if (value == null) return 'unknown';
  return String(value);
}

function splitMultiValue(raw: string): string[] {
  return raw
    .split(/[,;|/]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function uniqNormalized(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  values.forEach((value) => {
    const key = normalizeText(value);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(value);
  });
  return out;
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

function parseArgs(argv: string[]): { execute: boolean; limit: number | null } {
  const execute = argv.includes('--execute');
  const limitFlagIndex = argv.findIndex((arg) => arg === '--limit');
  let limit: number | null = null;

  if (limitFlagIndex >= 0) {
    const rawValue = argv[limitFlagIndex + 1];
    if (!rawValue) {
      throw new Error('Missing value for --limit. Example: --limit 5');
    }
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`Invalid --limit value "${rawValue}". Use a positive integer.`);
    }
    limit = parsed;
  }

  return { execute, limit };
}

function getString(row: ErasmusRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function setIfColumnExists(
  payload: Record<string, unknown>,
  columns: Set<string>,
  key: string,
  value: unknown
): void {
  if (columns.has(key)) {
    payload[key] = value;
  }
}

function cityOf(row: ErasmusRow): string {
  return getString(row, ['city', 'partner_city']);
}

function nameOf(row: ErasmusRow): string {
  return getString(row, ['partner_university_name', 'university_name', 'name']);
}

function subjectAreaOf(row: ErasmusRow): string {
  return getString(row, ['subject_area', 'subject_areas']);
}

function departmentOf(row: ErasmusRow): string {
  return getString(row, ['department', 'faculty_department']);
}

function websiteOf(row: ErasmusRow): string {
  return getString(row, ['website_url', 'partner_link', 'url']);
}

function reliabilityScoreForUrl(url: string): number {
  if (!url) return 0;
  const normalized = url.trim().toLowerCase();
  let score = 1;
  if (normalized.startsWith('https://')) score += 4;
  else if (normalized.startsWith('http://')) score += 2;
  if (normalized.includes('.edu') || normalized.includes('.ac.')) score += 2;
  if (normalized.includes('facebook.com') || normalized.includes('instagram.com')) score -= 2;
  if (normalized.length < 12) score -= 1;
  return score;
}

function completenessScore(row: ErasmusRow): number {
  let score = 0;
  if (nameOf(row)) score += 3;
  if (cityOf(row)) score += 2;
  if (getString(row, ['country', 'partner_country'])) score += 2;
  if (subjectAreaOf(row)) score += 1;
  if (departmentOf(row)) score += 1;
  if (websiteOf(row)) score += 2;
  return score;
}

function pickMaster(rows: ErasmusRow[]): ErasmusRow {
  const sorted = [...rows].sort((a, b) => {
    const scoreDiff = completenessScore(b) - completenessScore(a);
    if (scoreDiff !== 0) return scoreDiff;

    const aName = normalizeText(nameOf(a));
    const bName = normalizeText(nameOf(b));
    if (aName.length !== bName.length) return aName.length - bName.length;

    return asId(a.id).localeCompare(asId(b.id));
  });
  return sorted[0];
}

async function fetchRowsAndColumns(): Promise<{ rows: ErasmusRow[]; columns: Set<string> }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const probe = await supabase.from(TABLE_NAME).select('*').limit(1);
  if (probe.error) {
    throw new Error(`Failed to probe ${TABLE_NAME} schema: ${probe.error.message}`);
  }

  const columns = new Set<string>();
  (probe.data ?? []).forEach((row) => {
    Object.keys((row ?? {}) as Record<string, unknown>).forEach((key) => columns.add(key));
  });

  // For empty tables, add likely columns to keep logic stable.
  if ((probe.data ?? []).length === 0) {
    ['id', 'partner_university_name', 'city', 'partner_city', 'country', 'partner_country', 'subject_area', 'department', 'faculty_department', 'website_url', 'partner_link'].forEach((key) =>
      columns.add(key)
    );
  }

  const selectCandidates = [
    'id',
    'partner_university_name',
    'university_name',
    'name',
    'city',
    'partner_city',
    'country',
    'partner_country',
    'subject_area',
    'subject_areas',
    'department',
    'faculty_department',
    'website_url',
    'partner_link',
    'url',
  ].filter((key) => columns.has(key));

  if (!selectCandidates.includes('id')) {
    throw new Error(`Table ${TABLE_NAME} has no "id" column; cannot merge safely.`);
  }

  const selectClause = selectCandidates.join(',');
  const response = await supabase.from(TABLE_NAME).select(selectClause);
  if (response.error) {
    throw new Error(`Failed to fetch rows from ${TABLE_NAME}: ${response.error.message}`);
  }

  return {
    rows: (response.data ?? []) as unknown as ErasmusRow[],
    columns,
  };
}

function buildDuplicateClusters(rows: ErasmusRow[]): ErasmusRow[][] {
  const byCity = new Map<string, ErasmusRow[]>();
  rows.forEach((row) => {
    const city = cityOf(row);
    const cityKey = normalizeText(city);
    if (!cityKey) return;
    const list = byCity.get(cityKey) ?? [];
    list.push(row);
    byCity.set(cityKey, list);
  });

  const clusters: ErasmusRow[][] = [];

  byCity.forEach((cityRows) => {
    const visited = new Set<string>();
    for (let i = 0; i < cityRows.length; i += 1) {
      const seed = cityRows[i];
      const seedId = asId(seed.id);
      if (visited.has(seedId)) continue;

      const cluster: ErasmusRow[] = [seed];
      visited.add(seedId);

      for (let j = i + 1; j < cityRows.length; j += 1) {
        const candidate = cityRows[j];
        const candidateId = asId(candidate.id);
        if (visited.has(candidateId)) continue;

        const sim = similarityScore(nameOf(seed), nameOf(candidate));
        if (sim >= DUPLICATE_SIMILARITY_THRESHOLD) {
          cluster.push(candidate);
          visited.add(candidateId);
        }
      }

      if (cluster.length > 1) {
        clusters.push(cluster);
      }
    }
  });

  return clusters;
}

async function writePreview(preview: MergePreview): Promise<string> {
  const outputPath = path.resolve(process.cwd(), PREVIEW_FILE);
  await writeFile(outputPath, JSON.stringify(preview, null, 2), 'utf-8');
  return outputPath;
}

async function executeMerges(
  clusters: MergeClusterPreview[],
  rowsById: Map<string, ErasmusRow>,
  columns: Set<string>
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  for (let idx = 0; idx < clusters.length; idx += 1) {
    const cluster = clusters[idx];
    const masterRow = rowsById.get(cluster.master.id);
    if (!masterRow) continue;

    console.log(
      `Merging cluster ${idx + 1}/${clusters.length}: ${cluster.city || 'Unknown City'} / ${
        cluster.master.name || 'Unknown University'
      } (master ${cluster.master.id}, merging ${cluster.mergeIds.length} rows)`
    );

    const updatePayload: Record<string, unknown> = {};
    if (cluster.mergedSubjectAreas.length > 0) {
      if (columns.has('subject_area')) {
        setIfColumnExists(updatePayload, columns, 'subject_area', cluster.mergedSubjectAreas.join('; '));
      } else if (columns.has('subject_areas')) {
        setIfColumnExists(updatePayload, columns, 'subject_areas', cluster.mergedSubjectAreas.join('; '));
      }
    }

    if (cluster.mergedDepartments.length > 0) {
      if (columns.has('department')) {
        setIfColumnExists(updatePayload, columns, 'department', cluster.mergedDepartments.join('; '));
      } else if (columns.has('faculty_department')) {
        setIfColumnExists(updatePayload, columns, 'faculty_department', cluster.mergedDepartments.join('; '));
      }
    }

    if (cluster.websiteAfter) {
      if (columns.has('website_url')) {
        setIfColumnExists(updatePayload, columns, 'website_url', cluster.websiteAfter);
      } else if (columns.has('partner_link')) {
        setIfColumnExists(updatePayload, columns, 'partner_link', cluster.websiteAfter);
      }
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabase
        .from(TABLE_NAME)
        .update(updatePayload)
        .eq('id', masterRow.id);
      if (updateError) {
        throw new Error(`Failed to update master row ${cluster.master.id}: ${updateError.message}`);
      }
    }

    if (cluster.mergeIds.length > 0) {
      const { error: deleteError } = await supabase
        .from(TABLE_NAME)
        .delete()
        .in('id', cluster.mergeIds);
      if (deleteError) {
        throw new Error(`Failed to delete merged rows for master ${cluster.master.id}: ${deleteError.message}`);
      }
    }
  }
}

async function main(): Promise<void> {
  const { execute, limit } = parseArgs(process.argv.slice(2));
  console.log(`Running Erasmus duplicate merge (${execute ? 'EXECUTE' : 'DRY RUN'})...`);

  const { rows, columns } = await fetchRowsAndColumns();
  const rowsById = new Map<string, ErasmusRow>(rows.map((row) => [asId(row.id), row]));
  const duplicateClusters = buildDuplicateClusters(rows);

  const previews: MergeClusterPreview[] = duplicateClusters.map((clusterRows) => {
    const master = pickMaster(clusterRows);
    const masterId = asId(master.id);
    const mergeRows = clusterRows.filter((row) => asId(row.id) !== masterId);

    const allSubjects = uniqNormalized(
      clusterRows.flatMap((row) => splitMultiValue(subjectAreaOf(row)))
    );
    const allDepartments = uniqNormalized(
      clusterRows.flatMap((row) => splitMultiValue(departmentOf(row)))
    );

    const allWebsites = uniqNormalized(clusterRows.map((row) => websiteOf(row)).filter(Boolean));
    const bestWebsite =
      allWebsites.sort((a, b) => reliabilityScoreForUrl(b) - reliabilityScoreForUrl(a))[0] ?? null;
    const currentWebsite = websiteOf(master) || null;

    return {
      city: cityOf(master),
      normalizedCity: normalizeText(cityOf(master)),
      nameSimilarityThreshold: DUPLICATE_SIMILARITY_THRESHOLD,
      master: {
        id: masterId,
        name: nameOf(master),
        completenessScore: completenessScore(master),
      },
      mergeIds: mergeRows.map((row) => asId(row.id)),
      mergedFromNames: mergeRows.map((row) => nameOf(row)).filter(Boolean),
      mergedSubjectAreas: allSubjects,
      mergedDepartments: allDepartments,
      websiteBefore: currentWebsite,
      websiteAfter: bestWebsite,
    };
  });

  const preview: MergePreview = {
    generatedAt: new Date().toISOString(),
    dryRun: !execute,
    table: TABLE_NAME,
    scannedRows: rows.length,
    candidateClusters: previews.length,
    mergeRowsCount: previews.reduce((sum, cluster) => sum + cluster.mergeIds.length, 0),
    updatesPlanned: previews.length,
    deletesPlanned: previews.reduce((sum, cluster) => sum + cluster.mergeIds.length, 0),
    executed: false,
    clusters: previews,
  };

  const previewPath = await writePreview(preview);

  if (!execute) {
    console.log(`DRY RUN complete. Preview written to: ${previewPath}`);
    console.log(`Candidate clusters: ${preview.candidateClusters}`);
    console.log(`Rows that would be deleted: ${preview.deletesPlanned}`);
    if (limit != null) {
      console.log(`Execution limit requested: first ${limit} cluster(s) (applies only with --execute).`);
    }
    console.log('Review the preview and rerun with --execute to apply changes.');
    return;
  }

  const executionTargets = limit != null ? previews.slice(0, limit) : previews;
  console.log(
    `Executing merge for ${executionTargets.length} of ${previews.length} cluster(s)${
      limit != null ? ` (limited by --limit ${limit})` : ''
    }.`
  );

  await executeMerges(executionTargets, rowsById, columns);
  preview.executed = true;
  preview.dryRun = false;
  await writePreview(preview);

  console.log(`EXECUTE complete. Preview updated at: ${previewPath}`);
  console.log(`Merged clusters: ${executionTargets.length}`);
  console.log(
    `Deleted rows: ${executionTargets.reduce((sum, cluster) => sum + cluster.mergeIds.length, 0)}`
  );
}

main().catch((error) => {
  console.error('Duplicate merge script failed:', error);
  process.exit(1);
});

