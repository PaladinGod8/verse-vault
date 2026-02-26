import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IPC } from '../../src/shared/ipcChannels';

type EventHandler = (...args: unknown[]) => unknown;
type IpcHandler = (...args: unknown[]) => unknown;

const registeredEvents: Record<string, EventHandler> = {};
const registeredIpcHandlers: Record<string, IpcHandler> = {};

const appOnMock = vi.fn((event: string, handler: EventHandler) => {
  registeredEvents[event] = handler;
});
const appQuitMock = vi.fn();
const ipcHandleMock = vi.fn((channel: string, handler: IpcHandler) => {
  registeredIpcHandlers[channel] = handler;
});
const loadURLMock = vi.fn();
const loadFileMock = vi.fn();
const openDevToolsMock = vi.fn();
const getAllWindowsMock = vi.fn();
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
const getDatabaseMock = vi.fn(() => ({
  prepare: prepareMock,
}));
const closeDatabaseMock = vi.fn();

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

  for (const key of Object.keys(registeredEvents)) delete registeredEvents[key];
  for (const key of Object.keys(registeredIpcHandlers))
    delete registeredIpcHandlers[key];

  vi.clearAllMocks();

  vi.doMock('electron-squirrel-startup', () => false);
  vi.doMock('electron', () => ({
    app: {
      on: appOnMock,
      quit: appQuitMock,
    },
    BrowserWindow: BrowserWindowMock,
    ipcMain: {
      handle: ipcHandleMock,
    },
  }));
  vi.doMock('../../src/database/db', () => ({
    getDatabase: getDatabaseMock,
    closeDatabase: closeDatabaseMock,
  }));

  await import('../../src/main');
}

describe('main process', () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
  });

  it('registers app lifecycle events and IPC handlers', async () => {
    const selectAllMock = vi.fn(() => [{ id: 1 }]);
    const insertRunMock = vi.fn(() => ({ lastInsertRowid: 5 }));
    const updateRunMock = vi.fn();
    const deleteRunMock = vi.fn();
    const selectByIdGetMock = vi.fn((id: number) => ({ id }));

    prepareMock.mockImplementation((sql: string) => {
      if (sql.includes('SELECT * FROM verses ORDER BY created_at DESC')) {
        return { all: selectAllMock };
      }
      if (sql.includes('INSERT INTO verses')) {
        return { run: insertRunMock };
      }
      if (sql.includes('UPDATE verses SET')) {
        return { run: updateRunMock };
      }
      if (sql.includes('DELETE FROM verses WHERE id = ?')) {
        return { run: deleteRunMock };
      }
      if (sql.includes('SELECT * FROM verses WHERE id = ?')) {
        return { get: selectByIdGetMock };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    setForgeGlobals('http://localhost:5173');
    await importMainWithMocks();

    expect(appQuitMock).not.toHaveBeenCalled();
    expect(appOnMock).toHaveBeenCalledTimes(4);

    expect(registeredEvents.ready).toBeTypeOf('function');
    expect(registeredEvents['before-quit']).toBeTypeOf('function');
    expect(registeredEvents['window-all-closed']).toBeTypeOf('function');
    expect(registeredEvents.activate).toBeTypeOf('function');

    registeredEvents.ready();

    expect(getDatabaseMock).toHaveBeenCalledTimes(1);
    expect(browserWindowCtorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 800,
        height: 600,
        webPreferences: expect.objectContaining({
          contextIsolation: true,
          nodeIntegration: false,
        }),
      }),
    );
    expect(loadURLMock).toHaveBeenCalledWith('http://localhost:5173');
    expect(loadFileMock).not.toHaveBeenCalled();
    expect(openDevToolsMock).toHaveBeenCalledTimes(1);

    expect(ipcHandleMock).toHaveBeenCalledTimes(4);

    const getAllResult = registeredIpcHandlers[IPC.VERSES_GET_ALL]({});
    expect(selectAllMock).toHaveBeenCalledTimes(1);
    expect(getAllResult).toEqual([{ id: 1 }]);

    const addResult = registeredIpcHandlers[IPC.VERSES_ADD](
      {},
      { text: 'abc' },
    );
    expect(insertRunMock).toHaveBeenCalledWith('abc', null, null);
    expect(selectByIdGetMock).toHaveBeenCalledWith(5);
    expect(addResult).toEqual({ id: 5 });

    const updateResult = registeredIpcHandlers[IPC.VERSES_UPDATE]({}, 9, {
      reference: 'John 3:16',
    });
    expect(updateRunMock).toHaveBeenCalledWith(null, 'John 3:16', null, 9);
    expect(selectByIdGetMock).toHaveBeenCalledWith(9);
    expect(updateResult).toEqual({ id: 9 });

    const deleteResult = registeredIpcHandlers[IPC.VERSES_DELETE]({}, 4);
    expect(deleteRunMock).toHaveBeenCalledWith(4);
    expect(deleteResult).toEqual({ id: 4 });

    registeredEvents['before-quit']();
    expect(closeDatabaseMock).toHaveBeenCalledTimes(1);

    getAllWindowsMock.mockReturnValueOnce([]).mockReturnValueOnce([{}]);
    registeredEvents.activate();
    registeredEvents.activate();
    expect(browserWindowCtorMock).toHaveBeenCalledTimes(2);

    Object.defineProperty(process, 'platform', {
      value: 'win32',
      configurable: true,
    });
    registeredEvents['window-all-closed']();
    expect(appQuitMock).toHaveBeenCalledTimes(1);

    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      configurable: true,
    });
    registeredEvents['window-all-closed']();
    expect(appQuitMock).toHaveBeenCalledTimes(1);

    setForgeGlobals(undefined);
    registeredEvents.ready();
    expect(loadFileMock).toHaveBeenCalledTimes(1);
  });
});
