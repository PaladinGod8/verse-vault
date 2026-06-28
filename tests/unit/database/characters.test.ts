import { describe, expect, it, vi } from 'vitest';

async function loadDbModule(options?: {
  charactersTableInfoRows?: Array<{ name: string; }>;
}) {
  const appGetPathMock = vi.fn(() => 'C:/fake-user-data');
  const charactersTableInfoRows = options?.charactersTableInfoRows ?? [
    { name: 'id' },
    { name: 'created_at' },
    { name: 'updated_at' },
  ];

  const pragmaMock = vi.fn((command: string) => {
    if (command === 'table_info(characters)') {
      return charactersTableInfoRows;
    }
    if (command === 'table_info(worlds)') {
      return [{ name: 'id' }, { name: 'name' }, { name: 'config' }];
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
    pragmaMock,
  };
}

describe('Characters schema migration', () => {
  it('adds character columns when missing', async () => {
    const { getDatabase, closeDatabase, execMock, pragmaMock } = await loadDbModule();

    getDatabase();
    closeDatabase();

    expect(pragmaMock).toHaveBeenCalledWith('table_info(characters)');
    const executedSql = execMock.mock.calls.map(([sql]) => String(sql)).join('\n');

    expect(executedSql).toContain(
      'ALTER TABLE characters ADD COLUMN world_id INTEGER REFERENCES worlds(id) ON DELETE CASCADE',
    );
    expect(executedSql).toContain(
      "ALTER TABLE characters ADD COLUMN name TEXT NOT NULL DEFAULT ''",
    );
    expect(executedSql).toContain('ALTER TABLE characters ADD COLUMN profile TEXT');
    expect(executedSql).toContain(
      'ALTER TABLE characters ADD COLUMN is_player_character INTEGER NOT NULL DEFAULT 0 CHECK (is_player_character IN (0, 1))',
    );
    expect(executedSql).toContain('ALTER TABLE characters ADD COLUMN owner TEXT');
    expect(executedSql).toContain('ALTER TABLE characters ADD COLUMN author TEXT');
    expect(executedSql).toContain('ALTER TABLE characters ADD COLUMN image_src TEXT');
    expect(executedSql).toContain(
      "ALTER TABLE characters ADD COLUMN sections TEXT NOT NULL DEFAULT '{}'",
    );
    expect(executedSql).toContain(
      "ALTER TABLE characters ADD COLUMN wiki_summary TEXT NOT NULL DEFAULT '{}'",
    );
    expect(executedSql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_characters_world_id ON characters(world_id)',
    );
  });

  it('is idempotent and does not re-add columns when they already exist', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule({
      charactersTableInfoRows: [
        { name: 'id' },
        { name: 'created_at' },
        { name: 'updated_at' },
        { name: 'world_id' },
        { name: 'name' },
        { name: 'profile' },
        { name: 'is_player_character' },
        { name: 'owner' },
        { name: 'author' },
        { name: 'image_src' },
        { name: 'sections' },
        { name: 'wiki_summary' },
      ],
    });

    getDatabase();
    closeDatabase();

    const executedSql = execMock.mock.calls.map(([sql]) => String(sql)).join('\n');
    expect(executedSql).not.toContain('ALTER TABLE characters ADD COLUMN');
  });

  it('creates a covering index on (world_id, name) for prefix search', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();

    getDatabase();
    closeDatabase();

    const executedSql = execMock.mock.calls.map(([sql]) => String(sql)).join('\n');
    expect(executedSql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_characters_world_id_name ON characters(world_id, name COLLATE NOCASE)',
    );
  });
});
