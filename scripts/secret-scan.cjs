#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const args = new Set(process.argv.slice(2));
const scanWorkingTree = !args.has('--history-only');
const scanHistory = !args.has('--working-tree-only');
const configPath = process.env.SECRET_SCAN_CONFIG_PATH
  || path.resolve(process.cwd(), '.gitleaks.toml');

function fail(message, exitCode = 1) {
  console.error(`[secret-scan] ${message}`);
  process.exit(exitCode);
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });

  if (result.error) {
    fail(`Failed to start ${command}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`Command failed: ${command} ${commandArgs.join(' ')}`);
  }
}

if (!fs.existsSync(configPath)) {
  fail(`Missing gitleaks config: ${configPath}`);
}

if (!scanWorkingTree && !scanHistory) {
  fail('No scan mode selected. Remove conflicting flags.');
}

const scans = [];

if (scanWorkingTree) {
  scans.push({
    label: 'working tree',
    args: ['dir', '.', '--redact', '--no-banner', '--config', configPath],
  });
}

if (scanHistory) {
  scans.push({
    label: 'git history',
    args: ['git', '.', '--redact', '--no-banner', '--config', configPath],
  });
}

for (const scan of scans) {
  console.log(`[secret-scan] Scanning ${scan.label} with gitleaks...`);
  run('gitleaks', scan.args);
}

console.log('[secret-scan] No secrets detected.');
