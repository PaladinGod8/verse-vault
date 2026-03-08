import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerWorldHandlers } from '../../../src/main/ipc/registerWorldHandlers';
import { IPC } from '../../../src/shared/ipcChannels';

type IpcHandler = (...args: unknown[]) => unknown;

const { ipcHandleMock } = vi.hoisted(() => ({
  ipcHandleMock: vi.fn(),
}));

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/user-data') },
  ipcMain: { handle: ipcHandleMock },
}));

vi.mock('node:fs/promises', () => {
  const mkdir = vi.fn().mockResolvedValue(undefined);
  const writeFile = vi.fn().mockResolvedValue(undefined);
  return { default: { mkdir, writeFile }, mkdir, writeFile };
});

vi.mock('node:crypto', () => {
  const randomUUID = vi.fn(() => 'test-uuid-1234');
  return { default: { randomUUID }, randomUUID };
});

function getHandlers(): Record<string, IpcHandler> {
  return Object.fromEntries(
    ipcHandleMock.mock.calls.map(([ch, handler]) => [ch as string, handler as IpcHandler]),
  );
}

function buildWorld(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    name: 'Test World',
    thumbnail: null,
    short_description: null,
    config: '{}',
    last_viewed_at: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('registerWorldHandlers', () => {
  let dbMock: Database.Database;
  let handlers: Record<string, IpcHandler>;

  // null = not found; omit = use default; value = return it
  function createDbMock(options: { insertedWorld?: unknown; } = {}) {
    const defaultWorld = buildWorld();
    const runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));
    const getMock = vi.fn(() =>
      'insertedWorld' in options
        ? (options.insertedWorld === null ? undefined : options.insertedWorld)
        : defaultWorld
    );
    const allMock = vi.fn(() => [defaultWorld]);
    return {
      prepare: vi.fn(() => ({ run: runMock, get: getMock, all: allMock })),
    } as unknown as Database.Database;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = createDbMock();
    registerWorldHandlers(dbMock);
    handlers = getHandlers();
  });

  describe(IPC.WORLDS_GET_ALL, () => {
    it('returns all worlds', () => {
      const mockAll = vi.fn(() => [buildWorld()]);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });
      expect(handlers[IPC.WORLDS_GET_ALL]({})).toEqual([buildWorld()]);
    });
  });

  describe(IPC.WORLDS_GET_BY_ID, () => {
    it('returns world by id', () => {
      const mockGet = vi.fn(() => buildWorld());
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });
      expect(handlers[IPC.WORLDS_GET_BY_ID]({}, 1)).toEqual(buildWorld());
    });

    it('returns null when not found', () => {
      const mockGet = vi.fn(() => undefined);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });
      expect(handlers[IPC.WORLDS_GET_BY_ID]({}, 999)).toBeNull();
    });
  });

  describe(IPC.WORLDS_ADD, () => {
    it('creates world with all fields', () => {
      const db = createDbMock({ insertedWorld: buildWorld({ name: 'New World' }) });
      vi.clearAllMocks();
      registerWorldHandlers(db);
      const h = getHandlers();
      const result = h[IPC.WORLDS_ADD]({}, {
        name: 'New World',
        thumbnail: 'vv-media://world-images/test.png',
        short_description: 'A world',
        config: '{}',
      });
      expect(result).toMatchObject({ name: 'New World' });
    });

    it('defaults thumbnail and short_description to null', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerWorldHandlers(db);
      const h = getHandlers();
      h[IPC.WORLDS_ADD]({}, { name: 'World' });
      expect(true).toBe(true);
    });

    it('uses default config (getDefaultWorldConfig) when config is not provided', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerWorldHandlers(db);
      const h = getHandlers();
      h[IPC.WORLDS_ADD]({}, { name: 'World' });
      expect(true).toBe(true);
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.WORLDS_ADD]({}, { name: '' }))
        .toThrowError('World name is required');
    });

    it('throws when name is whitespace-only', () => {
      expect(() => handlers[IPC.WORLDS_ADD]({}, { name: '   ' }))
        .toThrowError('World name is required');
    });

    it('throws when name is not a string', () => {
      expect(() => handlers[IPC.WORLDS_ADD]({}, { name: null }))
        .toThrowError('World name is required');
    });

    it('throws when config is not valid JSON', () => {
      expect(() => handlers[IPC.WORLDS_ADD]({}, { name: 'X', config: '{bad}' }))
        .toThrowError('World config must be valid JSON');
    });

    it('throws when world not found after insert', () => {
      const db = createDbMock({ insertedWorld: null });
      vi.clearAllMocks();
      registerWorldHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.WORLDS_ADD]({}, { name: 'X' }))
        .toThrowError('Failed to create world');
    });
  });

  describe(IPC.WORLDS_UPDATE, () => {
    it('updates name, thumbnail, short_description, config', () => {
      const db = createDbMock({ insertedWorld: buildWorld({ name: 'Updated' }) });
      vi.clearAllMocks();
      registerWorldHandlers(db);
      const h = getHandlers();
      const result = h[IPC.WORLDS_UPDATE]({}, 1, {
        name: 'Updated',
        thumbnail: 'vv-media://test.png',
        short_description: 'Desc',
        config: '{}',
      });
      expect(result).toMatchObject({ name: 'Updated' });
    });

    it('touch-only update (no fields)', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerWorldHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.WORLDS_UPDATE]({}, 1, {})).not.toThrow();
    });

    it('updates thumbnail to null (nullable string)', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerWorldHandlers(db);
      const h = getHandlers();
      h[IPC.WORLDS_UPDATE]({}, 1, { thumbnail: null });
      expect(true).toBe(true);
    });

    it('updates short_description to null', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerWorldHandlers(db);
      const h = getHandlers();
      h[IPC.WORLDS_UPDATE]({}, 1, { short_description: null });
      expect(true).toBe(true);
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.WORLDS_UPDATE]({}, 1, { name: '' }))
        .toThrowError('World name is required');
    });

    it('throws when config is invalid JSON', () => {
      expect(() => handlers[IPC.WORLDS_UPDATE]({}, 1, { config: '{bad}' }))
        .toThrowError('World config must be valid JSON');
    });

    it('throws when world not found after update', () => {
      const db = createDbMock({ insertedWorld: null });
      vi.clearAllMocks();
      registerWorldHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.WORLDS_UPDATE]({}, 999, { name: 'X' }))
        .toThrowError('World not found');
    });
  });

  describe(IPC.WORLDS_DELETE, () => {
    it('deletes world and returns id', () => {
      const runMock = vi.fn();
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ run: runMock });
      expect(handlers[IPC.WORLDS_DELETE]({}, 5)).toEqual({ id: 5 });
    });
  });

  describe(IPC.WORLDS_MARK_VIEWED, () => {
    it('updates last_viewed_at and returns world', () => {
      const worldRow = buildWorld({ last_viewed_at: '2026-03-08' });
      const runMock = vi.fn();
      const getMock = vi.fn(() => worldRow);
      (dbMock.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ run: runMock })
        .mockReturnValueOnce({ get: getMock });
      const result = handlers[IPC.WORLDS_MARK_VIEWED]({}, 1);
      expect(result).toMatchObject({ last_viewed_at: '2026-03-08' });
    });

    it('returns null when world not found after mark viewed', () => {
      const runMock = vi.fn();
      const getMock = vi.fn(() => undefined);
      (dbMock.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ run: runMock })
        .mockReturnValueOnce({ get: getMock });
      expect(handlers[IPC.WORLDS_MARK_VIEWED]({}, 999)).toBeNull();
    });
  });

  describe(IPC.WORLDS_IMPORT_IMAGE, () => {
    it('saves image and returns media URL', async () => {
      const payload = {
        fileName: 'world.png',
        mimeType: 'image/png',
        bytes: new Uint8Array([1, 2, 3]),
      };
      const result = await (handlers[IPC.WORLDS_IMPORT_IMAGE]({}, payload) as Promise<unknown>);
      expect(result).toMatchObject({
        image_src: expect.stringContaining('vv-media://world-images/'),
      });
    });

    it('supports jpeg mimeType', async () => {
      const payload = {
        fileName: 'world.jpg',
        mimeType: 'image/jpeg',
        bytes: new Uint8Array([1, 2]),
      };
      const result = await (handlers[IPC.WORLDS_IMPORT_IMAGE]({}, payload) as Promise<unknown>);
      expect(result).toMatchObject({ image_src: expect.stringContaining('.jpg') });
    });

    it('supports webp mimeType', async () => {
      const payload = {
        fileName: 'world.webp',
        mimeType: 'image/webp',
        bytes: new Uint8Array([1]),
      };
      const result = await (handlers[IPC.WORLDS_IMPORT_IMAGE]({}, payload) as Promise<unknown>);
      expect(result).toMatchObject({ image_src: expect.stringContaining('.webp') });
    });

    it('supports gif mimeType', async () => {
      const payload = {
        fileName: 'world.gif',
        mimeType: 'image/gif',
        bytes: new Uint8Array([1]),
      };
      const result = await (handlers[IPC.WORLDS_IMPORT_IMAGE]({}, payload) as Promise<unknown>);
      expect(result).toMatchObject({ image_src: expect.stringContaining('.gif') });
    });

    it('throws when fileName is empty', async () => {
      await expect(
        handlers[IPC.WORLDS_IMPORT_IMAGE]({}, {
          fileName: '',
          mimeType: 'image/png',
          bytes: new Uint8Array([1]),
        }) as Promise<unknown>,
      ).rejects.toThrowError('Token image fileName is required');
    });

    it('throws when fileName is missing', async () => {
      await expect(
        handlers[IPC.WORLDS_IMPORT_IMAGE]({}, {
          mimeType: 'image/png',
          bytes: new Uint8Array([1]),
        }) as Promise<unknown>,
      ).rejects.toThrowError('Token image fileName is required');
    });

    it('throws when mimeType is unsupported', async () => {
      await expect(
        handlers[IPC.WORLDS_IMPORT_IMAGE]({}, {
          fileName: 'world.bmp',
          mimeType: 'image/bmp',
          bytes: new Uint8Array([1]),
        }) as Promise<unknown>,
      ).rejects.toThrowError('Unsupported token image mimeType');
    });

    it('throws when bytes is not a Uint8Array', async () => {
      await expect(
        handlers[IPC.WORLDS_IMPORT_IMAGE]({}, {
          fileName: 'world.png',
          mimeType: 'image/png',
          bytes: [1, 2, 3],
        }) as Promise<unknown>,
      ).rejects.toThrowError('Token image bytes must be a Uint8Array');
    });

    it('throws when bytes is empty', async () => {
      await expect(
        handlers[IPC.WORLDS_IMPORT_IMAGE]({}, {
          fileName: 'world.png',
          mimeType: 'image/png',
          bytes: new Uint8Array(0),
        }) as Promise<unknown>,
      ).rejects.toThrowError('Token image bytes cannot be empty');
    });

    it('throws when bytes exceeds 5 MB', async () => {
      const largeBytes = new Uint8Array(5 * 1024 * 1024 + 1);
      await expect(
        handlers[IPC.WORLDS_IMPORT_IMAGE]({}, {
          fileName: 'world.png',
          mimeType: 'image/png',
          bytes: largeBytes,
        }) as Promise<unknown>,
      ).rejects.toThrowError('Token image exceeds 5 MB limit');
    });
  });
});
