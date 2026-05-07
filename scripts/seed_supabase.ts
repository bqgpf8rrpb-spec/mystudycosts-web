import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

type ProgramEntry = {
  name: string;
  nc_value: string | null;
  nc_last_updated: string | null;
};

type ProgramsByUniversity = Record<string, ProgramEntry[]>;

type NcRow = {
  university: string;
  program_name: string;
  nc_value: string | null;
  nc_last_updated: string | null;
};

const BATCH_SIZE = 1000;
const TABLE_NAME = 'nc_search_index';

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function normalizeNc(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment (.env.local).'
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const sourcePath = path.resolve(__dirname, '../data/university_programs_v2.json');

  console.log(`Loading source data from: ${sourcePath}`);
  const raw = await readFile(sourcePath, 'utf-8');
  const parsed = JSON.parse(raw) as ProgramsByUniversity;

  const rows: NcRow[] = [];
  for (const [university, programs] of Object.entries(parsed)) {
    if (!Array.isArray(programs)) continue;

    for (const program of programs) {
      if (!program || typeof program.name !== 'string') continue;

      rows.push({
        university,
        program_name: program.name.trim(),
        nc_value: normalizeNc(program.nc_value),
        nc_last_updated: normalizeNc(program.nc_last_updated),
      });
    }
  }

  if (rows.length === 0) {
    console.log('No rows found to seed. Exiting.');
    return;
  }

  const batches = chunkArray(rows, BATCH_SIZE);
  console.log(`Prepared ${rows.length} rows across ${batches.length} batches.`);

  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i];
    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert(batch, { onConflict: 'university,program_name' });

    if (error) {
      console.error(`Batch ${i + 1}/${batches.length} failed:`, error);
      throw new Error(`Seeding aborted at batch ${i + 1}`);
    }

    console.log(
      `Uploaded batch ${i + 1}/${batches.length} (${batch.length} rows, total uploaded: ${Math.min(
        (i + 1) * BATCH_SIZE,
        rows.length
      )}/${rows.length})`
    );
  }

  console.log('Seeding completed successfully.');
}

main().catch((error) => {
  console.error('Seeder failed:', error);
  process.exit(1);
});
