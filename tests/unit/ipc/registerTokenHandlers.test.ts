import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerTokenHandlers } from '../../../src/main/ipc/registerTokenHandlers';
import { IPC } from '../../../src/shared/ipcChannels';

type IpcHandler = (...args: unknown[]) => unknown;

const { ipcHandleMock, moveToWorldMock, moveToCampaignMock } = vi.hoisted(() => ({
  ipcHandleMock: vi.fn(),
  moveToWorldMock: vi.fn(),
  moveToCampaignMock: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: { handle: ipcHandleMock },
}));

vi.mock('../../../src/database/db', () => ({
  db: {
    tokens: {
      moveToWorld: moveToWorldMock,
      moveToCampaign: moveToCampaignMock,
    },
  },
  ensureTokenConfigJsonText: vi.fn((config: unknown) => {
    if (typeof config !== 'string') throw new Error('Token config must be a JSON string');
    try {
      JSON.parse(config);
    } catch {
      throw new Error('Token config must be valid JSON');
    }
    return config;
  }),
}));

vi.mock('node:fs/promises', () => {
  const mkdir = vi.fn().mockResolvedValue(undefined);
  const writeFile = vi.fn().mockResolvedValue(undefined);
  return { default: { mkdir, writeFile }, mkdir, writeFile };
});

vi.mock('node:crypto', () => {
  const randomUUID = vi.fn(() => 'token-uuid-5678');
  return { default: { randomUUID }, randomUUID };
});

function getHandlers(): Record<string, IpcHandler> {
  return Object.fromEntries(
    ipcHandleMock.mock.calls.map(([ch, handler]) => [ch as string, handler as IpcHandler]),
  );
}

function buildToken(overrides?: Record<string, unknown>): Token {
  return {
    id: 1,
    world_id: 10,
    campaign_id: null,
    name: 'Test Token',
    image_src: null,
    config: '{}',
    grid_type: 'square',
    is_visible: 1,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  } as Token;
}

const USER_DATA_PATH = 'C:\\mock-user-data';

describe('registerTokenHandlers', () => {
  let dbMock: Database.Database;
  let handlers: Record<string, IpcHandler>;

  // null = not found; omit = use default; value = return it
  function createDbMock(options: { insertedToken?: unknown; } = {}) {
    const defaultToken = buildToken();
    const runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));
    const getMock = vi.fn(() =>
      'insertedToken' in options
        ? (options.insertedToken === null ? undefined : options.insertedToken)
        : defaultToken
    );
    const allMock = vi.fn(() => [defaultToken]);
    return {
      prepare: vi.fn(() => ({ run: runMock, get: getMock, all: allMock })),
    } as unknown as Database.Database;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = createDbMock();
    registerTokenHandlers(dbMock, { userDataPath: USER_DATA_PATH });
    handlers = getHandlers();
  });

  describe(IPC.TOKENS_GET_ALL_BY_CAMPAIGN, () => {
    it('returns tokens for campaign', () => {
      const mockAll = vi.fn(() => [buildToken()]);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });
      expect(handlers[IPC.TOKENS_GET_ALL_BY_CAMPAIGN]({}, 5)).toEqual([buildToken()]);
    });
  });

  describe(IPC.TOKENS_GET_ALL_BY_WORLD, () => {
    it('returns tokens for valid worldId', () => {
      const mockAll = vi.fn(() => [buildToken()]);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });
      expect(handlers[IPC.TOKENS_GET_ALL_BY_WORLD]({}, 10)).toEqual([buildToken()]);
    });

    it('throws for invalid worldId (zero)', () => {
      expect(() => handlers[IPC.TOKENS_GET_ALL_BY_WORLD]({}, 0))
        .toThrowError('Invalid worldId');
    });

    it('throws for invalid worldId (non-integer)', () => {
      expect(() => handlers[IPC.TOKENS_GET_ALL_BY_WORLD]({}, 1.5))
        .toThrowError('Invalid worldId');
    });

    it('throws for invalid worldId (negative)', () => {
      expect(() => handlers[IPC.TOKENS_GET_ALL_BY_WORLD]({}, -1))
        .toThrowError('Invalid worldId');
    });
  });

  describe(IPC.TOKENS_GET_BY_ID, () => {
    it('returns token by id', () => {
      const mockGet = vi.fn(() => buildToken());
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });
      expect(handlers[IPC.TOKENS_GET_BY_ID]({}, 1)).toEqual(buildToken());
    });

    it('returns null when not found', () => {
      const mockGet = vi.fn(() => undefined);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });
      expect(handlers[IPC.TOKENS_GET_BY_ID]({}, 999)).toBeNull();
    });
  });

  describe(IPC.TOKENS_ADD, () => {
    it('creates token with required fields using defaults', () => {
      const db = createDbMock({ insertedToken: buildToken() });
      vi.clearAllMocks();
      registerTokenHandlers(db, { userDataPath: USER_DATA_PATH });
      const h = getHandlers();
      const result = h[IPC.TOKENS_ADD]({}, { world_id: 10, name: 'Token' });
      expect(result).toMatchObject({ name: 'Test Token' });
    });

    it('creates token with all optional fields', () => {
      const db = createDbMock({
        insertedToken: buildToken({ campaign_id: 5, grid_type: 'hex', is_visible: 0 }),
      });
      vi.clearAllMocks();
      registerTokenHandlers(db, { userDataPath: USER_DATA_PATH });
      const h = getHandlers();
      h[IPC.TOKENS_ADD]({}, {
        world_id: 10,
        campaign_id: 5,
        name: 'Token',
        image_src: 'vv-media://token-images/test.png',
        config: '{}',
        grid_type: 'hex',
        is_visible: 0,
      });
      expect(true).toBe(true);
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.TOKENS_ADD]({}, { world_id: 10, name: '' }))
        .toThrowError('Token name is required');
    });

    it('throws when world_id is invalid (zero)', () => {
      expect(() => handlers[IPC.TOKENS_ADD]({}, { world_id: 0, name: 'X' }))
        .toThrowError('Invalid world_id');
    });

    it('throws when world_id is invalid (non-integer)', () => {
      expect(() => handlers[IPC.TOKENS_ADD]({}, { world_id: 1.5, name: 'X' }))
        .toThrowError('Invalid world_id');
    });

    it('throws when campaign_id is invalid (non-integer)', () => {
      expect(() => handlers[IPC.TOKENS_ADD]({}, { world_id: 10, campaign_id: 1.5, name: 'X' }))
        .toThrowError('Invalid campaign_id');
    });

    it('throws when campaign_id is invalid (zero)', () => {
      expect(() => handlers[IPC.TOKENS_ADD]({}, { world_id: 10, campaign_id: 0, name: 'X' }))
        .toThrowError('Invalid campaign_id');
    });

    it('allows null campaign_id', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerTokenHandlers(db, { userDataPath: USER_DATA_PATH });
      const h = getHandlers();
      expect(() => h[IPC.TOKENS_ADD]({}, { world_id: 10, campaign_id: null, name: 'X' })).not
        .toThrow();
    });

    it('throws when grid_type is invalid', () => {
      expect(() =>
        handlers[IPC.TOKENS_ADD]({}, {
          world_id: 10,
          name: 'X',
          grid_type: 'triangle' as TokenGridType,
        })
      ).toThrowError("grid_type must be 'square' or 'hex'");
    });

    it('throws when is_visible is not 0 or 1', () => {
      expect(() => handlers[IPC.TOKENS_ADD]({}, { world_id: 10, name: 'X', is_visible: 2 }))
        .toThrowError('Token visibility must be 0 or 1');
    });

    it('throws when token not found after insert', () => {
      const db = createDbMock({ insertedToken: null });
      vi.clearAllMocks();
      registerTokenHandlers(db, { userDataPath: USER_DATA_PATH });
      const h = getHandlers();
      expect(() => h[IPC.TOKENS_ADD]({}, { world_id: 10, name: 'X' }))
        .toThrowError('Failed to create token');
    });
  });

  describe(IPC.TOKENS_UPDATE, () => {
    it('updates all fields', () => {
      const db = createDbMock({ insertedToken: buildToken({ name: 'Updated' }) });
      vi.clearAllMocks();
      registerTokenHandlers(db, { userDataPath: USER_DATA_PATH });
      const h = getHandlers();
      const result = h[IPC.TOKENS_UPDATE]({}, 1, {
        name: 'Updated',
        image_src: 'vv-media://test.png',
        config: '{}',
        grid_type: 'hex',
        is_visible: 0,
      });
      expect(result).toMatchObject({ name: 'Updated' });
    });

    it('touch-only update (no fields)', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerTokenHandlers(db, { userDataPath: USER_DATA_PATH });
      const h = getHandlers();
      expect(() => h[IPC.TOKENS_UPDATE]({}, 1, {})).not.toThrow();
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.TOKENS_UPDATE]({}, 1, { name: '' }))
        .toThrowError('Token name cannot be empty');
    });

    it('throws when token not found after update', () => {
      const db = createDbMock({ insertedToken: null });
      vi.clearAllMocks();
      registerTokenHandlers(db, { userDataPath: USER_DATA_PATH });
      const h = getHandlers();
      expect(() => h[IPC.TOKENS_UPDATE]({}, 999, { name: 'X' }))
        .toThrowError('Token not found');
    });
  });

  describe(IPC.TOKENS_MOVE_TO_WORLD, () => {
    it('delegates to db.tokens.moveToWorld', () => {
      moveToWorldMock.mockReturnValueOnce({ id: 1, campaign_id: null });
      const result = handlers[IPC.TOKENS_MOVE_TO_WORLD]({}, 1);
      expect(result).toEqual({ id: 1, campaign_id: null });
      expect(moveToWorldMock).toHaveBeenCalledWith(1);
    });
  });

  describe(IPC.TOKENS_MOVE_TO_CAMPAIGN, () => {
    it('delegates to db.tokens.moveToCampaign', () => {
      moveToCampaignMock.mockReturnValueOnce({ id: 1, campaign_id: 5 });
      const result = handlers[IPC.TOKENS_MOVE_TO_CAMPAIGN]({}, 1, 5);
      expect(result).toEqual({ id: 1, campaign_id: 5 });
      expect(moveToCampaignMock).toHaveBeenCalledWith(1, 5);
    });
  });

  describe(IPC.TOKENS_DELETE, () => {
    it('deletes token and returns id', () => {
      const runMock = vi.fn();
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ run: runMock });
      expect(handlers[IPC.TOKENS_DELETE]({}, 3)).toEqual({ id: 3 });
    });
  });

  describe(IPC.TOKENS_IMPORT_IMAGE, () => {
    it('saves image and returns media URL', async () => {
      const result = await (handlers[IPC.TOKENS_IMPORT_IMAGE]({}, {
        fileName: 'token.png',
        mimeType: 'image/png',
        bytes: new Uint8Array([1, 2, 3]),
      }) as Promise<unknown>);
      expect(result).toMatchObject({
        image_src: expect.stringContaining('vv-media://token-images/'),
      });
    });

    it('supports jpeg', async () => {
      const result = await (handlers[IPC.TOKENS_IMPORT_IMAGE]({}, {
        fileName: 'token.jpg',
        mimeType: 'image/jpeg',
        bytes: new Uint8Array([1]),
      }) as Promise<unknown>);
      expect(result).toMatchObject({ image_src: expect.stringContaining('.jpg') });
    });

    it('supports webp', async () => {
      const result = await (handlers[IPC.TOKENS_IMPORT_IMAGE]({}, {
        fileName: 'token.webp',
        mimeType: 'image/webp',
        bytes: new Uint8Array([1]),
      }) as Promise<unknown>);
      expect(result).toMatchObject({ image_src: expect.stringContaining('.webp') });
    });

    it('supports gif', async () => {
      const result = await (handlers[IPC.TOKENS_IMPORT_IMAGE]({}, {
        fileName: 'token.gif',
        mimeType: 'image/gif',
        bytes: new Uint8Array([1]),
      }) as Promise<unknown>);
      expect(result).toMatchObject({ image_src: expect.stringContaining('.gif') });
    });

    it('throws when fileName is empty', async () => {
      await expect(
        handlers[IPC.TOKENS_IMPORT_IMAGE]({}, {
          fileName: '',
          mimeType: 'image/png',
          bytes: new Uint8Array([1]),
        }) as Promise<unknown>,
      ).rejects.toThrowError('Token image fileName is required');
    });

    it('throws when mimeType is unsupported', async () => {
      await expect(
        handlers[IPC.TOKENS_IMPORT_IMAGE]({}, {
          fileName: 'token.bmp',
          mimeType: 'image/bmp',
          bytes: new Uint8Array([1]),
        }) as Promise<unknown>,
      ).rejects.toThrowError('Unsupported token image mimeType');
    });

    it('throws when bytes is not Uint8Array', async () => {
      await expect(
        handlers[IPC.TOKENS_IMPORT_IMAGE]({}, {
          fileName: 'token.png',
          mimeType: 'image/png',
          bytes: [1, 2, 3],
        }) as Promise<unknown>,
      ).rejects.toThrowError('Token image bytes must be a Uint8Array');
    });

    it('throws when bytes is empty', async () => {
      await expect(
        handlers[IPC.TOKENS_IMPORT_IMAGE]({}, {
          fileName: 'token.png',
          mimeType: 'image/png',
          bytes: new Uint8Array(0),
        }) as Promise<unknown>,
      ).rejects.toThrowError('Token image bytes cannot be empty');
    });

    it('throws when bytes exceeds 5 MB', async () => {
      const largeBytes = new Uint8Array(5 * 1024 * 1024 + 1);
      await expect(
        handlers[IPC.TOKENS_IMPORT_IMAGE]({}, {
          fileName: 'token.png',
          mimeType: 'image/png',
          bytes: largeBytes,
        }) as Promise<unknown>,
      ).rejects.toThrowError('Token image exceeds 5 MB limit');
    });
  });
});
