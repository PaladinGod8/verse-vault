import { describe, expect, it, vi } from 'vitest';

// Mirrors the FakeDatabase harness in world-config.test.ts: better-sqlite3 is
// built against Electron's ABI and cannot load under the Node/vitest runner, so
// the db module is exercised against an in-memory fake that records exec/pragma
// calls and their invocation order.
async function loadDbModule() {
  const appGetPathMock = vi.fn(() => 'C:/fake-user-data');

  const pragmaMock = vi.fn((command: string) => {
    if (command === 'table_info(tokens)') {
      return [
        { name: 'world_id' },
        { name: 'campaign_id', notnull: 0 },
        { name: 'grid_type' },
      ];
    }
    if (command === 'table_info(worlds)') {
      return [{ name: 'id' }, { name: 'name' }, { name: 'config' }];
    }
    if (command === 'table_info(factions)') {
      return [{ name: 'id' }, { name: 'last_viewed_at' }];
    }
    return [];
  });

  const execMock = vi.fn();
  const closeMock = vi.fn();
  const transactionMock = vi.fn(
    (callback: (...args: unknown[]) => unknown) => (...args: unknown[]) => callback(...args),
  );
  const prepareMock = vi.fn((sql: string) => {
    if (sql === 'PRAGMA table_info(sessions)') {
      return { all: () => [{ name: 'act_id' }, { name: 'planned_at' }] };
    }
    return { all: vi.fn(() => []), get: vi.fn(() => undefined), run: vi.fn() };
  });

  class FakeDatabase {
    pragma = pragmaMock;
    exec = execMock;
    close = closeMock;
    prepare = prepareMock;
    transaction = transactionMock;

    constructor(dbPath: string) {
      void dbPath;
    }
  }

  vi.resetModules();
  vi.doMock('electron', () => ({ app: { getPath: appGetPathMock } }));
  vi.doMock('better-sqlite3', () => ({ default: FakeDatabase }));

  const dbModule = await import('../../../src/database/db');
  return { ...dbModule, execMock, pragmaMock };
}

describe('foreign key enforcement', () => {
  it('enables PRAGMA foreign_keys so ON DELETE CASCADE fires at runtime', async () => {
    const { getDatabase, closeDatabase, pragmaMock } = await loadDbModule();

    getDatabase();
    closeDatabase();

    const enabledForeignKeys = pragmaMock.mock.calls.some(
      ([command]) => command === 'foreign_keys = ON',
    );
    expect(enabledForeignKeys).toBe(true);
  });

  it('enables foreign keys only after schema creation and migrations run', async () => {
    // Enabling foreign keys before the legacy table-rebuild migrations would
    // make `DROP TABLE` fire cascading deletes on child rows. It must be the
    // last step of connection setup.
    const { getDatabase, closeDatabase, execMock, pragmaMock } = await loadDbModule();

    getDatabase();
    closeDatabase();

    const foreignKeyCallIndex = pragmaMock.mock.calls.findIndex(
      ([command]) => command === 'foreign_keys = ON',
    );
    expect(foreignKeyCallIndex).toBeGreaterThanOrEqual(0);

    const foreignKeyOrder = pragmaMock.mock.invocationCallOrder[foreignKeyCallIndex];
    const lastSchemaOrder = Math.max(...execMock.mock.invocationCallOrder);

    expect(execMock.mock.invocationCallOrder.length).toBeGreaterThan(0);
    expect(foreignKeyOrder).toBeGreaterThan(lastSchemaOrder);
  });
});
