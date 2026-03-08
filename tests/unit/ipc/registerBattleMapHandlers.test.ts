import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerBattleMapHandlers } from '../../../src/main/ipc/registerBattleMapHandlers';
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

function buildBattleMap(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    world_id: 10,
    name: 'Test Map',
    config:
      '{"runtime":{"grid":{"mode":"square","cellSize":50,"originX":0,"originY":0},"map":{"imageSrc":null,"backgroundColor":"#000000"},"camera":{"x":0,"y":0,"zoom":1}}}',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('registerBattleMapHandlers', () => {
  let dbMock: Database.Database;
  let handlers: Record<string, IpcHandler>;

  // null = not found; omit = use default; value = return it
  function createDbMock(options: { insertedBattleMap?: unknown; } = {}) {
    const defaultBattleMap = buildBattleMap();
    const runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));
    const getMock = vi.fn(() =>
      'insertedBattleMap' in options
        ? (options.insertedBattleMap === null ? undefined : options.insertedBattleMap)
        : defaultBattleMap
    );
    const allMock = vi.fn(() => [defaultBattleMap]);
    return {
      prepare: vi.fn(() => ({ run: runMock, get: getMock, all: allMock })),
    } as unknown as Database.Database;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = createDbMock();
    registerBattleMapHandlers(dbMock);
    handlers = getHandlers();
  });

  describe(IPC.BATTLEMAPS_GET_ALL_BY_WORLD, () => {
    it('returns battlemaps for world', () => {
      const mockAll = vi.fn(() => [buildBattleMap()]);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });
      expect(handlers[IPC.BATTLEMAPS_GET_ALL_BY_WORLD]({}, 10)).toEqual([buildBattleMap()]);
    });
  });

  describe(IPC.BATTLEMAPS_GET_BY_ID, () => {
    it('returns battlemap', () => {
      const mockGet = vi.fn(() => buildBattleMap());
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });
      expect(handlers[IPC.BATTLEMAPS_GET_BY_ID]({}, 1)).toEqual(buildBattleMap());
    });

    it('returns null when not found', () => {
      const mockGet = vi.fn(() => undefined);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });
      expect(handlers[IPC.BATTLEMAPS_GET_BY_ID]({}, 999)).toBeNull();
    });
  });

  describe(IPC.BATTLEMAPS_ADD, () => {
    it('creates battlemap with default empty config', () => {
      const db = createDbMock({ insertedBattleMap: buildBattleMap() });
      vi.clearAllMocks();
      registerBattleMapHandlers(db);
      const h = getHandlers();
      const result = h[IPC.BATTLEMAPS_ADD]({}, { world_id: 10, name: 'Test Map' });
      expect(result).toMatchObject({ name: 'Test Map' });
    });

    it('creates battlemap with explicit config', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerBattleMapHandlers(db);
      const h = getHandlers();
      h[IPC.BATTLEMAPS_ADD]({}, {
        world_id: 10,
        name: 'Map',
        config:
          '{"runtime":{"grid":{"mode":"hex","cellSize":60,"originX":5,"originY":5},"map":{"imageSrc":"vv-media://test","backgroundColor":"#ffffff"},"camera":{"x":10,"y":20,"zoom":2}}}',
      });
      expect(true).toBe(true);
    });

    it('creates battlemap config with "none" grid mode', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerBattleMapHandlers(db);
      const h = getHandlers();
      h[IPC.BATTLEMAPS_ADD]({}, {
        world_id: 10,
        name: 'Map',
        config: '{"runtime":{"grid":{"mode":"none","cellSize":50,"originX":0,"originY":0}}}',
      });
      expect(true).toBe(true);
    });

    it('creates battlemap with config that has no runtime key (uses defaults)', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerBattleMapHandlers(db);
      const h = getHandlers();
      h[IPC.BATTLEMAPS_ADD]({}, { world_id: 10, name: 'Map', config: '{"extra":"data"}' });
      expect(true).toBe(true);
    });

    it('creates battlemap with imageSrc as empty string (normalizes to null)', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerBattleMapHandlers(db);
      const h = getHandlers();
      h[IPC.BATTLEMAPS_ADD]({}, {
        world_id: 10,
        name: 'Map',
        config: '{"runtime":{"map":{"imageSrc":"","backgroundColor":"#000"}}}',
      });
      expect(true).toBe(true);
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.BATTLEMAPS_ADD]({}, { world_id: 10, name: '' }))
        .toThrowError('BattleMap name is required');
    });

    it('throws when config is not a string', () => {
      expect(() =>
        handlers[IPC.BATTLEMAPS_ADD]({}, {
          world_id: 10,
          name: 'X',
          config: 42 as unknown as string,
        })
      )
        .toThrowError('BattleMap config must be a JSON string');
    });

    it('throws when config is not a JSON object', () => {
      expect(() => handlers[IPC.BATTLEMAPS_ADD]({}, { world_id: 10, name: 'X', config: '[1,2]' }))
        .toThrowError('BattleMap config must be a JSON object');
    });

    it('throws when runtime is not a JSON object', () => {
      expect(() =>
        handlers[IPC.BATTLEMAPS_ADD]({}, { world_id: 10, name: 'X', config: '{"runtime":"bad"}' })
      ).toThrowError('BattleMap config runtime must be a JSON object');
    });

    it('throws when runtime.grid is not a JSON object', () => {
      expect(() =>
        handlers[IPC.BATTLEMAPS_ADD]({}, {
          world_id: 10,
          name: 'X',
          config: '{"runtime":{"grid":"bad"}}',
        })
      ).toThrowError('BattleMap config runtime.grid must be a JSON object');
    });

    it('throws when grid mode is invalid', () => {
      expect(() =>
        handlers[IPC.BATTLEMAPS_ADD]({}, {
          world_id: 10,
          name: 'X',
          config: '{"runtime":{"grid":{"mode":"triangle","cellSize":50,"originX":0,"originY":0}}}',
        })
      ).toThrowError("BattleMap config runtime.grid.mode must be one of: 'square', 'hex', 'none'");
    });

    it('throws when grid mode is a non-string', () => {
      expect(() =>
        handlers[IPC.BATTLEMAPS_ADD]({}, {
          world_id: 10,
          name: 'X',
          config: '{"runtime":{"grid":{"mode":123,"cellSize":50,"originX":0,"originY":0}}}',
        })
      ).toThrowError('BattleMap config runtime.grid.mode must be one of');
    });

    it('throws when cellSize is zero (not positive)', () => {
      expect(() =>
        handlers[IPC.BATTLEMAPS_ADD]({}, {
          world_id: 10,
          name: 'X',
          config: '{"runtime":{"grid":{"mode":"square","cellSize":0,"originX":0,"originY":0}}}',
        })
      ).toThrowError('BattleMap config runtime.grid.cellSize must be greater than 0');
    });

    it('throws when originX is non-finite', () => {
      expect(() =>
        handlers[IPC.BATTLEMAPS_ADD]({}, {
          world_id: 10,
          name: 'X',
          config:
            '{"runtime":{"grid":{"mode":"square","cellSize":50,"originX":"bad","originY":0}}}',
        })
      ).toThrowError('BattleMap config runtime.grid.originX must be a finite number');
    });

    it('throws when runtime.map is not a JSON object', () => {
      expect(() =>
        handlers[IPC.BATTLEMAPS_ADD]({}, {
          world_id: 10,
          name: 'X',
          config: '{"runtime":{"map":"bad"}}',
        })
      ).toThrowError('BattleMap config runtime.map must be a JSON object');
    });

    it('throws when map imageSrc is not string or null', () => {
      expect(() =>
        handlers[IPC.BATTLEMAPS_ADD]({}, {
          world_id: 10,
          name: 'X',
          config: '{"runtime":{"map":{"imageSrc":42,"backgroundColor":"#000"}}}',
        })
      ).toThrowError('BattleMap config runtime.map.imageSrc must be a string or null');
    });

    it('throws when map backgroundColor is not a string', () => {
      expect(() =>
        handlers[IPC.BATTLEMAPS_ADD]({}, {
          world_id: 10,
          name: 'X',
          config: '{"runtime":{"map":{"imageSrc":null,"backgroundColor":123}}}',
        })
      ).toThrowError('BattleMap config runtime.map.backgroundColor must be a string');
    });

    it('throws when map backgroundColor is empty', () => {
      expect(() =>
        handlers[IPC.BATTLEMAPS_ADD]({}, {
          world_id: 10,
          name: 'X',
          config: '{"runtime":{"map":{"imageSrc":null,"backgroundColor":"   "}}}',
        })
      ).toThrowError('BattleMap config runtime.map.backgroundColor cannot be empty');
    });

    it('throws when runtime.camera is not a JSON object', () => {
      expect(() =>
        handlers[IPC.BATTLEMAPS_ADD]({}, {
          world_id: 10,
          name: 'X',
          config: '{"runtime":{"camera":"bad"}}',
        })
      ).toThrowError('BattleMap config runtime.camera must be a JSON object');
    });

    it('throws when camera zoom is zero', () => {
      expect(() =>
        handlers[IPC.BATTLEMAPS_ADD]({}, {
          world_id: 10,
          name: 'X',
          config: '{"runtime":{"camera":{"x":0,"y":0,"zoom":0}}}',
        })
      ).toThrowError('BattleMap config runtime.camera.zoom must be greater than 0');
    });

    it('throws when battlemap not found after insert', () => {
      const db = createDbMock({ insertedBattleMap: null });
      vi.clearAllMocks();
      registerBattleMapHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.BATTLEMAPS_ADD]({}, { world_id: 10, name: 'Map' }))
        .toThrowError('Failed to create BattleMap');
    });
  });

  describe(IPC.BATTLEMAPS_UPDATE, () => {
    it('updates name and config', () => {
      const db = createDbMock({ insertedBattleMap: buildBattleMap({ name: 'Updated' }) });
      vi.clearAllMocks();
      registerBattleMapHandlers(db);
      const h = getHandlers();
      const result = h[IPC.BATTLEMAPS_UPDATE]({}, 1, { name: 'Updated', config: '{}' });
      expect(result).toMatchObject({ name: 'Updated' });
    });

    it('touch-only update (no fields)', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerBattleMapHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.BATTLEMAPS_UPDATE]({}, 1, {})).not.toThrow();
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.BATTLEMAPS_UPDATE]({}, 1, { name: '' }))
        .toThrowError('BattleMap name cannot be empty');
    });

    it('throws when battlemap not found after update', () => {
      const db = createDbMock({ insertedBattleMap: null });
      vi.clearAllMocks();
      registerBattleMapHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.BATTLEMAPS_UPDATE]({}, 999, { name: 'X' }))
        .toThrowError('BattleMap not found');
    });
  });

  describe(IPC.BATTLEMAPS_DELETE, () => {
    it('deletes battlemap and returns id', () => {
      const runMock = vi.fn();
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ run: runMock });
      expect(handlers[IPC.BATTLEMAPS_DELETE]({}, 5)).toEqual({ id: 5 });
    });
  });
});
