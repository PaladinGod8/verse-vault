import { describe, expect, it, vi } from 'vitest';

async function loadDbModule(options?: {
  loreNotesTableInfoRows?: Array<{ name: string; }>;
}) {
  const appGetPathMock = vi.fn(() => 'C:/fake-user-data');
  const loreNotesTableInfoRows = options?.loreNotesTableInfoRows ?? [];

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
      return [{ name: 'id' }, { name: 'last_viewed_at' }];
    }
    if (command === 'table_info(lore_notes)') {
      return loreNotesTableInfoRows;
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

describe('Lore Notes schema migration', () => {
  it('creates lore_notes table with expected columns and world index', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();

    getDatabase();
    closeDatabase();

    const sql = execMock.mock.calls.map(([s]) => String(s)).join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS lore_notes');
    expect(sql).toContain(
      'world_id       INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE',
    );
    expect(sql).toContain('name           TEXT    NOT NULL');
    expect(sql).toContain('content        TEXT');
    expect(sql).toContain('image_src      TEXT');
    expect(sql).toContain('last_viewed_at TEXT');
    expect(sql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_lore_notes_world_id ON lore_notes(world_id)',
    );
  });

  it('creates lore_note_tags table with unique per-note tag index and world/tag index', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();

    getDatabase();
    closeDatabase();

    const sql = execMock.mock.calls.map(([s]) => String(s)).join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS lore_note_tags');
    expect(sql).toContain(
      'lore_note_id INTEGER NOT NULL REFERENCES lore_notes(id) ON DELETE CASCADE',
    );
    expect(sql).toContain('tag_name     TEXT    NOT NULL');
    expect(sql).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_lore_note_tags_unique',
    );
    expect(sql).toContain('ON lore_note_tags(lore_note_id, tag_name COLLATE NOCASE)');
    expect(sql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_lore_note_tags_world_tag',
    );
    expect(sql).toContain('ON lore_note_tags(world_id, tag_name COLLATE NOCASE)');
  });

  it('adds last_viewed_at to legacy lore_notes tables missing it', async () => {
    const { getDatabase, closeDatabase, execMock, pragmaMock } = await loadDbModule({
      loreNotesTableInfoRows: [
        { name: 'id' },
        { name: 'world_id' },
        { name: 'name' },
        { name: 'content' },
        { name: 'image_src' },
        { name: 'created_at' },
        { name: 'updated_at' },
      ],
    });

    getDatabase();
    closeDatabase();

    expect(pragmaMock).toHaveBeenCalledWith('table_info(lore_notes)');
    const sql = execMock.mock.calls.map(([s]) => String(s)).join('\n');
    expect(sql).toContain('ALTER TABLE lore_notes ADD COLUMN last_viewed_at TEXT');
  });

  it('is idempotent when legacy lore_notes table already has last_viewed_at', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule({
      loreNotesTableInfoRows: [
        { name: 'id' },
        { name: 'world_id' },
        { name: 'name' },
        { name: 'content' },
        { name: 'image_src' },
        { name: 'last_viewed_at' },
        { name: 'created_at' },
        { name: 'updated_at' },
      ],
    });

    getDatabase();
    closeDatabase();

    const sql = execMock.mock.calls.map(([s]) => String(s)).join('\n');
    expect(sql).not.toContain('ALTER TABLE lore_notes ADD COLUMN last_viewed_at TEXT');
  });
});
