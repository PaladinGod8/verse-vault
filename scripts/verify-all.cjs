#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const yarnCmd = 'yarn';
const args = new Set(process.argv.slice(2));
const runInstall = args.has('--install');
const runDev = !args.has('--no-dev');

function runCommand(cmd, commandArgs, options = {}) {
  const result = spawnSync(cmd, commandArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...(options.env || {}) },
  });

  if (result.error) {
    console.error(`[verify-all] Failed to start command: ${cmd}`);
    console.error(result.error.message);
    return false;
  }

  if (typeof result.status === 'number') {
    if (result.status === 0) {
      return true;
    }

    if (!options.allowFailure) {
      console.error(
        `[verify-all] Command failed with exit code ${result.status}: ${cmd} ${commandArgs.join(' ')}`,
      );
    }
    return false;
  }

  if (result.signal) {
    console.error(
      `[verify-all] Command terminated by signal: ${result.signal}`,
    );
    return false;
  }

  return true;
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function cleanDirectories(dirs) {
  for (const dir of dirs) {
    const absolute = path.resolve(process.cwd(), dir);
    let removed = false;

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      try {
        fs.rmSync(absolute, { recursive: true, force: true });
        removed = true;
        break;
      } catch (error) {
        const err = error;
        const lockErrorCodes = ['EBUSY', 'EPERM', 'ENOTEMPTY'];

        if (err && lockErrorCodes.includes(err.code)) {
          if (attempt < 5) {
            console.warn(
              `[verify-all] Cleanup retry ${attempt}/5 for locked path: ${absolute} (${err.code})`,
            );
            sleep(200 * attempt);
            continue;
          }

          console.warn(
            `[verify-all] Skipping cleanup for locked path: ${absolute} (${err.code}).`,
          );
          removed = true;
          break;
        }

        throw error;
      }
    }

    if (!removed) {
      throw new Error(`[verify-all] Failed to clean directory: ${absolute}`);
    }
  }
}

const steps = [];

if (runInstall) {
  steps.push({
    name: 'Install dependencies',
    run: () => runCommand(yarnCmd, ['install', '--check-files']),
  });
}

steps.push(
  {
    name: 'Run postinstall (native module rebuild)',
    run: () => runCommand(yarnCmd, ['postinstall']),
  },
  {
    name: 'Check formatting and auto-fix if needed',
    run: () => {
      const formatIsClean = runCommand(yarnCmd, ['format:check'], {
        allowFailure: true,
      });

      if (formatIsClean) {
        return true;
      }

      console.log(
        '[verify-all] Formatting issues found. Running auto-format...',
      );

      if (!runCommand(yarnCmd, ['format'])) {
        return false;
      }

      return runCommand(yarnCmd, ['format:check']);
    },
  },
  {
    name: 'Type check TypeScript',
    run: () => runCommand(yarnCmd, ['type-check']),
  },
  {
    name: 'Run lint (strict, no warnings)',
    run: () => runCommand(yarnCmd, ['lint']),
  },
  {
    name: 'Run unit tests with V8 coverage (minimum 80%)',
    run: () => {
      cleanDirectories(['coverage']);
      return runCommand(yarnCmd, ['test:unit:coverage']);
    },
  },
  {
    name: 'Package app for e2e',
    run: () => runCommand(yarnCmd, ['package']),
  },
  {
    name: 'Run e2e tests',
    run: () => {
      cleanDirectories(['test-results', 'playwright-report']);
      return runCommand(yarnCmd, ['test:e2e'], {
        env: { PLAYWRIGHT_HTML_OPEN: 'never' },
      });
    },
  },
);

if (runDev) {
  steps.push({
    name: 'Start dev app (close the Electron window to finish)',
    run: () => runCommand(yarnCmd, ['dev']),
  });
}

for (const [index, step] of steps.entries()) {
  const stepNumber = `${index + 1}/${steps.length}`;
  console.log(`\n[verify-all] ${stepNumber} ${step.name}`);

  const ok = step.run();
  if (!ok) {
    console.error(`[verify-all] Failed at step ${stepNumber}: ${step.name}`);
    process.exit(1);
  }
}

console.log('\n[verify-all] Complete.');
