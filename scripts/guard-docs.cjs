#!/usr/bin/env node

const { spawnSync } = require('child_process');

const args = new Set(process.argv.slice(2));
const stagedOnly = args.has('--staged');

const DOCS = {
  ARCHITECTURE: 'docs/01_ARCHITECTURE.md',
  CODEBASE_MAP: 'docs/02_CODEBASE_MAP.md',
};

const CODEBASE_MAP_ROOT_FILES = new Set([
  'forge.env.d.ts',
  'forge.config.ts',
  'vite.base.config.ts',
  'vite.main.config.ts',
  'vite.preload.config.ts',
  'vite.renderer.config.ts',
]);

const ARCHITECTURE_RELEVANT_FILES = new Set([
  'src/main.ts',
  'src/preload.ts',
  'src/shared/ipcChannels.ts',
  'src/database/db.ts',
  'forge.env.d.ts',
  'forge.config.ts',
  'vite.main.config.ts',
  'vite.preload.config.ts',
]);

function runGit(commandArgs) {
  return spawnSync('git', commandArgs, {
    encoding: 'utf8',
  });
}

function normalizePath(filePath) {
  return filePath.trim().replace(/\\/g, '/');
}

function getChangedFiles() {
  const repoCheck = runGit(['rev-parse', '--is-inside-work-tree']);
  if (repoCheck.error) {
    console.error('[guard:docs] Failed to execute git.');
    console.error(repoCheck.error.message);
    process.exit(2);
  }
  if (repoCheck.status !== 0) {
    console.warn('[guard:docs] Not inside a Git work tree. Skipping.');
    return null;
  }

  const diffArgs = stagedOnly
    ? ['diff', '--cached', '--name-only', '--diff-filter=ACMRD']
    : ['diff', '--name-only', '--diff-filter=ACMRD', 'HEAD'];

  const diffResult = runGit(diffArgs);
  if (diffResult.error) {
    console.error('[guard:docs] Failed to execute git diff.');
    console.error(diffResult.error.message);
    process.exit(2);
  }
  if (diffResult.status !== 0) {
    console.error('[guard:docs] Failed to read changed files from git.');
    if (diffResult.stderr) {
      console.error(diffResult.stderr.trim());
    }
    process.exit(2);
  }

  return diffResult.stdout.split(/\r?\n/).map(normalizePath).filter(Boolean);
}

function needsCodebaseMapDoc(filePath) {
  if (filePath.startsWith('src/')) {
    return true;
  }
  return CODEBASE_MAP_ROOT_FILES.has(filePath);
}

function needsArchitectureDoc(filePath) {
  if (ARCHITECTURE_RELEVANT_FILES.has(filePath)) {
    return true;
  }
  return filePath.startsWith('src/database/');
}

function collectRuleHits(changedFiles) {
  return {
    codebaseMapHits: changedFiles.filter(needsCodebaseMapDoc),
    architectureHits: changedFiles.filter(needsArchitectureDoc),
  };
}

function main() {
  const changedFiles = getChangedFiles();
  if (!changedFiles) {
    return;
  }

  const changedSet = new Set(changedFiles);
  const { codebaseMapHits, architectureHits } = collectRuleHits(changedFiles);

  const failures = [];

  if (codebaseMapHits.length > 0 && !changedSet.has(DOCS.CODEBASE_MAP)) {
    failures.push({
      doc: DOCS.CODEBASE_MAP,
      reason: 'Source/config/directory changes detected without codebase map update.',
      files: codebaseMapHits,
    });
  }

  if (architectureHits.length > 0 && !changedSet.has(DOCS.ARCHITECTURE)) {
    failures.push({
      doc: DOCS.ARCHITECTURE,
      reason: 'Architecture-relevant files changed without architecture doc update.',
      files: architectureHits,
    });
  }

  if (failures.length === 0) {
    if (codebaseMapHits.length === 0 && architectureHits.length === 0) {
      console.log(
        '[guard:docs] No architecture/map-relevant file changes detected.',
      );
    } else {
      console.log(
        '[guard:docs] Required docs updates detected for changed files.',
      );
    }
    return;
  }

  console.error(
    '[guard:docs] Required docs were not updated for the staged/changed files.',
  );
  for (const failure of failures) {
    console.error(`[guard:docs] Missing doc update: ${failure.doc}`);
    console.error(`[guard:docs] Reason: ${failure.reason}`);
    console.error('[guard:docs] Triggering file(s):');
    for (const file of failure.files) {
      console.error(`  - ${file}`);
    }
  }
  process.exit(1);
}

main();
