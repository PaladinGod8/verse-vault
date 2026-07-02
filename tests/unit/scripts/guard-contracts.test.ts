import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  loadIpcCatalog,
  preloadUsesSharedDbApi,
  validateCatalogCoverage,
  validatePreloadBridgeCoverage,
} from '../../../scripts/lib/contracts.cjs';

const cleanupDirs: string[] = [];

function makeTempRepo(modifyCatalog: (source: string) => string): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vv-contract-guard-'));
  cleanupDirs.push(tempDir);

  fs.mkdirSync(path.join(tempDir, 'src/shared/contracts'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'src/main/ipc'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });

  fs.writeFileSync(
    path.join(tempDir, 'src/shared/ipcChannels.ts'),
    fs.readFileSync(path.join(process.cwd(), 'src/shared/ipcChannels.ts'), 'utf8'),
    'utf8',
  );
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
    path.join(tempDir, 'src/shared/ipcCatalog.ts'),
    modifyCatalog(
      fs.readFileSync(path.join(process.cwd(), 'src/shared/ipcCatalog.ts'), 'utf8'),
    ),
    'utf8',
  );
  fs.writeFileSync(
    path.join(tempDir, 'src/preload.ts'),
    fs.readFileSync(path.join(process.cwd(), 'src/preload.ts'), 'utf8'),
    'utf8',
  );

  for (const entry of loadIpcCatalog(process.cwd())) {
    const handlerPath = path.join(tempDir, entry.handler);
    fs.mkdirSync(path.dirname(handlerPath), { recursive: true });
    if (!fs.existsSync(handlerPath)) {
      fs.writeFileSync(handlerPath, '// test handler\n', 'utf8');
    }
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

describe('guard-contracts', () => {
  it('passes against the current repo state', () => {
    const report = validateCatalogCoverage(process.cwd());
    const preloadReport = validatePreloadBridgeCoverage(process.cwd());

    expect(report.missingKeys).toEqual([]);
    expect(report.extraKeys).toEqual([]);
    expect(report.duplicateKeys).toEqual([]);
    expect(report.invalidBridges).toEqual([]);
    expect(report.invalidTypeSources).toEqual([]);
    expect(report.missingHandlers).toEqual([]);
    expect(preloadReport.missingMethods).toEqual([]);
    expect(preloadReport.extraMethods).toEqual([]);
    expect(preloadUsesSharedDbApi(process.cwd())).toBe(true);
  });

  it('detects a missing IPC catalog entry', () => {
    const repoRoot = makeTempRepo((source) =>
      source.replace(
        "    ['VERSES_DELETE', 'window.db.verses.delete', 'DbApi.verses.delete'],\n",
        '',
      )
    );

    const report = validateCatalogCoverage(repoRoot);
    expect(report.missingKeys).toContain('VERSES_DELETE');
  });

  it('detects an extra IPC catalog entry', () => {
    const repoRoot = makeTempRepo((source) =>
      source.replace(
        '];\n\nexport const IPC_CATALOG_BY_KEY',
        `  {
    key: 'NOT_REAL',
    domain: 'verses',
    bridge: 'window.db.verses.getAll',
    handler: 'src/main/ipc/registerVerseHandlers.ts',
    typeSource: 'DbApi.verses.getAll',
  },
];

export const IPC_CATALOG_BY_KEY`,
      )
    );

    const report = validateCatalogCoverage(repoRoot);
    expect(report.extraKeys).toContain('NOT_REAL');
  });

  it('detects an invalid handler path', () => {
    const repoRoot = makeTempRepo((source) =>
      source.replace(
        "  verses: 'src/main/ipc/registerVerseHandlers.ts',\n",
        "  verses: 'src/main/ipc/missingVerseHandlers.ts',\n",
      )
    );

    const report = validateCatalogCoverage(repoRoot);
    expect(report.missingHandlers.some((entry: { key: string; }) => entry.key === 'VERSES_GET_ALL'))
      .toBe(true);
  });

  it('detects a bridge/type-source mismatch', () => {
    const repoRoot = makeTempRepo((source) =>
      source.replace(
        "    ['VERSES_GET_ALL', 'window.db.verses.getAll', 'DbApi.verses.getAll'],\n",
        "    ['VERSES_GET_ALL', 'window.db.verses.notReal', 'DbApi.verses.notReal'],\n",
      )
    );

    const report = validateCatalogCoverage(repoRoot);
    expect(report.invalidBridges.some((entry: { key: string; }) => entry.key === 'VERSES_GET_ALL'))
      .toBe(true);
    expect(
      report.invalidTypeSources.some((entry: { key: string; }) => entry.key === 'VERSES_GET_ALL'),
    ).toBe(true);
  });
});
