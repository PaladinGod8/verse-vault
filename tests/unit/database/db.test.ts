import path from 'path';
import { describe, expect, it, vi } from 'vitest';

async function loadDbModule(options?: {
  tableInfoRows?: Array<{ name: string }>;
  prepareImplementation?: (sql: string) => {
    all?: (...args: unknown[]) => unknown;
    get?: (...args: unknown[]) => unknown;
    run?: (...args: unknown[]) => unknown;
  };
}) {
  const appGetPathMock = vi.fn(() => 'C:/fake-user-data');
  const pragmaMock = vi.fn();
  const execMock = vi.fn();
  const closeMock = vi.fn();
  const databaseCtorMock = vi.fn();
  const transactionMock = vi.fn(
    (callback: (...args: unknown[]) => unknown) =>
      (...args: unknown[]) =>
        callback(...args),
  );
  const tableInfoRows = options?.tableInfoRows ?? [
    { name: 'act_id' },
    { name: 'planned_at' },
  ];

  const prepareMock = options?.prepareImplementation
    ? vi.fn((sql: string) => options.prepareImplementation?.(sql))
    : vi.fn().mockReturnValue({
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
    app: {
      getPath: appGetPathMock,
    },
  }));
  vi.doMock('better-sqlite3', () => ({
    default: FakeDatabase,
  }));

  const dbModule = await import('../../../src/database/db');
  return {
    ...dbModule,
    appGetPathMock,
    pragmaMock,
    execMock,
    closeMock,
    databaseCtorMock,
    prepareMock,
  };
}

describe('database', () => {
  it('creates and caches a database instance with schema setup', async () => {
    const {
      getDatabase,
      closeDatabase,
      databaseCtorMock,
      pragmaMock,
      execMock,
    } = await loadDbModule();

    const first = getDatabase();
    const second = getDatabase();
    closeDatabase();

    expect(first).toBe(second);
    expect(databaseCtorMock).toHaveBeenCalledTimes(1);
    expect(databaseCtorMock).toHaveBeenCalledWith(
      path.join('C:/fake-user-data', 'verse-vault.db'),
    );
    expect(pragmaMock).toHaveBeenCalledWith('journal_mode = WAL');
    expect(execMock).toHaveBeenCalledTimes(3);

    const schemaSql = execMock.mock.calls
      .map(([sql]) => String(sql))
      .join('\n');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS verses');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS worlds');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS levels');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS campaigns');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS arcs');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS acts');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS sessions');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS scenes');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS abilities');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS ability_children');
    expect(schemaSql).toContain('planned_at TEXT');
    expect(schemaSql).toContain('name TEXT NOT NULL');
    expect(schemaSql).toContain('thumbnail TEXT');
    expect(schemaSql).toContain('short_description TEXT');
    expect(schemaSql).toContain('last_viewed_at TEXT');
    expect(schemaSql).toContain("updated_at TEXT DEFAULT (datetime('now'))");
    expect(schemaSql).toContain("type IN ('active', 'passive')");
    expect(schemaSql).toContain(
      "passive_subtype IS NULL OR passive_subtype IN ('linchpin', 'keystone', 'rostering')",
    );
    expect(schemaSql).toContain(
      "effects           TEXT    NOT NULL DEFAULT '[]'",
    );
    expect(schemaSql).toContain(
      "conditions        TEXT    NOT NULL DEFAULT '[]'",
    );
    expect(schemaSql).toContain(
      "cast_cost         TEXT    NOT NULL DEFAULT '{}'",
    );
    expect(schemaSql).toContain("pick_timing IN ('obtain', 'rest')");
    expect(schemaSql).toContain(
      'parent_id INTEGER NOT NULL REFERENCES abilities(id) ON DELETE CASCADE',
    );
    expect(schemaSql).toContain(
      'child_id  INTEGER NOT NULL REFERENCES abilities(id) ON DELETE CASCADE',
    );
    expect(schemaSql).toContain('UNIQUE (parent_id, child_id)');
    expect(schemaSql).toContain(
      'campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE',
    );
    expect(schemaSql).toContain(
      'session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE',
    );
    expect(schemaSql).toContain("config     TEXT    NOT NULL DEFAULT '{}'");
    expect(schemaSql).toContain('sort_order  INTEGER NOT NULL DEFAULT 0');
    expect(schemaSql).toContain("payload    TEXT    NOT NULL DEFAULT '{}'");
  });

  it('adds planned_at to sessions for existing databases missing the column', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule({
      tableInfoRows: [{ name: 'act_id' }],
    });

    getDatabase();
    closeDatabase();

    expect(execMock).toHaveBeenCalledTimes(4);
    expect(
      execMock.mock.calls.some(
        ([sql]) =>
          typeof sql === 'string' &&
          sql.includes('ALTER TABLE sessions ADD COLUMN planned_at TEXT'),
      ),
    ).toBe(true);
  });

  it('migrates legacy sessions schema from campaign_id to act_id', async () => {
    const arcInsertRunMock = vi.fn(() => ({ lastInsertRowid: 11 }));
    const actInsertRunMock = vi.fn(() => ({ lastInsertRowid: 21 }));
    const insertNewSessionRunMock = vi.fn();
    const campaignsSelectAllMock = vi.fn(() => [{ id: 1 }]);
    const legacySessionsSelectAllMock = vi.fn(() => [
      {
        id: 5,
        campaign_id: 1,
        name: 'Legacy Session',
        notes: 'Legacy notes',
        sort_order: 0,
        created_at: '2026-01-01 00:00:00',
        updated_at: '2026-01-02 00:00:00',
      },
    ]);

    let tableInfoCallCount = 0;
    const { getDatabase, closeDatabase, execMock } = await loadDbModule({
      prepareImplementation: (sql) => {
        if (sql === 'PRAGMA table_info(sessions)') {
          return {
            all: () => {
              tableInfoCallCount += 1;
              return tableInfoCallCount === 1
                ? [{ name: 'campaign_id' }]
                : [{ name: 'act_id' }, { name: 'planned_at' }];
            },
          };
        }
        if (sql === 'SELECT id FROM campaigns') {
          return { all: campaignsSelectAllMock };
        }
        if (
          sql ===
          "INSERT INTO arcs (campaign_id, name, sort_order) VALUES (?, 'Arc 1', 0)"
        ) {
          return { run: arcInsertRunMock };
        }
        if (
          sql ===
          "INSERT INTO acts (arc_id, name, sort_order) VALUES (?, 'Act 1', 0)"
        ) {
          return { run: actInsertRunMock };
        }
        if (sql === 'SELECT * FROM sessions') {
          return { all: legacySessionsSelectAllMock };
        }
        if (
          sql ===
          'INSERT INTO sessions_new (id, act_id, name, notes, planned_at, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ) {
          return { run: insertNewSessionRunMock };
        }

        throw new Error(`Unexpected SQL in migration test: ${sql}`);
      },
    });

    getDatabase();
    closeDatabase();

    expect(campaignsSelectAllMock).toHaveBeenCalledTimes(1);
    expect(legacySessionsSelectAllMock).toHaveBeenCalledTimes(1);
    expect(arcInsertRunMock).toHaveBeenCalledWith(1);
    expect(actInsertRunMock).toHaveBeenCalledWith(11);
    expect(insertNewSessionRunMock).toHaveBeenCalledWith(
      5,
      21,
      'Legacy Session',
      'Legacy notes',
      null,
      0,
      '2026-01-01 00:00:00',
      '2026-01-02 00:00:00',
    );

    const execSql = execMock.mock.calls.map(([sql]) => String(sql)).join('\n');
    expect(execSql).toContain('CREATE TABLE sessions_new');
    expect(execSql).toContain('ALTER TABLE sessions_new RENAME TO sessions');
    expect(execSql).not.toContain(
      'ALTER TABLE sessions ADD COLUMN planned_at TEXT',
    );
  });

  it('closes and resets the singleton', async () => {
    const { getDatabase, closeDatabase, closeMock, databaseCtorMock } =
      await loadDbModule();

    getDatabase();
    closeDatabase();
    closeDatabase();
    getDatabase();

    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(databaseCtorMock).toHaveBeenCalledTimes(2);
  });
});
