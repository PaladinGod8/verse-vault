#!/usr/bin/env node

const path = require('path');
const { spawnSync } = require('child_process');
const electronRebuildCli = require.resolve('electron-rebuild/lib/src/cli.js');

const MAX_ATTEMPTS = 5;
const LOCK_RETRY_DELAYS_MS = [500, 1000, 2000, 4000];
const LOCK_PATH_FRAGMENT =
  `${path.sep}better-sqlite3${path.sep}build${path.sep}Release${path.sep}better_sqlite3.node`;

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function run(command, args) {
  return spawnSync(command, args, {
    stdio: 'pipe',
    shell: false,
    encoding: 'utf8',
  });
}

function outputStreams(result) {
  const stdout = typeof result.stdout === 'string' ? result.stdout : '';
  const stderr = typeof result.stderr === 'string' ? result.stderr : '';
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  return `${stdout}${stderr}`;
}

function lockErrorDetected(output) {
  return /EPERM: operation not permitted, unlink/i.test(output)
    && output.includes(LOCK_PATH_FRAGMENT);
}

function printLikelyLockingProcesses() {
  if (process.platform !== 'win32') return;

  console.error('[rebuild] Querying likely locking processes...');
  const result = run('tasklist', ['/FI', 'IMAGENAME eq electron.exe', '/FO', 'TABLE']);
  if (result.status === 0) {
    const text = `${result.stdout || ''}${result.stderr || ''}`.trim();
    if (text) {
      console.error(text);
    }
  }
}

function runRebuildAttempt(attempt) {
  console.error(
    `[rebuild] Attempt ${attempt}/${MAX_ATTEMPTS}: electron-rebuild -f -w better-sqlite3`,
  );
  const result = run(process.execPath, [electronRebuildCli, '-f', '-w', 'better-sqlite3']);
  const combined = outputStreams(result);
  return { result, combined };
}

let reportedProcessHint = false;

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  const { result, combined } = runRebuildAttempt(attempt);

  if (result.error) {
    console.error(`[rebuild] Failed to start electron-rebuild: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status === 0) {
    console.error('[rebuild] Native rebuild succeeded.');
    process.exit(0);
  }

  const isLockError = process.platform === 'win32' && lockErrorDetected(combined);
  const canRetry = isLockError && attempt < MAX_ATTEMPTS;

  if (canRetry) {
    if (!reportedProcessHint) {
      console.error(
        '[rebuild] Detected Windows file lock on better_sqlite3.node. Close running app/test processes and retrying automatically...',
      );
      printLikelyLockingProcesses();
      reportedProcessHint = true;
    }

    const delay = LOCK_RETRY_DELAYS_MS[attempt - 1] || LOCK_RETRY_DELAYS_MS.at(-1);
    console.error(`[rebuild] Waiting ${delay}ms before retry...`);
    sleep(delay);
    continue;
  }

  if (isLockError) {
    console.error(
      '[rebuild] Rebuild still failing due to locked better_sqlite3.node. Ensure all Electron/Verse Vault instances are closed, then retry.',
    );
  } else {
    console.error(`[rebuild] Native rebuild failed with exit code ${result.status ?? 'unknown'}.`);
  }

  process.exit(result.status ?? 1);
}
