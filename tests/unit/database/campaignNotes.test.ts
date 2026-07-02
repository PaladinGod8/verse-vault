import { describe, expect, it, vi } from 'vitest';

async function loadDbModule() {
  const appGetPathMock = vi.fn(() => 'C:/fake-user-data');
  const pragmaMock = vi.fn(() => []);
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

describe('Campaign Notes schema migration', () => {
  it('creates campaign_notes tables and indexes', async () => {
    const { getDatabase, closeDatabase, execMock } = await loadDbModule();

    getDatabase();
    closeDatabase();

    const sql = execMock.mock.calls.map(([s]) => String(s)).join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS campaign_notes');
    expect(sql).toContain(
      'campaign_id          INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE',
    );
    expect(sql).toContain('canvas_scene         TEXT');
    expect(sql).toContain('canvas_preview_image TEXT');
    expect(sql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_campaign_notes_campaign_id',
    );
    expect(sql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_campaign_notes_campaign_id_name',
    );
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS campaign_note_tags');
    expect(sql).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_note_tags_unique',
    );
    expect(sql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_campaign_note_tags_campaign_tag',
    );
  });
});
