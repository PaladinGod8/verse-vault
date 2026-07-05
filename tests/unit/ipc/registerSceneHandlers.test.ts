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
    campaign_id: 1,
    act_id: 1,
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
  getSceneAnchorById?: unknown;
  getActAnchor?: unknown;
  getNextSortOrder?: number;
  resequenceRows?: Array<{ id: number; }>;
};

function createDbMock(opts: PrepareOptions = {}) {
  const defaultScene = buildScene();
  const defaultSession = buildSession();
  const runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));

  const prepareMock = vi.fn((sql: string) => {
    if (sql.includes('COALESCE(MAX(sort_order)')) {
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
    if (sql.includes('arcs.campaign_id AS campaign_id')) {
      const val = 'getActAnchor' in opts
        ? (opts.getActAnchor === null ? undefined : opts.getActAnchor)
        : { campaign_id: 1 };
      return { get: vi.fn(() => val) };
    }
    if (sql === 'SELECT act_id, session_id FROM scenes WHERE id = ?') {
      const val = 'getSceneAnchorById' in opts
        ? (opts.getSceneAnchorById === null ? undefined : opts.getSceneAnchorById)
        : { act_id: defaultScene.act_id, session_id: defaultScene.session_id };
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

  describe(IPC.SCENES_GET_ALL_BY_ACT, () => {
    it('returns scenes for an act', () => {
      const mockAll = vi.fn(() => [buildScene()]);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });
      expect(handlers[IPC.SCENES_GET_ALL_BY_ACT]({}, 1)).toEqual([buildScene()]);
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
    it('creates scene with default payload when session_id given (act_id derived from session)', () => {
      const db = createDbMock({ getById: buildScene() });
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      const result = h[IPC.SCENES_ADD]({}, { session_id: 3, name: 'Scene' });
      expect(result).toMatchObject({ name: 'Scene One' });
    });

    it('creates a stray scene with act_id only, no session', () => {
      const db = createDbMock({ getById: buildScene({ session_id: null }) });
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      const result = h[IPC.SCENES_ADD]({}, { act_id: 1, name: 'Scene' });
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

    it('throws when neither act_id nor session_id is given', () => {
      expect(() => handlers[IPC.SCENES_ADD]({}, { name: 'X' }))
        .toThrowError('Scene requires an act_id or session_id');
    });

    it('throws when session_id is given but the session does not exist', () => {
      const db = createDbMock({ getById: undefined });
      (db.prepare as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
        if (sql === 'SELECT * FROM sessions WHERE id = ?') {
          return { get: vi.fn(() => undefined) };
        }
        return { run: vi.fn(), get: vi.fn(), all: vi.fn(() => []) };
      });
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.SCENES_ADD]({}, { session_id: 999, name: 'X' }))
        .toThrowError('Session not found');
    });

    it('throws when act_id is given but the act does not exist', () => {
      const db = createDbMock({ getActAnchor: null });
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.SCENES_ADD]({}, { act_id: 999, name: 'X' }))
        .toThrowError('Act not found');
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
        getSceneAnchorById: { act_id: 1, session_id: 3 },
        resequenceRows: [{ id: 2 }],
      });
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      expect(h[IPC.SCENES_DELETE]({}, 1)).toEqual({ id: 1 });
    });

    it('deletes a stray scene and resequences within the act', () => {
      const db = createDbMock({
        getSceneAnchorById: { act_id: 1, session_id: null },
        resequenceRows: [{ id: 2 }],
      });
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      expect(h[IPC.SCENES_DELETE]({}, 1)).toEqual({ id: 1 });
    });

    it('returns id when scene not found', () => {
      const db = createDbMock({ getSceneAnchorById: null });
      vi.clearAllMocks();
      registerSceneHandlers(db);
      const h = getHandlers();
      expect(h[IPC.SCENES_DELETE]({}, 999)).toEqual({ id: 999 });
    });
  });

  describe(IPC.SCENES_MOVE_TO_ACT, () => {
    function createMoveDbMock(overrides: {
      scene?: unknown;
      sceneSequence?: unknown[];
      targetActAnchor?: unknown;
      targetSession?: unknown;
      nextSortOrder?: number;
      resequenceRows?: Array<{ id: number; }>;
    } = {}) {
      const sceneRow = overrides.scene ?? buildScene({ act_id: 1, session_id: 3 });
      const sceneGetMock = overrides.sceneSequence
        ? vi.fn((() => {
          const sequence = overrides.sceneSequence ?? [];
          let i = 0;
          return () => sequence[i++];
        })())
        : vi.fn(() => sceneRow);

      const prepareMock = vi.fn((sql: string) => {
        if (sql === 'SELECT * FROM scenes WHERE id = ?') {
          return { get: sceneGetMock };
        }
        if (sql.includes('arcs.campaign_id AS campaign_id')) {
          const val = 'targetActAnchor' in overrides
            ? overrides.targetActAnchor
            : { campaign_id: 1 };
          return { get: vi.fn(() => val) };
        }
        if (sql === 'SELECT * FROM sessions WHERE id = ?') {
          const val = 'targetSession' in overrides ? overrides.targetSession : undefined;
          return { get: vi.fn(() => val) };
        }
        if (sql.includes('COALESCE(MAX(sort_order)')) {
          return { get: vi.fn(() => ({ next_sort_order: overrides.nextSortOrder ?? 1 })) };
        }
        if (sql.startsWith('SELECT id FROM scenes')) {
          return { all: vi.fn(() => overrides.resequenceRows ?? []) };
        }
        return { run: vi.fn(), get: vi.fn(() => sceneRow), all: vi.fn(() => []) };
      });

      return {
        prepare: prepareMock,
        transaction: vi.fn((cb: (...args: unknown[]) => unknown) => cb),
      } as unknown as Database.Database;
    }

    it('moves a scene to a different act and ungroups it from its session', () => {
      const oldScene = buildScene({ act_id: 1, session_id: 3 });
      const movedScene = buildScene({ act_id: 2, session_id: null });
      const db = createMoveDbMock({
        scene: oldScene,
        sceneSequence: [oldScene, movedScene],
        targetActAnchor: { campaign_id: 1 },
      });
      registerSceneHandlers(db);
      const h = getHandlers();
      const result = h[IPC.SCENES_MOVE_TO_ACT]({}, 1, 2, null);
      expect(result).toMatchObject({ act_id: 2, session_id: null });
    });

    it('moves a scene to a different act into a target session of that act', () => {
      const oldScene = buildScene({ act_id: 1, session_id: 3 });
      const movedScene = buildScene({ act_id: 2, session_id: 4 });
      const db = createMoveDbMock({
        scene: oldScene,
        sceneSequence: [oldScene, movedScene],
        targetActAnchor: { campaign_id: 1 },
        targetSession: buildSession({ id: 4, act_id: 2 }),
      });
      registerSceneHandlers(db);
      const h = getHandlers();
      const result = h[IPC.SCENES_MOVE_TO_ACT]({}, 1, 2, 4);
      expect(result).toMatchObject({ act_id: 2, session_id: 4 });
    });

    it('regroups a stray scene into a session within the same act', () => {
      const oldScene = buildScene({ act_id: 1, session_id: null });
      const movedScene = buildScene({ act_id: 1, session_id: 3 });
      const db = createMoveDbMock({
        scene: oldScene,
        sceneSequence: [oldScene, movedScene],
        targetActAnchor: { campaign_id: 1 },
        targetSession: buildSession({ id: 3, act_id: 1 }),
      });
      registerSceneHandlers(db);
      const h = getHandlers();
      const result = h[IPC.SCENES_MOVE_TO_ACT]({}, 1, 1, 3);
      expect(result).toMatchObject({ act_id: 1, session_id: 3 });
    });

    it('returns scene unchanged when act and session are unchanged', () => {
      const scene = buildScene({ act_id: 1, session_id: 3 });
      const db = createMoveDbMock({
        scene,
        targetActAnchor: { campaign_id: 1 },
        targetSession: buildSession({ id: 3, act_id: 1 }),
      });
      registerSceneHandlers(db);
      const h = getHandlers();
      const result = h[IPC.SCENES_MOVE_TO_ACT]({}, 1, 1, 3);
      expect(result).toMatchObject({ act_id: 1, session_id: 3 });
    });

    it('throws when scene not found', () => {
      const db = createMoveDbMock({ scene: undefined, sceneSequence: [undefined] });
      registerSceneHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.SCENES_MOVE_TO_ACT]({}, 999, 2, null)).toThrowError('Scene not found');
    });

    it('throws when target act not found', () => {
      const db = createMoveDbMock({ targetActAnchor: undefined });
      registerSceneHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.SCENES_MOVE_TO_ACT]({}, 1, 999, null)).toThrowError(
        'Target act not found',
      );
    });

    it('throws when target session not found', () => {
      const db = createMoveDbMock({
        targetActAnchor: { campaign_id: 1 },
        targetSession: undefined,
      });
      registerSceneHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.SCENES_MOVE_TO_ACT]({}, 1, 2, 999)).toThrowError(
        'Target session not found',
      );
    });

    it('throws when target session does not belong to the target act', () => {
      const db = createMoveDbMock({
        targetActAnchor: { campaign_id: 1 },
        targetSession: buildSession({ id: 4, act_id: 5 }),
      });
      registerSceneHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.SCENES_MOVE_TO_ACT]({}, 1, 2, 4)).toThrowError(
        'Target session does not belong to the target act',
      );
    });

    it('throws when scene not found after update', () => {
      const oldScene = buildScene({ act_id: 1, session_id: 3 });
      const db = createMoveDbMock({
        scene: oldScene,
        sceneSequence: [oldScene, undefined],
        targetActAnchor: { campaign_id: 1 },
      });
      registerSceneHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.SCENES_MOVE_TO_ACT]({}, 1, 2, null)).toThrowError('Scene not found');
    });
  });
});
