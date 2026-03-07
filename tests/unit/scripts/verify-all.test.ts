import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const VERIFY_ALL_SCRIPT = path.resolve(process.cwd(), 'scripts', 'verify-all.cjs');

type VerifyRunResult = SpawnSyncReturns<string>;

type VerifyRunOptions = {
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
      'state.calls.push({ cmd, args: process.argv.slice(2) });',
      '',
      'const stdoutOn = (process.env.FAKE_YARN_STDOUT_ON || "").split(",").filter(Boolean);',
      'const stderrOn = (process.env.FAKE_YARN_STDERR_ON || "").split(",").filter(Boolean);',
      'const failOn = (process.env.FAKE_YARN_FAIL_ON || "").split(",").filter(Boolean);',
      'const failOnce = (process.env.FAKE_YARN_FAIL_ONCE || "").split(",").filter(Boolean);',
      'const failCode = Number(process.env.FAKE_YARN_FAIL_CODE || "2");',
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
      'fs.writeFileSync(statePath, JSON.stringify(state, null, 2));',
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

  return spawnSync(process.execPath, [VERIFY_ALL_SCRIPT, '--no-dev'], {
    cwd: workspace,
    encoding: 'utf8',
    timeout: 15_000,
    env: {
      ...process.env,
      ...options.env,
      PATH: `${binPath}${path.delimiter}${process.env.PATH || ''}`,
      FAKE_YARN_STATE_PATH: path.join(workspace, '.fake-yarn-state.json'),
    },
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

describe('scripts/verify-all.cjs terminal log capture', () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
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
});
