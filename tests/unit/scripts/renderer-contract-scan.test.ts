import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { validatePreloadBridgeCoverage } from '../../../scripts/lib/contracts.cjs';
import { scanRendererContracts } from '../../../scripts/lib/renderer-contract-scan.cjs';

const cleanupDirs: string[] = [];

function makeTempRepo(options?: {
  preloadSource?: string;
  rendererFiles?: Record<string, string>;
}): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vv-renderer-guard-'));
  cleanupDirs.push(tempDir);

  fs.mkdirSync(path.join(tempDir, 'src/shared/contracts'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'src/renderer'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });

  fs.writeFileSync(
    path.join(tempDir, 'src/shared/contracts/dbApi.ts'),
    fs.readFileSync(path.join(process.cwd(), 'src/shared/contracts/dbApi.ts'), 'utf8'),
    'utf8',
  );

  // dbApi.ts imports DB_API_RELATIONSHIP_METHODS as a runtime value (not just a type), so
  // this sibling file must be copied too - unlike its other imports, it isn't erased by TS.
  fs.writeFileSync(
    path.join(tempDir, 'src/shared/contracts/dbApiRelationships.ts'),
    fs.readFileSync(
      path.join(process.cwd(), 'src/shared/contracts/dbApiRelationships.ts'),
      'utf8',
    ),
    'utf8',
  );

  fs.writeFileSync(
    path.join(tempDir, 'src/preload.ts'),
    options?.preloadSource
      ?? fs.readFileSync(path.join(process.cwd(), 'src/preload.ts'), 'utf8'),
    'utf8',
  );

  const rendererFiles = options?.rendererFiles ?? {
    'src/renderer/App.tsx': `
      export function App(): null {
        void window.db.verses.getAll();
        return null;
      }
    `,
  };

  for (const [relativePath, source] of Object.entries(rendererFiles)) {
    const absolutePath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, source.trimStart(), 'utf8');
  }

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

describe('renderer contract scan', () => {
  it('passes against the current repo state', () => {
    const report = scanRendererContracts(process.cwd());
    const preloadReport = validatePreloadBridgeCoverage(process.cwd());

    expect(report.invalidWindowDbCalls).toEqual([]);
    expect(report.forbiddenImports).toEqual([]);
    expect(report.rawIpcStrings).toEqual([]);
    expect(preloadReport.missingMethods).toEqual([]);
    expect(preloadReport.extraMethods).toEqual([]);
  });

  it('detects renderer calls to unknown window.db methods', () => {
    const repoRoot = makeTempRepo({
      rendererFiles: {
        'src/renderer/pages/BrokenPage.tsx': `
          export function BrokenPage(): null {
            void window.db.verses.notReal();
            return null;
          }
        `,
      },
    });

    const report = scanRendererContracts(repoRoot);

    expect(report.invalidWindowDbCalls).toEqual([
      expect.objectContaining({
        accessPath: 'window.db.verses.notReal',
      }),
    ]);
  });

  it('detects renderer imports from electron', () => {
    const repoRoot = makeTempRepo({
      rendererFiles: {
        'src/renderer/pages/BrokenPage.tsx': `
          import { ipcRenderer } from 'electron';

          export function BrokenPage(): string {
            return String(ipcRenderer);
          }
        `,
      },
    });

    const report = scanRendererContracts(repoRoot);

    expect(report.forbiddenImports).toEqual([
      expect.objectContaining({
        moduleSpecifier: 'electron',
      }),
    ]);
  });

  it('detects raw ipc-like strings in renderer code', () => {
    const repoRoot = makeTempRepo({
      rendererFiles: {
        'src/renderer/pages/BrokenPage.tsx': `
          const channel = 'db:tokens:add';

          export function BrokenPage(): string {
            return channel;
          }
        `,
      },
    });

    const report = scanRendererContracts(repoRoot);

    expect(report.rawIpcStrings).toEqual([
      expect.objectContaining({
        value: 'db:tokens:add',
      }),
    ]);
  });

  it('detects preload bridge methods missing from the shared DbApi inventory', () => {
    const preloadSource = fs
      .readFileSync(path.join(process.cwd(), 'src/preload.ts'), 'utf8')
      .replace(
        '    delete: (id) => ipcRenderer.invoke(IPC.VERSES_DELETE, id),\n',
        '',
      );
    const repoRoot = makeTempRepo({ preloadSource });

    const report = validatePreloadBridgeCoverage(repoRoot);

    expect(report.missingMethods).toContain('verses.delete');
  });
});
