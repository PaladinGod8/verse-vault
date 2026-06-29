#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_BRANCH_FLOOR = 80;
const COVERAGE_SUMMARY_PATH = path.resolve(
  process.cwd(),
  process.env.COVERAGE_SUMMARY_PATH || 'coverage/coverage-summary.json',
);

function parseFloor() {
  const raw = process.env.BRANCH_COVERAGE_FLOOR;
  if (!raw) {
    return DEFAULT_BRANCH_FLOOR;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new Error(`Invalid BRANCH_COVERAGE_FLOOR: ${raw}`);
  }

  return parsed;
}

function readCoverageSummary() {
  if (!fs.existsSync(COVERAGE_SUMMARY_PATH)) {
    throw new Error(
      `Coverage summary not found at ${COVERAGE_SUMMARY_PATH}. Run \`yarn test:unit:run\` first.`,
    );
  }

  return JSON.parse(fs.readFileSync(COVERAGE_SUMMARY_PATH, 'utf8'));
}

function formatPct(value) {
  return Number(value).toFixed(2);
}

function collectWeakFiles(summary) {
  return Object.entries(summary)
    .filter(([filePath]) => filePath !== 'total')
    .map(([filePath, metrics]) => ({
      filePath,
      pct: metrics?.branches?.pct,
    }))
    .filter((entry) => Number.isFinite(entry.pct))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 5);
}

function main() {
  const floor = parseFloor();
  const summary = readCoverageSummary();
  const totalPct = summary?.total?.branches?.pct;

  if (!Number.isFinite(totalPct)) {
    throw new Error('Coverage summary missing total branch percentage.');
  }

  console.log(
    `[coverage:branches] Total branch coverage ${formatPct(totalPct)}% (floor ${
      formatPct(floor)
    }%).`,
  );

  const weakFiles = collectWeakFiles(summary);
  if (weakFiles.length > 0) {
    console.log('[coverage:branches] Lowest-covered production files:');
    for (const entry of weakFiles) {
      console.log(`  - ${entry.filePath}: ${formatPct(entry.pct)}%`);
    }
  }

  if (totalPct < floor) {
    throw new Error(
      `Branch coverage ${formatPct(totalPct)}% is below required floor ${formatPct(floor)}%.`,
    );
  }
}

try {
  main();
} catch (error) {
  console.error(
    `[coverage:branches] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
