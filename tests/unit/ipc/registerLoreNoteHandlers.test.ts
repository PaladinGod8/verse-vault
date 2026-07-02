import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerLoreNoteHandlers } from '../../../src/main/ipc/registerLoreNoteHandlers';
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
  const randomUUID = vi.fn(() => 'lore-note-uuid-9999');
  return { default: { randomUUID }, randomUUID };
});

function getHandlers(): Record<string, IpcHandler> {
  return Object.fromEntries(
    ipcHandleMock.mock.calls.map(([ch, handler]) => [ch as string, handler as IpcHandler]),
  );
}

function buildLoreNoteRow(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    world_id: 10,
    name: 'Founding Myth',
    content: null as null,
    image_src: null as null,
    last_viewed_at: null as null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('registerLoreNoteHandlers', () => {
  let dbMock: Database.Database;
  let handlers: Record<string, IpcHandler>;

  function createDbMock(options: { selectedLoreNote?: unknown; } = {}) {
    const defaultLoreNote = buildLoreNoteRow();
    const runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));
    const getMock = vi.fn(() =>
      'selectedLoreNote' in options
        ? (options.selectedLoreNote === null ? undefined : options.selectedLoreNote)
        : defaultLoreNote
    );
    const allMock = vi.fn(() => [defaultLoreNote]);
    const transactionMock = vi.fn(
      (callback: (...args: unknown[]) => unknown) => (...args: unknown[]) => callback(...args),
    );
    return {
      prepare: vi.fn(() => ({ run: runMock, get: getMock, all: allMock })),
      pragma: vi.fn(() => []),
      exec: vi.fn(),
      transaction: transactionMock,
    } as unknown as Database.Database;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = createDbMock();
    registerLoreNoteHandlers(dbMock);
    handlers = getHandlers();
  });

  it('returns all lore notes for a world with tags attached', () => {
    const noteAll = vi.fn(() => [buildLoreNoteRow({ id: 1 })]);
    const tagAll = vi.fn(() => [
      { lore_note_id: 1, tag_name: 'Economics' },
      { lore_note_id: 1, tag_name: 'Trade' },
    ]);
    (dbMock.prepare as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ all: noteAll })
      .mockReturnValueOnce({ all: tagAll });

    expect(handlers[IPC.LORE_NOTES_GET_ALL_BY_WORLD]({}, 10)).toEqual([
      { ...buildLoreNoteRow({ id: 1 }), tags: ['Economics', 'Trade'] },
    ]);
  });

  it('returns empty tags when a world has no lore note tags', () => {
    const noteAll = vi.fn(() => [buildLoreNoteRow({ id: 1 })]);
    const tagAll = vi.fn(() => []);
    (dbMock.prepare as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ all: noteAll })
      .mockReturnValueOnce({ all: tagAll });

    expect(handlers[IPC.LORE_NOTES_GET_ALL_BY_WORLD]({}, 10)).toEqual([
      { ...buildLoreNoteRow({ id: 1 }), tags: [] },
    ]);
  });

  it('returns lore note by id with tags attached', () => {
    const noteGet = vi.fn(() => buildLoreNoteRow());
    const tagAll = vi.fn(() => [{ tag_name: 'Economics' }]);
    (dbMock.prepare as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ get: noteGet })
      .mockReturnValueOnce({ all: tagAll });

    expect(handlers[IPC.LORE_NOTES_GET_BY_ID]({}, 1)).toEqual({
      ...buildLoreNoteRow(),
      tags: ['Economics'],
    });
  });

  it('returns null when lore note not found by id', () => {
    const mockGet = vi.fn(() => undefined);
    (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });

    expect(handlers[IPC.LORE_NOTES_GET_BY_ID]({}, 999)).toBeNull();
  });

  it('creates lore note with name, content, image, and deduped tags', () => {
    const db = createDbMock({
      selectedLoreNote: buildLoreNoteRow({
        name: 'Founding Myth',
        content: 'Long ago...',
        image_src: 'vv-media://lore-note-images/myth.png',
      }),
    });
    vi.clearAllMocks();
    registerLoreNoteHandlers(db);
    const h = getHandlers();

    const result = h[IPC.LORE_NOTES_ADD]({}, {
      world_id: 10,
      name: 'Founding Myth',
      content: 'Long ago...',
      image_src: 'vv-media://lore-note-images/myth.png',
      tags: ['Economics', '  economics ', 'Trade', ''],
    });

    expect(result).toMatchObject({
      name: 'Founding Myth',
      content: 'Long ago...',
      image_src: 'vv-media://lore-note-images/myth.png',
      tags: ['Economics', 'Trade'],
    });
  });

  it('throws when world_id missing on create', () => {
    expect(() => handlers[IPC.LORE_NOTES_ADD]({}, { name: 'Founding Myth' }))
      .toThrowError('Lore note world_id is required');
  });

  it('throws when name empty on create', () => {
    expect(() => handlers[IPC.LORE_NOTES_ADD]({}, { world_id: 10, name: '   ' }))
      .toThrowError('Lore note name is required');
  });

  it('throws when lore note missing after insert', () => {
    const db = createDbMock({ selectedLoreNote: null });
    vi.clearAllMocks();
    registerLoreNoteHandlers(db);
    const h = getHandlers();

    expect(() => h[IPC.LORE_NOTES_ADD]({}, { world_id: 10, name: 'Founding Myth' }))
      .toThrowError('Failed to create lore note');
  });

  it('updates lore note fields and replaces tags when tags provided', () => {
    const db = createDbMock({
      selectedLoreNote: buildLoreNoteRow({
        name: 'Updated Myth',
        content: 'Updated content.',
      }),
    });
    vi.clearAllMocks();
    registerLoreNoteHandlers(db);
    const h = getHandlers();

    const result = h[IPC.LORE_NOTES_UPDATE]({}, 1, {
      name: 'Updated Myth',
      content: 'Updated content.',
      image_src: null,
      tags: ['Magic'],
    });

    expect(result).toMatchObject({
      name: 'Updated Myth',
      content: 'Updated content.',
      image_src: null,
      tags: ['Magic'],
    });
  });

  it('leaves existing tags untouched when tags key omitted on update', () => {
    const existingGet = vi.fn(() => buildLoreNoteRow());
    const updateRun = vi.fn();
    const finalGet = vi.fn(() => buildLoreNoteRow({ name: 'Renamed Only' }));
    const existingTagsAll = vi.fn(() => [{ tag_name: 'Economics' }]);
    (dbMock.prepare as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ get: existingGet })
      .mockReturnValueOnce({ run: updateRun })
      .mockReturnValueOnce({ get: finalGet })
      .mockReturnValueOnce({ all: existingTagsAll });

    const result = handlers[IPC.LORE_NOTES_UPDATE]({}, 1, { name: 'Renamed Only' });

    expect(result).toMatchObject({ name: 'Renamed Only', tags: ['Economics'] });
  });

  it('throws when name empty on update', () => {
    expect(() => handlers[IPC.LORE_NOTES_UPDATE]({}, 1, { name: '' }))
      .toThrowError('Lore note name is required');
  });

  it('throws when lore note missing on update', () => {
    const db = createDbMock({ selectedLoreNote: null });
    vi.clearAllMocks();
    registerLoreNoteHandlers(db);
    const h = getHandlers();

    expect(() => h[IPC.LORE_NOTES_UPDATE]({}, 999, { name: 'Updated' }))
      .toThrowError('Lore note not found');
  });

  it('deletes lore note tags then the lore note, returning id', () => {
    const runMock = vi.fn();
    (dbMock.prepare as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ run: runMock })
      .mockReturnValueOnce({ run: runMock });

    expect(handlers[IPC.LORE_NOTES_DELETE]({}, 5)).toEqual({ id: 5 });
    expect(runMock).toHaveBeenCalledTimes(2);
  });

  it('marks lore note viewed and returns refreshed row with tags', () => {
    const runMock = vi.fn();
    const getMock = vi.fn(() => buildLoreNoteRow({ last_viewed_at: '2026-04-01 00:00:00' }));
    const tagAll = vi.fn(() => [{ tag_name: 'Economics' }]);
    (dbMock.prepare as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ run: runMock })
      .mockReturnValueOnce({ get: getMock })
      .mockReturnValueOnce({ all: tagAll });

    expect(handlers[IPC.LORE_NOTES_MARK_VIEWED]({}, 1)).toMatchObject({
      last_viewed_at: '2026-04-01 00:00:00',
      tags: ['Economics'],
    });
  });

  it('returns distinct world tag vocabulary ordered case-insensitively', () => {
    const tagAll = vi.fn(() => [{ tag_name: 'Economics' }, { tag_name: 'trade' }]);
    (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: tagAll });

    expect(handlers[IPC.LORE_NOTE_TAGS_GET_ALL_BY_WORLD]({}, 10)).toEqual([
      'Economics',
      'trade',
    ]);
  });

  it('saves image and returns lore note media URL', async () => {
    const payload = {
      fileName: 'myth.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([1, 2, 3]),
    };

    const result = await (
      handlers[IPC.LORE_NOTES_IMPORT_IMAGE]({}, payload) as Promise<unknown>
    );

    expect(result).toMatchObject({
      image_src: expect.stringContaining('vv-media://lore-note-images/'),
    });
  });

  it('throws when lore note image filename empty', async () => {
    await expect(
      handlers[IPC.LORE_NOTES_IMPORT_IMAGE]({}, {
        fileName: '',
        mimeType: 'image/png',
        bytes: new Uint8Array([1]),
      }) as Promise<unknown>,
    ).rejects.toThrowError('Lore note image fileName is required');
  });

  it('throws when lore note image mimeType unsupported', async () => {
    await expect(
      handlers[IPC.LORE_NOTES_IMPORT_IMAGE]({}, {
        fileName: 'myth.bmp',
        mimeType: 'image/bmp',
        bytes: new Uint8Array([1]),
      }) as Promise<unknown>,
    ).rejects.toThrowError('Unsupported lore note image mimeType');
  });

  it('throws when lore note image exceeds 5 MB', async () => {
    const largeBytes = new Uint8Array(5 * 1024 * 1024 + 1);

    await expect(
      handlers[IPC.LORE_NOTES_IMPORT_IMAGE]({}, {
        fileName: 'myth.png',
        mimeType: 'image/png',
        bytes: largeBytes,
      }) as Promise<unknown>,
    ).rejects.toThrowError('Lore note image exceeds 5 MB limit');
  });
});
