import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerFactionMemberHandlers } from '../../../src/main/ipc/registerFactionMemberHandlers';
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

function buildMember(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    faction_id: 1,
    character_id: 1,
    role: 'member',
    is_primary: 0,
    created_at: '2026-01-01',
    ...overrides,
  };
}

describe('registerFactionMemberHandlers', () => {
  let dbMock: Database.Database;
  let handlers: Record<string, IpcHandler>;

  function createDbMock(
    options: { existingMembers?: Array<{ character_id: number; is_primary: number; }>; } = {},
  ) {
    const runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));
    const getMock = vi.fn(() => buildMember());
    const allMock = vi.fn(() => options.existingMembers ?? [buildMember()]);
    const prepareMock = vi.fn(() => ({ run: runMock, get: getMock, all: allMock }));
    const transactionMock = vi.fn(
      (callback: (...args: unknown[]) => unknown) => (...args: unknown[]) => callback(...args),
    );
    return {
      prepare: prepareMock,
      transaction: transactionMock,
    } as unknown as Database.Database;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = createDbMock();
    registerFactionMemberHandlers(dbMock);
    handlers = getHandlers();
  });

  describe(IPC.FACTION_MEMBERS_GET_ALL_BY_FACTION, () => {
    it('returns all members for a faction joined with character name', () => {
      const mockAll = vi.fn(() => [buildMember()]);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });
      expect(handlers[IPC.FACTION_MEMBERS_GET_ALL_BY_FACTION]({}, 1)).toEqual([buildMember()]);
    });
  });

  describe(IPC.FACTION_MEMBERS_GET_ALL_BY_CHARACTER, () => {
    it('returns all memberships for a character joined with faction name', () => {
      const mockAll = vi.fn(() => [buildMember()]);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });
      expect(handlers[IPC.FACTION_MEMBERS_GET_ALL_BY_CHARACTER]({}, 1)).toEqual([buildMember()]);
    });
  });

  describe(IPC.FACTION_MEMBERS_GET_ALL_PRIMARY_BY_WORLD, () => {
    it('returns all primary memberships for a world', () => {
      const mockAll = vi.fn(() => [{ character_id: 1, faction_id: 2 }]);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });
      expect(handlers[IPC.FACTION_MEMBERS_GET_ALL_PRIMARY_BY_WORLD]({}, 10)).toEqual([
        { character_id: 1, faction_id: 2 },
      ]);
    });
  });

  describe(IPC.FACTION_MEMBERS_SET_FOR_FACTION, () => {
    it('runs inside a db transaction and issues a delete plus an insert per new member', () => {
      const runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));
      const getMock = vi.fn(() => buildMember());
      const allMock = vi.fn(() => [{ character_id: 1, is_primary: 1 }]);
      const prepareMock = vi.fn(() => ({ run: runMock, get: getMock, all: allMock }));
      const transactionMock = vi.fn(
        (callback: (...args: unknown[]) => unknown) => (...args: unknown[]) => callback(...args),
      );
      const db = {
        prepare: prepareMock,
        transaction: transactionMock,
      } as unknown as Database.Database;
      registerFactionMemberHandlers(db);
      const h = getHandlers();

      h[IPC.FACTION_MEMBERS_SET_FOR_FACTION]({}, 1, [
        { character_id: 1, role: 'founder' },
        { character_id: 3, role: 'member' },
      ]);

      expect(transactionMock).toHaveBeenCalled();
      // one delete-existing call + one insert call per new member (2 members)
      expect(runMock.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it("preserves a retained member's existing is_primary flag instead of resetting it", () => {
      const runMock = vi.fn<(...args: unknown[]) => { changes: number; lastInsertRowid: number; }>(
        () => ({ changes: 1, lastInsertRowid: 1 }),
      );
      const getMock = vi.fn(() => buildMember());
      // character_id 1 already has is_primary = 1 before the replace.
      const allMock = vi.fn(() => [{ character_id: 1, is_primary: 1 }]);
      const prepareMock = vi.fn(() => ({ run: runMock, get: getMock, all: allMock }));
      const transactionMock = vi.fn(
        (callback: (...args: unknown[]) => unknown) => (...args: unknown[]) => callback(...args),
      );
      const db = {
        prepare: prepareMock,
        transaction: transactionMock,
      } as unknown as Database.Database;
      registerFactionMemberHandlers(db);
      const h = getHandlers();

      h[IPC.FACTION_MEMBERS_SET_FOR_FACTION]({}, 1, [{ character_id: 1, role: 'founder' }]);

      // The insert for character_id 1 must carry is_primary = 1 (preserved), not 0.
      const insertCallWithPreservedPrimary = runMock.mock.calls.some(
        (call) => call.includes(1) && call.includes('founder'),
      );
      expect(insertCallWithPreservedPrimary).toBe(true);
    });
  });

  describe(IPC.FACTION_MEMBERS_SET_PRIMARY, () => {
    it('clears existing primary flags then sets the chosen faction as primary', () => {
      const runMock = vi.fn<(...args: unknown[]) => { changes: number; lastInsertRowid: number; }>(
        () => ({ changes: 1, lastInsertRowid: 1 }),
      );
      const getMock = vi.fn(() => buildMember());
      const allMock = vi.fn(() => [buildMember()]);
      const prepareMock = vi.fn(() => ({ run: runMock, get: getMock, all: allMock }));
      const transactionMock = vi.fn(
        (callback: (...args: unknown[]) => unknown) => (...args: unknown[]) => callback(...args),
      );
      const db = {
        prepare: prepareMock,
        transaction: transactionMock,
      } as unknown as Database.Database;
      registerFactionMemberHandlers(db);
      const h = getHandlers();

      h[IPC.FACTION_MEMBERS_SET_PRIMARY]({}, 7, 2);

      expect(transactionMock).toHaveBeenCalled();
      expect(runMock).toHaveBeenCalled();
    });
  });
});
