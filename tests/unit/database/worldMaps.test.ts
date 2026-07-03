import type Database from 'better-sqlite3';
import { describe, expect, it, vi } from 'vitest';
import { createWorldMapsRepo } from '../../../src/database/repos/worldMapsRepo';
import { createCoreTables } from '../../../src/database/schema';
import { runWorldMapsSchemaMigration } from '../../../src/database/worldMapMigrations';

// better-sqlite3 is compiled against Electron's ABI (via electron-rebuild) and
// cannot be loaded by the Node/vitest runner, so DB tests here assert on the
// emitted schema SQL and mock prepared statements — matching the repo's
// existing database test convention (see database/world-config.test.ts).

function collectExecSql(run: (db: Database.Database) => void): string {
  const execMock = vi.fn();
  const fakeDb = { exec: execMock, pragma: vi.fn() } as unknown as Database.Database;
  run(fakeDb);
  return execMock.mock.calls.map(([sql]) => String(sql)).join('\n');
}

describe('world_maps schema', () => {
  it('createCoreTables emits the world_maps table DDL', () => {
    const sql = collectExecSql((db) => createCoreTables(db));
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS world_maps');
    expect(sql).toContain('UNIQUE REFERENCES worlds(id) ON DELETE CASCADE');
    expect(sql).toContain('storage_key');
  });

  it('runWorldMapsSchemaMigration emits idempotent, additive DDL for legacy databases', () => {
    const sql = collectExecSql((db) => runWorldMapsSchemaMigration(db));
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS world_maps');
    expect(sql).toContain('UNIQUE REFERENCES worlds(id) ON DELETE CASCADE');
    expect(sql).not.toContain('DROP TABLE');
    expect(sql).not.toContain('ALTER TABLE world_maps');
  });
});

describe('createWorldMapsRepo', () => {
  function createDbMock(row: unknown) {
    const getMock = vi.fn(() => row);
    const prepareMock = vi.fn(() => ({ get: getMock }));
    const db = {
      prepare: prepareMock,
      transaction: (cb: (...args: unknown[]) => unknown) => cb,
    } as unknown as Database.Database;
    return { db, getMock, prepareMock };
  }

  it('getByWorld returns the bound world-map row', () => {
    const worldMap = {
      id: 7,
      world_id: 3,
      map_name: 'My Map',
      storage_key: 'world-map-7.map.gz',
      generator_version: '1.99.00',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    const { db, prepareMock } = createDbMock(worldMap);

    expect(createWorldMapsRepo(db).getByWorld(3)).toEqual(worldMap);
    expect(prepareMock).toHaveBeenCalledWith('SELECT * FROM world_maps WHERE world_id = ?');
  });

  it('getByWorld returns null when the world has no bound map', () => {
    const { db } = createDbMock(undefined);
    expect(createWorldMapsRepo(db).getByWorld(999)).toBeNull();
  });

  it('getById returns the bound world-map row', () => {
    const worldMap = {
      id: 7,
      world_id: 3,
      map_name: 'My Map',
      storage_key: 'world-map-7.map.gz',
      generator_version: '1.99.00',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    const { db, prepareMock } = createDbMock(worldMap);

    expect(createWorldMapsRepo(db).getById(7)).toEqual(worldMap);
    expect(prepareMock).toHaveBeenCalledWith('SELECT * FROM world_maps WHERE id = ?');
  });
});

describe('createWorldMapsRepo writes', () => {
  function createWriteDbMock(options?: { row?: Record<string, unknown> | null; }) {
    const runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 5 }));
    const row = options && 'row' in options ? options.row : {
      id: 5,
      world_id: 3,
      map_name: 'My World',
      storage_key: 'world-map-5.map.gz',
      generator_version: '1.99',
      created_at: 'created',
      updated_at: 'created',
    };
    const getMock = vi.fn(() => row);
    const statements: string[] = [];
    const prepareMock = vi.fn((sql: string) => {
      statements.push(sql);
      return { run: runMock, get: getMock };
    });
    const db = {
      prepare: prepareMock,
      // Pass-through transaction: return the callback so invoking it runs the body.
      transaction: (cb: (...args: unknown[]) => unknown) => cb,
    } as unknown as Database.Database;
    return { db, getMock, runMock, statements };
  }

  it('createForWorld inserts a row then sets storage_key derived from the new id', () => {
    const { db, runMock, statements } = createWriteDbMock();

    const row = createWorldMapsRepo(db).createForWorld(3, {
      mapName: 'My World',
      generatorVersion: '1.99',
    });

    expect(statements.some((s) => s.includes('INSERT INTO world_maps'))).toBe(true);
    expect(statements.some((s) => s.includes('UPDATE world_maps SET storage_key'))).toBe(true);
    expect(runMock).toHaveBeenCalledWith('world-map-5.map.gz', 5);
    expect(row.storage_key).toBe('world-map-5.map.gz');
  });

  it('throws when createForWorld cannot read back the inserted row', () => {
    const { db } = createWriteDbMock({ row: null });

    expect(() =>
      createWorldMapsRepo(db).createForWorld(3, {
        mapName: 'My World',
        generatorVersion: '1.99',
      })
    ).toThrow('Failed to create world map');
  });

  it('updateSnapshotMeta writes map_name + generator_version and touches updated_at', () => {
    const { db, runMock, statements } = createWriteDbMock();

    createWorldMapsRepo(db).updateSnapshotMeta(5, {
      mapName: 'Renamed',
      generatorVersion: '1.99',
    });

    expect(statements.some((s) => s.includes("updated_at = datetime('now')"))).toBe(true);
    expect(runMock).toHaveBeenCalledWith('Renamed', '1.99', 5);
  });

  it('throws when updateSnapshotMeta cannot find the row after update', () => {
    const { db } = createWriteDbMock({ row: null });

    expect(() =>
      createWorldMapsRepo(db).updateSnapshotMeta(5, {
        mapName: 'Renamed',
        generatorVersion: '1.99',
      })
    ).toThrow('World map not found');
  });

  it('delete removes the row by id', () => {
    const { db, runMock, statements } = createWriteDbMock();

    createWorldMapsRepo(db).delete(5);

    expect(statements).toContain('DELETE FROM world_maps WHERE id = ?');
    expect(runMock).toHaveBeenCalledWith(5);
  });
});
