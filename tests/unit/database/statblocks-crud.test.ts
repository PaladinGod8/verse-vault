import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IPC } from '../../../src/shared/ipcChannels';

type EventHandler = (...args: unknown[]) => unknown;
type IpcHandler = (...args: unknown[]) => unknown;

const registeredEvents: Record<string, EventHandler> = {};
const registeredIpcHandlers: Record<string, IpcHandler> = {};

const appOnMock = vi.fn((event: string, handler: EventHandler) => {
  registeredEvents[event] = handler;
});
const appQuitMock = vi.fn();
const appGetPathMock = vi.fn(() => 'C:\\mock-user-data');
const protocolHandleMock = vi.fn();
const netFetchMock = vi.fn();
const ipcHandleMock = vi.fn((channel: string, handler: IpcHandler) => {
  registeredIpcHandlers[channel] = handler;
});
const loadURLMock = vi.fn();
const loadFileMock = vi.fn();
const openDevToolsMock = vi.fn();
const getAllWindowsMock = vi.fn(() => []);
const browserWindowCtorMock = vi.fn();

class BrowserWindowMock {
  loadURL = loadURLMock;
  loadFile = loadFileMock;
  webContents = {
    openDevTools: openDevToolsMock,
  };

  constructor(options: Record<string, unknown>) {
    browserWindowCtorMock(options);
  }

  static getAllWindows = getAllWindowsMock;
}

const prepareMock = vi.fn();
const transactionMock = vi.fn(
  (callback: (...args: unknown[]) => unknown) =>
    (...args: unknown[]) =>
      callback(...args),
);
const getDatabaseMock = vi.fn(() => ({
  prepare: prepareMock,
  transaction: transactionMock,
}));
const closeDatabaseMock = vi.fn();
const randomUUIDMock = vi.fn(() => 'mock-uuid');
const mkdirMock = vi.fn(async () => undefined);
const writeFileMock = vi.fn(async () => undefined);
const pathToFileURLMock = vi.fn((value: string) => ({
  toString: () => `file:///${value.replaceAll('\\', '/')}`,
}));

function setForgeGlobals(devServerUrl: string | undefined) {
  Object.defineProperty(globalThis, 'MAIN_WINDOW_VITE_DEV_SERVER_URL', {
    value: devServerUrl,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'MAIN_WINDOW_VITE_NAME', {
    value: 'main_window',
    configurable: true,
    writable: true,
  });
}

async function importMainWithMocks() {
  vi.resetModules();
  vi.clearAllMocks();

  for (const key of Object.keys(registeredEvents)) delete registeredEvents[key];
  for (const key of Object.keys(registeredIpcHandlers))
    delete registeredIpcHandlers[key];

  vi.doMock('electron-squirrel-startup', () => false);
  vi.doMock('electron', () => ({
    app: {
      on: appOnMock,
      quit: appQuitMock,
      getPath: appGetPathMock,
    },
    BrowserWindow: BrowserWindowMock,
    ipcMain: {
      handle: ipcHandleMock,
    },
    protocol: {
      handle: protocolHandleMock,
    },
    net: {
      fetch: netFetchMock,
    },
  }));
  vi.doMock('node:crypto', () => ({
    __esModule: true,
    randomUUID: randomUUIDMock,
    default: { randomUUID: randomUUIDMock },
  }));
  vi.doMock('node:fs/promises', () => ({
    __esModule: true,
    mkdir: mkdirMock,
    writeFile: writeFileMock,
    default: { mkdir: mkdirMock, writeFile: writeFileMock },
  }));
  vi.doMock('node:url', () => ({
    __esModule: true,
    pathToFileURL: pathToFileURLMock,
    default: { pathToFileURL: pathToFileURLMock },
  }));
  vi.doMock('../../../src/database/db', () => ({
    getDatabase: getDatabaseMock,
    closeDatabase: closeDatabaseMock,
  }));

  setForgeGlobals(undefined);

  await import('../../../src/main');

  // Trigger the 'ready' event to register IPC handlers
  const readyHandler = registeredEvents['ready'];
  if (readyHandler) {
    await readyHandler();
  }
}

const baseStatBlock = {
  id: 10,
  world_id: 1,
  campaign_id: null,
  character_id: null,
  name: 'Goblin Warrior',
  description: null,
  default_token_id: null,
  config: '{}',
  created_at: '2026-01-01 00:00:00',
  updated_at: '2026-01-01 00:00:00',
};

describe('StatBlocks CRUD handlers', () => {
  beforeEach(async () => {
    prepareMock.mockReset();
    await importMainWithMocks();
  });

  describe('getAllByWorld', () => {
    it('returns all statblocks for a world ordered by updated_at desc', () => {
      const allMock = vi.fn(() => [baseStatBlock]);
      prepareMock.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM statblocks WHERE world_id = ?')) {
          return { all: allMock };
        }
        return { all: vi.fn(() => []), run: vi.fn(), get: vi.fn() };
      });

      const result = registeredIpcHandlers[IPC.STATBLOCKS_GET_ALL_BY_WORLD](
        {},
        1,
      );

      expect(allMock).toHaveBeenCalledWith(1);
      expect(result).toEqual([baseStatBlock]);
    });

    it('returns empty array when no statblocks exist for world', () => {
      const allMock = vi.fn(() => []);
      prepareMock.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM statblocks WHERE world_id = ?')) {
          return { all: allMock };
        }
        return { all: vi.fn(() => []), run: vi.fn(), get: vi.fn() };
      });

      const result = registeredIpcHandlers[IPC.STATBLOCKS_GET_ALL_BY_WORLD](
        {},
        99,
      );

      expect(result).toEqual([]);
    });
  });

  describe('getAllByCampaign', () => {
    it('returns all statblocks for a campaign ordered by updated_at desc', () => {
      const campaignSB = { ...baseStatBlock, campaign_id: 5 };
      const allMock = vi.fn(() => [campaignSB]);
      prepareMock.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM statblocks WHERE campaign_id = ?')) {
          return { all: allMock };
        }
        return { all: vi.fn(() => []), run: vi.fn(), get: vi.fn() };
      });

      const result = registeredIpcHandlers[IPC.STATBLOCKS_GET_ALL_BY_CAMPAIGN](
        {},
        5,
      );

      expect(allMock).toHaveBeenCalledWith(5);
      expect(result).toEqual([campaignSB]);
    });

    it('returns empty array when no campaign statblocks exist', () => {
      const allMock = vi.fn(() => []);
      prepareMock.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM statblocks WHERE campaign_id = ?')) {
          return { all: allMock };
        }
        return { all: vi.fn(() => []), run: vi.fn(), get: vi.fn() };
      });

      const result = registeredIpcHandlers[IPC.STATBLOCKS_GET_ALL_BY_CAMPAIGN](
        {},
        99,
      );

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('returns statblock when found', () => {
      const getMock = vi.fn(() => baseStatBlock);
      prepareMock.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM statblocks WHERE id = ?')) {
          return { get: getMock };
        }
        return { all: vi.fn(() => []), run: vi.fn(), get: vi.fn() };
      });

      const result = registeredIpcHandlers[IPC.STATBLOCKS_GET_BY_ID]({}, 10);

      expect(getMock).toHaveBeenCalledWith(10);
      expect(result).toEqual(baseStatBlock);
    });

    it('returns null when statblock not found', () => {
      const getMock = vi.fn(() => undefined);
      prepareMock.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM statblocks WHERE id = ?')) {
          return { get: getMock };
        }
        return { all: vi.fn(() => []), run: vi.fn(), get: vi.fn() };
      });

      const result = registeredIpcHandlers[IPC.STATBLOCKS_GET_BY_ID]({}, 9999);

      expect(result).toBeNull();
    });
  });

  describe('add', () => {
    it('inserts a statblock and returns the created row', () => {
      const insertRunMock = vi.fn(() => ({ lastInsertRowid: 10 }));
      const getAfterInsertMock = vi.fn(() => baseStatBlock);
      let selectCallCount = 0;

      prepareMock.mockImplementation((sql: string) => {
        if (sql.includes('INSERT INTO statblocks')) {
          return { run: insertRunMock };
        }
        if (sql.includes('SELECT * FROM statblocks WHERE id = ?')) {
          selectCallCount++;
          return { get: getAfterInsertMock };
        }
        return { all: vi.fn(() => []), run: vi.fn(), get: vi.fn() };
      });

      const result = registeredIpcHandlers[IPC.STATBLOCKS_ADD](
        {},
        { world_id: 1, name: 'Goblin Warrior', config: '{}' },
      );

      expect(insertRunMock).toHaveBeenCalledWith(
        1,
        null,
        'Goblin Warrior',
        null,
        '{}',
      );
      expect(getAfterInsertMock).toHaveBeenCalledWith(10);
      expect(result).toEqual(baseStatBlock);
      expect(selectCallCount).toBe(1);
    });

    it('trims whitespace from name before inserting', () => {
      const insertRunMock = vi.fn(() => ({ lastInsertRowid: 10 }));
      prepareMock.mockImplementation((sql: string) => {
        if (sql.includes('INSERT INTO statblocks')) {
          return { run: insertRunMock };
        }
        if (sql.includes('SELECT * FROM statblocks WHERE id = ?')) {
          return { get: vi.fn(() => baseStatBlock) };
        }
        return { all: vi.fn(() => []), run: vi.fn(), get: vi.fn() };
      });

      registeredIpcHandlers[IPC.STATBLOCKS_ADD](
        {},
        { world_id: 1, name: '  Goblin Warrior  ' },
      );

      expect(insertRunMock).toHaveBeenCalledWith(
        1,
        null,
        'Goblin Warrior',
        null,
        '{}',
      );
    });

    it('includes campaign_id when provided', () => {
      const insertRunMock = vi.fn(() => ({ lastInsertRowid: 10 }));
      prepareMock.mockImplementation((sql: string) => {
        if (sql.includes('INSERT INTO statblocks')) {
          return { run: insertRunMock };
        }
        if (sql.includes('SELECT * FROM statblocks WHERE id = ?')) {
          return {
            get: vi.fn(() => ({ ...baseStatBlock, campaign_id: 5 })),
          };
        }
        return { all: vi.fn(() => []), run: vi.fn(), get: vi.fn() };
      });

      registeredIpcHandlers[IPC.STATBLOCKS_ADD](
        {},
        { world_id: 1, campaign_id: 5, name: 'Campaign Mob' },
      );

      expect(insertRunMock).toHaveBeenCalledWith(
        1,
        5,
        'Campaign Mob',
        null,
        '{}',
      );
    });

    it('throws when name is blank', () => {
      prepareMock.mockImplementation(() => ({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn(() => []),
      }));

      expect(() =>
        registeredIpcHandlers[IPC.STATBLOCKS_ADD](
          {},
          { world_id: 1, name: '   ' },
        ),
      ).toThrowError('StatBlock name is required');
    });
  });

  describe('update', () => {
    it('updates name and description, returns updated row', () => {
      const updateRunMock = vi.fn();
      const getMock = vi.fn(() => ({
        ...baseStatBlock,
        name: 'Orc Berserker',
        description: 'A rage-fueled orc',
      }));

      prepareMock.mockImplementation((sql: string) => {
        if (sql.includes('UPDATE statblocks SET')) {
          return { run: updateRunMock };
        }
        if (sql.includes('SELECT * FROM statblocks WHERE id = ?')) {
          return { get: getMock };
        }
        return { all: vi.fn(() => []), run: vi.fn(), get: vi.fn() };
      });

      const result = registeredIpcHandlers[IPC.STATBLOCKS_UPDATE]({}, 10, {
        name: 'Orc Berserker',
        description: 'A rage-fueled orc',
      });

      const updateSql = prepareMock.mock.calls.find(
        ([sql]) =>
          typeof sql === 'string' && sql.includes('UPDATE statblocks SET'),
      )?.[0] as string;

      expect(updateSql).toContain('name = ?');
      expect(updateSql).toContain('description = ?');
      expect(updateSql).toContain("updated_at = datetime('now')");
      expect(updateRunMock).toHaveBeenCalledWith(
        'Orc Berserker',
        'A rage-fueled orc',
        10,
      );
      expect(result).toMatchObject({ name: 'Orc Berserker' });
    });

    it('updates only the config field when only config is provided', () => {
      const updateRunMock = vi.fn();
      const getMock = vi.fn(() => ({
        ...baseStatBlock,
        config: '{"hp":20}',
      }));

      prepareMock.mockImplementation((sql: string) => {
        if (sql.includes('UPDATE statblocks SET')) {
          return { run: updateRunMock };
        }
        if (sql.includes('SELECT * FROM statblocks WHERE id = ?')) {
          return { get: getMock };
        }
        return { all: vi.fn(() => []), run: vi.fn(), get: vi.fn() };
      });

      registeredIpcHandlers[IPC.STATBLOCKS_UPDATE]({}, 10, {
        config: '{"hp":20}',
      });

      const updateSql = prepareMock.mock.calls.find(
        ([sql]) =>
          typeof sql === 'string' && sql.includes('UPDATE statblocks SET'),
      )?.[0] as string;

      expect(updateSql).toContain('config = ?');
      expect(updateSql).not.toContain('name = ?');
      expect(updateRunMock).toHaveBeenCalledWith('{"hp":20}', 10);
    });

    it('issues timestamp-only update when payload is empty', () => {
      const updateRunMock = vi.fn();
      const getMock = vi.fn(() => baseStatBlock);

      prepareMock.mockImplementation((sql: string) => {
        if (sql.includes('UPDATE statblocks SET')) {
          return { run: updateRunMock };
        }
        if (sql.includes('SELECT * FROM statblocks WHERE id = ?')) {
          return { get: getMock };
        }
        return { all: vi.fn(() => []), run: vi.fn(), get: vi.fn() };
      });

      registeredIpcHandlers[IPC.STATBLOCKS_UPDATE]({}, 10, {});

      const updateSql = prepareMock.mock.calls.find(
        ([sql]) =>
          typeof sql === 'string' && sql.includes('UPDATE statblocks SET'),
      )?.[0] as string;

      expect(updateSql).toBe(
        "UPDATE statblocks SET updated_at = datetime('now') WHERE id = ?",
      );
      expect(updateRunMock).toHaveBeenCalledWith(10);
    });

    it('throws when name update is blank', () => {
      prepareMock.mockImplementation(() => ({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn(() => []),
      }));

      expect(() =>
        registeredIpcHandlers[IPC.STATBLOCKS_UPDATE]({}, 10, { name: '  ' }),
      ).toThrowError('StatBlock name cannot be empty');
    });

    it('throws when statblock not found after update', () => {
      const updateRunMock = vi.fn();
      const getMock = vi.fn(() => undefined);

      prepareMock.mockImplementation((sql: string) => {
        if (sql.includes('UPDATE statblocks SET')) {
          return { run: updateRunMock };
        }
        if (sql.includes('SELECT * FROM statblocks WHERE id = ?')) {
          return { get: getMock };
        }
        return { all: vi.fn(() => []), run: vi.fn(), get: vi.fn() };
      });

      expect(() =>
        registeredIpcHandlers[IPC.STATBLOCKS_UPDATE]({}, 9999, {
          name: 'Ghost',
        }),
      ).toThrowError('StatBlock not found');
    });
  });

  describe('delete', () => {
    it('deletes a statblock and returns { id }', () => {
      const deleteRunMock = vi.fn();
      prepareMock.mockImplementation((sql: string) => {
        if (sql.includes('DELETE FROM statblocks WHERE id = ?')) {
          return { run: deleteRunMock };
        }
        return { all: vi.fn(() => []), run: vi.fn(), get: vi.fn() };
      });

      const result = registeredIpcHandlers[IPC.STATBLOCKS_DELETE]({}, 10);

      expect(deleteRunMock).toHaveBeenCalledWith(10);
      expect(result).toEqual({ id: 10 });
    });

    it('is idempotent — returns { id } even for non-existent row', () => {
      const deleteRunMock = vi.fn();
      prepareMock.mockImplementation((sql: string) => {
        if (sql.includes('DELETE FROM statblocks WHERE id = ?')) {
          return { run: deleteRunMock };
        }
        return { all: vi.fn(() => []), run: vi.fn(), get: vi.fn() };
      });

      const result = registeredIpcHandlers[IPC.STATBLOCKS_DELETE]({}, 9999);

      expect(deleteRunMock).toHaveBeenCalledWith(9999);
      expect(result).toEqual({ id: 9999 });
    });
  });
});
