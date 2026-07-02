import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerCharacterRelationshipHandlers } from '../../../src/main/ipc/registerCharacterRelationshipHandlers';
import type { CharacterRelationshipInput } from '../../../src/shared/contracts/dbApiPayloads';
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
    character_id: 1,
    related_character_id: 2,
    character_label: 'Mentor',
    related_label: 'Student',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    counterpart_id: 2,
    counterpart_name: 'Agnes',
    subject_label: 'Mentor',
    counterpart_label: 'Student',
    ...overrides,
  };
}

describe('registerCharacterRelationshipHandlers', () => {
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
    registerCharacterRelationshipHandlers(dbMock);
    handlers = getHandlers();
  });

  describe(IPC.CHARACTER_RELATIONSHIPS_GET_ALL_BY_CHARACTER, () => {
    it('returns relationships oriented for the queried character, binding the id positionally six times', () => {
      const result = handlers[IPC.CHARACTER_RELATIONSHIPS_GET_ALL_BY_CHARACTER]({}, 1);
      expect(result).toEqual([buildRelationshipView()]);
      const allCall = (dbMock.prepare as ReturnType<typeof vi.fn>).mock.results[0].value.all;
      expect(allCall).toHaveBeenCalledWith(1, 1, 1, 1, 1, 1);
    });
  });

  describe(IPC.CHARACTER_RELATIONSHIPS_ADD, () => {
    const validInput: CharacterRelationshipInput = {
      character_id: 1,
      related_character_id: 2,
      character_label: 'Mentor',
      related_label: 'Student',
    };

    it('inserts a new relationship and returns the freshly-inserted row', () => {
      const result = handlers[IPC.CHARACTER_RELATIONSHIPS_ADD]({}, validInput);
      expect(result).toEqual(buildRelationshipView());
      const insertCall = (dbMock.prepare as ReturnType<typeof vi.fn>).mock.calls.find(([sql]) =>
        String(sql).includes('INSERT INTO character_relationships')
      );
      expect(insertCall).toBeDefined();
    });

    it('throws a friendly error when character_id equals related_character_id', () => {
      expect(() =>
        handlers[IPC.CHARACTER_RELATIONSHIPS_ADD]({}, {
          ...validInput,
          related_character_id: 1,
        })
      ).toThrow('A character cannot have a relationship with themselves.');
    });

    it('throws a friendly error when either label is blank', () => {
      expect(() =>
        handlers[IPC.CHARACTER_RELATIONSHIPS_ADD]({}, { ...validInput, character_label: '  ' })
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

      expect(() => handlers[IPC.CHARACTER_RELATIONSHIPS_ADD]({}, validInput)).toThrow(
        'A relationship with these exact labels already exists between these two characters.',
      );
    });
  });

  describe(IPC.CHARACTER_RELATIONSHIPS_UPDATE, () => {
    it('updates only the provided label fields and returns the updated row', () => {
      const result = handlers[IPC.CHARACTER_RELATIONSHIPS_UPDATE]({}, 1, {
        character_label: 'Rival',
      });
      expect(result).toEqual(buildRelationshipView());
      const updateCall = (dbMock.prepare as ReturnType<typeof vi.fn>).mock.calls.find(([sql]) =>
        String(sql).includes('UPDATE character_relationships')
      );
      expect(updateCall?.[0]).toContain('character_label = ?');
      expect(updateCall?.[0]).not.toContain('related_label = ?');
    });

    it('rethrows a friendly error when the update violates the unique constraint', () => {
      const uniqueError = Object.assign(new Error('UNIQUE constraint failed'), {
        code: 'SQLITE_CONSTRAINT_UNIQUE',
      });
      const runMock = vi.fn(() => {
        throw uniqueError;
      });
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ run: runMock });

      expect(() =>
        handlers[IPC.CHARACTER_RELATIONSHIPS_UPDATE]({}, 1, { character_label: 'Rival' })
      ).toThrow(
        'A relationship with these exact labels already exists between these two characters.',
      );
    });
  });

  describe(IPC.CHARACTER_RELATIONSHIPS_DELETE, () => {
    it('deletes the relationship by id and returns the deleted id', () => {
      const result = handlers[IPC.CHARACTER_RELATIONSHIPS_DELETE]({}, 1);
      expect(result).toEqual({ id: 1 });
      const deleteCall = (dbMock.prepare as ReturnType<typeof vi.fn>).mock.calls.find(([sql]) =>
        String(sql).includes('DELETE FROM character_relationships')
      );
      expect(deleteCall).toBeDefined();
    });
  });
});
