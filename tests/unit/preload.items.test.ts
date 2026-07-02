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

describe('preload items bridge', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('forwards items CRUD calls to their IPC channels', async () => {
    await import('../../src/preload');
    const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

    await api.items.getAllByWorld(1);
    expect(invokeMock).toHaveBeenCalledWith(IPC.ITEMS_GET_ALL_BY_WORLD, 1);

    await api.items.getById(2);
    expect(invokeMock).toHaveBeenCalledWith(IPC.ITEMS_GET_BY_ID, 2);

    await api.items.add({ world_id: 1, name: 'Sunblade' });
    expect(invokeMock).toHaveBeenCalledWith(IPC.ITEMS_ADD, {
      world_id: 1,
      name: 'Sunblade',
    });

    await api.items.update(2, { name: 'Updated' });
    expect(invokeMock).toHaveBeenCalledWith(IPC.ITEMS_UPDATE, 2, {
      name: 'Updated',
    });

    await api.items.delete(2);
    expect(invokeMock).toHaveBeenCalledWith(IPC.ITEMS_DELETE, 2);

    await api.items.markViewed(2);
    expect(invokeMock).toHaveBeenCalledWith(IPC.ITEMS_MARK_VIEWED, 2);
  });

  it('forwards items.importImage to ITEMS_IMPORT_IMAGE', async () => {
    await import('../../src/preload');
    const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

    const payload: TokenImageImportPayload = {
      fileName: 'item.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([7, 8, 9]),
    };

    await api.items.importImage(payload);

    expect(invokeMock).toHaveBeenCalledWith(IPC.ITEMS_IMPORT_IMAGE, {
      fileName: 'item.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([7, 8, 9]),
    });
  });

  it('throws error when items.importImage receives non-Uint8Array bytes', async () => {
    await import('../../src/preload');
    const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

    const invalidPayload = {
      fileName: 'item.png',
      mimeType: 'image/png',
      bytes: [7, 8, 9],
    } as unknown as TokenImageImportPayload;

    expect(() => api.items.importImage(invalidPayload)).toThrow(
      'Item image bytes must be a Uint8Array',
    );
  });
});
