import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerLevelHandlers } from '../../../src/main/ipc/registerLevelHandlers';
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

function buildLevel(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    world_id: 10,
    name: 'Level One',
    category: 'dungeon',
    description: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('registerLevelHandlers', () => {
  let runMock: ReturnType<typeof vi.fn>;
  let getMock: ReturnType<typeof vi.fn>;
  let allMock: ReturnType<typeof vi.fn>;
  let dbMock: Database.Database;
  let handlers: Record<string, IpcHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));
    getMock = vi.fn(() => buildLevel());
    allMock = vi.fn(() => [buildLevel()]);
    dbMock = {
      prepare: vi.fn(() => ({ run: runMock, get: getMock, all: allMock })),
    } as unknown as Database.Database;
    registerLevelHandlers(dbMock);
    handlers = getHandlers();
  });

  describe(IPC.LEVELS_GET_ALL_BY_WORLD, () => {
    it('returns levels for world', () => {
      expect(handlers[IPC.LEVELS_GET_ALL_BY_WORLD]({}, 10)).toEqual([buildLevel()]);
      expect(allMock).toHaveBeenCalledWith(10);
    });
  });

  describe(IPC.LEVELS_GET_BY_ID, () => {
    it('returns level by id', () => {
      expect(handlers[IPC.LEVELS_GET_BY_ID]({}, 1)).toEqual(buildLevel());
    });

    it('returns null when not found', () => {
      getMock.mockReturnValueOnce(undefined);
      expect(handlers[IPC.LEVELS_GET_BY_ID]({}, 999)).toBeNull();
    });
  });

  describe(IPC.LEVELS_ADD, () => {
    it('creates level with all fields', () => {
      const result = handlers[IPC.LEVELS_ADD]({}, {
        world_id: 10,
        name: 'Dungeon Level',
        category: 'dungeon',
        description: 'Dark and damp',
      });
      expect(result).toEqual(buildLevel());
      expect(runMock).toHaveBeenCalledWith(10, 'Dungeon Level', 'dungeon', 'Dark and damp');
    });

    it('defaults description to null', () => {
      handlers[IPC.LEVELS_ADD]({}, { world_id: 10, name: 'Level', category: 'outdoor' });
      expect(runMock).toHaveBeenCalledWith(10, 'Level', 'outdoor', null);
    });

    it('trims name and category', () => {
      handlers[IPC.LEVELS_ADD]({}, { world_id: 10, name: '  Name  ', category: '  cat  ' });
      expect(runMock).toHaveBeenCalledWith(10, 'Name', 'cat', null);
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.LEVELS_ADD]({}, { world_id: 10, name: '', category: 'x' }))
        .toThrowError('Level name is required');
    });

    it('throws when category is empty', () => {
      expect(() => handlers[IPC.LEVELS_ADD]({}, { world_id: 10, name: 'X', category: '' }))
        .toThrowError('Level category is required');
    });

    it('throws when level not found after insert', () => {
      getMock.mockReturnValueOnce(undefined);
      expect(() => handlers[IPC.LEVELS_ADD]({}, { world_id: 10, name: 'X', category: 'y' }))
        .toThrowError('Failed to create level');
    });
  });

  describe(IPC.LEVELS_UPDATE, () => {
    it('updates name, category, description and returns level', () => {
      const result = handlers[IPC.LEVELS_UPDATE]({}, 1, {
        name: 'Updated',
        category: 'city',
        description: 'New desc',
      });
      expect(result).toEqual(buildLevel());
    });

    it('touch-only update (no fields)', () => {
      handlers[IPC.LEVELS_UPDATE]({}, 1, {});
      // touch-only path: no setClauses, uses datetime-only SQL
      expect(runMock).toHaveBeenCalledWith(1);
    });

    it('updates only name', () => {
      handlers[IPC.LEVELS_UPDATE]({}, 1, { name: 'OnlyName' });
      expect(runMock).toHaveBeenCalledWith('OnlyName', 1);
    });

    it('updates only category', () => {
      handlers[IPC.LEVELS_UPDATE]({}, 1, { category: 'forest' });
      expect(runMock).toHaveBeenCalledWith('forest', 1);
    });

    it('updates only description', () => {
      handlers[IPC.LEVELS_UPDATE]({}, 1, { description: 'Desc' });
      expect(runMock).toHaveBeenCalledWith('Desc', 1);
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.LEVELS_UPDATE]({}, 1, { name: '' }))
        .toThrowError('Level name cannot be empty');
    });

    it('throws when category is empty', () => {
      expect(() => handlers[IPC.LEVELS_UPDATE]({}, 1, { category: '' }))
        .toThrowError('Level category cannot be empty');
    });

    it('throws when level not found after update', () => {
      getMock.mockReturnValueOnce(undefined);
      expect(() => handlers[IPC.LEVELS_UPDATE]({}, 999, { name: 'X' }))
        .toThrowError('Level not found');
    });
  });

  describe(IPC.LEVELS_DELETE, () => {
    it('deletes level and returns id', () => {
      expect(handlers[IPC.LEVELS_DELETE]({}, 7)).toEqual({ id: 7 });
      expect(runMock).toHaveBeenCalledWith(7);
    });
  });
});
