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
        levels: expect.any(Object),
        abilities: expect.any(Object),
        worlds: expect.any(Object),
      }),
    );

    const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

    await api.verses.getAll();
    await api.verses.add({ text: 'Verse text' });
    await api.verses.update(3, { reference: 'John 3:16' });
    await api.verses.delete(7);
    await api.worlds.getAll();
    await api.worlds.getById(2);
    await api.worlds.add({ name: 'World name' });
    await api.worlds.update(5, { short_description: 'Updated' });
    await api.worlds.delete(9);
    await api.worlds.markViewed(11);
    await api.abilities.getAllByWorld(3);
    await api.abilities.getById(4);
    await api.abilities.add({
      world_id: 3,
      name: 'Ability',
      type: 'active',
    });
    await api.abilities.update(4, { name: 'Updated ability' });
    await api.abilities.delete(4);
    await api.abilities.addChild({ parent_id: 1, child_id: 2 });
    await api.abilities.removeChild({ parent_id: 1, child_id: 2 });
    await api.abilities.getChildren(1);

    expect(invokeMock).toHaveBeenNthCalledWith(1, IPC.VERSES_GET_ALL);
    expect(invokeMock).toHaveBeenNthCalledWith(2, IPC.VERSES_ADD, {
      text: 'Verse text',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(3, IPC.VERSES_UPDATE, 3, {
      reference: 'John 3:16',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(4, IPC.VERSES_DELETE, 7);
    expect(invokeMock).toHaveBeenNthCalledWith(5, IPC.WORLDS_GET_ALL);
    expect(invokeMock).toHaveBeenNthCalledWith(6, IPC.WORLDS_GET_BY_ID, 2);
    expect(invokeMock).toHaveBeenNthCalledWith(7, IPC.WORLDS_ADD, {
      name: 'World name',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(8, IPC.WORLDS_UPDATE, 5, {
      short_description: 'Updated',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(9, IPC.WORLDS_DELETE, 9);
    expect(invokeMock).toHaveBeenNthCalledWith(10, IPC.WORLDS_MARK_VIEWED, 11);
    expect(invokeMock).toHaveBeenNthCalledWith(
      11,
      IPC.ABILITIES_GET_ALL_BY_WORLD,
      3,
    );
    expect(invokeMock).toHaveBeenNthCalledWith(12, IPC.ABILITIES_GET_BY_ID, 4);
    expect(invokeMock).toHaveBeenNthCalledWith(13, IPC.ABILITIES_ADD, {
      world_id: 3,
      name: 'Ability',
      type: 'active',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(14, IPC.ABILITIES_UPDATE, 4, {
      name: 'Updated ability',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(15, IPC.ABILITIES_DELETE, 4);
    expect(invokeMock).toHaveBeenNthCalledWith(16, IPC.ABILITIES_ADD_CHILD, {
      parent_id: 1,
      child_id: 2,
    });
    expect(invokeMock).toHaveBeenNthCalledWith(17, IPC.ABILITIES_REMOVE_CHILD, {
      parent_id: 1,
      child_id: 2,
    });
    expect(invokeMock).toHaveBeenNthCalledWith(
      18,
      IPC.ABILITIES_GET_CHILDREN,
      1,
    );
  });
});
