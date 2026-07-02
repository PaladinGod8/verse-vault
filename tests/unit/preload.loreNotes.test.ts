import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IPC } from '../../src/shared/ipcChannels';

const exposeInMainWorldMock = vi.fn();
const invokeMock = vi.fn();

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: exposeInMainWorldMock,
  },
  ipcRenderer: {
    invoke: invokeMock,
  },
}));

describe('preload lore notes bridge', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('forwards lore note CRUD calls to their IPC channels', async () => {
    await import('../../src/preload');
    const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

    await api.loreNotes.getAllByWorld(1);
    expect(invokeMock).toHaveBeenCalledWith(IPC.LORE_NOTES_GET_ALL_BY_WORLD, 1);

    await api.loreNotes.getById(2);
    expect(invokeMock).toHaveBeenCalledWith(IPC.LORE_NOTES_GET_BY_ID, 2);

    await api.loreNotes.add({ world_id: 1, name: 'Founding Myth', tags: ['Economics'] });
    expect(invokeMock).toHaveBeenCalledWith(IPC.LORE_NOTES_ADD, {
      world_id: 1,
      name: 'Founding Myth',
      tags: ['Economics'],
    });

    await api.loreNotes.update(2, { name: 'Updated', tags: [] });
    expect(invokeMock).toHaveBeenCalledWith(IPC.LORE_NOTES_UPDATE, 2, {
      name: 'Updated',
      tags: [],
    });

    await api.loreNotes.delete(2);
    expect(invokeMock).toHaveBeenCalledWith(IPC.LORE_NOTES_DELETE, 2);

    await api.loreNotes.markViewed(2);
    expect(invokeMock).toHaveBeenCalledWith(IPC.LORE_NOTES_MARK_VIEWED, 2);

    await api.loreNotes.getAllTagsByWorld(1);
    expect(invokeMock).toHaveBeenCalledWith(IPC.LORE_NOTE_TAGS_GET_ALL_BY_WORLD, 1);
  });

  it('forwards loreNotes.importImage to LORE_NOTES_IMPORT_IMAGE', async () => {
    await import('../../src/preload');
    const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

    const payload: TokenImageImportPayload = {
      fileName: 'note.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([7, 8, 9]),
    };

    await api.loreNotes.importImage(payload);

    expect(invokeMock).toHaveBeenCalledWith(IPC.LORE_NOTES_IMPORT_IMAGE, {
      fileName: 'note.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([7, 8, 9]),
    });
  });

  it('throws error when loreNotes.importImage receives non-Uint8Array bytes', async () => {
    await import('../../src/preload');
    const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

    const invalidPayload = {
      fileName: 'note.png',
      mimeType: 'image/png',
      bytes: [7, 8, 9],
    } as unknown as TokenImageImportPayload;

    expect(() => api.loreNotes.importImage(invalidPayload)).toThrow(
      'Lore note image bytes must be a Uint8Array',
    );
  });
});
