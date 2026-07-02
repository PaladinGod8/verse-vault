import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerBackgroundHandlers } from '../../../src/main/ipc/registerBackgroundHandlers';
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
  const randomUUID = vi.fn(() => 'background-uuid-9999');
  return { default: { randomUUID }, randomUUID };
});

function getHandlers(): Record<string, IpcHandler> {
  return Object.fromEntries(
    ipcHandleMock.mock.calls.map(([ch, handler]) => [ch as string, handler as IpcHandler]),
  );
}

function buildBackground(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    world_id: 10,
    name: 'Royal Guard',
    description: null as null,
    image_src: null as null,
    last_viewed_at: null as null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('registerBackgroundHandlers', () => {
  let dbMock: Database.Database;
  let handlers: Record<string, IpcHandler>;

  function createDbMock(options: { selectedBackground?: unknown; } = {}) {
    const defaultBackground = buildBackground();
    const runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));
    const getMock = vi.fn(() =>
      'selectedBackground' in options
        ? (options.selectedBackground === null ? undefined : options.selectedBackground)
        : defaultBackground
    );
    const allMock = vi.fn(() => [defaultBackground]);
    return {
      prepare: vi.fn(() => ({ run: runMock, get: getMock, all: allMock })),
      pragma: vi.fn(() => []),
      exec: vi.fn(),
    } as unknown as Database.Database;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = createDbMock();
    registerBackgroundHandlers(dbMock);
    handlers = getHandlers();
  });

  it('returns all backgrounds for a world', () => {
    const mockAll = vi.fn(() => [buildBackground()]);
    (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });

    expect(handlers[IPC.BACKGROUNDS_GET_ALL_BY_WORLD]({}, 10)).toEqual([buildBackground()]);
  });

  it('returns background by id', () => {
    const mockGet = vi.fn(() => buildBackground());
    (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });

    expect(handlers[IPC.BACKGROUNDS_GET_BY_ID]({}, 1)).toEqual(buildBackground());
  });

  it('returns null when background not found by id', () => {
    const mockGet = vi.fn(() => undefined);
    (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });

    expect(handlers[IPC.BACKGROUNDS_GET_BY_ID]({}, 999)).toBeNull();
  });

  it('creates background with name, description, and image', () => {
    const db = createDbMock({
      selectedBackground: buildBackground({
        name: 'Royal Guard',
        description: 'City watch and palace soldiers.',
        image_src: 'vv-media://background-images/guard.png',
      }),
    });
    vi.clearAllMocks();
    registerBackgroundHandlers(db);
    const h = getHandlers();

    const result = h[IPC.BACKGROUNDS_ADD]({}, {
      world_id: 10,
      name: 'Royal Guard',
      description: 'City watch and palace soldiers.',
      image_src: 'vv-media://background-images/guard.png',
    });

    expect(result).toMatchObject({
      name: 'Royal Guard',
      description: 'City watch and palace soldiers.',
      image_src: 'vv-media://background-images/guard.png',
    });
  });

  it('throws when world_id missing on create', () => {
    expect(() => handlers[IPC.BACKGROUNDS_ADD]({}, { name: 'Royal Guard' }))
      .toThrowError('Background world_id is required');
  });

  it('throws when name empty on create', () => {
    expect(() => handlers[IPC.BACKGROUNDS_ADD]({}, { world_id: 10, name: '   ' }))
      .toThrowError('Background name is required');
  });

  it('throws when background missing after insert', () => {
    const db = createDbMock({ selectedBackground: null });
    vi.clearAllMocks();
    registerBackgroundHandlers(db);
    const h = getHandlers();

    expect(() => h[IPC.BACKGROUNDS_ADD]({}, { world_id: 10, name: 'Royal Guard' }))
      .toThrowError('Failed to create background');
  });

  it('updates background fields', () => {
    const db = createDbMock({
      selectedBackground: buildBackground({
        name: 'Updated Guard',
        description: 'Updated desc.',
      }),
    });
    vi.clearAllMocks();
    registerBackgroundHandlers(db);
    const h = getHandlers();

    const result = h[IPC.BACKGROUNDS_UPDATE]({}, 1, {
      name: 'Updated Guard',
      description: 'Updated desc.',
      image_src: null,
    });

    expect(result).toMatchObject({
      name: 'Updated Guard',
      description: 'Updated desc.',
      image_src: null,
    });
  });

  it('throws when name empty on update', () => {
    expect(() => handlers[IPC.BACKGROUNDS_UPDATE]({}, 1, { name: '' }))
      .toThrowError('Background name is required');
  });

  it('throws when background missing after update', () => {
    const db = createDbMock({ selectedBackground: null });
    vi.clearAllMocks();
    registerBackgroundHandlers(db);
    const h = getHandlers();

    expect(() => h[IPC.BACKGROUNDS_UPDATE]({}, 999, { name: 'Updated' }))
      .toThrowError('Background not found');
  });

  it('deletes background and returns id', () => {
    const runMock = vi.fn();
    (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ run: runMock });

    expect(handlers[IPC.BACKGROUNDS_DELETE]({}, 5)).toEqual({ id: 5 });
  });

  it('marks background viewed and returns refreshed row', () => {
    const runMock = vi.fn();
    const getMock = vi.fn(() => buildBackground({ last_viewed_at: '2026-04-01 00:00:00' }));
    (dbMock.prepare as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ run: runMock })
      .mockReturnValueOnce({ get: getMock });

    expect(handlers[IPC.BACKGROUNDS_MARK_VIEWED]({}, 1)).toMatchObject({
      last_viewed_at: '2026-04-01 00:00:00',
    });
  });

  it('saves image and returns background media URL', async () => {
    const payload = {
      fileName: 'guard.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([1, 2, 3]),
    };

    const result = await (handlers[IPC.BACKGROUNDS_IMPORT_IMAGE]({}, payload) as Promise<unknown>);

    expect(result).toMatchObject({
      image_src: expect.stringContaining('vv-media://background-images/'),
    });
  });

  it('throws when background image filename empty', async () => {
    await expect(
      handlers[IPC.BACKGROUNDS_IMPORT_IMAGE]({}, {
        fileName: '',
        mimeType: 'image/png',
        bytes: new Uint8Array([1]),
      }) as Promise<unknown>,
    ).rejects.toThrowError('Background image fileName is required');
  });

  it('throws when background image mimeType unsupported', async () => {
    await expect(
      handlers[IPC.BACKGROUNDS_IMPORT_IMAGE]({}, {
        fileName: 'guard.bmp',
        mimeType: 'image/bmp',
        bytes: new Uint8Array([1]),
      }) as Promise<unknown>,
    ).rejects.toThrowError('Unsupported background image mimeType');
  });

  it('throws when background image exceeds 5 MB', async () => {
    const largeBytes = new Uint8Array(5 * 1024 * 1024 + 1);

    await expect(
      handlers[IPC.BACKGROUNDS_IMPORT_IMAGE]({}, {
        fileName: 'guard.png',
        mimeType: 'image/png',
        bytes: largeBytes,
      }) as Promise<unknown>,
    ).rejects.toThrowError('Background image exceeds 5 MB limit');
  });
});
