import path from 'path';
import { describe, expect, it, vi } from 'vitest';

async function loadDbModule() {
  const appGetPathMock = vi.fn(() => 'C:/fake-user-data');
  const pragmaMock = vi.fn();
  const execMock = vi.fn();
  const closeMock = vi.fn();
  const databaseCtorMock = vi.fn();

  class FakeDatabase {
    pragma = pragmaMock;
    exec = execMock;
    close = closeMock;

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
    expect(execMock).toHaveBeenCalledTimes(1);
    expect(execMock.mock.calls[0][0]).toContain(
      'CREATE TABLE IF NOT EXISTS verses',
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
