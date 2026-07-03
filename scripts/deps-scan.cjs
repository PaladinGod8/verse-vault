#!/usr/bin/env node

const { spawnSync } = require('child_process');

const trivyBin = process.env.TRIVY_BIN || 'trivy';

// Only fail the gate on genuinely actionable severities by default. Override via
// DEPS_SCAN_SEVERITY (comma-separated Trivy severities) for wider or narrower scans.
const severity = process.env.DEPS_SCAN_SEVERITY || 'HIGH,CRITICAL';

// Skip large generated trees that never hold the source-of-truth manifests. The
// yarn.lock at the repo root is what Trivy parses for the dependency graph, so
// pruning these keeps the scan fast and free of duplicated findings.
const skipDirs = [
  'node_modules',
  'out',
  '.vite',
  'coverage',
  'playwright-report',
  'test-results',
  'scripts/logs',
];

function fail(message, exitCode = 1) {
  console.error(`[deps-scan] ${message}`);
  process.exit(exitCode);
}

// Probe explicitly rather than relying on a spawn ENOENT error: on Windows the
// scan runs through cmd.exe (shell: true), so a missing binary surfaces as a
// non-zero exit code instead of result.error, which would be misreported as a
// vulnerability finding.
function isTrivyAvailable() {
  const probe = spawnSync(trivyBin, ['--version'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
    env: process.env,
  });
  return !probe.error && probe.status === 0;
}

if (!isTrivyAvailable()) {
  fail(
    'Trivy CLI not found on PATH. Install it from https://trivy.dev/ '
      + '(for example `winget install AquaSecurity.Trivy` or `scoop install trivy`).',
  );
}

const trivyArgs = [
  'fs',
  '--scanners',
  'vuln',
  '--include-dev-deps',
  '--severity',
  severity,
  '--exit-code',
  '1',
  '--no-progress',
];

for (const dir of skipDirs) {
  trivyArgs.push('--skip-dirs', dir);
}

trivyArgs.push('.');

console.log(
  `[deps-scan] Scanning dependencies for ${severity} vulnerabilities with Trivy...`,
);

const result = spawnSync(trivyBin, trivyArgs, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: process.env,
});

if (result.error) {
  fail(`Failed to start ${trivyBin}: ${result.error.message}`);
}

if (result.status !== 0) {
  fail(
    `Trivy found dependency vulnerabilities at or above ${severity}. `
      + 'Update the affected packages (see the fixed versions above), '
      + 'or record an accepted risk in .trivyignore.',
  );
}

console.log(
  `[deps-scan] No dependency vulnerabilities at or above ${severity} detected.`,
);
