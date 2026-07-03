import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  registerWorldMapHostHandlers,
  type WorldMapHostDeps,
} from '../../../src/main/ipc/registerWorldMapHostHandlers';
import { WORLD_MAP_HOST_CHANNELS } from '../../../src/shared/worldMapHostChannels';

type IpcHandler = (event: unknown, ...args: unknown[]) => unknown;

type IpcListener = (event: unknown, ...args: unknown[]) => void;

const { ipcHandleMock, ipcOnMock } = vi.hoisted(() => ({
  ipcHandleMock: vi.fn(),
  ipcOnMock: vi.fn(),
}));

vi.mock('electron', () => ({ ipcMain: { handle: ipcHandleMock, on: ipcOnMock } }));

function getHandlers(): Record<string, IpcHandler> {
  return Object.fromEntries(
    ipcHandleMock.mock.calls.map(([ch, handler]) => [ch as string, handler as IpcHandler]),
  );
}

function getListeners(): Record<string, IpcListener> {
  return Object.fromEntries(
    ipcOnMock.mock.calls.map(([ch, listener]) => [ch as string, listener as IpcListener]),
  );
}

const eventFrom = (webContentsId: number) => ({ sender: { id: webContentsId } });

describe('registerWorldMapHostHandlers', () => {
  let deps: WorldMapHostDeps;
  let handlers: Record<string, IpcHandler>;
  let listeners: Record<string, IpcListener>;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = {
      resolveWorldId: vi.fn((id: number) => (id === 42 ? 3 : null)),
      buildSession: vi.fn((worldId: number) => ({
        worldId,
        worldName: 'A1',
        worldMapId: null,
        mapFileUrl: null,
        vendorEntryUrl: 'vv-fmg://app/index.html',
        hasExistingMap: false,
      })),
      saveCurrent: vi.fn(async () => ({
        id: 5,
        world_id: 3,
        map_name: 'A1',
        storage_key: 'world-map-5.map.gz',
        generator_version: '1.99',
        created_at: 'c',
        updated_at: 'u',
      })),
      regenerate: vi.fn(async () => ({ ok: true as const })),
      exportCopy: vi.fn(async () => ({ ok: true as const })),
      closeWindow: vi.fn(() => ({ ok: true as const })),
    };
    registerWorldMapHostHandlers(deps);
    handlers = getHandlers();
    listeners = getListeners();
  });

  it('registers all five host channels', () => {
    expect([...Object.keys(handlers), ...Object.keys(listeners)].sort()).toEqual(
      Object.values(WORLD_MAP_HOST_CHANNELS).sort(),
    );
  });

  it('getSession builds a session for the world resolved from the calling window', async () => {
    const session = await handlers[WORLD_MAP_HOST_CHANNELS.GET_SESSION](eventFrom(42));
    expect(deps.resolveWorldId).toHaveBeenCalledWith(42);
    expect(deps.buildSession).toHaveBeenCalledWith(3);
    expect(session).toMatchObject({ worldId: 3 });
  });

  it('saveCurrent forwards the resolved world id, map data and meta', async () => {
    const meta = { mapName: 'A1', generatorVersion: '1.99' };
    const result = await handlers[WORLD_MAP_HOST_CHANNELS.SAVE](eventFrom(42), 'MAPDATA', meta);
    expect(deps.saveCurrent).toHaveBeenCalledWith(3, 'MAPDATA', meta);
    expect(result).toMatchObject({ id: 5, storage_key: 'world-map-5.map.gz' });
  });

  it('rejects a save with non-string map data', () => {
    expect(() =>
      handlers[WORLD_MAP_HOST_CHANNELS.SAVE](eventFrom(42), 123, {
        mapName: null,
        generatorVersion: null,
      })
    )
      .toThrowError('World map save requires non-empty map data');
    expect(deps.saveCurrent).not.toHaveBeenCalled();
  });

  it('rejects a save with empty map data', () => {
    expect(() =>
      handlers[WORLD_MAP_HOST_CHANNELS.SAVE](eventFrom(42), '', {
        mapName: null,
        generatorVersion: null,
      })
    )
      .toThrowError('World map save requires non-empty map data');
    expect(deps.saveCurrent).not.toHaveBeenCalled();
  });

  it('regenerate forwards the resolved world id', async () => {
    const result = await handlers[WORLD_MAP_HOST_CHANNELS.REGENERATE](eventFrom(42));

    expect(deps.regenerate).toHaveBeenCalledWith(3);
    expect(result).toEqual({ ok: true });
  });

  it('exportCopy forwards the resolved world id, map data, and suggested name', async () => {
    const result = await handlers[WORLD_MAP_HOST_CHANNELS.EXPORT_COPY](
      eventFrom(42),
      'MAPDATA',
      'atlas.map.gz',
    );

    expect(deps.exportCopy).toHaveBeenCalledWith(3, 'MAPDATA', 'atlas.map.gz');
    expect(result).toEqual({ ok: true });
  });

  it('rejects exportCopy with non-string map data', () => {
    expect(() => handlers[WORLD_MAP_HOST_CHANNELS.EXPORT_COPY](eventFrom(42), 123, 'atlas.map.gz'))
      .toThrowError('World map export requires non-empty map data');
    expect(deps.exportCopy).not.toHaveBeenCalled();
  });

  it('rejects exportCopy with empty map data', () => {
    expect(() => handlers[WORLD_MAP_HOST_CHANNELS.EXPORT_COPY](eventFrom(42), '', 'atlas.map.gz'))
      .toThrowError('World map export requires non-empty map data');
    expect(deps.exportCopy).not.toHaveBeenCalled();
  });

  it('rejects any call from a window with no bound editor session', () => {
    expect(() => handlers[WORLD_MAP_HOST_CHANNELS.GET_SESSION](eventFrom(99)))
      .toThrowError('World map editor session not found');
    expect(deps.buildSession).not.toHaveBeenCalled();
  });

  it('rejects regenerate from a window with no bound editor session', () => {
    expect(() => handlers[WORLD_MAP_HOST_CHANNELS.REGENERATE](eventFrom(99)))
      .toThrowError('World map editor session not found');
    expect(deps.regenerate).not.toHaveBeenCalled();
  });

  it('rejects exportCopy from a window with no bound editor session', () => {
    expect(() =>
      handlers[WORLD_MAP_HOST_CHANNELS.EXPORT_COPY](eventFrom(99), 'MAPDATA', 'atlas.map.gz')
    )
      .toThrowError('World map editor session not found');
    expect(deps.exportCopy).not.toHaveBeenCalled();
  });

  it('close targets the calling window by its webContents id', async () => {
    await listeners[WORLD_MAP_HOST_CHANNELS.CLOSE](eventFrom(42), { ok: true });
    expect(deps.closeWindow).toHaveBeenCalledWith(42, { ok: true });
  });
});
