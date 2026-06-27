#!/usr/bin/env node

const { spawnSync } = require('child_process');
const { parseRoleHeader, SEAM_FILES } = require('./lib/generated-docs.cjs');
const { buildCodebaseMapDoc, CODEBASE_MAP_PATH } = require('./lib/generated-docs.cjs');
const fs = require('fs');
const path = require('path');

const args = new Set(process.argv.slice(2));
const stagedOnly = args.has('--staged');

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

function codebaseMapIsFresh(repoRoot) {
  const targetPath = path.join(repoRoot, CODEBASE_MAP_PATH);
  const current = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : '';
  return current === buildCodebaseMapDoc(repoRoot);
}

function findMissingHeaders(repoRoot, changedFiles) {
  return changedFiles
    .filter((file) => SEAM_FILES.includes(file))
    .filter((file) => !parseRoleHeader(fs.readFileSync(path.join(repoRoot, file), 'utf8')));
}

function main() {
  const repoRoot = process.cwd();
  const changedFiles = getChangedFiles();
  if (!changedFiles) {
    return;
  }

  const missingHeaders = findMissingHeaders(repoRoot, changedFiles);
  const fresh = codebaseMapIsFresh(repoRoot);

  if (!fresh) {
    console.error(`[guard:docs] ${CODEBASE_MAP_PATH} is stale. Run yarn docs:generate.`);
  }
  if (missingHeaders.length > 0) {
    console.error('[guard:docs] Missing required role headers in touched seam files:');
    for (const file of missingHeaders) {
      console.error(`  - ${file}`);
    }
  }

  if (!fresh || missingHeaders.length > 0) {
    process.exit(1);
  }

  console.log('[guard:docs] Codebase map is current and touched seam headers are present.');
}

main();
