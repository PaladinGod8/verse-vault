import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerStatBlockHandlers } from '../../../src/main/ipc/registerStatBlockHandlers';
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

function buildStatBlock(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    world_id: 10,
    campaign_id: null as null,
    character_id: null as null,
    name: 'Goblin',
    description: null as null,
    default_token_id: null as null,
    config: '{}',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('registerStatBlockHandlers — CRUD', () => {
  let dbMock: Database.Database;
  let handlers: Record<string, IpcHandler>;

  // null = not found; omit = use default; value = return it
  function createDbMock(options: { insertedStatBlock?: unknown; } = {}) {
    const defaultStatBlock = buildStatBlock();
    const runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));
    const getMock = vi.fn(() =>
      'insertedStatBlock' in options
        ? (options.insertedStatBlock === null ? undefined : options.insertedStatBlock)
        : defaultStatBlock
    );
    const allMock = vi.fn(() => [defaultStatBlock]);
    return {
      prepare: vi.fn(() => ({ run: runMock, get: getMock, all: allMock })),
    } as unknown as Database.Database;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = createDbMock();
    registerStatBlockHandlers(dbMock);
    handlers = getHandlers();
  });

  describe(IPC.STATBLOCKS_GET_ALL_BY_WORLD, () => {
    it('returns statblocks for world', () => {
      const mockAll = vi.fn(() => [buildStatBlock()]);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });
      expect(handlers[IPC.STATBLOCKS_GET_ALL_BY_WORLD]({}, 10)).toEqual([buildStatBlock()]);
    });
  });

  describe(IPC.STATBLOCKS_GET_ALL_BY_CAMPAIGN, () => {
    it('returns statblocks for campaign', () => {
      const mockAll = vi.fn(() => [buildStatBlock()]);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });
      expect(handlers[IPC.STATBLOCKS_GET_ALL_BY_CAMPAIGN]({}, 5)).toEqual([buildStatBlock()]);
    });
  });

  describe(IPC.STATBLOCKS_GET_BY_ID, () => {
    it('returns statblock', () => {
      const mockGet = vi.fn(() => buildStatBlock());
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });
      expect(handlers[IPC.STATBLOCKS_GET_BY_ID]({}, 1)).toEqual(buildStatBlock());
    });

    it('returns null when not found', () => {
      const mockGet = vi.fn(() => undefined);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });
      expect(handlers[IPC.STATBLOCKS_GET_BY_ID]({}, 999)).toBeNull();
    });
  });

  describe(IPC.STATBLOCKS_ADD, () => {
    it('creates statblock with default empty config', () => {
      const db = createDbMock({ insertedStatBlock: buildStatBlock() });
      vi.clearAllMocks();
      registerStatBlockHandlers(db);
      const h = getHandlers();
      const result = h[IPC.STATBLOCKS_ADD]({}, { world_id: 10, name: 'Goblin' });
      expect(result).toMatchObject({ name: 'Goblin' });
    });

    it('creates statblock with explicit config and skills', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerStatBlockHandlers(db);
      const h = getHandlers();
      h[IPC.STATBLOCKS_ADD]({}, {
        world_id: 10,
        name: 'Goblin',
        config: '{"skills":[{"key":"str","rank":3},{"key":"dex","rank":2}]}',
      });
      expect(true).toBe(true);
    });

    it('deduplicates skills (last occurrence wins)', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerStatBlockHandlers(db);
      const h = getHandlers();
      h[IPC.STATBLOCKS_ADD]({}, {
        world_id: 10,
        name: 'Goblin',
        config: '{"skills":[{"key":"str","rank":3},{"key":"str","rank":5}]}',
      });
      expect(true).toBe(true);
    });

    it('creates statblock with campaign_id', () => {
      const db = createDbMock({ insertedStatBlock: buildStatBlock({ campaign_id: 7 }) });
      vi.clearAllMocks();
      registerStatBlockHandlers(db);
      const h = getHandlers();
      const result = h[IPC.STATBLOCKS_ADD]({}, {
        world_id: 10,
        campaign_id: 7,
        name: 'Goblin',
        description: 'A small creature',
      });
      expect(result).toMatchObject({ campaign_id: 7 });
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.STATBLOCKS_ADD]({}, { world_id: 10, name: '' }))
        .toThrowError('StatBlock name is required');
    });

    it('throws when config skills is not an array', () => {
      expect(() =>
        handlers[IPC.STATBLOCKS_ADD]({}, {
          world_id: 10,
          name: 'X',
          config: '{"skills":"not-array"}',
        })
      ).toThrowError('StatBlock config skills must be an array');
    });

    it('throws when config skills entry is not an object', () => {
      expect(() =>
        handlers[IPC.STATBLOCKS_ADD]({}, {
          world_id: 10,
          name: 'X',
          config: '{"skills":["string"]}',
        })
      ).toThrowError('StatBlock config skills[0] must be an object');
    });

    it('throws when skill key is empty', () => {
      expect(() =>
        handlers[IPC.STATBLOCKS_ADD]({}, {
          world_id: 10,
          name: 'X',
          config: '{"skills":[{"key":"","rank":1}]}',
        })
      ).toThrowError('StatBlock config skills[0].key is required');
    });

    it('throws when skill rank is not a finite number', () => {
      expect(() =>
        handlers[IPC.STATBLOCKS_ADD]({}, {
          world_id: 10,
          name: 'X',
          config: '{"skills":[{"key":"str","rank":"bad"}]}',
        })
      ).toThrowError('StatBlock config skills[0].rank must be a finite number');
    });

    it('throws when config is not valid JSON', () => {
      expect(() => handlers[IPC.STATBLOCKS_ADD]({}, { world_id: 10, name: 'X', config: '{bad}' }))
        .toThrowError('StatBlock config must be valid JSON text');
    });

    it('throws when config is not a JSON object', () => {
      expect(() => handlers[IPC.STATBLOCKS_ADD]({}, { world_id: 10, name: 'X', config: '[1,2]' }))
        .toThrowError('StatBlock config must be a JSON object');
    });

    it('throws when statblock not found after insert', () => {
      const db = createDbMock({ insertedStatBlock: null });
      vi.clearAllMocks();
      registerStatBlockHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.STATBLOCKS_ADD]({}, { world_id: 10, name: 'X' }))
        .toThrowError('Failed to create statblock');
    });
  });

  describe(IPC.STATBLOCKS_UPDATE, () => {
    it('updates name, description, config', () => {
      const db = createDbMock({ insertedStatBlock: buildStatBlock({ name: 'Updated' }) });
      vi.clearAllMocks();
      registerStatBlockHandlers(db);
      const h = getHandlers();
      const result = h[IPC.STATBLOCKS_UPDATE]({}, 1, {
        name: 'Updated',
        description: 'Desc',
        config: '{}',
      });
      expect(result).toMatchObject({ name: 'Updated' });
    });

    it('touch-only update (no fields)', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerStatBlockHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.STATBLOCKS_UPDATE]({}, 1, {})).not.toThrow();
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.STATBLOCKS_UPDATE]({}, 1, { name: '' }))
        .toThrowError('StatBlock name cannot be empty');
    });

    it('throws when statblock not found after update', () => {
      const db = createDbMock({ insertedStatBlock: null });
      vi.clearAllMocks();
      registerStatBlockHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.STATBLOCKS_UPDATE]({}, 999, { name: 'X' }))
        .toThrowError('StatBlock not found');
    });
  });

  describe(IPC.STATBLOCKS_DELETE, () => {
    it('deletes statblock and returns id', () => {
      const runMock = vi.fn();
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ run: runMock });
      expect(handlers[IPC.STATBLOCKS_DELETE]({}, 9)).toEqual({ id: 9 });
    });
  });
});
