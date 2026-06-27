#!/usr/bin/env node

const {
  preloadUsesSharedDbApi,
  validatePreloadBridgeCoverage,
  validateCatalogCoverage,
} = require('./lib/contracts.cjs');
const { scanRendererContracts } = require('./lib/renderer-contract-scan.cjs');

const report = validateCatalogCoverage(process.cwd());
const preloadReport = validatePreloadBridgeCoverage(process.cwd());
const rendererReport = scanRendererContracts(process.cwd());
let failed = false;

function printEntries(header, entries, formatter) {
  if (entries.length === 0) {
    return;
  }
  failed = true;
  console.error(header);
  for (const entry of entries) {
    console.error(`  - ${formatter(entry)}`);
  }
}

printEntries(
  '[guard:contracts] Missing IPC catalog entries:',
  report.missingKeys,
  (entry) => entry,
);
printEntries(
  '[guard:contracts] Extra IPC catalog entries:',
  report.extraKeys,
  (entry) => entry,
);
printEntries(
  '[guard:contracts] Duplicate IPC catalog entries:',
  report.duplicateKeys,
  (entry) => entry,
);
printEntries(
  '[guard:contracts] IPC catalog bridges missing from DbApi:',
  report.invalidBridges,
  (entry) => `${entry.key} -> ${entry.bridge}`,
);
printEntries(
  '[guard:contracts] IPC catalog type sources missing from DbApi:',
  report.invalidTypeSources,
  (entry) => `${entry.key} -> ${entry.typeSource}`,
);
printEntries(
  '[guard:contracts] IPC catalog handlers missing from disk:',
  report.missingHandlers,
  (entry) => `${entry.key} -> ${entry.handler}`,
);
printEntries(
  '[guard:contracts] Preload bridge methods missing from DbApi:',
  preloadReport.missingMethods,
  (entry) => entry,
);
printEntries(
  '[guard:contracts] Extra preload bridge methods not present in DbApi:',
  preloadReport.extraMethods,
  (entry) => entry,
);
printEntries(
  '[guard:contracts] Renderer window.db usage missing from DbApi:',
  rendererReport.invalidWindowDbCalls,
  (entry) => `${entry.filePath}:${entry.line} -> ${entry.accessPath}`,
);
printEntries(
  '[guard:contracts] Renderer must not import electron or ipcRenderer directly:',
  rendererReport.forbiddenImports,
  (entry) =>
    `${entry.filePath}:${entry.line} -> ${entry.importNames.join(', ') || '(side-effect import)'}`,
);
printEntries(
  '[guard:contracts] Renderer must not hardcode raw IPC channel strings:',
  rendererReport.rawIpcStrings,
  (entry) => `${entry.filePath}:${entry.line} -> ${entry.value}`,
);

if (!preloadUsesSharedDbApi(process.cwd())) {
  failed = true;
  console.error(
    '[guard:contracts] src/preload.ts must expose a const object typed as DbApi.',
  );
}

if (failed) {
  process.exit(1);
}

console.log('[guard:contracts] Shared contracts, IPC catalog, and preload typing are aligned.');
