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

describe('preload campaign notes bridge', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('forwards campaign note CRUD calls to their IPC channels', async () => {
    await import('../../src/preload');
    const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

    await api.campaignNotes.getAllByCampaign(1);
    expect(invokeMock).toHaveBeenCalledWith(IPC.CAMPAIGN_NOTES_GET_ALL_BY_CAMPAIGN, 1);

    await api.campaignNotes.getById(2);
    expect(invokeMock).toHaveBeenCalledWith(IPC.CAMPAIGN_NOTES_GET_BY_ID, 2);

    await api.campaignNotes.add({
      world_id: 1,
      campaign_id: 9,
      name: 'War Board',
      tags: ['Strategy'],
      canvas_scene: { elements: [], appState: {}, files: {} },
      canvas_preview_image: 'data:image/png;base64,abc',
    });
    expect(invokeMock).toHaveBeenCalledWith(IPC.CAMPAIGN_NOTES_ADD, {
      world_id: 1,
      campaign_id: 9,
      name: 'War Board',
      tags: ['Strategy'],
      canvas_scene: { elements: [], appState: {}, files: {} },
      canvas_preview_image: 'data:image/png;base64,abc',
    });

    await api.campaignNotes.update(2, { name: 'Updated Board', tags: [] });
    expect(invokeMock).toHaveBeenCalledWith(IPC.CAMPAIGN_NOTES_UPDATE, 2, {
      name: 'Updated Board',
      tags: [],
    });

    await api.campaignNotes.delete(2);
    expect(invokeMock).toHaveBeenCalledWith(IPC.CAMPAIGN_NOTES_DELETE, 2);

    await api.campaignNotes.getAllTagsByCampaign(9);
    expect(invokeMock).toHaveBeenCalledWith(IPC.CAMPAIGN_NOTE_TAGS_GET_ALL_BY_CAMPAIGN, 9);
  });
});
