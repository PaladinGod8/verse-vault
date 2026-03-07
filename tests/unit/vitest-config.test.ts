import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('vitest config optimization defaults', () => {
  function readConfigText(): string {
    const configPath = path.resolve(process.cwd(), 'vitest.config.ts');
    return fs.readFileSync(configPath, 'utf8');
  }

  it('pins worker threads pool for all runs', () => {
    const configText = readConfigText();
    expect(configText).toContain("pool: 'threads'");
    expect(configText).toContain('maxWorkers: Math.max(2, os.cpus().length - 1)');
  });

  it('keeps coverage thresholds and reporters aligned with quality gate', () => {
    const configText = readConfigText();
    expect(configText).toContain("provider: 'v8'");
    expect(configText).toContain("reporter: ['text', 'html', 'lcov', 'json-summary']");
    expect(configText).toContain('lines: 80');
    expect(configText).toContain('statements: 80');
    expect(configText).toContain('functions: 80');
    expect(configText).toContain('branches: 80');
  });
});
