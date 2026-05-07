#!/usr/bin/env node

/**
 * Quality Check for Erasmus Partner Database
 *
 * Performs completeness, freshness, and regression checks.
 * Generates a coverage report and alerts on issues.
 *
 * Exit codes:
 *   0 = all checks passed
 *   1 = warnings (non-critical)
 *   2 = critical issues found
 */

const fs = require('fs');
const path = require('path');

const PARTNERS_DB = path.join(__dirname, '..', 'data', 'erasmus_partners.json');
const MOVEON_DIR = path.join(__dirname, '..', 'data', 'moveon');
const EWP_REGISTRY = path.join(__dirname, '..', 'data', 'ewp_registry.json');
const SNAPSHOT_PATH = path.join(__dirname, '..', 'data', 'quality_snapshot.json');

function loadDb() {
  return JSON.parse(fs.readFileSync(PARTNERS_DB, 'utf-8'));
}

function loadPreviousSnapshot() {
  if (fs.existsSync(SNAPSHOT_PATH)) {
    return JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf-8'));
  }
  return null;
}

function computeStats(db) {
  const uniIds = Object.keys(db.universities);
  let totalPartners = 0;
  let studyPartners = 0;
  let traineeshipPartners = 0;
  const confidence = { verified_active: 0, moveon_only: 0, likely_active: 0, possibly_active: 0, historical: 0, traineeship: 0 };
  const topUnis = [];
  let unisWithPortal = 0;

  for (const uniId of uniIds) {
    const uni = db.universities[uniId];
    const partners = uni.partners || [];
    totalPartners += partners.length;

    let hasPortalData = false;
    for (const p of partners) {
      if (confidence[p.confidence] !== undefined) confidence[p.confidence]++;
      if (p.activity_type === 'traineeship' || p.confidence === 'traineeship') {
        traineeshipPartners++;
      } else {
        studyPartners++;
      }
      if (p.confidence === 'verified_active' || p.confidence === 'moveon_only') {
        hasPortalData = true;
      }
    }

    if (hasPortalData) unisWithPortal++;
    topUnis.push({ id: uniId, name: uni.name, partners: partners.length, study: partners.filter(p => p.confidence !== 'traineeship').length });
  }

  topUnis.sort((a, b) => b.study - a.study);

  return {
    timestamp: new Date().toISOString(),
    totalUniversities: uniIds.length,
    totalPartners,
    studyPartners,
    traineeshipPartners,
    confidence,
    unisWithPortal,
    portalCoverage: (unisWithPortal / uniIds.length * 100).toFixed(1),
    verifiedRate: ((confidence.verified_active + confidence.moveon_only) / studyPartners * 100).toFixed(1),
    likelyActiveRate: (confidence.likely_active / studyPartners * 100).toFixed(1),
    highConfidenceRate: ((confidence.verified_active + confidence.moveon_only + confidence.likely_active) / studyPartners * 100).toFixed(1),
    top50: topUnis.slice(0, 50),
  };
}

function checkCompleteness(stats) {
  const issues = [];
  const warnings = [];

  if (stats.totalUniversities < 400) {
    issues.push(`CRITICAL: Only ${stats.totalUniversities} universities (expected >= 400)`);
  }

  if (stats.totalPartners < 50000) {
    issues.push(`CRITICAL: Only ${stats.totalPartners} total partners (expected >= 50,000)`);
  }

  for (const uni of stats.top50.slice(0, 20)) {
    if (uni.study === 0) {
      issues.push(`CRITICAL: Top university ${uni.name} has 0 study partners`);
    }
  }

  if (parseFloat(stats.highConfidenceRate) < 40) {
    warnings.push(`WARNING: High-confidence rate is only ${stats.highConfidenceRate}% (target: >60%)`);
  }

  return { issues, warnings };
}

function checkFreshness() {
  const issues = [];
  const warnings = [];

  if (!fs.existsSync(MOVEON_DIR)) return { issues, warnings };

  const files = fs.readdirSync(MOVEON_DIR).filter(f => f.endsWith('.json'));
  let staleCount = 0;
  const stalePortals = [];

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(MOVEON_DIR, file), 'utf-8'));
      if (data.scraped_at) {
        const age = Date.now() - new Date(data.scraped_at).getTime();
        const ageDays = Math.round(age / (1000 * 60 * 60 * 24));
        if (ageDays > 90) {
          staleCount++;
          stalePortals.push({ file, ageDays, partners: data.partner_count || 0 });
        }
      }
    } catch (e) { /* skip corrupt files */ }
  }

  if (staleCount > 0) {
    warnings.push(`WARNING: ${staleCount} portal files are older than 90 days`);
    for (const sp of stalePortals.slice(0, 5)) {
      warnings.push(`  - ${sp.file}: ${sp.ageDays} days old (${sp.partners} partners)`);
    }
  }

  return { issues, warnings };
}

function checkRegression(stats, previousSnapshot) {
  const issues = [];
  const warnings = [];

  if (!previousSnapshot) return { issues, warnings };

  const prevStats = previousSnapshot;

  if (stats.totalUniversities < prevStats.totalUniversities * 0.9) {
    issues.push(`CRITICAL: University count dropped from ${prevStats.totalUniversities} to ${stats.totalUniversities} (>10% decrease)`);
  }

  if (stats.totalPartners < prevStats.totalPartners * 0.9) {
    issues.push(`CRITICAL: Partner count dropped from ${prevStats.totalPartners} to ${stats.totalPartners} (>10% decrease)`);
  }

  const prevVerified = (prevStats.confidence?.verified_active || 0) + (prevStats.confidence?.moveon_only || 0);
  const currVerified = stats.confidence.verified_active + stats.confidence.moveon_only;
  if (currVerified < prevVerified * 0.9 && prevVerified > 100) {
    warnings.push(`WARNING: Verified partner count dropped from ${prevVerified} to ${currVerified}`);
  }

  // Top-20 regression: if a uni that was in previous top 20 (by study partners) now has 0
  const prevTop20 = (prevStats.top50 || []).slice(0, 20).map(u => u.id);
  const currById = Object.fromEntries(
    (stats.top50 || []).map(u => [u.id, u])
  );
  for (const uniId of prevTop20) {
    const curr = currById[uniId];
    if (curr && curr.study === 0) {
      warnings.push(`WARNING: Top-20 university ${curr.name} (${uniId}) has dropped to 0 study partners`);
    }
  }

  return { issues, warnings };
}

function generateReport(stats, completeness, freshness, regression) {
  const lines = [];
  lines.push('=== Erasmus Partner Database Quality Report ===');
  lines.push(`Date: ${stats.timestamp}`);
  lines.push('');
  lines.push('--- Overview ---');
  lines.push(`Universities:        ${stats.totalUniversities}`);
  lines.push(`Total partners:      ${stats.totalPartners}`);
  lines.push(`  Study:             ${stats.studyPartners}`);
  lines.push(`  Traineeship:       ${stats.traineeshipPartners}`);
  lines.push(`Portal coverage:     ${stats.unisWithPortal} unis (${stats.portalCoverage}%)`);
  lines.push('');
  lines.push('--- Confidence Distribution ---');
  for (const [k, v] of Object.entries(stats.confidence)) {
    const pct = (v / stats.totalPartners * 100).toFixed(1);
    lines.push(`  ${k.padEnd(20)} ${String(v).padStart(6)} (${pct}%)`);
  }
  lines.push('');
  lines.push('--- Quality Metrics ---');
  lines.push(`Verified rate:       ${stats.verifiedRate}% of study partners`);
  lines.push(`Likely active rate:  ${stats.likelyActiveRate}% of study partners`);
  lines.push(`High confidence:     ${stats.highConfidenceRate}% of study partners`);
  lines.push('');

  const allIssues = [...completeness.issues, ...freshness.issues, ...regression.issues];
  const allWarnings = [...completeness.warnings, ...freshness.warnings, ...regression.warnings];

  if (allIssues.length > 0) {
    lines.push('--- CRITICAL ISSUES ---');
    allIssues.forEach(i => lines.push(i));
    lines.push('');
  }

  if (allWarnings.length > 0) {
    lines.push('--- WARNINGS ---');
    allWarnings.forEach(w => lines.push(w));
    lines.push('');
  }

  if (allIssues.length === 0 && allWarnings.length === 0) {
    lines.push('All checks passed.');
  }

  lines.push('');
  lines.push('--- Top 20 Universities by Study Partners ---');
  for (const uni of stats.top50.slice(0, 20)) {
    lines.push(`  ${String(uni.study).padStart(5)} ${uni.name}`);
  }

  return lines.join('\n');
}

async function main() {
  const db = loadDb();
  const previousSnapshot = loadPreviousSnapshot();

  const stats = computeStats(db);
  const completeness = checkCompleteness(stats);
  const freshness = checkFreshness();
  const regression = checkRegression(stats, previousSnapshot);

  const report = generateReport(stats, completeness, freshness, regression);
  console.log(report);

  // Save current snapshot for future regression checks
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(stats, null, 2));

  // Write report to file
  const reportPath = path.join(__dirname, '..', 'data', 'quality_report.txt');
  fs.writeFileSync(reportPath, report);

  const allIssues = [...completeness.issues, ...freshness.issues, ...regression.issues];
  const allWarnings = [...completeness.warnings, ...freshness.warnings, ...regression.warnings];

  if (allIssues.length > 0) {
    process.exit(2);
  } else if (allWarnings.length > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(2);
});
