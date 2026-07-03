import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerWorldMapHandlers } from '../../../src/main/ipc/registerWorldMapHandlers';
import type { WorldMapOpenEditorResult } from '../../../src/shared/contracts/domainTypes';
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

function buildWorldMap(overrides?: Record<string, unknown>) {
  return {
    id: 7,
    world_id: 3,
    map_name: 'My Map',
    storage_key: 'world-map-7.map.gz',
    generator_version: '1.99.00',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('registerWorldMapHandlers', () => {
  let dbMock: Database.Database;
  let getMock: ReturnType<typeof vi.fn>;
  let openEditor: (worldId: number) => Promise<WorldMapOpenEditorResult>;
  let handlers: Record<string, IpcHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    getMock = vi.fn(() => buildWorldMap());
    dbMock = {
      prepare: vi.fn(() => ({ get: getMock })),
      transaction: (cb: (...args: unknown[]) => unknown) => cb,
    } as unknown as Database.Database;
    openEditor = vi.fn(async () => ({ opened: true as const, worldMapId: 7 }));
    registerWorldMapHandlers(dbMock, { openEditor });
    handlers = getHandlers();
  });

  describe(IPC.WORLD_MAPS_GET_BY_WORLD, () => {
    it('returns the bound world map row', () => {
      expect(handlers[IPC.WORLD_MAPS_GET_BY_WORLD]({}, 3)).toEqual(buildWorldMap());
    });

    it('returns null when the world has no bound map', () => {
      getMock.mockReturnValueOnce(undefined);
      expect(handlers[IPC.WORLD_MAPS_GET_BY_WORLD]({}, 999)).toBeNull();
    });
  });

  describe(IPC.WORLD_MAPS_OPEN_EDITOR, () => {
    it('delegates to the injected editor-open command', async () => {
      const result = await handlers[IPC.WORLD_MAPS_OPEN_EDITOR]({}, 3);
      expect(openEditor).toHaveBeenCalledWith(3);
      expect(result).toEqual({ opened: true, worldMapId: 7 });
    });

    it('rejects a non-positive world id without opening a window', () => {
      expect(() => handlers[IPC.WORLD_MAPS_OPEN_EDITOR]({}, 0))
        .toThrowError('World map editor requires a valid world id');
      expect(openEditor).not.toHaveBeenCalled();
    });

    it('rejects a non-integer world id', () => {
      expect(() => handlers[IPC.WORLD_MAPS_OPEN_EDITOR]({}, 1.5))
        .toThrowError('World map editor requires a valid world id');
      expect(openEditor).not.toHaveBeenCalled();
    });
  });
});
