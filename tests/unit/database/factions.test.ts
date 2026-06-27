import { describe, expect, it, vi } from 'vitest';

async function loadDbModule() {
  const appGetPathMock = vi.fn(() => 'C:/fake-user-data');
  const pragmaMock = vi.fn((command: string) => {
    if (command === 'table_info(characters)') {
      return [
        { name: 'id' },
        { name: 'created_at' },
        { name: 'updated_at' },
        { name: 'world_id' },
        { name: 'name' },
        { name: 'profile' },
        { name: 'image_src' },
        { name: 'sections' },
        { name: 'wiki_summary' },
      ];
    }
    if (command === 'table_info(worlds)') {
      return [{ name: 'id' }, { name: 'name' }, { name: 'config' }];
    }
    if (command === 'table_info(tokens)') {
      return [{ name: 'world_id' }, { name: 'campaign_id', notnull: 0 }, { name: 'grid_type' }];
    }
    return [];
  });
  const execMock = vi.fn();
  const closeMock = vi.fn();
  const databaseCtorMock = vi.fn();
  const transactionMock = vi.fn(
    (callback: (...args: unknown[]) => unknown) => (...args: unknown[]) => callback(...args),
  );
  const prepareMock = vi.fn(() => ({
    all: vi.fn(() => []),
    get: vi.fn(() => undefined),
    run: vi.fn(),
  }));

  class FakeDatabase {
    pragma = pragmaMock;
    exec = execMock;
    close = closeMock;
    prepare = prepareMock;
    transaction = transactionMock;

    constructor(dbPath: string) {
      databaseCtorMock(dbPath);
    }
  }

  vi.resetModules();
  vi.doMock('electron', () => ({
    app: { getPath: appGetPathMock },
  }));
  vi.doMock('better-sqlite3', () => ({
    default: FakeDatabase,
  }));

  const dbModule = await import('../../../src/database/db');
  return {
    ...dbModule,
    execMock,
  };
}

describe('Factions schema migration', () => {
  it('creates faction_types table with the world-scoped unique name constraint', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();
    getDatabase();
    closeDatabase();

    const sql = execMock.mock.calls.map(([s]) => String(s)).join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS faction_types');
    expect(sql).toContain('world_id   INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE');
    expect(sql).toContain('UNIQUE(world_id, name)');
  });

  it('creates factions table with type and parent self-reference columns', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();
    getDatabase();
    closeDatabase();

    const sql = execMock.mock.calls.map(([s]) => String(s)).join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS factions');
    expect(sql).toContain("sections          TEXT    NOT NULL DEFAULT '{}'");
    expect(sql).toContain("wiki_summary      TEXT    NOT NULL DEFAULT '{}'");
    expect(sql).toContain(
      'type_id           INTEGER REFERENCES faction_types(id) ON DELETE SET NULL',
    );
    expect(sql).toContain(
      'parent_faction_id INTEGER REFERENCES factions(id) ON DELETE SET NULL',
    );
  });

  it('creates the expected factions indexes', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();
    getDatabase();
    closeDatabase();

    const sql = execMock.mock.calls.map(([s]) => String(s)).join('\n');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_factions_world_id ON factions(world_id)');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_factions_type_id ON factions(type_id)');
    expect(sql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_factions_parent_faction_id ON factions(parent_faction_id)',
    );
  });

  it('creates faction_members junction table with role and is_primary columns', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();
    getDatabase();
    closeDatabase();

    const sql = execMock.mock.calls.map(([s]) => String(s)).join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS faction_members');
    expect(sql).toContain('REFERENCES factions(id) ON DELETE CASCADE');
    expect(sql).toContain('REFERENCES characters(id) ON DELETE CASCADE');
    expect(sql).toContain('role         TEXT    NOT NULL');
    expect(sql).toContain('is_primary   INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1))');
    expect(sql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_faction_members_faction_id ON faction_members(faction_id)',
    );
    expect(sql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_faction_members_character_id ON faction_members(character_id)',
    );
  });

  it('creates tables in FK-safe order: faction_types, then factions, then faction_members', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();
    getDatabase();
    closeDatabase();

    const allSql = execMock.mock.calls.map(([s]) => String(s));
    const typesIndex = allSql.findIndex((s) =>
      s.includes('CREATE TABLE IF NOT EXISTS faction_types')
    );
    const factionsIndex = allSql.findIndex((s) =>
      s.includes('CREATE TABLE IF NOT EXISTS factions (')
    );
    const membersIndex = allSql.findIndex((s) =>
      s.includes('CREATE TABLE IF NOT EXISTS faction_members')
    );

    expect(typesIndex).toBeGreaterThanOrEqual(0);
    expect(factionsIndex).toBeGreaterThan(typesIndex);
    expect(membersIndex).toBeGreaterThan(factionsIndex);
  });

  it('migration is idempotent (every faction statement uses IF NOT EXISTS)', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();
    getDatabase();
    closeDatabase();

    const factionExecCalls = execMock.mock.calls
      .map(([s]) => String(s))
      .filter((s) => s.includes('faction'));

    for (const sql of factionExecCalls) {
      if (sql.includes('CREATE TABLE')) {
        expect(sql).toContain('CREATE TABLE IF NOT EXISTS');
      }
      if (sql.includes('CREATE INDEX')) {
        expect(sql).toContain('IF NOT EXISTS');
      }
    }
  });
});
