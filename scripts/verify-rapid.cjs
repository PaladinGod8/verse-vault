#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const args = new Set(process.argv.slice(2));
const runRebuild = args.has('--rebuild-native');
const forceFreshCache = args.has('--fresh-cache');

const TASK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_STATE_DIR = path.resolve('.cache', 'verify-rapid');
const CACHE_STATE_FILE = path.join(CACHE_STATE_DIR, 'state.json');

const CACHE_DIRS = [
  '.vite',
  path.join('node_modules', '.cache', 'eslint'),
  'coverage',
  'playwright-report',
  'test-results',
];

const TASKS = [
  { name: 'format', command: 'yarn', args: ['format:check'] },
  { name: 'typecheck', command: 'yarn', args: ['type-check'] },
  { name: 'lint', command: 'yarn', args: ['lint:cache'] },
  { name: 'docs-lint', command: 'yarn', args: ['lint:docs'] },
  { name: 'unit', command: 'yarn', args: ['test:unit:quick'] },
];

function hashFile(filePath) {
  const absolute = path.resolve(filePath);
  if (!fs.existsSync(absolute)) {
    return 'missing';
  }

  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(absolute));
  return hash.digest('hex');
}

function loadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return null;
  }
}

function rmDir(relativePath) {
  const absolute = path.resolve(relativePath);
  fs.rmSync(absolute, { recursive: true, force: true });
}

function ensureDir(relativePath) {
  fs.mkdirSync(path.resolve(relativePath), { recursive: true });
}

function getFingerprint() {
  return {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    yarnLockHash: hashFile('yarn.lock'),
    packageJsonHash: hashFile('package.json'),
    timestamp: new Date().toISOString(),
  };
}

function shouldResetCache(current, previous) {
  if (!previous) {
    return { reset: true, reason: 'no previous cache fingerprint found' };
  }

  const keys = ['node', 'platform', 'arch', 'yarnLockHash', 'packageJsonHash'];
  for (const key of keys) {
    if (current[key] !== previous[key]) {
      return {
        reset: true,
        reason: `cache fingerprint mismatch at "${key}"`,
      };
    }
  }

  return { reset: false, reason: 'cache fingerprint matches' };
}

function printCacheSummary(mode, reason) {
  console.log(`[verify-rapid] Cache mode: ${mode}`);
  console.log(`[verify-rapid] Cache reason: ${reason}`);
}

function runSync(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    console.error(`[verify-rapid] Failed to start ${command}`);
    console.error(result.error.message);
    return false;
  }

  if (result.status !== 0) {
    console.error(
      `[verify-rapid] Command failed: ${command} ${commandArgs.join(' ')}`,
    );
    return false;
  }

  return true;
}

function runTask(task) {
  return new Promise((resolve) => {
    const child = spawn(task.command, task.args, {
      shell: process.platform === 'win32',
      env: process.env,
      stdio: 'inherit',
    });

    const timeout = setTimeout(() => {
      console.error(
        `[verify-rapid] Task "${task.name}" timed out after ${TASK_TIMEOUT_MS / 1000}s — killing`,
      );
      child.kill('SIGTERM');
      // Give the process a moment to terminate gracefully, then force kill
      setTimeout(() => {
        try {
          child.kill('SIGKILL');
        } catch { /* already dead */ }
      }, 5000);
    }, TASK_TIMEOUT_MS);

    child.on('error', (error) => {
      clearTimeout(timeout);
      console.error(`[verify-rapid] Failed to start ${task.name}: ${error.message}`);
      resolve({ name: task.name, code: 1 });
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({ name: task.name, code: code ?? 1 });
    });
  });
}

async function main() {
  ensureDir(CACHE_STATE_DIR);

  const previousState = loadJson(CACHE_STATE_FILE);
  const currentState = getFingerprint();
  const cacheDecision = shouldResetCache(currentState, previousState);

  if (forceFreshCache || cacheDecision.reset) {
    const reason = forceFreshCache
      ? 'manual --fresh-cache requested'
      : cacheDecision.reason;
    printCacheSummary('reset', reason);
    for (const dir of CACHE_DIRS) {
      rmDir(dir);
    }
  } else {
    printCacheSummary('reuse', cacheDecision.reason);
  }

  fs.writeFileSync(CACHE_STATE_FILE, JSON.stringify(currentState, null, 2));

  if (runRebuild) {
    console.log('[verify-rapid] Running native rebuild...');
    if (!runSync('yarn', ['postinstall'])) {
      process.exit(1);
    }
  }

  console.log('[verify-rapid] Running fast quality checks in parallel...');
  const results = await Promise.all(TASKS.map((task) => runTask(task)));

  const failed = results.filter((result) => result.code !== 0);
  if (failed.length > 0) {
    console.error('\n[verify-rapid] Failed checks:');
    for (const failure of failed) {
      console.error(`- ${failure.name}`);
    }
    process.exit(1);
  }

  console.log('\n[verify-rapid] All rapid checks passed.');
}

main().catch((error) => {
  console.error('[verify-rapid] Unexpected error.');
  console.error(error);
  process.exit(1);
});
