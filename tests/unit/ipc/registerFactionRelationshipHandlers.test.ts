import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerFactionRelationshipHandlers } from '../../../src/main/ipc/registerFactionRelationshipHandlers';
import type { FactionRelationshipInput } from '../../../src/shared/contracts/dbApiPayloads';
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

function buildRelationshipView(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    faction_id: 1,
    related_faction_id: 2,
    faction_label: 'Rival',
    related_label: 'Rival',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    counterpart_id: 2,
    counterpart_name: 'The Ashen Concord',
    subject_label: 'Rival',
    counterpart_label: 'Rival',
    ...overrides,
  };
}

describe('registerFactionRelationshipHandlers', () => {
  let dbMock: Database.Database;
  let handlers: Record<string, IpcHandler>;

  function createDbMock() {
    const runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));
    const getMock = vi.fn(() => buildRelationshipView());
    const allMock = vi.fn(() => [buildRelationshipView()]);
    const prepareMock = vi.fn(() => ({ run: runMock, get: getMock, all: allMock }));
    return {
      prepare: prepareMock,
    } as unknown as Database.Database;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = createDbMock();
    registerFactionRelationshipHandlers(dbMock);
    handlers = getHandlers();
  });

  describe(IPC.FACTION_RELATIONSHIPS_GET_ALL_BY_FACTION, () => {
    it('returns relationships oriented for the queried faction, binding the id positionally six times', () => {
      const result = handlers[IPC.FACTION_RELATIONSHIPS_GET_ALL_BY_FACTION]({}, 1);
      expect(result).toEqual([buildRelationshipView()]);
      const allCall = (dbMock.prepare as ReturnType<typeof vi.fn>).mock.results[0].value.all;
      expect(allCall).toHaveBeenCalledWith(1, 1, 1, 1, 1, 1);
    });
  });

  describe(IPC.FACTION_RELATIONSHIPS_ADD, () => {
    const validInput: FactionRelationshipInput = {
      faction_id: 1,
      related_faction_id: 2,
      faction_label: 'Rival',
      related_label: 'Rival',
    };

    it('inserts a new relationship and returns the freshly-inserted row', () => {
      const result = handlers[IPC.FACTION_RELATIONSHIPS_ADD]({}, validInput);
      expect(result).toEqual(buildRelationshipView());
      const insertCall = (dbMock.prepare as ReturnType<typeof vi.fn>).mock.calls.find(([sql]) =>
        String(sql).includes('INSERT INTO faction_relationships')
      );
      expect(insertCall).toBeDefined();
    });

    it('throws a friendly error when faction_id equals related_faction_id', () => {
      expect(() =>
        handlers[IPC.FACTION_RELATIONSHIPS_ADD]({}, { ...validInput, related_faction_id: 1 })
      ).toThrow('A faction cannot have a relationship with itself.');
    });

    it('throws a friendly error when either label is blank', () => {
      expect(() =>
        handlers[IPC.FACTION_RELATIONSHIPS_ADD]({}, { ...validInput, faction_label: '  ' })
      ).toThrow('Both relationship labels are required.');
    });

    it('rethrows a friendly error when the insert violates the unique constraint', () => {
      const uniqueError = Object.assign(new Error('UNIQUE constraint failed'), {
        code: 'SQLITE_CONSTRAINT_UNIQUE',
      });
      const runMock = vi.fn(() => {
        throw uniqueError;
      });
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ run: runMock });

      expect(() => handlers[IPC.FACTION_RELATIONSHIPS_ADD]({}, validInput)).toThrow(
        'A relationship with these exact labels already exists between these two factions.',
      );
    });
  });

  describe(IPC.FACTION_RELATIONSHIPS_UPDATE, () => {
    it('updates only the provided label fields and returns the updated row', () => {
      const result = handlers[IPC.FACTION_RELATIONSHIPS_UPDATE]({}, 1, {
        faction_label: 'Ally',
      });
      expect(result).toEqual(buildRelationshipView());
      const updateCall = (dbMock.prepare as ReturnType<typeof vi.fn>).mock.calls.find(([sql]) =>
        String(sql).includes('UPDATE faction_relationships')
      );
      expect(updateCall?.[0]).toContain('faction_label = ?');
      expect(updateCall?.[0]).not.toContain('related_label = ?');
    });
  });

  describe(IPC.FACTION_RELATIONSHIPS_DELETE, () => {
    it('deletes the relationship by id and returns the deleted id', () => {
      const result = handlers[IPC.FACTION_RELATIONSHIPS_DELETE]({}, 1);
      expect(result).toEqual({ id: 1 });
      const deleteCall = (dbMock.prepare as ReturnType<typeof vi.fn>).mock.calls.find(([sql]) =>
        String(sql).includes('DELETE FROM faction_relationships')
      );
      expect(deleteCall).toBeDefined();
    });
  });
});
