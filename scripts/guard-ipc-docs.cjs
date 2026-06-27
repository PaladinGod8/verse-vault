#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { buildIpcContractDoc, IPC_CONTRACT_PATH } = require('./lib/generated-docs.cjs');
const { validateCatalogCoverage } = require('./lib/contracts.cjs');

const repoRoot = process.cwd();
const targetPath = path.join(repoRoot, IPC_CONTRACT_PATH);
const current = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : '';
const expected = buildIpcContractDoc(repoRoot);
const report = validateCatalogCoverage(repoRoot);

let failed = false;

if (current !== expected) {
  failed = true;
  console.error(
    `[guard:ipc-docs] ${IPC_CONTRACT_PATH} is stale. Run yarn docs:generate.`,
  );
}

if (
  report.missingKeys.length > 0
  || report.extraKeys.length > 0
  || report.duplicateKeys.length > 0
  || report.invalidBridges.length > 0
  || report.invalidTypeSources.length > 0
  || report.missingHandlers.length > 0
) {
  failed = true;
  console.error('[guard:ipc-docs] IPC catalog coverage is incomplete or inconsistent.');
}

if (failed) {
  process.exit(1);
}

console.log('[guard:ipc-docs] IPC contract doc and catalog coverage are current.');
