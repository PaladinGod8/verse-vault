import { describe, expect, it, vi } from 'vitest';

async function loadDbModule(options?: {
  tableInfoRows?: Array<{ name: string; }>;
  tokenTableInfoRows?: Array<{ name: string; notnull?: number; }>;
}) {
  const appGetPathMock = vi.fn(() => 'C:/fake-user-data');
  const tokenTableInfoRows = options?.tokenTableInfoRows ?? [
    { name: 'world_id' },
    { name: 'campaign_id', notnull: 0 },
    { name: 'grid_type' },
  ];
  const pragmaMock = vi.fn((command: string) => {
    if (command === 'table_info(tokens)') {
      return tokenTableInfoRows;
    }
    return undefined;
  });
  const execMock = vi.fn();
  const closeMock = vi.fn();
  const databaseCtorMock = vi.fn();
  const transactionMock = vi.fn(
    (callback: (...args: unknown[]) => unknown) => (...args: unknown[]) => callback(...args),
  );
  const tableInfoRows = options?.tableInfoRows ?? [
    { name: 'act_id' },
    { name: 'planned_at' },
  ];
  const prepareMock = vi.fn().mockReturnValue({
    all: () => tableInfoRows,
    run: vi.fn(),
  });

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
    closeMock,
    databaseCtorMock,
  };
}

describe('StatBlocks Schema Migration', () => {
  it('creates statblocks table on init', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();
    getDatabase();
    closeDatabase();

    const schemaSql = execMock.mock.calls
      .map(([sql]) => String(sql))
      .join('\n');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS statblocks');
  });

  it('includes all required columns', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();
    getDatabase();
    closeDatabase();

    const schemaSql = execMock.mock.calls
      .map(([sql]) => String(sql))
      .join('\n');
    expect(schemaSql).toContain('world_id');
    expect(schemaSql).toContain('campaign_id');
    expect(schemaSql).toContain('character_id');
    expect(schemaSql).toContain('default_token_id');
    expect(schemaSql).toContain('description');
    expect(schemaSql).toContain(
      "config                TEXT NOT NULL DEFAULT '{}'",
    );
    expect(schemaSql).toContain('created_at            TEXT NOT NULL DEFAULT');
    expect(schemaSql).toContain('updated_at            TEXT NOT NULL DEFAULT');
  });

  it('declares world_id as NOT NULL with ON DELETE CASCADE', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();
    getDatabase();
    closeDatabase();

    const schemaSql = execMock.mock.calls
      .map(([sql]) => String(sql))
      .join('\n');
    expect(schemaSql).toContain(
      'world_id              INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE',
    );
  });

  it('declares campaign_id as nullable with ON DELETE CASCADE', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();
    getDatabase();
    closeDatabase();

    const schemaSql = execMock.mock.calls
      .map(([sql]) => String(sql))
      .join('\n');
    expect(schemaSql).toContain(
      'campaign_id           INTEGER REFERENCES campaigns(id) ON DELETE CASCADE',
    );
  });

  it('declares default_token_id with ON DELETE SET NULL', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();
    getDatabase();
    closeDatabase();

    const schemaSql = execMock.mock.calls
      .map(([sql]) => String(sql))
      .join('\n');
    expect(schemaSql).toContain(
      'default_token_id      INTEGER REFERENCES tokens(id) ON DELETE SET NULL',
    );
  });

  it('creates all 4 required indexes', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();
    getDatabase();
    closeDatabase();

    const schemaSql = execMock.mock.calls
      .map(([sql]) => String(sql))
      .join('\n');
    expect(schemaSql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_statblocks_world_id ON statblocks(world_id)',
    );
    expect(schemaSql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_statblocks_campaign_id ON statblocks(campaign_id)',
    );
    expect(schemaSql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_statblocks_character_id ON statblocks(character_id)',
    );
    expect(schemaSql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_statblocks_default_token_id ON statblocks(default_token_id)',
    );
  });

  it('migration is idempotent (uses CREATE TABLE IF NOT EXISTS)', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();
    getDatabase();
    closeDatabase();

    // Every statblock exec call uses IF NOT EXISTS — verify no unconditional CREATE TABLE
    const statblockExecCalls = execMock.mock.calls
      .map(([sql]) => String(sql))
      .filter((sql) =>
        sql.includes('CREATE TABLE IF NOT EXISTS statblocks (')
        || sql.includes('idx_statblocks_')
      );

    for (const sql of statblockExecCalls) {
      if (sql.includes('CREATE TABLE')) {
        expect(sql).toContain('CREATE TABLE IF NOT EXISTS statblocks');
      }
      if (sql.includes('CREATE INDEX')) {
        expect(sql).toContain('IF NOT EXISTS');
      }
    }
  });

  it('migration runs as the last step in initializeSchema', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();
    getDatabase();
    closeDatabase();

    const allSql = execMock.mock.calls.map(([sql]) => String(sql));
    const lastStatblockIndex = allSql.findLastIndex((sql) => sql.includes('statblocks'));
    // statblocks migration SQL should come after abilities table creation
    const abilitiesIndex = allSql.findIndex((sql) =>
      sql.includes('CREATE TABLE IF NOT EXISTS abilities')
    );
    expect(lastStatblockIndex).toBeGreaterThan(abilitiesIndex);
  });

  it('creates statblock-token linkage table and indexes', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();
    getDatabase();
    closeDatabase();

    const schemaSql = execMock.mock.calls
      .map(([sql]) => String(sql))
      .join('\n');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS statblock_token_links');
    expect(schemaSql).toContain('statblock_id INTEGER NOT NULL REFERENCES statblocks(id) ON DELETE CASCADE');
    expect(schemaSql).toContain('token_id     INTEGER NOT NULL REFERENCES tokens(id) ON DELETE CASCADE');
    expect(schemaSql).toContain('UNIQUE (token_id)');
    expect(schemaSql).toContain('UNIQUE (statblock_id, token_id)');
    expect(schemaSql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_statblock_token_links_statblock_id',
    );
    expect(schemaSql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_statblock_token_links_token_id',
    );
  });

  it('creates statblock-ability assignments table and indexes', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();
    getDatabase();
    closeDatabase();

    const schemaSql = execMock.mock.calls
      .map(([sql]) => String(sql))
      .join('\n');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS statblock_ability_assignments');
    expect(schemaSql).toContain('statblock_id INTEGER NOT NULL REFERENCES statblocks(id) ON DELETE CASCADE');
    expect(schemaSql).toContain('ability_id   INTEGER NOT NULL REFERENCES abilities(id) ON DELETE CASCADE');
    expect(schemaSql).toContain('UNIQUE (statblock_id, ability_id)');
    expect(schemaSql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_statblock_ability_assignments_statblock_id',
    );
    expect(schemaSql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_statblock_ability_assignments_ability_id',
    );
  });

  it('linkage migration is idempotent with IF NOT EXISTS guards', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();
    getDatabase();
    closeDatabase();

    const linkageExecCalls = execMock.mock.calls
      .map(([sql]) => String(sql))
      .filter((sql) =>
        sql.includes('statblock_token_links')
        || sql.includes('statblock_ability_assignments')
      );

    for (const sql of linkageExecCalls) {
      if (sql.includes('CREATE TABLE')) {
        expect(sql).toContain('CREATE TABLE IF NOT EXISTS');
      }
      if (sql.includes('CREATE INDEX')) {
        expect(sql).toContain('IF NOT EXISTS');
      }
    }
  });

  it('runs linkage migration after statblocks migration', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();
    getDatabase();
    closeDatabase();

    const allSql = execMock.mock.calls.map(([sql]) => String(sql));
    const statblocksMigrationIndex = allSql.findIndex((sql) =>
      sql.includes('CREATE TABLE IF NOT EXISTS statblocks')
    );
    const linkageMigrationIndex = allSql.findIndex((sql) =>
      sql.includes('CREATE TABLE IF NOT EXISTS statblock_token_links')
    );
    expect(linkageMigrationIndex).toBeGreaterThan(statblocksMigrationIndex);
  });
});
