#!/usr/bin/env node

const { spawnSync } = require('child_process');

const args = new Set(process.argv.slice(2));
const stagedOnly = args.has('--staged');

const IPC_RELATED_FILES = new Set([
  'src/shared/ipcChannels.ts',
  'src/main.ts',
  'src/preload.ts',
  'forge.env.d.ts',
]);

const IPC_CONTRACT_DOC = 'docs/03_IPC_CONTRACT.md';

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
    console.error('[guard:ipc-docs] Failed to execute git.');
    console.error(repoCheck.error.message);
    process.exit(2);
  }
  if (repoCheck.status !== 0) {
    console.warn('[guard:ipc-docs] Not inside a Git work tree. Skipping.');
    return null;
  }

  const diffArgs = stagedOnly
    ? ['diff', '--cached', '--name-only', '--diff-filter=ACMR']
    : ['diff', '--name-only', '--diff-filter=ACMR', 'HEAD'];

  const diffResult = runGit(diffArgs);
  if (diffResult.error) {
    console.error('[guard:ipc-docs] Failed to execute git diff.');
    console.error(diffResult.error.message);
    process.exit(2);
  }
  if (diffResult.status !== 0) {
    console.error('[guard:ipc-docs] Failed to read changed files from git.');
    if (diffResult.stderr) {
      console.error(diffResult.stderr.trim());
    }
    process.exit(2);
  }

  return diffResult.stdout.split(/\r?\n/).map(normalizePath).filter(Boolean);
}

function main() {
  const changedFiles = getChangedFiles();
  if (!changedFiles) {
    return;
  }

  const changedSet = new Set(changedFiles);
  const changedIpcFiles = changedFiles.filter((file) =>
    IPC_RELATED_FILES.has(file),
  );

  if (changedIpcFiles.length === 0) {
    console.log('[guard:ipc-docs] No IPC-related file changes detected.');
    return;
  }

  if (changedSet.has(IPC_CONTRACT_DOC)) {
    console.log(
      '[guard:ipc-docs] IPC changes detected and docs/03_IPC_CONTRACT.md is updated.',
    );
    return;
  }

  console.error(
    '[guard:ipc-docs] IPC-related files changed without updating docs/03_IPC_CONTRACT.md.',
  );
  console.error('[guard:ipc-docs] Changed IPC-related file(s):');
  for (const file of changedIpcFiles) {
    console.error(`  - ${file}`);
  }
  console.error(
    `[guard:ipc-docs] Please update ${IPC_CONTRACT_DOC} in this change set.`,
  );
  process.exit(1);
}

main();
