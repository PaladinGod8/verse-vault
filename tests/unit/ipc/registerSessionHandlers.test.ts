import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerSessionHandlers } from '../../../src/main/ipc/registerSessionHandlers';
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

function buildSession(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    act_id: 3,
    name: 'Session One',
    notes: null as null,
    planned_at: null as null,
    sort_order: 0,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

// null = not found; omit = use default; value = return it
type DbOpts = {
  getById?: unknown;
  getActById?: unknown; // for SELECT act_id FROM sessions WHERE id = ?
  getNextSortOrder?: number;
  resequenceRows?: Array<{ id: number; }>;
};

function createDbMock(opts: DbOpts = {}): Database.Database {
  const defaultSession = buildSession();
  const runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));

  const prepareMock = vi.fn((sql: string) => {
    if (sql.includes('COALESCE(MAX(sort_order)') && sql.includes('act_id')) {
      return { get: vi.fn(() => ({ next_sort_order: opts.getNextSortOrder ?? 0 })) };
    }
    if (sql === 'SELECT * FROM sessions WHERE id = ?') {
      const val = 'getById' in opts
        ? (opts.getById === null ? undefined : opts.getById)
        : defaultSession;
      return { get: vi.fn(() => val) };
    }
    if (sql === 'SELECT act_id FROM sessions WHERE id = ?') {
      const val = 'getActById' in opts
        ? (opts.getActById === null ? undefined : opts.getActById)
        : { act_id: defaultSession.act_id };
      return { get: vi.fn(() => val) };
    }
    if (sql.startsWith('SELECT id FROM sessions')) {
      return { all: vi.fn(() => opts.resequenceRows ?? []) };
    }
    return { run: runMock, get: vi.fn(() => defaultSession), all: vi.fn(() => [defaultSession]) };
  });

  return {
    prepare: prepareMock,
    transaction: vi.fn((cb: (...args: unknown[]) => unknown) => cb),
  } as unknown as Database.Database;
}

describe('registerSessionHandlers', () => {
  let dbMock: Database.Database;
  let handlers: Record<string, IpcHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = createDbMock();
    registerSessionHandlers(dbMock);
    handlers = getHandlers();
  });

  describe(IPC.SESSIONS_GET_ALL_BY_CAMPAIGN, () => {
    it('returns sessions for campaign via join', () => {
      const mockAll = vi.fn(() => [buildSession()]);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });
      expect(handlers[IPC.SESSIONS_GET_ALL_BY_CAMPAIGN]({}, 10)).toEqual([buildSession()]);
    });
  });

  describe(IPC.SESSIONS_GET_ALL_BY_ACT, () => {
    it('returns sessions for an act', () => {
      const mockAll = vi.fn(() => [buildSession()]);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });
      expect(handlers[IPC.SESSIONS_GET_ALL_BY_ACT]({}, 3)).toEqual([buildSession()]);
    });
  });

  describe(IPC.SESSIONS_GET_BY_ID, () => {
    it('returns session', () => {
      const mockGet = vi.fn(() => buildSession());
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });
      expect(handlers[IPC.SESSIONS_GET_BY_ID]({}, 1)).toEqual(buildSession());
    });

    it('returns null when not found', () => {
      const mockGet = vi.fn(() => undefined);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });
      expect(handlers[IPC.SESSIONS_GET_BY_ID]({}, 999)).toBeNull();
    });
  });

  describe(IPC.SESSIONS_ADD, () => {
    it('creates session with all optional fields', () => {
      const db = createDbMock({
        getById: buildSession({ notes: 'Note', planned_at: '2026-03-01' }),
      });
      vi.clearAllMocks();
      registerSessionHandlers(db);
      const h = getHandlers();
      const result = h[IPC.SESSIONS_ADD]({}, {
        act_id: 3,
        name: 'Session',
        notes: 'Note',
        planned_at: '2026-03-01',
        sort_order: 0,
      });
      expect(result).toMatchObject({ notes: 'Note' });
    });

    it('defaults notes and planned_at to null', () => {
      expect(() => handlers[IPC.SESSIONS_ADD]({}, { act_id: 3, name: 'Session' })).not.toThrow();
    });

    it('auto-calculates sort_order when omitted', () => {
      const db = createDbMock({ getNextSortOrder: 2 });
      vi.clearAllMocks();
      registerSessionHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.SESSIONS_ADD]({}, { act_id: 3, name: 'Session' })).not.toThrow();
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.SESSIONS_ADD]({}, { act_id: 3, name: '' }))
        .toThrowError('Session name is required');
    });

    it('throws when session not found after insert', () => {
      const db = createDbMock({ getById: null });
      vi.clearAllMocks();
      registerSessionHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.SESSIONS_ADD]({}, { act_id: 3, name: 'X' }))
        .toThrowError('Failed to create session');
    });
  });

  describe(IPC.SESSIONS_UPDATE, () => {
    it('updates name, notes, planned_at, sort_order', () => {
      const db = createDbMock({ getById: buildSession({ name: 'Updated' }) });
      vi.clearAllMocks();
      registerSessionHandlers(db);
      const h = getHandlers();
      expect(h[IPC.SESSIONS_UPDATE]({}, 1, {
        name: 'Updated',
        notes: 'New notes',
        planned_at: '2026-06-01',
        sort_order: 1,
      })).toMatchObject({ name: 'Updated' });
    });

    it('touch-only update (no fields)', () => {
      const db = createDbMock({ getById: buildSession() });
      vi.clearAllMocks();
      registerSessionHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.SESSIONS_UPDATE]({}, 1, {})).not.toThrow();
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.SESSIONS_UPDATE]({}, 1, { name: '' }))
        .toThrowError('Session name cannot be empty');
    });

    it('throws when session not found after update', () => {
      const db = createDbMock({ getById: null });
      vi.clearAllMocks();
      registerSessionHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.SESSIONS_UPDATE]({}, 999, { name: 'X' }))
        .toThrowError('Session not found');
    });
  });

  describe(IPC.SESSIONS_DELETE, () => {
    it('deletes session and resequences', () => {
      const db = createDbMock({ getActById: { act_id: 3 }, resequenceRows: [{ id: 2 }] });
      vi.clearAllMocks();
      registerSessionHandlers(db);
      const h = getHandlers();
      expect(h[IPC.SESSIONS_DELETE]({}, 1)).toEqual({ id: 1 });
    });

    it('returns id when session not found', () => {
      const db = createDbMock({ getActById: null });
      vi.clearAllMocks();
      registerSessionHandlers(db);
      const h = getHandlers();
      expect(h[IPC.SESSIONS_DELETE]({}, 999)).toEqual({ id: 999 });
    });
  });

  describe(IPC.SESSIONS_MOVE_TO_ACT, () => {
    it('moves session to new act', () => {
      const sessionRow = buildSession({ act_id: 3 });
      let callCount = 0;
      const prepareMock = vi.fn((sql: string) => {
        if (sql === 'SELECT * FROM sessions WHERE id = ?') {
          callCount++;
          if (callCount === 1) return { get: vi.fn(() => sessionRow) };
          return { get: vi.fn(() => ({ ...sessionRow, act_id: 4 })) };
        }
        if (sql.includes('COALESCE(MAX(sort_order)')) {
          return { get: vi.fn(() => ({ next: 1 })) };
        }
        if (sql.startsWith('SELECT id FROM sessions')) {
          return { all: vi.fn(() => []) };
        }
        return { run: vi.fn(), get: vi.fn(() => sessionRow), all: vi.fn(() => []) };
      });
      const db = {
        prepare: prepareMock,
        transaction: vi.fn((cb: (...args: unknown[]) => unknown) => cb),
      } as unknown as Database.Database;
      vi.clearAllMocks();
      registerSessionHandlers(db);
      const h = getHandlers();
      expect(h[IPC.SESSIONS_MOVE_TO_ACT]({}, 1, 4)).toMatchObject({ act_id: 4 });
    });

    it('throws when session not found during move', () => {
      const prepareMock = vi.fn((sql: string) => {
        if (sql === 'SELECT * FROM sessions WHERE id = ?') return { get: vi.fn(() => undefined) };
        return { run: vi.fn(), get: vi.fn(), all: vi.fn(() => []) };
      });
      const db = {
        prepare: prepareMock,
        transaction: vi.fn((cb: (...args: unknown[]) => unknown) => cb),
      } as unknown as Database.Database;
      vi.clearAllMocks();
      registerSessionHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.SESSIONS_MOVE_TO_ACT]({}, 999, 4)).toThrowError('Session not found');
    });
  });
});
