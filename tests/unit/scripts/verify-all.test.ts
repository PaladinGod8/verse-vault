import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const VERIFY_ALL_SCRIPT = path.resolve(process.cwd(), 'scripts', 'verify-all.cjs');

type VerifyRunResult = SpawnSyncReturns<string>;

type VerifyRunOptions = {
  args?: string[];
  env?: Record<string, string>;
};

type RunMeta = {
  runId: string;
  status: string;
  failedStep: { name: string; } | null;
  logs: {
    runDir: string;
    runLog: string;
    latestLog: string;
    latestMeta: string;
  };
  steps: Array<{
    name: string;
    status: string;
    commands: Array<{
      logs: {
        stdout: string;
        stderr: string;
        combined: string;
      };
    }>;
  }>;
};

const tempDirs: string[] = [];

function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function removeDirWithRetries(dir: string): void {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (attempt < 5 && (code === 'EBUSY' || code === 'EPERM' || code === 'ENOTEMPTY')) {
        sleep(100 * attempt);
        continue;
      }
      throw error;
    }
  }
}

function createTempWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-all-test-'));
  tempDirs.push(workspace);

  const binDir = path.join(workspace, 'bin');
  fs.mkdirSync(binDir, { recursive: true });

  const fakeYarnJsPath = path.join(binDir, 'fake-yarn.js');
  fs.writeFileSync(
    fakeYarnJsPath,
    [
      "const fs = require('fs');",
      "const path = require('path');",
      '',
      'const cmd = process.argv.slice(2).join(" ");',
      'const statePath = process.env.FAKE_YARN_STATE_PATH || path.resolve(process.cwd(), ".fake-yarn-state.json");',
      '',
      'let state = { calls: [], failedOnce: {} };',
      'if (fs.existsSync(statePath)) {',
      '  state = JSON.parse(fs.readFileSync(statePath, "utf8"));',
      '  state.calls = Array.isArray(state.calls) ? state.calls : [];',
      '  state.failedOnce = state.failedOnce || {};',
      '}',
      '',
      'state.calls.push({',
      '  cmd,',
      '  args: process.argv.slice(2),',
      '  playwrightWorkers: process.env.PLAYWRIGHT_WORKERS || null,',
      '});',
      '',
      'const stdoutOn = (process.env.FAKE_YARN_STDOUT_ON || "").split(",").filter(Boolean);',
      'const stderrOn = (process.env.FAKE_YARN_STDERR_ON || "").split(",").filter(Boolean);',
      'const failOn = (process.env.FAKE_YARN_FAIL_ON || "").split(",").filter(Boolean);',
      'const failOnce = (process.env.FAKE_YARN_FAIL_ONCE || "").split(",").filter(Boolean);',
      'const failCode = Number(process.env.FAKE_YARN_FAIL_CODE || "2");',
      'const delayOn = (process.env.FAKE_YARN_DELAY_ON || "").split(",").filter(Boolean);',
      'const delayMs = Number(process.env.FAKE_YARN_DELAY_MS || "0");',
      '',
      'fs.writeFileSync(statePath, JSON.stringify(state, null, 2));',
      '',
      'if (delayOn.includes(cmd) && Number.isFinite(delayMs) && delayMs > 0) {',
      '  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);',
      '}',
      '',
      'if (stdoutOn.includes(cmd)) {',
      '  process.stdout.write(`[fake-yarn-stdout] ${cmd}\\n`);',
      '}',
      '',
      'if (stderrOn.includes(cmd)) {',
      '  process.stderr.write(`[fake-yarn-stderr] ${cmd}\\n`);',
      '}',
      '',
      'let exitCode = 0;',
      'if (failOn.includes(cmd)) {',
      '  exitCode = failCode;',
      '} else if (failOnce.includes(cmd) && !state.failedOnce[cmd]) {',
      '  state.failedOnce[cmd] = true;',
      '  exitCode = failCode;',
      '}',
      '',
      'process.exit(exitCode);',
      '',
    ].join('\n'),
    'utf8',
  );

  fs.writeFileSync(
    path.join(binDir, 'yarn.cmd'),
    '@echo off\r\nnode "%~dp0fake-yarn.js" %*\r\nexit /b %ERRORLEVEL%\r\n',
    'utf8',
  );

  fs.writeFileSync(
    path.join(binDir, 'yarn'),
    '#!/usr/bin/env sh\nnode "$(dirname "$0")/fake-yarn.js" "$@"\n',
    'utf8',
  );

  try {
    fs.chmodSync(path.join(binDir, 'yarn'), 0o755);
  } catch {
    // No-op on platforms where chmod is not meaningful for this test.
  }

  return workspace;
}

function runVerifyAll(workspace: string, options: VerifyRunOptions = {}): VerifyRunResult {
  const binPath = path.join(workspace, 'bin');
  const scriptArgs = options.args ?? ['--no-dev'];

  const env: Record<string, string> = {
    ...process.env,
    ...options.env,
    PATH: `${binPath}${path.delimiter}${process.env.PATH || ''}`,
    FAKE_YARN_STATE_PATH: path.join(workspace, '.fake-yarn-state.json'),
  };

  // Keep worker assertions deterministic regardless of the runner's ambient
  // PLAYWRIGHT_WORKERS (e.g. someone running via test:e2e:local:8, or a
  // verify:all invocation that exported it). Tests that care set it explicitly.
  if (!options.env || !('PLAYWRIGHT_WORKERS' in options.env)) {
    delete env.PLAYWRIGHT_WORKERS;
  }

  return spawnSync(process.execPath, [VERIFY_ALL_SCRIPT, ...scriptArgs], {
    cwd: workspace,
    encoding: 'utf8',
    timeout: 15_000,
    env,
  });
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function readLatestMeta(workspace: string): RunMeta {
  return readJsonFile<RunMeta>(
    path.join(workspace, 'scripts', 'logs', 'pipeline', 'latest.json'),
  );
}

function readFakeYarnState(workspace: string): {
  calls: Array<{ cmd: string; args: string[]; playwrightWorkers: string | null; }>;
} {
  return readJsonFile(path.join(workspace, '.fake-yarn-state.json'));
}

describe('scripts/verify-all.cjs terminal log capture', () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      removeDirWithRetries(dir);
    }
  });

  it('creates per-run log artifacts and latest pointers for successful runs', () => {
    const workspace = createTempWorkspace();
    const result = runVerifyAll(workspace);

    expect(result.status).toBe(0);

    const latestMeta = readLatestMeta(workspace);
    expect(latestMeta.status).toBe('passed');
    expect(latestMeta.failedStep).toBeNull();
    expect(fs.existsSync(latestMeta.logs.runDir)).toBe(true);
    expect(fs.existsSync(latestMeta.logs.runLog)).toBe(true);
    expect(fs.existsSync(latestMeta.logs.latestLog)).toBe(true);
    expect(fs.existsSync(latestMeta.logs.latestMeta)).toBe(true);

    const runLogContent = fs.readFileSync(latestMeta.logs.runLog, 'utf8');
    const latestLogContent = fs.readFileSync(latestMeta.logs.latestLog, 'utf8');

    expect(runLogContent).toContain('[verify-all] Complete.');
    expect(latestLogContent).toBe(runLogContent);
  }, 30_000);

  it('captures combined stdout and stderr for failed commands and exits with code 1', () => {
    const workspace = createTempWorkspace();
    const result = runVerifyAll(workspace, {
      env: {
        FAKE_YARN_FAIL_ON: 'lint',
        FAKE_YARN_STDOUT_ON: 'lint',
        FAKE_YARN_STDERR_ON: 'lint',
      },
    });

    expect(result.status).toBe(1);

    const latestMeta = readLatestMeta(workspace);
    expect(latestMeta.status).toBe('failed');
    expect(latestMeta.failedStep?.name).toBe('Run lint (strict, no warnings)');

    const failedStep = latestMeta.steps.find((step) => step.name === latestMeta.failedStep?.name);
    expect(failedStep).toBeDefined();

    if (!failedStep) {
      throw new Error('Expected failed step metadata to be present');
    }

    const firstCommand = failedStep.commands[0];
    expect(firstCommand).toBeDefined();
    if (!firstCommand) {
      throw new Error('Expected failed step to include at least one command');
    }

    const commandLogs = firstCommand.logs;
    const stdoutLog = fs.readFileSync(commandLogs.stdout, 'utf8');
    const stderrLog = fs.readFileSync(commandLogs.stderr, 'utf8');
    const combinedLog = fs.readFileSync(commandLogs.combined, 'utf8');

    expect(stdoutLog).toContain('[fake-yarn-stdout] lint');
    expect(stderrLog).toContain('[fake-yarn-stderr] lint');
    expect(combinedLog).toContain('[fake-yarn-stdout] lint');
    expect(combinedLog).toContain('[fake-yarn-stderr] lint');
  }, 30_000);

  it('updates latest pointers to the newest run across sequential executions', async () => {
    const workspace = createTempWorkspace();

    const firstRun = runVerifyAll(workspace, {
      env: {
        FAKE_YARN_FAIL_ON: 'type-check',
      },
    });
    expect(firstRun.status).toBe(1);

    const firstLatest = readLatestMeta(workspace);
    expect(firstLatest.status).toBe('failed');
    const firstRunLog = fs.readFileSync(firstLatest.logs.runLog, 'utf8');

    await new Promise((resolve) => setTimeout(resolve, 10));

    const secondRun = runVerifyAll(workspace);
    expect(secondRun.status).toBe(0);

    const secondLatest = readLatestMeta(workspace);
    expect(secondLatest.status).toBe('passed');
    expect(secondLatest.runId).not.toBe(firstLatest.runId);

    const secondRunLog = fs.readFileSync(secondLatest.logs.runLog, 'utf8');
    const latestLog = fs.readFileSync(secondLatest.logs.latestLog, 'utf8');

    expect(latestLog).toBe(secondRunLog);
    expect(latestLog).not.toBe(firstRunLog);
  }, 30_000);

  it('runs the secret scan step before formatting and linting', () => {
    const workspace = createTempWorkspace();
    const result = runVerifyAll(workspace);

    expect(result.status).toBe(0);

    const latestMeta = readLatestMeta(workspace);
    const stepNames = latestMeta.steps.map((step) => step.name);
    expect(stepNames).toContain('Scan secrets (working tree + git history)');

    const secretStepIndex = stepNames.indexOf('Scan secrets (working tree + git history)');
    const formatStepIndex = stepNames.indexOf('Check formatting and auto-fix if needed');
    const lintStepIndex = stepNames.indexOf('Run lint (strict, no warnings)');

    expect(secretStepIndex).toBeGreaterThanOrEqual(0);
    expect(secretStepIndex).toBeLessThan(formatStepIndex);
    expect(secretStepIndex).toBeLessThan(lintStepIndex);
  }, 30_000);

  it('runs the dependency vulnerability scan after secrets and before formatting', () => {
    const workspace = createTempWorkspace();
    const result = runVerifyAll(workspace);

    expect(result.status).toBe(0);

    const latestMeta = readLatestMeta(workspace);
    const stepNames = latestMeta.steps.map((step) => step.name);

    const secretIndex = stepNames.indexOf('Scan secrets (working tree + git history)');
    const depsIndex = stepNames.indexOf('Scan dependencies for vulnerabilities (Trivy)');
    const formatIndex = stepNames.indexOf('Check formatting and auto-fix if needed');

    expect(depsIndex).toBeGreaterThanOrEqual(0);
    expect(secretIndex).toBeLessThan(depsIndex);
    expect(depsIndex).toBeLessThan(formatIndex);

    const state = readFakeYarnState(workspace);
    expect(state.calls.some((call) => call.cmd === 'security:deps')).toBe(true);
  }, 30_000);

  it('fails the pipeline when the dependency vulnerability scan fails', () => {
    const workspace = createTempWorkspace();
    const result = runVerifyAll(workspace, {
      env: {
        FAKE_YARN_FAIL_ON: 'security:deps',
      },
    });

    expect(result.status).toBe(1);

    const latestMeta = readLatestMeta(workspace);
    expect(latestMeta.status).toBe('failed');
    expect(latestMeta.failedStep?.name).toBe(
      'Scan dependencies for vulnerabilities (Trivy)',
    );
  }, 30_000);

  it('treats the outdated dependency report as non-blocking', () => {
    const workspace = createTempWorkspace();
    const result = runVerifyAll(workspace, {
      env: {
        FAKE_YARN_FAIL_ON: 'deps:outdated',
      },
    });

    // `yarn outdated` exits non-zero whenever anything is behind latest; the
    // pipeline must still pass and record the informational step as passed.
    expect(result.status).toBe(0);

    const latestMeta = readLatestMeta(workspace);
    expect(latestMeta.status).toBe('passed');

    const outdatedStep = latestMeta.steps.find(
      (step) => step.name === 'Report outdated dependencies (informational)',
    );
    expect(outdatedStep?.status).toBe('passed');
  }, 30_000);

  it('skips native rebuild by default and only rebuilds when explicitly requested', () => {
    const workspace = createTempWorkspace();

    const defaultRun = runVerifyAll(workspace);
    expect(defaultRun.status).toBe(0);

    const defaultState = readFakeYarnState(workspace);
    expect(defaultState.calls.some((call) => call.cmd === 'postinstall')).toBe(false);

    const rebuildRun = runVerifyAll(workspace, {
      args: ['--no-dev', '--rebuild-native'],
    });
    expect(rebuildRun.status).toBe(0);

    const rebuildState = readFakeYarnState(workspace);
    expect(rebuildState.calls.some((call) => call.cmd === 'postinstall')).toBe(true);
  }, 30_000);

  it('reuses the packaged app when the package-fingerprint cache is warm', () => {
    const workspace = createTempWorkspace();

    // The fingerprint inputs (src/, forge.config.ts, package.json, ...) don't
    // exist in this bare sandbox workspace, so verify-all.cjs will compute the
    // fingerprint of zero files — the SHA-256 of an empty input. Pre-seed the
    // cache with that same value plus a stub packaged entry point to simulate
    // "already packaged, nothing relevant has changed since".
    const emptyFingerprint = crypto.createHash('sha256').digest('hex');
    const cacheFile = path.join(
      workspace,
      '.cache',
      'package-fingerprint',
      'state.json',
    );
    fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
    fs.writeFileSync(
      cacheFile,
      JSON.stringify({ package: { fingerprint: emptyFingerprint } }),
      'utf8',
    );

    const mainEntry = path.join(workspace, '.vite', 'build', 'main.js');
    fs.mkdirSync(path.dirname(mainEntry), { recursive: true });
    fs.writeFileSync(mainEntry, '// stub packaged entry\n', 'utf8');

    const result = runVerifyAll(workspace);
    expect(result.status).toBe(0);

    const state = readFakeYarnState(workspace);
    const packageCalls = state.calls.filter((call) => call.cmd === 'package');
    expect(packageCalls).toHaveLength(0);

    const latestMeta = readLatestMeta(workspace);
    const packageStep = latestMeta.steps.find((step) => step.name === 'Package app for e2e');
    expect(packageStep?.status).toBe('passed');
  }, 30_000);

  it('packages once and runs e2e with test:e2e:ci', () => {
    const workspace = createTempWorkspace();
    const result = runVerifyAll(workspace);

    expect(result.status).toBe(0);

    const state = readFakeYarnState(workspace);
    const packageCalls = state.calls.filter((call) => call.cmd === 'package');
    const e2eCiCalls = state.calls.filter((call) => call.cmd === 'test:e2e:ci');
    const legacyE2ECalls = state.calls.filter((call) => call.cmd === 'test:e2e');

    expect(packageCalls).toHaveLength(1);
    expect(e2eCiCalls).toHaveLength(1);
    expect(legacyE2ECalls).toHaveLength(0);
  }, 30_000);

  it('runs guard:e2e-timing before package and e2e', () => {
    const workspace = createTempWorkspace();
    const result = runVerifyAll(workspace);

    expect(result.status).toBe(0);

    const latestMeta = readLatestMeta(workspace);
    const stepNames = latestMeta.steps.map((step) => step.name);
    const guardIndex = stepNames.indexOf('Guard E2E timing');
    const packageIndex = stepNames.indexOf('Package app for e2e');
    const e2eIndex = stepNames.indexOf('Run e2e tests');

    expect(guardIndex).toBeGreaterThanOrEqual(0);
    expect(guardIndex).toBeLessThan(packageIndex);
    expect(guardIndex).toBeLessThan(e2eIndex);
  }, 30_000);

  it('defaults the e2e step to parallel Playwright workers', () => {
    const workspace = createTempWorkspace();
    const result = runVerifyAll(workspace, {
      args: [],
    });

    expect(result.status).toBe(0);

    const state = readFakeYarnState(workspace);
    const e2eCall = state.calls.find((call) => call.cmd === 'test:e2e:ci');

    // Parallel e2e is safe now that the earlier Windows flakes (Chromium
    // throttling requestAnimationFrame in non-foreground Electron windows) are
    // fixed at the source via `backgroundThrottling: false` and the renderer
    // anti-throttle launch switches. An explicit PLAYWRIGHT_WORKERS still wins.
    expect(e2eCall).toBeDefined();
    expect(e2eCall?.playwrightWorkers).toBe('4');
  }, 30_000);

  it('honors an explicit PLAYWRIGHT_WORKERS override for the e2e step', () => {
    const workspace = createTempWorkspace();
    const result = runVerifyAll(workspace, {
      args: [],
      env: { PLAYWRIGHT_WORKERS: '4' },
    });

    expect(result.status).toBe(0);

    const state = readFakeYarnState(workspace);
    const e2eCall = state.calls.find((call) => call.cmd === 'test:e2e:ci');

    expect(e2eCall?.playwrightWorkers).toBe('4');
  }, 30_000);

  it('uses the dedicated e2e timeout override for the e2e step', () => {
    const workspace = createTempWorkspace();
    const result = runVerifyAll(workspace, {
      env: {
        FAKE_YARN_DELAY_ON: 'test:e2e:ci',
        FAKE_YARN_DELAY_MS: '250',
        VERIFY_ALL_E2E_TIMEOUT_MS: '100',
      },
    });

    expect(result.status).toBe(1);

    const latestMeta = readLatestMeta(workspace);
    expect(latestMeta.status).toBe('failed');
    expect(latestMeta.failedStep?.name).toBe('Run e2e tests');
  }, 30_000);
});
