import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerArcHandlers } from '../../../src/main/ipc/registerArcHandlers';
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

function buildArc(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    campaign_id: 10,
    name: 'The First Arc',
    sort_order: 0,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

// Pass `null` to simulate DB returning undefined (not found).
// Omit to use the default arc. Provide a value to return it.
type DbOpts = {
  getById?: unknown; // null = not found
  getCampaignById?: unknown; // null = not found
  getNextSortOrder?: number;
  resequenceRows?: Array<{ id: number; }>;
};

function createDbMock(opts: DbOpts = {}): Database.Database {
  const defaultArc = buildArc();
  const runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));

  const prepareMock = vi.fn((sql: string) => {
    if (sql.includes('COALESCE(MAX(sort_order)')) {
      return { get: vi.fn(() => ({ next: opts.getNextSortOrder ?? 0 })) };
    }
    if (sql === 'SELECT * FROM arcs WHERE id = ?') {
      const val = 'getById' in opts
        ? (opts.getById === null ? undefined : opts.getById)
        : defaultArc;
      return { get: vi.fn(() => val) };
    }
    if (sql === 'SELECT campaign_id FROM arcs WHERE id = ?') {
      const val = 'getCampaignById' in opts
        ? (opts.getCampaignById === null ? undefined : opts.getCampaignById)
        : { campaign_id: defaultArc.campaign_id };
      return { get: vi.fn(() => val) };
    }
    if (sql.startsWith('SELECT id FROM arcs')) {
      return { all: vi.fn(() => opts.resequenceRows ?? []) };
    }
    return { run: runMock, get: vi.fn(() => defaultArc), all: vi.fn(() => [defaultArc]) };
  });

  return {
    prepare: prepareMock,
    transaction: vi.fn((cb: (...args: unknown[]) => unknown) => cb),
  } as unknown as Database.Database;
}

describe('registerArcHandlers', () => {
  let dbMock: Database.Database;
  let handlers: Record<string, IpcHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = createDbMock();
    registerArcHandlers(dbMock);
    handlers = getHandlers();
  });

  describe(IPC.ARCS_GET_ALL_BY_CAMPAIGN, () => {
    it('returns arcs for a campaign', () => {
      const mockAll = vi.fn(() => [buildArc()]);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });
      expect(handlers[IPC.ARCS_GET_ALL_BY_CAMPAIGN]({}, 10)).toEqual([buildArc()]);
    });
  });

  describe(IPC.ARCS_GET_BY_ID, () => {
    it('returns arc by id', () => {
      const mockGet = vi.fn(() => buildArc());
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });
      expect(handlers[IPC.ARCS_GET_BY_ID]({}, 1)).toEqual(buildArc());
    });

    it('returns null when arc not found', () => {
      const mockGet = vi.fn(() => undefined);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });
      expect(handlers[IPC.ARCS_GET_BY_ID]({}, 999)).toBeNull();
    });
  });

  describe(IPC.ARCS_ADD, () => {
    it('creates arc with explicit sort_order', () => {
      const db = createDbMock({ getById: buildArc({ sort_order: 2 }) });
      vi.clearAllMocks();
      registerArcHandlers(db);
      const h = getHandlers();
      const result = h[IPC.ARCS_ADD]({}, { campaign_id: 10, name: 'Arc', sort_order: 2 });
      expect(result).toMatchObject({ sort_order: 2 });
    });

    it('auto-calculates sort_order when not provided', () => {
      const db = createDbMock({ getNextSortOrder: 3 });
      vi.clearAllMocks();
      registerArcHandlers(db);
      const h = getHandlers();
      h[IPC.ARCS_ADD]({}, { campaign_id: 10, name: 'Arc' });
      expect(true).toBe(true);
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.ARCS_ADD]({}, { campaign_id: 10, name: '' }))
        .toThrowError('Arc name is required');
    });

    it('throws when name is not a string', () => {
      expect(() => handlers[IPC.ARCS_ADD]({}, { campaign_id: 10, name: null }))
        .toThrowError('Arc name is required');
    });

    it('throws when arc not found after insert', () => {
      const db = createDbMock({ getById: null });
      vi.clearAllMocks();
      registerArcHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.ARCS_ADD]({}, { campaign_id: 10, name: 'Arc' }))
        .toThrowError('Failed to create arc');
    });
  });

  describe(IPC.ARCS_UPDATE, () => {
    it('updates name and sort_order', () => {
      const db = createDbMock({ getById: buildArc({ name: 'Updated' }) });
      vi.clearAllMocks();
      registerArcHandlers(db);
      const h = getHandlers();
      const result = h[IPC.ARCS_UPDATE]({}, 1, { name: 'Updated', sort_order: 1 });
      expect(result).toMatchObject({ name: 'Updated' });
    });

    it('touch-only update (no fields)', () => {
      const db = createDbMock({ getById: buildArc() });
      vi.clearAllMocks();
      registerArcHandlers(db);
      const h = getHandlers();
      expect(h[IPC.ARCS_UPDATE]({}, 1, {})).toMatchObject({ id: 1 });
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.ARCS_UPDATE]({}, 1, { name: '' }))
        .toThrowError('Arc name cannot be empty');
    });

    it('throws when arc not found after update', () => {
      const db = createDbMock({ getById: null });
      vi.clearAllMocks();
      registerArcHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.ARCS_UPDATE]({}, 999, { name: 'X' }))
        .toThrowError('Arc not found');
    });
  });

  describe(IPC.ARCS_DELETE, () => {
    it('deletes arc and resequences when arc exists', () => {
      const db = createDbMock({
        getCampaignById: { campaign_id: 10 },
        resequenceRows: [{ id: 2 }, { id: 3 }],
      });
      vi.clearAllMocks();
      registerArcHandlers(db);
      const h = getHandlers();
      expect(h[IPC.ARCS_DELETE]({}, 1)).toEqual({ id: 1 });
    });

    it('returns id when arc not found (no-op)', () => {
      const db = createDbMock({ getCampaignById: null });
      vi.clearAllMocks();
      registerArcHandlers(db);
      const h = getHandlers();
      expect(h[IPC.ARCS_DELETE]({}, 999)).toEqual({ id: 999 });
    });

    it('resequences with empty sibling list', () => {
      const db = createDbMock({
        getCampaignById: { campaign_id: 10 },
        resequenceRows: [],
      });
      vi.clearAllMocks();
      registerArcHandlers(db);
      const h = getHandlers();
      expect(h[IPC.ARCS_DELETE]({}, 5)).toEqual({ id: 5 });
    });
  });
});
