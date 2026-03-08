import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerActHandlers } from '../../../src/main/ipc/registerActHandlers';
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

function buildAct(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    arc_id: 5,
    name: 'Act One',
    sort_order: 0,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

// null = not found; omit = use default; value = return it
type DbOpts = {
  getById?: unknown;
  getArcById?: unknown; // for SELECT arc_id FROM acts WHERE id = ?
  getNextSortOrder?: number;
  resequenceRows?: Array<{ id: number; }>;
};

function createDbMock(opts: DbOpts = {}): Database.Database {
  const defaultAct = buildAct();
  const runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));

  const prepareMock = vi.fn((sql: string) => {
    if (sql.includes('COALESCE(MAX(sort_order)') && sql.includes('arc_id')) {
      return { get: vi.fn(() => ({ next: opts.getNextSortOrder ?? 0 })) };
    }
    if (sql === 'SELECT * FROM acts WHERE id = ?') {
      const val = 'getById' in opts
        ? (opts.getById === null ? undefined : opts.getById)
        : defaultAct;
      return { get: vi.fn(() => val) };
    }
    if (sql === 'SELECT arc_id FROM acts WHERE id = ?') {
      const val = 'getArcById' in opts
        ? (opts.getArcById === null ? undefined : opts.getArcById)
        : { arc_id: defaultAct.arc_id };
      return { get: vi.fn(() => val) };
    }
    if (sql.startsWith('SELECT id FROM acts')) {
      return { all: vi.fn(() => opts.resequenceRows ?? []) };
    }
    return { run: runMock, get: vi.fn(() => defaultAct), all: vi.fn(() => [defaultAct]) };
  });

  return {
    prepare: prepareMock,
    transaction: vi.fn((cb: (...args: unknown[]) => unknown) => cb),
  } as unknown as Database.Database;
}

describe('registerActHandlers', () => {
  let dbMock: Database.Database;
  let handlers: Record<string, IpcHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = createDbMock();
    registerActHandlers(dbMock);
    handlers = getHandlers();
  });

  describe(IPC.ACTS_GET_ALL_BY_ARC, () => {
    it('returns acts for an arc', () => {
      const mockAll = vi.fn(() => [buildAct()]);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });
      expect(handlers[IPC.ACTS_GET_ALL_BY_ARC]({}, 5)).toEqual([buildAct()]);
    });
  });

  describe(IPC.ACTS_GET_ALL_BY_CAMPAIGN, () => {
    it('returns acts for a campaign via join', () => {
      const mockAll = vi.fn(() => [buildAct()]);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });
      expect(handlers[IPC.ACTS_GET_ALL_BY_CAMPAIGN]({}, 10)).toEqual([buildAct()]);
    });
  });

  describe(IPC.ACTS_GET_BY_ID, () => {
    it('returns act', () => {
      const mockGet = vi.fn(() => buildAct());
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });
      expect(handlers[IPC.ACTS_GET_BY_ID]({}, 1)).toEqual(buildAct());
    });

    it('returns null when not found', () => {
      const mockGet = vi.fn(() => undefined);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });
      expect(handlers[IPC.ACTS_GET_BY_ID]({}, 999)).toBeNull();
    });
  });

  describe(IPC.ACTS_ADD, () => {
    it('creates act with explicit sort_order', () => {
      const db = createDbMock({ getById: buildAct({ sort_order: 2 }) });
      vi.clearAllMocks();
      registerActHandlers(db);
      const h = getHandlers();
      expect(h[IPC.ACTS_ADD]({}, { arc_id: 5, name: 'Act', sort_order: 2 }))
        .toMatchObject({ sort_order: 2 });
    });

    it('auto-calculates sort_order when omitted', () => {
      const db = createDbMock({ getNextSortOrder: 1 });
      vi.clearAllMocks();
      registerActHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.ACTS_ADD]({}, { arc_id: 5, name: 'Act' })).not.toThrow();
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.ACTS_ADD]({}, { arc_id: 5, name: '' }))
        .toThrowError('Act name is required');
    });

    it('throws when act not found after insert', () => {
      const db = createDbMock({ getById: null });
      vi.clearAllMocks();
      registerActHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.ACTS_ADD]({}, { arc_id: 5, name: 'Act' }))
        .toThrowError('Failed to create act');
    });
  });

  describe(IPC.ACTS_UPDATE, () => {
    it('updates name and sort_order', () => {
      const db = createDbMock({ getById: buildAct({ name: 'Updated' }) });
      vi.clearAllMocks();
      registerActHandlers(db);
      const h = getHandlers();
      expect(h[IPC.ACTS_UPDATE]({}, 1, { name: 'Updated', sort_order: 1 }))
        .toMatchObject({ name: 'Updated' });
    });

    it('touch-only update succeeds', () => {
      const db = createDbMock({ getById: buildAct() });
      vi.clearAllMocks();
      registerActHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.ACTS_UPDATE]({}, 1, {})).not.toThrow();
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.ACTS_UPDATE]({}, 1, { name: '' }))
        .toThrowError('Act name cannot be empty');
    });

    it('throws when act not found after update', () => {
      const db = createDbMock({ getById: null });
      vi.clearAllMocks();
      registerActHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.ACTS_UPDATE]({}, 999, { name: 'X' }))
        .toThrowError('Act not found');
    });
  });

  describe(IPC.ACTS_DELETE, () => {
    it('deletes act and resequences', () => {
      const db = createDbMock({
        getArcById: { arc_id: 5 },
        resequenceRows: [{ id: 2 }],
      });
      vi.clearAllMocks();
      registerActHandlers(db);
      const h = getHandlers();
      expect(h[IPC.ACTS_DELETE]({}, 1)).toEqual({ id: 1 });
    });

    it('returns id when act not found', () => {
      const db = createDbMock({ getArcById: null });
      vi.clearAllMocks();
      registerActHandlers(db);
      const h = getHandlers();
      expect(h[IPC.ACTS_DELETE]({}, 999)).toEqual({ id: 999 });
    });
  });

  describe(IPC.ACTS_MOVE_TO_ARC, () => {
    it('moves act to new arc', () => {
      const actRow = buildAct({ arc_id: 5 });
      let callCount = 0;
      const prepareMock = vi.fn((sql: string) => {
        if (sql === 'SELECT * FROM acts WHERE id = ?') {
          callCount++;
          if (callCount === 1) return { get: vi.fn(() => actRow) };
          return { get: vi.fn(() => ({ ...actRow, arc_id: 6 })) };
        }
        if (sql.includes('COALESCE(MAX(sort_order)')) {
          return { get: vi.fn(() => ({ next: 1 })) };
        }
        if (sql.startsWith('SELECT id FROM acts')) {
          return { all: vi.fn(() => []) };
        }
        return {
          run: vi.fn(() => ({ changes: 1 })),
          get: vi.fn(() => actRow),
          all: vi.fn(() => []),
        };
      });
      const db = {
        prepare: prepareMock,
        transaction: vi.fn((cb: (...args: unknown[]) => unknown) => cb),
      } as unknown as Database.Database;
      vi.clearAllMocks();
      registerActHandlers(db);
      const h = getHandlers();
      expect(h[IPC.ACTS_MOVE_TO_ARC]({}, 1, 6)).toMatchObject({ arc_id: 6 });
    });

    it('throws when act not found during move', () => {
      const prepareMock = vi.fn((sql: string) => {
        if (sql === 'SELECT * FROM acts WHERE id = ?') return { get: vi.fn(() => undefined) };
        return { run: vi.fn(), get: vi.fn(), all: vi.fn(() => []) };
      });
      const db = {
        prepare: prepareMock,
        transaction: vi.fn((cb: (...args: unknown[]) => unknown) => cb),
      } as unknown as Database.Database;
      vi.clearAllMocks();
      registerActHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.ACTS_MOVE_TO_ARC]({}, 999, 6)).toThrowError('Act not found');
    });
  });
});
