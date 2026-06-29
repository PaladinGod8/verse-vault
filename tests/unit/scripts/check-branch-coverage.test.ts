import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT_PATH = path.resolve(process.cwd(), 'scripts', 'check-branch-coverage.cjs');

const tempDirs: string[] = [];

function createWorkspace(summary: unknown): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'vv-branch-coverage-'));
  tempDirs.push(workspace);

  const coverageDir = path.join(workspace, 'coverage');
  fs.mkdirSync(coverageDir, { recursive: true });
  fs.writeFileSync(
    path.join(coverageDir, 'coverage-summary.json'),
    JSON.stringify(summary, null, 2),
    'utf8',
  );

  return workspace;
}

function runScript(workspace: string, env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd: workspace,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env,
    },
  });
}

describe('check-branch-coverage.cjs', () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('passes when total branch coverage meets default floor and prints weakest files', () => {
    const workspace = createWorkspace({
      total: { branches: { pct: 82.14 } },
      'src/renderer/App.tsx': { branches: { pct: 78.5 } },
      'src/database/repos/tokensRepo.ts': { branches: { pct: 0 } },
    });

    const result = runScript(workspace);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Total branch coverage 82.14% (floor 80.00%).');
    expect(result.stdout).toContain('src/database/repos/tokensRepo.ts: 0.00%');
  });

  it('fails when total branch coverage is below configured floor', () => {
    const workspace = createWorkspace({
      total: { branches: { pct: 82.14 } },
    });

    const result = runScript(workspace, { BRANCH_COVERAGE_FLOOR: '83' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Branch coverage 82.14% is below required floor 83.00%.');
  });

  it('fails with actionable error when coverage summary is missing', () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'vv-branch-coverage-'));
    tempDirs.push(workspace);

    const result = runScript(workspace);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Coverage summary not found');
  });
});
