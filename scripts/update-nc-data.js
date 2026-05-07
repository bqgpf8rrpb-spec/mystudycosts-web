#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PROGRAMS_PATH = path.join(ROOT, 'data', 'university_programs.json');
const SOURCE_PATH = path.join(ROOT, 'data', 'new_nc_data.json');
const MANUAL_TEMPLATE_PATH = path.join(ROOT, 'data', 'new_nc_data.template.json');
const METADATA_KEYS = new Set(['last_updated', 'data_version', 'total_programs']);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateProgramsDataset(data) {
  if (!isPlainObject(data)) {
    throw new Error('university_programs.json must be an object at root level.');
  }

  for (const [university, programs] of Object.entries(data)) {
    if (METADATA_KEYS.has(university)) continue;
    if (!Array.isArray(programs)) {
      // The dataset may contain additional root-level metadata counters.
      continue;
    }

    for (const program of programs) {
      if (!isPlainObject(program)) continue;
      if (typeof program.name !== 'string' || !program.name.trim()) {
        throw new Error(`Invalid program name in "${university}".`);
      }

      if (!('nc_threshold' in program)) {
        throw new Error(`Missing nc_threshold in "${university}" -> "${program.name}".`);
      }

      const nc = program.nc_threshold;
      if (nc !== null && typeof nc !== 'number' && typeof nc !== 'string') {
        throw new Error(`Invalid nc_threshold type in "${university}" -> "${program.name}".`);
      }

      if ('semester_fee' in program) {
        const fee = program.semester_fee;
        if (fee !== null && (typeof fee !== 'number' || Number.isNaN(fee) || fee < 0)) {
          throw new Error(`Invalid semester_fee in "${university}" -> "${program.name}".`);
        }
      }
    }
  }
}

function normalize(text) {
  return String(text || '').trim().toLowerCase();
}

function ensureManualTemplate() {
  if (fs.existsSync(MANUAL_TEMPLATE_PATH)) return;
  const template = [
    {
      university: 'Technical University of Munich (TUM)',
      program: 'Business Administration (B.Sc.)',
      nc_threshold: 1.8,
      semester_fee: 182.0,
    },
  ];
  writeJson(MANUAL_TEMPLATE_PATH, template);
  console.log(`Created manual template at ${path.relative(ROOT, MANUAL_TEMPLATE_PATH)}`);
}

function loadUpdates() {
  if (!fs.existsSync(SOURCE_PATH)) {
    ensureManualTemplate();
    console.log('No data/new_nc_data.json found. Skipping NC/semester updates for this run.');
    return [];
  }

  const updates = readJson(SOURCE_PATH);
  if (!Array.isArray(updates)) {
    throw new Error('data/new_nc_data.json must be an array.');
  }
  return updates;
}

function applyUpdates(dataset, updates) {
  let applied = 0;
  let skipped = 0;

  for (const entry of updates) {
    if (!isPlainObject(entry)) {
      skipped += 1;
      continue;
    }

    const university = entry.university;
    const programName = entry.program;
    if (typeof university !== 'string' || typeof programName !== 'string') {
      skipped += 1;
      continue;
    }

    const programs = dataset[university];
    if (!Array.isArray(programs)) {
      skipped += 1;
      continue;
    }

    const target = programs.find(
      (program) => isPlainObject(program) && normalize(program.name) === normalize(programName)
    );

    if (!target) {
      skipped += 1;
      continue;
    }

    let changed = false;
    if ('nc_threshold' in entry && target.nc_threshold !== entry.nc_threshold) {
      target.nc_threshold = entry.nc_threshold;
      changed = true;
    }

    if ('semester_fee' in entry && target.semester_fee !== entry.semester_fee) {
      target.semester_fee = entry.semester_fee;
      changed = true;
    }

    if (changed) applied += 1;
  }

  return { applied, skipped };
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const dataset = readJson(PROGRAMS_PATH);
  validateProgramsDataset(dataset);

  const before = JSON.stringify(dataset);
  const updates = loadUpdates();
  const { applied, skipped } = applyUpdates(dataset, updates);

  if (applied > 0) {
    dataset.last_updated = new Date().toISOString();
  }
  validateProgramsDataset(dataset);
  const after = JSON.stringify(dataset);
  const changed = before !== after;

  if (!dryRun && changed) {
    writeJson(PROGRAMS_PATH, dataset);
  }

  console.log(`Updates loaded: ${updates.length}`);
  console.log(`Entries applied: ${applied}`);
  console.log(`Entries skipped: ${skipped}`);
  console.log(`Dataset changed: ${changed}`);
  console.log(`last_updated: ${dataset.last_updated}`);
}

main();
