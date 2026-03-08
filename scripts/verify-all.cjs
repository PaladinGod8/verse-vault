#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const yarnCmd = 'yarn';
const args = new Set(process.argv.slice(2));
const runInstall = args.has('--install');
const runDev = !args.has('--no-dev');
const preRunRetentionLimit = 3;
const postRunRetentionLimit = 3;

const baseLogDir = path.resolve(process.cwd(), 'scripts', 'logs', 'pipeline');
const runsDir = path.join(baseLogDir, 'runs');
const latestLogPath = path.join(baseLogDir, 'latest.log');
const latestMetaPath = path.join(baseLogDir, 'latest.json');

function createRunId() {
  const now = new Date();
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+$/, '')
    .replace('T', '-');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  const rand = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0');
  return `${stamp}${ms}-${process.pid}-${rand}`;
}

const runId = createRunId();
const runDir = path.join(runsDir, runId);
const runLogPath = path.join(runDir, 'run.log');
const runMetaPath = path.join(runDir, 'meta.json');

let isRunLogReady = false;
let hasFinalized = false;
let isShuttingDown = false;

const runMeta = {
  runId,
  status: 'running',
  failedStep: null,
  logs: {
    runDir,
    runLog: runLogPath,
    latestLog: latestLogPath,
    latestMeta: latestMetaPath,
  },
  steps: [],
};

let currentStepMeta = null;

function appendRunLog(text) {
  if (!isRunLogReady) {
    return;
  }
  fs.appendFileSync(runLogPath, text, 'utf8');
}

function logLine(message) {
  const line = `${message}\n`;
  process.stdout.write(line);
  appendRunLog(line);
}

function logErrorLine(message) {
  const line = `${message}\n`;
  process.stderr.write(line);
  appendRunLog(line);
}

function slugify(parts) {
  const text = parts
    .filter(Boolean)
    .join('-')
    .toLowerCase();
  const slug = text
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'command';
}

function ensureStepMeta() {
  if (!currentStepMeta) {
    throw new Error('runCommand called without active step metadata');
  }
}

function runCommand(cmd, commandArgs, options = {}) {
  ensureStepMeta();

  const commandIndex = currentStepMeta.commands.length + 1;
  const commandSlug = slugify([String(commandIndex), cmd, ...commandArgs]);
  const commandDir = path.join(runDir, 'commands', commandSlug);
  fs.mkdirSync(commandDir, { recursive: true });

  const stdoutPath = path.join(commandDir, 'stdout.log');
  const stderrPath = path.join(commandDir, 'stderr.log');
  const combinedPath = path.join(commandDir, 'combined.log');

  const result = spawnSync(cmd, commandArgs, {
    stdio: 'pipe',
    shell: process.platform === 'win32',
    env: { ...process.env, ...(options.env || {}) },
    encoding: 'utf8',
    timeout: options.timeout || 10 * 60 * 1000, // 10 minutes default
  });

  const stdout = typeof result.stdout === 'string' ? result.stdout : '';
  const stderr = typeof result.stderr === 'string' ? result.stderr : '';
  const combined = `${stdout}${stderr}`;

  fs.writeFileSync(stdoutPath, stdout, 'utf8');
  fs.writeFileSync(stderrPath, stderr, 'utf8');
  fs.writeFileSync(combinedPath, combined, 'utf8');

  if (stdout) {
    process.stdout.write(stdout);
    appendRunLog(stdout);
  }
  if (stderr) {
    process.stderr.write(stderr);
    appendRunLog(stderr);
  }

  const commandMeta = {
    command: cmd,
    args: commandArgs,
    status: 'passed',
    exitCode: typeof result.status === 'number' ? result.status : null,
    signal: result.signal ?? null,
    logs: {
      stdout: stdoutPath,
      stderr: stderrPath,
      combined: combinedPath,
    },
  };

  if (result.error) {
    commandMeta.status = 'failed';
    currentStepMeta.commands.push(commandMeta);
    logErrorLine(`[verify-all] Failed to start command: ${cmd}`);
    logErrorLine(result.error.message);
    return false;
  }

  if (typeof result.status === 'number') {
    if (result.status === 0) {
      currentStepMeta.commands.push(commandMeta);
      return true;
    }

    commandMeta.status = 'failed';
    currentStepMeta.commands.push(commandMeta);

    if (!options.allowFailure) {
      logErrorLine(
        `[verify-all] Command failed with exit code ${result.status}: ${cmd} ${
          commandArgs.join(' ')
        }`,
      );
    }
    return false;
  }

  if (result.signal) {
    commandMeta.status = 'failed';
    currentStepMeta.commands.push(commandMeta);
    logErrorLine(`[verify-all] Command terminated by signal: ${result.signal}`);
    return false;
  }

  currentStepMeta.commands.push(commandMeta);
  return true;
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function removeDirectoryWithRetries(absolutePath) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      fs.rmSync(absolutePath, { recursive: true, force: true });
      return;
    } catch (error) {
      const err = error;
      const lockErrorCodes = ['EBUSY', 'EPERM', 'ENOTEMPTY'];

      if (err && lockErrorCodes.includes(err.code)) {
        if (attempt < 5) {
          logLine(
            `[verify-all] Cleanup retry ${attempt}/5 for locked path: ${absolutePath} (${err.code})`,
          );
          sleep(200 * attempt);
          continue;
        }

        logLine(
          `[verify-all] Skipping cleanup for locked path: ${absolutePath} (${err.code}).`,
        );
        return;
      }

      throw error;
    }
  }
}

function pruneRunDirectories(keepCount, reason) {
  fs.mkdirSync(runsDir, { recursive: true });

  const runDirectories = fs
    .readdirSync(runsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const excess = runDirectories.length - keepCount;
  if (excess <= 0) {
    return;
  }

  for (const runName of runDirectories.slice(0, excess)) {
    const absolutePath = path.join(runsDir, runName);
    logLine(`[verify-all] Pruning old run (${reason}): ${absolutePath}`);
    removeDirectoryWithRetries(absolutePath);
  }
}

function cleanDirectories(dirs) {
  for (const dir of dirs) {
    const absolute = path.resolve(process.cwd(), dir);
    removeDirectoryWithRetries(absolute);
  }
}

function initializeRunLogging() {
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(runLogPath, '', 'utf8');
  isRunLogReady = true;
}

function finalizeRun() {
  fs.mkdirSync(baseLogDir, { recursive: true });
  fs.writeFileSync(runMetaPath, JSON.stringify(runMeta, null, 2), 'utf8');
  fs.copyFileSync(runLogPath, latestLogPath);
  fs.writeFileSync(latestMetaPath, JSON.stringify(runMeta, null, 2), 'utf8');
}

function finalizeAndPrune() {
  if (hasFinalized) {
    return;
  }

  hasFinalized = true;
  let finalError = null;

  try {
    finalizeRun();
  } catch (error) {
    finalError = error;
  }

  try {
    pruneRunDirectories(postRunRetentionLimit, 'post-run');
  } catch (error) {
    if (!finalError) {
      finalError = error;
    }
  }

  if (finalError) {
    throw finalError;
  }
}

function failRun(stepName, exitCode = 1) {
  runMeta.status = 'failed';
  runMeta.failedStep = stepName ? { name: stepName } : null;
  try {
    finalizeAndPrune();
  } catch (error) {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    process.stderr.write(`[verify-all] Finalization error: ${message}\n`);
  }
  process.exit(exitCode);
}

function handleTerminationSignal(signalName) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logErrorLine(`[verify-all] Received ${signalName}. Finalizing and pruning before exit...`);
  failRun(currentStepMeta ? currentStepMeta.name : `Interrupted (${signalName})`, 130);
}

fs.mkdirSync(runsDir, { recursive: true });
pruneRunDirectories(preRunRetentionLimit, 'pre-run');
initializeRunLogging();
process.on('SIGINT', () => handleTerminationSignal('SIGINT'));
process.on('SIGTERM', () => handleTerminationSignal('SIGTERM'));

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

      logLine('[verify-all] Formatting issues found. Running auto-format...');

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

try {
  for (const [index, step] of steps.entries()) {
    const stepNumber = `${index + 1}/${steps.length}`;
    const stepMeta = {
      name: step.name,
      status: 'running',
      commands: [],
    };
    runMeta.steps.push(stepMeta);
    currentStepMeta = stepMeta;

    logLine(`\n[verify-all] ${stepNumber} ${step.name}`);

    const ok = step.run();
    if (!ok) {
      stepMeta.status = 'failed';
      logErrorLine(`[verify-all] Failed at step ${stepNumber}: ${step.name}`);
      failRun(step.name, 1);
    }

    stepMeta.status = 'passed';
  }

  runMeta.status = 'passed';
  runMeta.failedStep = null;
  logLine('\n[verify-all] Complete.');
  finalizeAndPrune();
} catch (error) {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  logErrorLine(`[verify-all] Unhandled error: ${message}`);
  failRun(currentStepMeta ? currentStepMeta.name : null, 1);
}
