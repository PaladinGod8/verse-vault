import path from 'path';
import { describe, expect, it, vi } from 'vitest';

async function loadDbModule(options?: {
  tableInfoRows?: Array<{ name: string; }>;
  tokenTableInfoRows?: Array<{ name: string; }>;
  prepareImplementation?: (sql: string) => {
    all?: (...args: unknown[]) => unknown;
    get?: (...args: unknown[]) => unknown;
    run?: (...args: unknown[]) => unknown;
  };
}) {
  const appGetPathMock = vi.fn(() => 'C:/fake-user-data');
  const tokenTableInfoRows = options?.tokenTableInfoRows ?? [
    { name: 'world_id' },
    { name: 'campaign_id' },
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
    const schemaSql = execMock.mock.calls
      .map(([sql]) => String(sql))
      .join('\n');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS verses');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS worlds');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS levels');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS campaigns');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS campaign_notes');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS campaign_note_tags');
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS battlemaps');
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
    expect(schemaSql).toContain('canvas_enabled INTEGER NOT NULL DEFAULT 0');
    expect(schemaSql).toContain('canvas_scene   TEXT');
    expect(schemaSql).toContain('canvas_preview_image TEXT');
    expect(schemaSql).toContain(
      'act_id      INTEGER REFERENCES acts(id) ON DELETE CASCADE',
    );
    expect(schemaSql).toContain(
      'session_id  INTEGER REFERENCES sessions(id) ON DELETE CASCADE',
    );
    expect(schemaSql).toContain("config     TEXT    NOT NULL DEFAULT '{}'");
    expect(schemaSql).toContain('sort_order  INTEGER NOT NULL DEFAULT 0');
    expect(schemaSql).toContain("payload     TEXT    NOT NULL DEFAULT '{}'");
    expect(schemaSql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_tokens_world_id ON tokens(world_id)',
    );
  });

  it('adds planned_at to sessions for existing databases missing the column', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule({
      tableInfoRows: [{ name: 'act_id' }],
    });

    getDatabase();
    closeDatabase();

    expect(
      execMock.mock.calls.some(
        ([sql]) =>
          typeof sql === 'string'
          && sql.includes('ALTER TABLE sessions ADD COLUMN planned_at TEXT'),
      ),
    ).toBe(true);
  });

  it('migrates legacy sessions schema from campaign_id to act_id', async () => {
    const arcInsertRunMock = vi.fn(() => ({ lastInsertRowid: 11 }));
    const actInsertRunMock = vi.fn(() => ({ lastInsertRowid: 21 }));
    const insertNewSessionRunMock = vi.fn();
    const offlineMediaUpdateRunMock = vi.fn();
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
          sql
            === "INSERT INTO arcs (campaign_id, name, sort_order) VALUES (?, 'Arc 1', 0)"
        ) {
          return { run: arcInsertRunMock };
        }
        if (
          sql
            === "INSERT INTO acts (arc_id, name, sort_order) VALUES (?, 'Act 1', 0)"
        ) {
          return { run: actInsertRunMock };
        }
        if (sql === 'SELECT * FROM sessions') {
          return { all: legacySessionsSelectAllMock };
        }
        if (sql === 'PRAGMA table_info(scenes)') {
          return {
            all: () => [{ name: 'campaign_id' }, { name: 'act_id' }, { name: 'session_id' }],
          };
        }
        if (/^SELECT id, \w+ AS image_src FROM \w+$/.test(sql)) {
          return { all: () => [] };
        }
        if (/^UPDATE \w+ SET \w+ = \? WHERE id = \?$/.test(sql)) {
          return { run: offlineMediaUpdateRunMock };
        }
        if (
          sql
            === 'INSERT INTO sessions_new (id, act_id, name, notes, planned_at, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
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
    expect(offlineMediaUpdateRunMock).not.toHaveBeenCalled();
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

  it('migrates scenes to add campaign_id/act_id anchors, backfilling from their session', async () => {
    const insertNewSceneRunMock = vi.fn();
    const legacyScenesSelectAllMock = vi.fn(() => [
      {
        id: 7,
        session_id: 3,
        name: 'Legacy Scene',
        notes: 'Legacy scene notes',
        payload: '{}',
        sort_order: 0,
        created_at: '2026-01-01 00:00:00',
        updated_at: '2026-01-02 00:00:00',
      },
    ]);
    const sessionAnchorsSelectAllMock = vi.fn(() => [
      { session_id: 3, act_id: 21, campaign_id: 1 },
    ]);

    const { getDatabase, closeDatabase, execMock } = await loadDbModule({
      prepareImplementation: (sql) => {
        if (sql === 'PRAGMA table_info(sessions)') {
          return { all: () => [{ name: 'act_id' }, { name: 'planned_at' }] };
        }
        if (sql === 'PRAGMA table_info(scenes)') {
          return { all: () => [{ name: 'session_id' }] };
        }
        if (
          sql.startsWith('SELECT sessions.id AS session_id, sessions.act_id AS act_id')
        ) {
          return { all: sessionAnchorsSelectAllMock };
        }
        if (sql === 'SELECT * FROM scenes') {
          return { all: legacyScenesSelectAllMock };
        }
        if (
          sql
            === 'INSERT INTO scenes_new (id, campaign_id, act_id, session_id, name, notes, payload, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ) {
          return { run: insertNewSceneRunMock };
        }
        if (/^SELECT id, \w+ AS image_src FROM \w+$/.test(sql)) {
          return { all: () => [] };
        }
        if (/^UPDATE \w+ SET \w+ = \? WHERE id = \?$/.test(sql)) {
          return { run: vi.fn() };
        }

        throw new Error(`Unexpected SQL in migration test: ${sql}`);
      },
    });

    getDatabase();
    closeDatabase();

    expect(sessionAnchorsSelectAllMock).toHaveBeenCalledTimes(1);
    expect(legacyScenesSelectAllMock).toHaveBeenCalledTimes(1);
    expect(insertNewSceneRunMock).toHaveBeenCalledWith(
      7,
      1,
      21,
      3,
      'Legacy Scene',
      'Legacy scene notes',
      '{}',
      0,
      '2026-01-01 00:00:00',
      '2026-01-02 00:00:00',
    );

    const execSql = execMock.mock.calls.map(([sql]) => String(sql)).join('\n');
    expect(execSql).toContain('CREATE TABLE scenes_new');
    expect(execSql).toContain('ALTER TABLE scenes_new RENAME TO scenes');
  });

  it('skips scene anchor migration when scenes already have campaign_id', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule({
      prepareImplementation: (sql) => {
        if (sql === 'PRAGMA table_info(sessions)') {
          return { all: () => [{ name: 'act_id' }, { name: 'planned_at' }] };
        }
        if (sql === 'PRAGMA table_info(scenes)') {
          return {
            all: () => [{ name: 'campaign_id' }, { name: 'act_id' }, { name: 'session_id' }],
          };
        }
        if (/^SELECT id, \w+ AS image_src FROM \w+$/.test(sql)) {
          return { all: () => [] };
        }
        if (/^UPDATE \w+ SET \w+ = \? WHERE id = \?$/.test(sql)) {
          return { run: vi.fn() };
        }

        throw new Error(`Unexpected SQL in migration test: ${sql}`);
      },
    });

    getDatabase();
    closeDatabase();

    const execSql = execMock.mock.calls.map(([sql]) => String(sql)).join('\n');
    expect(execSql).not.toContain('CREATE TABLE scenes_new');
  });

  it('closes and resets the singleton', async () => {
    const { getDatabase, closeDatabase, closeMock, databaseCtorMock } = await loadDbModule();

    getDatabase();
    closeDatabase();
    closeDatabase();
    getDatabase();

    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(databaseCtorMock).toHaveBeenCalledTimes(2);
  });

  it('normalizes token footprint config JSON for square and hex cells', async () => {
    const { ensureTokenConfigJsonText } = await loadDbModule();

    const normalized = JSON.parse(
      ensureTokenConfigJsonText(
        JSON.stringify({
          footprint: {
            version: 1,
            grid_type: 'square',
            square_cells: [
              { col: 2, row: 1 },
              { col: 0, row: 0 },
              { col: 2, row: 1 },
            ],
            width_cells: 3,
            height_cells: 2,
          },
          framing: {
            extent_x_cells: 1.5,
            extent_y_cells: 1,
            max_extent_cells: 1.5,
          },
        }),
      ),
    ) as TokenConfigShape;

    expect(normalized.footprint?.square_cells).toEqual([
      { col: 0, row: 0 },
      { col: 2, row: 1 },
    ]);
    expect(normalized.footprint?.width_cells).toBe(3);
    expect(normalized.footprint?.height_cells).toBe(2);

    const normalizedHex = JSON.parse(
      ensureTokenConfigJsonText(
        JSON.stringify({
          footprint: {
            version: 1,
            grid_type: 'hex',
            hex_cells: [
              { q: 1, r: 0 },
              { q: 0, r: 0 },
              { q: 1, r: 0 },
            ],
            radius_cells: 1,
          },
        }),
      ),
    ) as TokenConfigShape;

    expect(normalizedHex.footprint?.hex_cells).toEqual([
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ]);
    expect(normalizedHex.footprint?.radius_cells).toBe(1);
  });

  it('rejects invalid token footprint config shapes and values', async () => {
    const { ensureTokenConfigJsonText } = await loadDbModule();

    expect(() =>
      ensureTokenConfigJsonText(
        JSON.stringify({
          footprint: {
            version: 2,
          },
        }),
      )
    ).toThrowError('Token config footprint.version must be 1');

    expect(() =>
      ensureTokenConfigJsonText(
        JSON.stringify({
          footprint: {
            grid_type: 'triangle',
          },
        }),
      )
    ).toThrowError(
      "Token config footprint.grid_type must be 'square' or 'hex'",
    );

    expect(() =>
      ensureTokenConfigJsonText(
        JSON.stringify({
          footprint: {
            square_cells: [{ col: 0.5, row: 1 }],
          },
        }),
      )
    ).toThrowError(
      'Token config footprint.square_cells[0].col must be an integer',
    );

    expect(() =>
      ensureTokenConfigJsonText(
        JSON.stringify({
          footprint: {
            radius_cells: 0,
          },
        }),
      )
    ).toThrowError(
      'Token config footprint.radius_cells must be greater than 0',
    );
  });
});
