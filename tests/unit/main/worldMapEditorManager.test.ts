import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createWorldMapEditorManager,
  type WorldMapEditorWindow,
} from '../../../src/main/worldMapEditorManager';
import type { WorldMap, WorldMapSaveMeta } from '../../../src/shared/contracts/domainTypes';

function buildWorldMap(id: number, worldId: number): WorldMap {
  return {
    id,
    world_id: worldId,
    map_name: 'Atlas',
    storage_key: `world-map-${id}.map.gz`,
    generator_version: 'v1.99',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };
}

function createFakeWindow(webContentsId: number) {
  let destroyed = false;
  let closedListener: (() => void) | null = null;
  let closeListener: ((event: { preventDefault(): void; }) => void) | null = null;
  let willPreventUnloadListener: ((event: { preventDefault(): void; }) => void) | null = null;
  let prevented = false;
  const webContentsMock = {
    get id() {
      if (destroyed) {
        throw new TypeError('Object has been destroyed');
      }
      return webContentsId;
    },
    executeJavaScript: vi.fn(async () => ({ ok: true })),
    on: vi.fn((event: string, listener: (event: { preventDefault(): void; }) => void) => {
      if (event === 'will-prevent-unload') {
        willPreventUnloadListener = listener;
      }
    }),
  };

  const win: WorldMapEditorWindow & {
    fireClose(): void;
    fireClosed(): void;
    fireWillPreventUnload(): boolean;
    prevented(): boolean;
    setDestroyed(value?: boolean): void;
  } = {
    webContents: webContentsMock,
    focus: vi.fn(),
    close: vi.fn(),
    isDestroyed: () => destroyed,
    on: (event, listener) => {
      if (event === 'closed') {
        closedListener = listener as () => void;
      } else {
        closeListener = listener as (event: { preventDefault(): void; }) => void;
      }
    },
    fireClose: () => {
      prevented = false;
      closeListener?.({
        preventDefault: () => {
          prevented = true;
        },
      });
    },
    fireClosed: () => {
      destroyed = true;
      closedListener?.();
    },
    fireWillPreventUnload: () => {
      let preventedUnload = false;
      willPreventUnloadListener?.({
        preventDefault: () => {
          preventedUnload = true;
        },
      });
      return preventedUnload;
    },
    prevented: () => prevented,
    setDestroyed: (value = true) => {
      destroyed = value;
    },
  };
  return win;
}

describe('createWorldMapEditorManager', () => {
  let savedRows: Map<number, WorldMap>;
  let createWindow: (worldId: number) => WorldMapEditorWindow;
  let windows: ReturnType<typeof createFakeWindow>[];
  let saveSnapshot: (worldId: number, mapData: string, meta: WorldMapSaveMeta) => Promise<WorldMap>;
  let exportCopy: (
    worldId: number,
    mapData: string,
    suggestedName: string,
  ) => Promise<{ ok: true; }>;
  let confirmDiscardOnCloseFailure: (
    worldId: number,
    errorMessage: string,
  ) => Promise<boolean>;

  beforeEach(() => {
    savedRows = new Map();
    windows = [];
    createWindow = vi.fn(() => {
      const win = createFakeWindow(windows.length + 10);
      windows.push(win);
      return win;
    });
    saveSnapshot = vi.fn(async (worldId: number) => {
      const row = buildWorldMap(savedRows.size + 1, worldId);
      savedRows.set(worldId, row);
      return row;
    });
    exportCopy = vi.fn(async () => ({ ok: true as const }));
    confirmDiscardOnCloseFailure = vi.fn(async () => false);
  });

  function makeManager() {
    return createWorldMapEditorManager({
      getWorld: (worldId) => ({ id: worldId, name: `World ${worldId}` }),
      persistence: {
        getByWorld: (worldId) => savedRows.get(worldId) ?? null,
        deleteByWorld: vi.fn(async () => undefined),
        saveSnapshot,
      },
      createWindow,
      vendorEntryUrl: 'vv-fmg://app/vendor/index.html',
      mapFileUrl: (storageKey) => `vv-fmg://app/maps/${storageKey}`,
      exportCopy,
      confirmDiscardOnCloseFailure,
    });
  }

  async function flushCloseFlow() {
    await Promise.resolve();
    await Promise.resolve();
  }

  async function flushScheduledClose() {
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  }

  it('opens a window and reports null when the world has no bound map', async () => {
    const manager = makeManager();

    const result = await manager.openWorldMapEditor(3);

    expect(createWindow).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ opened: true, worldMapId: null });
  });

  it('throws when opening an editor for a missing world', async () => {
    const manager = createWorldMapEditorManager({
      getWorld: () => null,
      persistence: {
        getByWorld: vi.fn(() => null),
        deleteByWorld: vi.fn(async () => undefined),
        saveSnapshot,
      },
      createWindow,
      vendorEntryUrl: 'vv-fmg://app/vendor/index.html',
      mapFileUrl: (storageKey) => `vv-fmg://app/maps/${storageKey}`,
      exportCopy,
      confirmDiscardOnCloseFailure,
    });

    await expect(manager.openWorldMapEditor(3)).rejects.toThrow('World 3 not found');
    expect(createWindow).not.toHaveBeenCalled();
  });

  it('builds a session with custom protocol URLs for an existing map', async () => {
    const manager = makeManager();
    savedRows.set(3, buildWorldMap(42, 3));

    const session = manager.buildSession(3);

    expect(session).toEqual({
      worldId: 3,
      worldName: 'World 3',
      worldMapId: 42,
      mapFileUrl: 'vv-fmg://app/maps/world-map-42.map.gz',
      vendorEntryUrl: 'vv-fmg://app/vendor/index.html',
      hasExistingMap: true,
    });
  });

  it('builds a session with null map fields before the first save', () => {
    const manager = makeManager();

    const session = manager.buildSession(3);

    expect(session).toEqual({
      worldId: 3,
      worldName: 'World 3',
      worldMapId: null,
      mapFileUrl: null,
      vendorEntryUrl: 'vv-fmg://app/vendor/index.html',
      hasExistingMap: false,
    });
  });

  it('throws when building a session for a missing world', () => {
    const manager = createWorldMapEditorManager({
      getWorld: () => null,
      persistence: {
        getByWorld: vi.fn(() => null),
        deleteByWorld: vi.fn(async () => undefined),
        saveSnapshot,
      },
      createWindow,
      vendorEntryUrl: 'vv-fmg://app/vendor/index.html',
      mapFileUrl: (storageKey) => `vv-fmg://app/maps/${storageKey}`,
      exportCopy,
      confirmDiscardOnCloseFailure,
    });

    expect(() => manager.buildSession(3)).toThrow('World 3 not found');
  });

  it('focuses the existing window instead of opening a second one per world', async () => {
    const manager = makeManager();

    await manager.openWorldMapEditor(3);
    await manager.openWorldMapEditor(3);

    expect(createWindow).toHaveBeenCalledTimes(1);
    expect(windows[0].focus).toHaveBeenCalledTimes(1);
  });

  it('reopens a destroyed tracked window instead of focusing it', async () => {
    const manager = makeManager();

    await manager.openWorldMapEditor(3);
    windows[0].setDestroyed();
    await manager.openWorldMapEditor(3);

    expect(createWindow).toHaveBeenCalledTimes(2);
    expect(windows[0].focus).not.toHaveBeenCalled();
  });

  it('tracks the world by webContents id for host calls', async () => {
    const manager = makeManager();

    await manager.openWorldMapEditor(3);

    expect(manager.resolveWorldId(10)).toBe(3);
    expect(manager.resolveWorldId(999)).toBeNull();
  });

  it('delegates snapshot saves and export copies', async () => {
    const manager = makeManager();

    await manager.saveWorldMapSnapshot(3, 'MAPDATA', {
      mapName: 'Atlas',
      generatorVersion: 'v1.99',
    });
    await manager.exportWorldMapCopy(3, 'MAPDATA', 'atlas.map.gz');

    expect(saveSnapshot).toHaveBeenCalledWith(3, 'MAPDATA', {
      mapName: 'Atlas',
      generatorVersion: 'v1.99',
    });
    expect(exportCopy).toHaveBeenCalledWith(3, 'MAPDATA', 'atlas.map.gz');
  });

  it('intercepts user close, asks renderer to save, then closes on success', async () => {
    const manager = makeManager();
    await manager.openWorldMapEditor(3);

    windows[0].fireClose();
    await flushCloseFlow();

    expect(windows[0].prevented()).toBe(true);
    expect(windows[0].webContents.executeJavaScript).toHaveBeenCalled();
    expect(windows[0].close).toHaveBeenCalledTimes(1);
  });

  it('prompts discard when renderer close-save fails', async () => {
    const manager = makeManager();
    await manager.openWorldMapEditor(3);
    (windows[0].webContents.executeJavaScript as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: false, errorMessage: 'disk full' });
    vi.mocked(confirmDiscardOnCloseFailure).mockResolvedValueOnce(true);

    windows[0].fireClose();
    await flushCloseFlow();

    expect(confirmDiscardOnCloseFailure).toHaveBeenCalledWith(3, 'disk full');
    expect(windows[0].close).toHaveBeenCalledTimes(1);
  });

  it('uses fallback close-save failure copy when renderer omits an error message', async () => {
    const manager = makeManager();
    await manager.openWorldMapEditor(3);
    (windows[0].webContents.executeJavaScript as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: false });
    vi.mocked(confirmDiscardOnCloseFailure).mockResolvedValueOnce(false);

    windows[0].fireClose();
    await flushCloseFlow();

    expect(confirmDiscardOnCloseFailure).toHaveBeenCalledWith(
      3,
      'World map save failed during close',
    );
  });

  it('keeps the window open when discard is denied after a close-save failure', async () => {
    const manager = makeManager();
    await manager.openWorldMapEditor(3);
    (windows[0].webContents.executeJavaScript as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: false, errorMessage: 'disk full' });
    vi.mocked(confirmDiscardOnCloseFailure).mockResolvedValueOnce(false);

    windows[0].fireClose();
    await flushCloseFlow();

    expect(confirmDiscardOnCloseFailure).toHaveBeenCalledWith(3, 'disk full');
    expect(windows[0].close).not.toHaveBeenCalled();
  });

  it('treats an undefined renderer close decision as approval to close', async () => {
    const manager = makeManager();
    await manager.openWorldMapEditor(3);
    (windows[0].webContents.executeJavaScript as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(undefined);

    windows[0].fireClose();
    await flushCloseFlow();

    expect(confirmDiscardOnCloseFailure).not.toHaveBeenCalled();
    expect(windows[0].close).toHaveBeenCalledTimes(1);
  });

  it('ignores duplicate close events while close-save check is in flight', async () => {
    const manager = makeManager();
    await manager.openWorldMapEditor(3);
    let resolveDecision: ((value: { ok: true; }) => void) | null = null;
    (windows[0].webContents.executeJavaScript as ReturnType<typeof vi.fn>)
      .mockImplementationOnce(
        () =>
          new Promise<{ ok: true; }>((resolve) => {
            resolveDecision = resolve;
          }),
      );

    windows[0].fireClose();
    windows[0].fireClose();
    resolveDecision?.({ ok: true });
    await flushCloseFlow();

    expect(windows[0].webContents.executeJavaScript).toHaveBeenCalledTimes(1);
    expect(windows[0].close).toHaveBeenCalledTimes(1);
  });

  it('does not try to close a window that was destroyed while close-save check was running', async () => {
    const manager = makeManager();
    await manager.openWorldMapEditor(3);
    let resolveDecision: ((value: { ok: true; }) => void) | null = null;
    (windows[0].webContents.executeJavaScript as ReturnType<typeof vi.fn>)
      .mockImplementationOnce(
        () =>
          new Promise<{ ok: true; }>((resolve) => {
            resolveDecision = resolve;
          }),
      );

    windows[0].fireClose();
    windows[0].setDestroyed();
    resolveDecision?.({ ok: true });
    await flushCloseFlow();

    expect(windows[0].close).not.toHaveBeenCalled();
  });

  it('ignores upstream unload blockers from FMG so approved closes can finish', async () => {
    const manager = makeManager();
    await manager.openWorldMapEditor(3);

    expect(windows[0].fireWillPreventUnload()).toBe(true);
  });

  it('allows subsequent close events after host close-save already approved', async () => {
    const manager = makeManager();
    await manager.openWorldMapEditor(3);

    windows[0].fireClose();
    await flushCloseFlow();
    windows[0].fireClose();

    expect(windows[0].prevented()).toBe(false);
  });

  it('closes an active editor window by webContents id', async () => {
    const manager = makeManager();
    await manager.openWorldMapEditor(3);

    await expect(manager.closeWorldMapWindow(10)).resolves.toEqual({ ok: true });

    expect(windows[0].close).toHaveBeenCalledTimes(1);
  });

  it('closes immediately when host renderer already resolved close approval', async () => {
    const manager = makeManager();
    await manager.openWorldMapEditor(3);

    await expect(manager.closeWorldMapWindow(10, { ok: true })).resolves.toEqual({ ok: true });
    await flushScheduledClose();

    expect(confirmDiscardOnCloseFailure).not.toHaveBeenCalled();
    expect(windows[0].webContents.executeJavaScript).not.toHaveBeenCalled();
    expect(windows[0].close).toHaveBeenCalledTimes(1);
  });

  it('prompts discard when host renderer reports a close-save failure', async () => {
    const manager = makeManager();
    await manager.openWorldMapEditor(3);
    vi.mocked(confirmDiscardOnCloseFailure).mockResolvedValueOnce(true);

    await expect(
      manager.closeWorldMapWindow(10, { ok: false, errorMessage: 'disk full' }),
    ).resolves.toEqual({ ok: true });
    await flushScheduledClose();

    expect(confirmDiscardOnCloseFailure).toHaveBeenCalledWith(3, 'disk full');
    expect(windows[0].webContents.executeJavaScript).not.toHaveBeenCalled();
    expect(windows[0].close).toHaveBeenCalledTimes(1);
  });

  it('keeps host window open when discard is denied after renderer close-save failure', async () => {
    const manager = makeManager();
    await manager.openWorldMapEditor(3);
    vi.mocked(confirmDiscardOnCloseFailure).mockResolvedValueOnce(false);

    await expect(
      manager.closeWorldMapWindow(10, { ok: false, errorMessage: 'disk full' }),
    ).resolves.toEqual({ ok: true });

    expect(confirmDiscardOnCloseFailure).toHaveBeenCalledWith(3, 'disk full');
    expect(windows[0].close).not.toHaveBeenCalled();
  });

  it('rejects close requests for unknown editor sessions', async () => {
    const manager = makeManager();

    await expect(manager.closeWorldMapWindow(999)).rejects.toThrow(
      'World map editor session not found',
    );
  });

  it('rejects close requests when the tracked editor window is already destroyed', async () => {
    const manager = makeManager();
    await manager.openWorldMapEditor(3);
    windows[0].setDestroyed();

    await expect(manager.closeWorldMapWindow(10)).rejects.toThrow(
      'World map editor session not found',
    );
  });

  it('removes session tracking after the window is closed', async () => {
    const manager = makeManager();
    await manager.openWorldMapEditor(3);

    windows[0].fireClosed();

    expect(manager.resolveWorldId(10)).toBeNull();
  });

  it('removes session tracking after close without touching destroyed webContents', async () => {
    const manager = makeManager();
    await manager.openWorldMapEditor(3);

    expect(() => windows[0].fireClosed()).not.toThrow();
    expect(manager.resolveWorldId(10)).toBeNull();
  });
});
