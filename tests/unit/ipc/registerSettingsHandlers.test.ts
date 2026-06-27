import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerSettingsHandlers } from '../../../src/main/ipc/registerSettingsHandlers';
import { IPC } from '../../../src/shared/ipcChannels';

type IpcHandler = (...args: unknown[]) => unknown;

const { ipcHandleMock } = vi.hoisted(() => ({
  ipcHandleMock: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: { handle: ipcHandleMock },
}));

function getHandlers(): Record<string, IpcHandler> {
  return Object.fromEntries(
    ipcHandleMock.mock.calls.map(([ch, handler]) => [ch as string, handler as IpcHandler]),
  );
}

function buildSettings(overrides?: Partial<AppSettings>): AppSettings {
  return {
    id: 1,
    config: '{"theme":"light"}',
    created_at: '2026-01-01 00:00:00',
    updated_at: '2026-01-01 00:00:00',
    ...overrides,
  };
}

describe('registerSettingsHandlers', () => {
  let runMock: ReturnType<typeof vi.fn>;
  let getMock: ReturnType<typeof vi.fn>;
  let dbMock: Database.Database;
  let handlers: Record<string, IpcHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));
    getMock = vi.fn(() => buildSettings());
    dbMock = {
      prepare: vi.fn(() => ({ run: runMock, get: getMock })),
    } as unknown as Database.Database;
    registerSettingsHandlers(dbMock);
    handlers = getHandlers();
  });

  describe(IPC.SETTINGS_GET, () => {
    it('ensures the singleton row exists and returns it', () => {
      const result = handlers[IPC.SETTINGS_GET]({});
      expect(result).toEqual(buildSettings());
      expect(runMock).toHaveBeenCalled();
      expect(getMock).toHaveBeenCalled();
    });
  });

  describe(IPC.SETTINGS_UPDATE, () => {
    it('persists the new config string and returns the updated row', () => {
      getMock.mockReturnValueOnce(buildSettings({ config: '{"theme":"dark"}' }));
      const result = handlers[IPC.SETTINGS_UPDATE]({}, '{"theme":"dark"}');
      expect(result).toEqual(buildSettings({ config: '{"theme":"dark"}' }));
      expect(runMock).toHaveBeenCalledWith('{"theme":"dark"}');
    });
  });
});
