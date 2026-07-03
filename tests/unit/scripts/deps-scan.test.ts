import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const DEPS_SCAN_SCRIPT = path.resolve(process.cwd(), 'scripts', 'deps-scan.cjs');

type DepsScanResult = SpawnSyncReturns<string>;

const tempDirs: string[] = [];

function createTempWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-scan-test-'));
  tempDirs.push(workspace);

  const binDir = path.join(workspace, 'bin');
  fs.mkdirSync(binDir, { recursive: true });

  const fakeTrivyJsPath = path.join(binDir, 'fake-trivy.js');
  fs.writeFileSync(
    fakeTrivyJsPath,
    [
      "const fs = require('fs');",
      "const path = require('path');",
      '',
      'const args = process.argv.slice(2);',
      'const statePath = process.env.FAKE_TRIVY_STATE_PATH || path.resolve(process.cwd(), ".fake-trivy-state.json");',
      'const exitCode = Number(process.env.FAKE_TRIVY_EXIT_CODE || "0");',
      '',
      '// The availability probe (`trivy --version`) must always succeed and must',
      '// not be recorded, so only the actual `fs` scan is asserted on.',
      'if (args[0] === "--version") {',
      '  process.stdout.write("Version: 0.0.0-fake\\n");',
      '  process.exit(0);',
      '}',
      '',
      'let state = { calls: [] };',
      'if (fs.existsSync(statePath)) {',
      '  state = JSON.parse(fs.readFileSync(statePath, "utf8"));',
      '  state.calls = Array.isArray(state.calls) ? state.calls : [];',
      '}',
      '',
      'state.calls.push(args);',
      'fs.writeFileSync(statePath, JSON.stringify(state, null, 2));',
      '',
      'process.exit(exitCode);',
    ].join('\n'),
    'utf8',
  );

  fs.writeFileSync(
    path.join(binDir, 'trivy.cmd'),
    '@echo off\r\nnode "%~dp0fake-trivy.js" %*\r\nexit /b %ERRORLEVEL%\r\n',
    'utf8',
  );

  fs.writeFileSync(
    path.join(binDir, 'trivy'),
    '#!/usr/bin/env sh\nnode "$(dirname "$0")/fake-trivy.js" "$@"\n',
    'utf8',
  );

  try {
    fs.chmodSync(path.join(binDir, 'trivy'), 0o755);
  } catch {
    // No-op on platforms where chmod is not meaningful for this test.
  }

  return workspace;
}

function runDepsScan(
  workspace: string,
  env: Record<string, string> = {},
): DepsScanResult {
  const binPath = path.join(workspace, 'bin');

  return spawnSync(process.execPath, [DEPS_SCAN_SCRIPT], {
    cwd: workspace,
    encoding: 'utf8',
    timeout: 15_000,
    env: {
      ...process.env,
      ...env,
      PATH: `${binPath}${path.delimiter}${process.env.PATH || ''}`,
      FAKE_TRIVY_STATE_PATH: path.join(workspace, '.fake-trivy-state.json'),
    },
  });
}

function readCalls(workspace: string): string[][] {
  const statePath = path.join(workspace, '.fake-trivy-state.json');
  return JSON.parse(fs.readFileSync(statePath, 'utf8')).calls as string[][];
}

describe('scripts/deps-scan.cjs', () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('runs a vuln-only Trivy filesystem scan that blocks on HIGH/CRITICAL', () => {
    const workspace = createTempWorkspace();
    const result = runDepsScan(workspace);

    expect(result.status).toBe(0);

    const calls = readCalls(workspace);
    expect(calls).toHaveLength(1);

    const args = calls[0] ?? [];
    expect(args[0]).toBe('fs');
    expect(args).toEqual(expect.arrayContaining(['--scanners', 'vuln']));
    expect(args).toContain('--include-dev-deps');
    expect(args).toEqual(expect.arrayContaining(['--severity', 'HIGH,CRITICAL']));
    expect(args).toEqual(expect.arrayContaining(['--exit-code', '1']));
    // node_modules must be skipped so the scan stays fast and lockfile-driven.
    expect(args).toEqual(expect.arrayContaining(['--skip-dirs', 'node_modules']));
    expect(args[args.length - 1]).toBe('.');
  });

  it('honors a DEPS_SCAN_SEVERITY override', () => {
    const workspace = createTempWorkspace();
    const result = runDepsScan(workspace, { DEPS_SCAN_SEVERITY: 'CRITICAL' });

    expect(result.status).toBe(0);

    const args = readCalls(workspace)[0] ?? [];
    expect(args).toEqual(expect.arrayContaining(['--severity', 'CRITICAL']));
  });

  it('fails when Trivy reports vulnerabilities', () => {
    const workspace = createTempWorkspace();
    const result = runDepsScan(workspace, { FAKE_TRIVY_EXIT_CODE: '1' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('dependency vulnerabilities');
  });

  it('gives an actionable error when Trivy is not installed', () => {
    const workspace = createTempWorkspace();
    // Point at a binary name that does not exist on PATH.
    const result = runDepsScan(workspace, { TRIVY_BIN: 'trivy-does-not-exist' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Trivy CLI not found');
  });
});
