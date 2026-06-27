#!/usr/bin/env node

// Syncs repo-local agent skill sources into each agent's global skills
// directory, so Codex and Claude Code both pick up the same Verse
// Vault-specific skill content outside this checkout.

const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

const SYNC_TARGETS = [
  {
    source: path.join(REPO_ROOT, '.codex', 'skills', 'verse-vault-tdd'),
    destinationRoot: () => process.env.CODEX_HOME || path.join(os.homedir(), '.codex'),
    destinationName: 'verse-vault-tdd',
  },
  {
    source: path.join(REPO_ROOT, '.claude', 'skills', 'tdd'),
    destinationRoot: () => path.join(os.homedir(), '.claude'),
    destinationName: 'verse-vault-tdd',
  },
  {
    source: path.join(REPO_ROOT, '.codex', 'skills', 'verse-vault-fix-bug'),
    destinationRoot: () => process.env.CODEX_HOME || path.join(os.homedir(), '.codex'),
    destinationName: 'verse-vault-fix-bug',
  },
  {
    source: path.join(REPO_ROOT, '.claude', 'skills', 'fix-bug'),
    destinationRoot: () => path.join(os.homedir(), '.claude'),
    destinationName: 'verse-vault-fix-bug',
  },
];

function copyDirRecursive(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function main() {
  let failed = false;

  for (const target of SYNC_TARGETS) {
    if (!fs.existsSync(target.source)) {
      console.error(`[skills:sync] Missing source: ${target.source}`);
      failed = true;
      continue;
    }

    const destination = path.join(target.destinationRoot(), 'skills', target.destinationName);
    copyDirRecursive(target.source, destination);
    console.log(`[skills:sync] ${path.relative(REPO_ROOT, target.source)} -> ${destination}`);
  }

  if (failed) {
    process.exit(1);
  }
}

main();
