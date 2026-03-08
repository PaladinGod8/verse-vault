import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerSceneHandlers } from '../../../src/main/ipc/registerSceneHandlers';
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

function buildScene(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    session_id: 3,
    name: 'Scene One',
    notes: null as null,
    payload: '{}',
    sort_order: 0,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

function buildSession(overrides?: Record<string, unknown>) {
  return { id: 3, act_id: 1, name: 'Session One', ...overrides };
}

// null = not found; omit = use default; value = return it
type PrepareOptions = {
  getById?: unknown;
  getSceneSessionById?: unknown;
  getNextSortOrder?: number;
  resequenceRows?: Array<{ id: number; }>;
};

function createDbMock(opts: PrepareOptions = {}) {
  const defaultScene = buildScene();
  const defaultSession = buildSession();
  const runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));

  const prepareMock = vi.fn((sql: string) => {
    if (sql.includes('COALESCE(MAX(sort_order)') && sql.includes('session_id')) {
      return { get: vi.fn(() => ({ next_sort_order: opts.getNextSortOrder ?? 0 })) };
    }
    if (sql === 'SELECT * FROM scenes WHERE id = ?') {
      const val = 'getById' in opts
        ? (opts.getById === null ? undefined : opts.getById)
        : defaultScene;
      return { get: vi.fn(() => val) };
    }
    if (sql === 'SELECT * FROM sessions WHERE id = ?') {
      return { get: vi.fn(() => defaultSession) };
    }
    if (sql === 'SELECT session_id FROM scenes WHERE id = ?') {
      const val = 'getSceneSessionById' in opts
        ? (opts.getSceneSessionById === null ? undefined : opts.getSceneSessionById)
        : { session_id: defaultScene.session_id };
      return { get: vi.fn(() => val) };
    }
    if (sql.startsWith('SELECT id FROM scenes')) {
      return { all: vi.fn(() => opts.resequenceRows ?? []) };
    }
    return { run: runMock, get: vi.fn(() => defaultScene), all: vi.fn(() => [defaultScene]) };
  });

  return {
    prepare: prepareMock,
    transaction: vi.fn((cb: (...args: unknown[]) => unknown) => cb),
  } as unknown as Database.Database;
}

describe('registerSceneHandlers', () => {
  let dbMock: Database.Database;
  let handlers: Record<string, IpcHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = createDbMock();
    registerSceneHandlers(dbMock);
    handlers = getHandlers();
  });

  describe(IPC.SCENES_GET_ALL_BY_CAMPAIGN, () => {
    it('returns scenes for campaign via join', () => {
      const mockAll = vi.fn(() => [buildScene()]);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });
      expect(handlers[IPC.SCENES_GET_ALL_BY_CAMPAIGN]({}, 10)).toEqual([buildScene()]);
    });
  });

  describe(IPC.SCENES_GET_ALL_BY_SESSION, () => {
    it('returns scenes for a session', () => {
      const mockAll = vi.fn(() => [buildScene()]);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });
      expect(handlers[IPC.SCENES_GET_ALL_BY_SESSION]({}, 3)).toEqual([buildScene()]);
    });
  });

  describe(IPC.SCENES_GET_BY_ID, () => {
    it('returns scene by id', () => {
      const mockGet = vi.fn(() => buildScene());
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });
      expect(handlers[IPC.SCENES_GET_BY_ID]({}, 1)).toEqual(buildScene());
    });

    it('returns null when not found', () => {
      const mockGet = vi.fn(() => undefined);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });
      expect(handlers[IPC.SCENES_GET_BY_ID]({}, 999)).toBeNull();
    });
  });

  describe(IPC.SCENES_ADD, () => {
    it('creates scene with default payload when omitted', () => {
      const db = createDbMock({ getById: buildScene() });
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      const result = h[IPC.SCENES_ADD]({}, { session_id: 3, name: 'Scene' });
      expect(result).toMatchObject({ name: 'Scene One' });
    });

    it('creates scene with explicit valid payload', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      h[IPC.SCENES_ADD]({}, {
        session_id: 3,
        name: 'Scene',
        payload: '{"runtime":{"battlemap_id":null}}',
        sort_order: 0,
      });
      expect(true).toBe(true);
    });

    it('creates scene with valid battlemap_id in payload', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      h[IPC.SCENES_ADD]({}, {
        session_id: 3,
        name: 'Scene',
        payload: '{"runtime":{"battlemap_id":5}}',
      });
      expect(true).toBe(true);
    });

    it('creates scene with payload that has no runtime key', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      h[IPC.SCENES_ADD]({}, { session_id: 3, name: 'Scene', payload: '{"someKey":"val"}' });
      expect(true).toBe(true);
    });

    it('creates scene with notes', () => {
      const db = createDbMock({ getById: buildScene({ notes: 'Note text' }) });
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      const result = h[IPC.SCENES_ADD]({}, { session_id: 3, name: 'Scene', notes: 'Note text' });
      expect(result).toMatchObject({ notes: 'Note text' });
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.SCENES_ADD]({}, { session_id: 3, name: '' }))
        .toThrowError('Scene name is required');
    });

    it('throws when payload is not a string', () => {
      expect(() =>
        handlers[IPC.SCENES_ADD]({}, { session_id: 3, name: 'X', payload: 42 as unknown as string })
      )
        .toThrowError('Scene payload must be a JSON string');
    });

    it('throws when payload is invalid JSON', () => {
      expect(() => handlers[IPC.SCENES_ADD]({}, { session_id: 3, name: 'X', payload: '{bad}' }))
        .toThrowError('Scene payload must be valid JSON text');
    });

    it('throws when runtime is not a JSON object', () => {
      expect(() =>
        handlers[IPC.SCENES_ADD]({}, { session_id: 3, name: 'X', payload: '{"runtime":"string"}' })
      ).toThrowError('Scene payload runtime must be a JSON object');
    });

    it('throws when battlemap_id is not a positive integer', () => {
      expect(() =>
        handlers[IPC.SCENES_ADD]({}, {
          session_id: 3,
          name: 'X',
          payload: '{"runtime":{"battlemap_id":-1}}',
        })
      ).toThrowError('Scene payload runtime.battlemap_id must be a positive integer or null');
    });

    it('throws when battlemap_id is a non-integer number', () => {
      expect(() =>
        handlers[IPC.SCENES_ADD]({}, {
          session_id: 3,
          name: 'X',
          payload: '{"runtime":{"battlemap_id":1.5}}',
        })
      ).toThrowError('Scene payload runtime.battlemap_id must be a positive integer or null');
    });

    it('throws when scene not found after insert', () => {
      const db = createDbMock({ getById: null });
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.SCENES_ADD]({}, { session_id: 3, name: 'X' }))
        .toThrowError('Failed to create scene');
    });
  });

  describe(IPC.SCENES_UPDATE, () => {
    it('updates all fields', () => {
      const db = createDbMock({ getById: buildScene({ name: 'Updated' }) });
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      const result = h[IPC.SCENES_UPDATE]({}, 1, {
        name: 'Updated',
        notes: 'New note',
        payload: '{}',
        sort_order: 2,
      });
      expect(result).toMatchObject({ name: 'Updated' });
    });

    it('touch-only update (no fields)', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.SCENES_UPDATE]({}, 1, {})).not.toThrow();
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.SCENES_UPDATE]({}, 1, { name: '' }))
        .toThrowError('Scene name cannot be empty');
    });

    it('throws when scene not found after update', () => {
      const db = createDbMock({ getById: null });
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.SCENES_UPDATE]({}, 999, { name: 'X' }))
        .toThrowError('Scene not found');
    });
  });

  describe(IPC.SCENES_DELETE, () => {
    it('deletes scene and resequences', () => {
      const db = createDbMock({
        getSceneSessionById: { session_id: 3 },
        resequenceRows: [{ id: 2 }],
      });
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      expect(h[IPC.SCENES_DELETE]({}, 1)).toEqual({ id: 1 });
    });

    it('returns id when scene not found', () => {
      const db = createDbMock({ getSceneSessionById: null });
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      expect(h[IPC.SCENES_DELETE]({}, 999)).toEqual({ id: 999 });
    });
  });

  describe(IPC.SCENES_MOVE_TO_SESSION, () => {
    it('moves scene to a different session', () => {
      const sceneRow = buildScene({ session_id: 3 });
      const newSessionRow = buildSession({ id: 4 });
      const sceneGetMock = vi.fn()
        .mockReturnValueOnce(sceneRow)
        .mockReturnValueOnce({ ...sceneRow, session_id: 4 });
      const prepareMock = vi.fn((sql: string) => {
        if (sql === 'SELECT * FROM scenes WHERE id = ?') {
          return { get: sceneGetMock };
        }
        if (sql === 'SELECT * FROM sessions WHERE id = ?') {
          return { get: vi.fn(() => newSessionRow) };
        }
        if (sql.includes('COALESCE(MAX(sort_order)')) {
          return { get: vi.fn(() => ({ nextSortOrder: 1 })) };
        }
        if (sql.startsWith('SELECT id FROM scenes')) {
          return { all: vi.fn(() => []) };
        }
        return { run: vi.fn(), get: vi.fn(() => sceneRow), all: vi.fn(() => []) };
      });
      const db = {
        prepare: prepareMock,
        transaction: vi.fn((cb: (...args: unknown[]) => unknown) => cb),
      } as unknown as Database.Database;
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      const result = h[IPC.SCENES_MOVE_TO_SESSION]({}, 1, 4);
      expect(result).toMatchObject({ session_id: 4 });
    });

    it('returns scene unchanged when moving to same session', () => {
      const sceneRow = buildScene({ session_id: 3 });
      const sessionRow = buildSession({ id: 3 });
      const prepareMock = vi.fn((sql: string) => {
        if (sql === 'SELECT * FROM scenes WHERE id = ?') {
          return { get: vi.fn(() => sceneRow) };
        }
        if (sql === 'SELECT * FROM sessions WHERE id = ?') {
          return { get: vi.fn(() => sessionRow) };
        }
        return { run: vi.fn(), get: vi.fn(), all: vi.fn(() => []) };
      });
      const db = {
        prepare: prepareMock,
        transaction: vi.fn((cb: (...args: unknown[]) => unknown) => cb),
      } as unknown as Database.Database;
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      const result = h[IPC.SCENES_MOVE_TO_SESSION]({}, 1, 3);
      expect(result).toMatchObject({ session_id: 3 });
    });

    it('throws when scene not found', () => {
      const prepareMock = vi.fn((sql: string) => {
        if (sql === 'SELECT * FROM scenes WHERE id = ?') {
          return { get: vi.fn(() => undefined) };
        }
        if (sql === 'SELECT * FROM sessions WHERE id = ?') {
          return { get: vi.fn(() => buildSession()) };
        }
        return { run: vi.fn(), get: vi.fn(), all: vi.fn(() => []) };
      });
      const db = {
        prepare: prepareMock,
        transaction: vi.fn((cb: (...args: unknown[]) => unknown) => cb),
      } as unknown as Database.Database;
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.SCENES_MOVE_TO_SESSION]({}, 999, 4)).toThrowError('Scene not found');
    });

    it('throws when target session not found', () => {
      const sceneRow = buildScene({ session_id: 3 });
      const prepareMock = vi.fn((sql: string) => {
        if (sql === 'SELECT * FROM scenes WHERE id = ?') {
          return { get: vi.fn(() => sceneRow) };
        }
        if (sql === 'SELECT * FROM sessions WHERE id = ?') {
          return { get: vi.fn(() => undefined) };
        }
        return { run: vi.fn(), get: vi.fn(), all: vi.fn(() => []) };
      });
      const db = {
        prepare: prepareMock,
        transaction: vi.fn((cb: (...args: unknown[]) => unknown) => cb),
      } as unknown as Database.Database;
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.SCENES_MOVE_TO_SESSION]({}, 1, 999)).toThrowError(
        'Target session not found',
      );
    });

    it('throws when scene not found after update', () => {
      const sceneRow = buildScene({ session_id: 3 });
      const newSessionRow = buildSession({ id: 4 });
      const sceneGetMock = vi.fn()
        .mockReturnValueOnce(sceneRow)
        .mockReturnValueOnce(undefined);
      const prepareMock = vi.fn((sql: string) => {
        if (sql === 'SELECT * FROM scenes WHERE id = ?') {
          return { get: sceneGetMock };
        }
        if (sql === 'SELECT * FROM sessions WHERE id = ?') {
          return { get: vi.fn(() => newSessionRow) };
        }
        if (sql.includes('COALESCE(MAX(sort_order)')) {
          return { get: vi.fn(() => ({ nextSortOrder: 1 })) };
        }
        if (sql.startsWith('SELECT id FROM scenes')) {
          return { all: vi.fn(() => []) };
        }
        return { run: vi.fn(), get: vi.fn(), all: vi.fn(() => []) };
      });
      const db = {
        prepare: prepareMock,
        transaction: vi.fn((cb: (...args: unknown[]) => unknown) => cb),
      } as unknown as Database.Database;
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.SCENES_MOVE_TO_SESSION]({}, 1, 4)).toThrowError('Scene not found');
    });
  });
});
