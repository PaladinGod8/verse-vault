import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT_PATH = path.resolve(process.cwd(), 'scripts', 'lint-tracked-markdown.cjs');

const tempDirs: string[] = [];

function writeFile(targetPath: string, contents: string): void {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, contents, 'utf8');
}

function createWorkspace(): string {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'vv-lint-markdown-'));
  tempDirs.push(workspace);

  spawnSync('git', ['init'], { cwd: workspace, stdio: 'ignore' });
  spawnSync('git', ['config', 'user.email', 'tests@example.com'], {
    cwd: workspace,
    stdio: 'ignore',
  });
  spawnSync('git', ['config', 'user.name', 'Verse Vault Tests'], {
    cwd: workspace,
    stdio: 'ignore',
  });

  writeFile(path.join(workspace, '.markdownlint-cli2.jsonc'), '{}\n');
  writeFile(
    path.join(workspace, 'node_modules', '.bin', 'markdownlint-cli2.cmd'),
    [
      '@echo off',
      'setlocal enabledelayedexpansion',
      'set "missing="',
      ':loop',
      'if "%~1"=="" goto done',
      'if not "%~1"=="--config" if not "%~2"=="" if not exist "%~1" set "missing=%~1"',
      'shift',
      'goto loop',
      ':done',
      'if defined missing (',
      '  echo missing file !missing! 1>&2',
      '  exit /b 2',
      ')',
      'exit /b 0',
      '',
    ].join('\r\n'),
  );

  return workspace;
}

function runScript(workspace: string) {
  return spawnSync(process.execPath, [SCRIPT_PATH, '--tool=markdownlint', '--partition=all'], {
    cwd: workspace,
    encoding: 'utf8',
  });
}

describe('lint-tracked-markdown.cjs', () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('skips tracked markdown files that were deleted from the working tree', () => {
    const workspace = createWorkspace();
    const deletedDoc = path.join(workspace, 'LOCAL_CI_PIPELINE_REVIEW.md');
    const liveDoc = path.join(workspace, 'README.md');

    writeFile(deletedDoc, '# Temporary review\n');
    writeFile(liveDoc, '# Readme\n');

    spawnSync('git', ['add', 'LOCAL_CI_PIPELINE_REVIEW.md', 'README.md'], {
      cwd: workspace,
      stdio: 'ignore',
    });

    fs.rmSync(deletedDoc);

    const result = runScript(workspace);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Skipping 1 missing tracked markdown file');
    expect(result.stdout).toContain('count=1');
    expect(result.stderr).not.toContain('missing file');
  });
});
