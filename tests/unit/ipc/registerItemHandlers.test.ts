import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerItemHandlers } from '../../../src/main/ipc/registerItemHandlers';
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
  const randomUUID = vi.fn(() => 'item-uuid-9999');
  return { default: { randomUUID }, randomUUID };
});

function getHandlers(): Record<string, IpcHandler> {
  return Object.fromEntries(
    ipcHandleMock.mock.calls.map(([ch, handler]) => [ch as string, handler as IpcHandler]),
  );
}

function buildItem(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    world_id: 10,
    name: 'Sunblade',
    description: null as null,
    image_src: null as null,
    last_viewed_at: null as null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('registerItemHandlers', () => {
  let dbMock: Database.Database;
  let handlers: Record<string, IpcHandler>;

  function createDbMock(options: { selectedItem?: unknown; } = {}) {
    const defaultItem = buildItem();
    const runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));
    const getMock = vi.fn(() =>
      'selectedItem' in options
        ? (options.selectedItem === null ? undefined : options.selectedItem)
        : defaultItem
    );
    const allMock = vi.fn(() => [defaultItem]);
    return {
      prepare: vi.fn(() => ({ run: runMock, get: getMock, all: allMock })),
      pragma: vi.fn(() => []),
      exec: vi.fn(),
    } as unknown as Database.Database;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = createDbMock();
    registerItemHandlers(dbMock);
    handlers = getHandlers();
  });

  it('returns all items for a world', () => {
    const mockAll = vi.fn(() => [buildItem()]);
    (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });

    expect(handlers[IPC.ITEMS_GET_ALL_BY_WORLD]({}, 10)).toEqual([buildItem()]);
  });

  it('returns item by id', () => {
    const mockGet = vi.fn(() => buildItem());
    (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });

    expect(handlers[IPC.ITEMS_GET_BY_ID]({}, 1)).toEqual(buildItem());
  });

  it('returns null when item not found by id', () => {
    const mockGet = vi.fn(() => undefined);
    (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });

    expect(handlers[IPC.ITEMS_GET_BY_ID]({}, 999)).toBeNull();
  });

  it('creates item with name, description, and image', () => {
    const db = createDbMock({
      selectedItem: buildItem({
        name: 'Sunblade',
        description: 'Ancient radiant sword.',
        image_src: 'vv-media://item-images/sunblade.png',
      }),
    });
    vi.clearAllMocks();
    registerItemHandlers(db);
    const h = getHandlers();

    const result = h[IPC.ITEMS_ADD]({}, {
      world_id: 10,
      name: 'Sunblade',
      description: 'Ancient radiant sword.',
      image_src: 'vv-media://item-images/sunblade.png',
    });

    expect(result).toMatchObject({
      name: 'Sunblade',
      description: 'Ancient radiant sword.',
      image_src: 'vv-media://item-images/sunblade.png',
    });
  });

  it('throws when world_id missing on create', () => {
    expect(() => handlers[IPC.ITEMS_ADD]({}, { name: 'Sunblade' }))
      .toThrowError('Item world_id is required');
  });

  it('throws when name empty on create', () => {
    expect(() => handlers[IPC.ITEMS_ADD]({}, { world_id: 10, name: '   ' }))
      .toThrowError('Item name is required');
  });

  it('throws when item missing after insert', () => {
    const db = createDbMock({ selectedItem: null });
    vi.clearAllMocks();
    registerItemHandlers(db);
    const h = getHandlers();

    expect(() => h[IPC.ITEMS_ADD]({}, { world_id: 10, name: 'Sunblade' }))
      .toThrowError('Failed to create item');
  });

  it('updates item fields', () => {
    const db = createDbMock({
      selectedItem: buildItem({
        name: 'Updated Blade',
        description: 'Updated desc.',
      }),
    });
    vi.clearAllMocks();
    registerItemHandlers(db);
    const h = getHandlers();

    const result = h[IPC.ITEMS_UPDATE]({}, 1, {
      name: 'Updated Blade',
      description: 'Updated desc.',
      image_src: null,
    });

    expect(result).toMatchObject({
      name: 'Updated Blade',
      description: 'Updated desc.',
      image_src: null,
    });
  });

  it('throws when name empty on update', () => {
    expect(() => handlers[IPC.ITEMS_UPDATE]({}, 1, { name: '' }))
      .toThrowError('Item name is required');
  });

  it('throws when item missing after update', () => {
    const db = createDbMock({ selectedItem: null });
    vi.clearAllMocks();
    registerItemHandlers(db);
    const h = getHandlers();

    expect(() => h[IPC.ITEMS_UPDATE]({}, 999, { name: 'Updated' }))
      .toThrowError('Item not found');
  });

  it('deletes item and returns id', () => {
    const runMock = vi.fn();
    (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ run: runMock });

    expect(handlers[IPC.ITEMS_DELETE]({}, 5)).toEqual({ id: 5 });
  });

  it('marks item viewed and returns refreshed row', () => {
    const runMock = vi.fn();
    const getMock = vi.fn(() => buildItem({ last_viewed_at: '2026-04-01 00:00:00' }));
    (dbMock.prepare as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ run: runMock })
      .mockReturnValueOnce({ get: getMock });

    expect(handlers[IPC.ITEMS_MARK_VIEWED]({}, 1)).toMatchObject({
      last_viewed_at: '2026-04-01 00:00:00',
    });
  });

  it('saves image and returns item media URL', async () => {
    const payload = {
      fileName: 'sunblade.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([1, 2, 3]),
    };

    const result = await (handlers[IPC.ITEMS_IMPORT_IMAGE]({}, payload) as Promise<unknown>);

    expect(result).toMatchObject({
      image_src: expect.stringContaining('vv-media://item-images/'),
    });
  });

  it('throws when item image filename empty', async () => {
    await expect(
      handlers[IPC.ITEMS_IMPORT_IMAGE]({}, {
        fileName: '',
        mimeType: 'image/png',
        bytes: new Uint8Array([1]),
      }) as Promise<unknown>,
    ).rejects.toThrowError('Item image fileName is required');
  });

  it('throws when item image mimeType unsupported', async () => {
    await expect(
      handlers[IPC.ITEMS_IMPORT_IMAGE]({}, {
        fileName: 'sunblade.bmp',
        mimeType: 'image/bmp',
        bytes: new Uint8Array([1]),
      }) as Promise<unknown>,
    ).rejects.toThrowError('Unsupported item image mimeType');
  });

  it('throws when item image exceeds 5 MB', async () => {
    const largeBytes = new Uint8Array(5 * 1024 * 1024 + 1);

    await expect(
      handlers[IPC.ITEMS_IMPORT_IMAGE]({}, {
        fileName: 'sunblade.png',
        mimeType: 'image/png',
        bytes: largeBytes,
      }) as Promise<unknown>,
    ).rejects.toThrowError('Item image exceeds 5 MB limit');
  });
});
