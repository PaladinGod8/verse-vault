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

describe('preload', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('exposes db api and forwards calls to IPC channels', async () => {
    await import('../../src/preload');

    expect(exposeInMainWorldMock).toHaveBeenCalledTimes(1);
    expect(exposeInMainWorldMock).toHaveBeenCalledWith(
      'db',
      expect.objectContaining({
        verses: expect.any(Object),
      }),
    );

    const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

    await api.verses.getAll();
    await api.verses.add({ text: 'Verse text' });
    await api.verses.update(3, { reference: 'John 3:16' });
    await api.verses.delete(7);

    expect(invokeMock).toHaveBeenNthCalledWith(1, IPC.VERSES_GET_ALL);
    expect(invokeMock).toHaveBeenNthCalledWith(2, IPC.VERSES_ADD, {
      text: 'Verse text',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(3, IPC.VERSES_UPDATE, 3, {
      reference: 'John 3:16',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(4, IPC.VERSES_DELETE, 7);
  });
});
