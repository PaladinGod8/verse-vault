import { describe, expect, it, vi } from 'vitest';

async function loadDbModule(options?: {
  itemsTableInfoRows?: Array<{ name: string; }>;
}) {
  const appGetPathMock = vi.fn(() => 'C:/fake-user-data');
  const itemsTableInfoRows = options?.itemsTableInfoRows ?? [];

  const pragmaMock = vi.fn((command: string) => {
    if (command === 'table_info(characters)') {
      return [
        { name: 'id' },
        { name: 'created_at' },
        { name: 'updated_at' },
      ];
    }
    if (command === 'table_info(backgrounds)') {
      return [{ name: 'id' }, { name: 'last_viewed_at' }];
    }
    if (command === 'table_info(items)') {
      return itemsTableInfoRows;
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

describe('Items schema migration', () => {
  it('creates items table with expected columns and world index', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();

    getDatabase();
    closeDatabase();

    const sql = execMock.mock.calls.map(([s]) => String(s)).join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS items');
    expect(sql).toContain(
      'world_id       INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE',
    );
    expect(sql).toContain('name           TEXT    NOT NULL');
    expect(sql).toContain('description    TEXT');
    expect(sql).toContain('image_src      TEXT');
    expect(sql).toContain('last_viewed_at TEXT');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_items_world_id ON items(world_id)');
  });

  it('adds last_viewed_at to legacy items tables missing it', async () => {
    const { getDatabase, closeDatabase, execMock, pragmaMock } = await loadDbModule({
      itemsTableInfoRows: [
        { name: 'id' },
        { name: 'world_id' },
        { name: 'name' },
        { name: 'description' },
        { name: 'image_src' },
        { name: 'created_at' },
        { name: 'updated_at' },
      ],
    });

    getDatabase();
    closeDatabase();

    expect(pragmaMock).toHaveBeenCalledWith('table_info(items)');
    const sql = execMock.mock.calls.map(([s]) => String(s)).join('\n');
    expect(sql).toContain('ALTER TABLE items ADD COLUMN last_viewed_at TEXT');
  });

  it('is idempotent when legacy items table already has last_viewed_at', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule({
      itemsTableInfoRows: [
        { name: 'id' },
        { name: 'world_id' },
        { name: 'name' },
        { name: 'description' },
        { name: 'image_src' },
        { name: 'last_viewed_at' },
        { name: 'created_at' },
        { name: 'updated_at' },
      ],
    });

    getDatabase();
    closeDatabase();

    const sql = execMock.mock.calls.map(([s]) => String(s)).join('\n');
    expect(sql).not.toContain('ALTER TABLE items ADD COLUMN last_viewed_at TEXT');
  });
});
