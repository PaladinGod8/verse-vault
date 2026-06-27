import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SECRET_SCAN_SCRIPT = path.resolve(process.cwd(), 'scripts', 'secret-scan.cjs');

type SecretScanResult = SpawnSyncReturns<string>;

const tempDirs: string[] = [];

function createTempWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'secret-scan-test-'));
  tempDirs.push(workspace);

  const binDir = path.join(workspace, 'bin');
  fs.mkdirSync(binDir, { recursive: true });

  fs.writeFileSync(
    path.join(workspace, '.gitleaks.toml'),
    'title = "test config"\n[extend]\nuseDefault = true\n',
    'utf8',
  );

  const fakeGitleaksJsPath = path.join(binDir, 'fake-gitleaks.js');
  fs.writeFileSync(
    fakeGitleaksJsPath,
    [
      "const fs = require('fs');",
      "const path = require('path');",
      '',
      'const args = process.argv.slice(2);',
      'const statePath = process.env.FAKE_GITLEAKS_STATE_PATH || path.resolve(process.cwd(), ".fake-gitleaks-state.json");',
      'const failOn = (process.env.FAKE_GITLEAKS_FAIL_ON || "").split(",").filter(Boolean);',
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
      'const mode = args[0] || "";',
      'if (failOn.includes(mode)) {',
      '  process.exit(2);',
      '}',
      'process.exit(0);',
    ].join('\n'),
    'utf8',
  );

  fs.writeFileSync(
    path.join(binDir, 'gitleaks.cmd'),
    '@echo off\r\nnode "%~dp0fake-gitleaks.js" %*\r\nexit /b %ERRORLEVEL%\r\n',
    'utf8',
  );

  fs.writeFileSync(
    path.join(binDir, 'gitleaks'),
    '#!/usr/bin/env sh\nnode "$(dirname "$0")/fake-gitleaks.js" "$@"\n',
    'utf8',
  );

  try {
    fs.chmodSync(path.join(binDir, 'gitleaks'), 0o755);
  } catch {
    // No-op on platforms where chmod is not meaningful for this test.
  }

  return workspace;
}

function runSecretScan(
  workspace: string,
  args: string[] = [],
  env: Record<string, string> = {},
): SecretScanResult {
  const binPath = path.join(workspace, 'bin');

  return spawnSync(process.execPath, [SECRET_SCAN_SCRIPT, ...args], {
    cwd: workspace,
    encoding: 'utf8',
    timeout: 15_000,
    env: {
      ...process.env,
      ...env,
      PATH: `${binPath}${path.delimiter}${process.env.PATH || ''}`,
      FAKE_GITLEAKS_STATE_PATH: path.join(workspace, '.fake-gitleaks-state.json'),
    },
  });
}

function readCalls(workspace: string): string[][] {
  const statePath = path.join(workspace, '.fake-gitleaks-state.json');
  return JSON.parse(fs.readFileSync(statePath, 'utf8')).calls as string[][];
}

describe('scripts/secret-scan.cjs', () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('runs working-tree and git-history scans by default', () => {
    const workspace = createTempWorkspace();
    const result = runSecretScan(workspace);

    expect(result.status).toBe(0);

    const calls = readCalls(workspace);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual([
      'dir',
      '.',
      '--redact',
      '--no-banner',
      '--config',
      path.join(workspace, '.gitleaks.toml'),
    ]);
    expect(calls[1]).toEqual([
      'git',
      '.',
      '--redact',
      '--no-banner',
      '--config',
      path.join(workspace, '.gitleaks.toml'),
    ]);
  });

  it('can limit scans to the working tree for fast local lanes', () => {
    const workspace = createTempWorkspace();
    const result = runSecretScan(workspace, ['--working-tree-only']);

    expect(result.status).toBe(0);

    const calls = readCalls(workspace);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[0]).toBe('dir');
  });

  it('fails fast when gitleaks reports a leak', () => {
    const workspace = createTempWorkspace();
    const result = runSecretScan(workspace, [], {
      FAKE_GITLEAKS_FAIL_ON: 'git',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Command failed');
  });
});
