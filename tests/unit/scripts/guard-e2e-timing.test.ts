import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanE2ETimingIssues } from '../../../scripts/guard-e2e-timing.cjs';

const cleanupDirs: string[] = [];

function makeTempRepo(source: string): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vv-e2e-timing-'));
  cleanupDirs.push(tempDir);

  const testFilePath = path.join(tempDir, 'tests/e2e/sample.test.ts');
  fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
  fs.writeFileSync(testFilePath, source.trimStart(), 'utf8');

  return tempDir;
}

afterEach(() => {
  while (cleanupDirs.length > 0) {
    const dir = cleanupDirs.pop();
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('guard-e2e-timing', () => {
  it('passes against the current repo state', () => {
    const report = scanE2ETimingIssues(process.cwd());

    expect(report.forbiddenCalls).toEqual([]);
  });

  it('detects page.waitForTimeout usage', () => {
    const repoRoot = makeTempRepo(`
      async function test(page: { waitForTimeout(ms: number): Promise<void> }) {
        await page.waitForTimeout(50);
      }
    `);

    const report = scanE2ETimingIssues(repoRoot);

    expect(report.forbiddenCalls).toEqual([
      expect.objectContaining({
        callee: 'page.waitForTimeout',
      }),
    ]);
  });

  it('detects setTimeout usage in e2e files', () => {
    const repoRoot = makeTempRepo(`
      export function waitForLater(): void {
        setTimeout(() => undefined, 50);
      }
    `);

    const report = scanE2ETimingIssues(repoRoot);

    expect(report.forbiddenCalls).toEqual([
      expect.objectContaining({
        callee: 'setTimeout',
      }),
    ]);
  });

  it('detects sleep-like helper calls', () => {
    const repoRoot = makeTempRepo(`
      async function test(): Promise<void> {
        await sleep(50);
      }
    `);

    const report = scanE2ETimingIssues(repoRoot);

    expect(report.forbiddenCalls).toEqual([
      expect.objectContaining({
        callee: 'sleep',
      }),
    ]);
  });

  it('allows requestAnimationFrame-based waiting helpers', () => {
    const repoRoot = makeTempRepo(`
      export async function waitForAnimationFrame(): Promise<void> {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      }
    `);

    const report = scanE2ETimingIssues(repoRoot);

    expect(report.forbiddenCalls).toEqual([]);
  });
});
