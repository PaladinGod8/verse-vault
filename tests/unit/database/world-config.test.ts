import { describe, expect, it, vi } from 'vitest';

async function loadDbModule(options?: {
  worldsTableInfoRows?: Array<{ name: string }>;
  tokenTableInfoRows?: Array<{ name: string; notnull?: number }>;
  sessionTableInfoRows?: Array<{ name: string }>;
}) {
  const appGetPathMock = vi.fn(() => 'C:/fake-user-data');
  const worldsTableInfoRows = options?.worldsTableInfoRows ?? [
    { name: 'id' },
    { name: 'name' },
    { name: 'config' },
  ];
  const tokenTableInfoRows = options?.tokenTableInfoRows ?? [
    { name: 'world_id' },
    { name: 'campaign_id', notnull: 0 },
    { name: 'grid_type' },
  ];

  const pragmaMock = vi.fn((command: string) => {
    if (command === 'table_info(tokens)') {
      return tokenTableInfoRows;
    }
    if (command === 'table_info(worlds)') {
      return worldsTableInfoRows;
    }
    return undefined;
  });

  const execMock = vi.fn();
  const closeMock = vi.fn();
  const databaseCtorMock = vi.fn();
  const transactionMock = vi.fn(
    (callback: (...args: unknown[]) => unknown) =>
      (...args: unknown[]) =>
        callback(...args),
  );

  const sessionTableInfoRows = options?.sessionTableInfoRows ?? [
    { name: 'act_id' },
    { name: 'planned_at' },
  ];
  const prepareMock = vi.fn((sql: string) => {
    if (sql === 'PRAGMA table_info(sessions)') {
      return {
        all: () => sessionTableInfoRows,
      };
    }
    return {
      all: vi.fn(() => []),
      get: vi.fn(() => undefined),
      run: vi.fn(),
    };
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
    pragmaMock,
  };
}

describe('World Config Migration', () => {
  it('adds config column definition to worlds table schema SQL', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();

    getDatabase();
    closeDatabase();

    const schemaSql = execMock.mock.calls
      .map(([sql]) => String(sql))
      .join('\n');

    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS worlds');
    expect(schemaSql).toContain("config TEXT NOT NULL DEFAULT '{}'");
  });

  it('runs additive migration when existing worlds table lacks config', async () => {
    const { getDatabase, closeDatabase, execMock, pragmaMock } =
      await loadDbModule({
        worldsTableInfoRows: [{ name: 'id' }, { name: 'name' }],
      });

    getDatabase();
    closeDatabase();

    expect(pragmaMock).toHaveBeenCalledWith('table_info(worlds)');
    expect(
      execMock.mock.calls.some(
        ([sql]) =>
          typeof sql === 'string' &&
          sql.includes(
            "ALTER TABLE worlds ADD COLUMN config TEXT NOT NULL DEFAULT '{}'",
          ),
      ),
    ).toBe(true);
  });

  it('is idempotent and does not alter worlds when config already exists', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule({
      worldsTableInfoRows: [
        { name: 'id' },
        { name: 'name' },
        { name: 'config' },
      ],
    });

    getDatabase();
    closeDatabase();

    expect(
      execMock.mock.calls.some(
        ([sql]) =>
          typeof sql === 'string' &&
          sql.includes('ALTER TABLE worlds ADD COLUMN config'),
      ),
    ).toBe(false);
  });

  it('uses additive ALTER TABLE approach that preserves existing rows', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule({
      worldsTableInfoRows: [{ name: 'id' }, { name: 'name' }],
    });

    getDatabase();
    closeDatabase();

    const executedSql = execMock.mock.calls
      .map(([sql]) => String(sql))
      .join('\n');
    expect(executedSql).toContain(
      "ALTER TABLE worlds ADD COLUMN config TEXT NOT NULL DEFAULT '{}'",
    );
    expect(executedSql).not.toContain('DROP TABLE worlds');
    expect(executedSql).not.toContain('ALTER TABLE worlds RENAME TO');
  });
});
