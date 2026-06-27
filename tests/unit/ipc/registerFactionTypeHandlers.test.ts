import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerFactionTypeHandlers } from '../../../src/main/ipc/registerFactionTypeHandlers';
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

function buildFactionType(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    world_id: 10,
    name: 'Company',
    created_at: '2026-01-01',
    ...overrides,
  };
}

class UniqueConstraintError extends Error {
  code = 'SQLITE_CONSTRAINT_UNIQUE';
}

describe('registerFactionTypeHandlers', () => {
  let dbMock: Database.Database;
  let handlers: Record<string, IpcHandler>;

  function createDbMock(options: { runImpl?: () => unknown; } = {}) {
    const runMock = vi.fn(options.runImpl ?? (() => ({ changes: 1, lastInsertRowid: 1 })));
    const getMock = vi.fn(() => buildFactionType());
    const allMock = vi.fn(() => [buildFactionType()]);
    return {
      prepare: vi.fn(() => ({ run: runMock, get: getMock, all: allMock })),
    } as unknown as Database.Database;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = createDbMock();
    registerFactionTypeHandlers(dbMock);
    handlers = getHandlers();
  });

  describe(IPC.FACTION_TYPES_GET_ALL_BY_WORLD, () => {
    it('returns all faction types for a world', () => {
      const mockAll = vi.fn(() => [buildFactionType()]);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });
      expect(handlers[IPC.FACTION_TYPES_GET_ALL_BY_WORLD]({}, 10)).toEqual([buildFactionType()]);
    });
  });

  describe(IPC.FACTION_TYPES_ADD, () => {
    it('creates a faction type', () => {
      const result = handlers[IPC.FACTION_TYPES_ADD]({}, { world_id: 10, name: 'Company' });
      expect(result).toMatchObject({ name: 'Company' });
    });

    it('throws when world_id is missing', () => {
      expect(() => handlers[IPC.FACTION_TYPES_ADD]({}, { name: 'Company' }))
        .toThrowError('Faction type world_id is required');
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.FACTION_TYPES_ADD]({}, { world_id: 10, name: '' }))
        .toThrowError('Faction type name is required');
    });

    it('throws a friendly error on duplicate name', () => {
      const db = createDbMock({
        runImpl: () => {
          throw new UniqueConstraintError('UNIQUE constraint failed');
        },
      });
      registerFactionTypeHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.FACTION_TYPES_ADD]({}, { world_id: 10, name: 'Company' }))
        .toThrowError('A faction type with this name already exists.');
    });
  });

  describe(IPC.FACTION_TYPES_RENAME, () => {
    it('renames a faction type', () => {
      const result = handlers[IPC.FACTION_TYPES_RENAME]({}, 1, 'Renamed');
      expect(result).toMatchObject({ name: 'Company' });
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.FACTION_TYPES_RENAME]({}, 1, ''))
        .toThrowError('Faction type name is required');
    });

    it('throws a friendly error on duplicate name', () => {
      const db = createDbMock({
        runImpl: () => {
          throw new UniqueConstraintError('UNIQUE constraint failed');
        },
      });
      registerFactionTypeHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.FACTION_TYPES_RENAME]({}, 1, 'Company'))
        .toThrowError('A faction type with this name already exists.');
    });
  });

  describe(IPC.FACTION_TYPES_DELETE, () => {
    it('deletes a faction type and returns id', () => {
      const runMock = vi.fn();
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ run: runMock });
      expect(handlers[IPC.FACTION_TYPES_DELETE]({}, 5)).toEqual({ id: 5 });
    });
  });
});
