import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IPC } from '../../../src/shared/ipcChannels';

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

describe('preload - token move methods', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should invoke IPC.TOKENS_MOVE_TO_WORLD channel with correct parameters', async () => {
    const mockToken: Token = {
      id: 1,
      world_id: 1,
      campaign_id: null,
      name: 'Test Token',
      image_src: null,
      config: '{}',
      is_visible: 1,
      created_at: '2026-03-01 00:00:00',
      updated_at: '2026-03-01 00:00:00',
    };

    invokeMock.mockResolvedValueOnce(mockToken);

    await import('../../../src/preload');

    const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

    const result = await api.tokens.moveToWorld(1);

    expect(invokeMock).toHaveBeenCalledWith(IPC.TOKENS_MOVE_TO_WORLD, 1);
    expect(result.campaign_id).toBeNull();
    expect(result.id).toBe(1);
  });

  it('should propagate main process errors for moveToWorld', async () => {
    invokeMock.mockRejectedValueOnce(new Error('Token not found'));

    await import('../../../src/preload');

    const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

    await expect(api.tokens.moveToWorld(99999)).rejects.toThrow(
      'Token not found',
    );
  });

  it('should invoke IPC.TOKENS_MOVE_TO_CAMPAIGN channel with correct parameters', async () => {
    const mockToken: Token = {
      id: 1,
      world_id: 1,
      campaign_id: 2,
      name: 'Test Token',
      image_src: null,
      config: '{}',
      is_visible: 1,
      created_at: '2026-03-01 00:00:00',
      updated_at: '2026-03-01 00:00:00',
    };

    invokeMock.mockResolvedValueOnce(mockToken);

    await import('../../../src/preload');

    const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

    const result = await api.tokens.moveToCampaign(1, 2);

    expect(invokeMock).toHaveBeenCalledWith(IPC.TOKENS_MOVE_TO_CAMPAIGN, 1, 2);
    expect(result.campaign_id).toBe(2);
    expect(result.id).toBe(1);
  });

  it('should propagate main process errors for moveToCampaign', async () => {
    invokeMock.mockRejectedValueOnce(
      new Error('Campaign not in the same world'),
    );

    await import('../../../src/preload');

    const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

    await expect(api.tokens.moveToCampaign(1, 99999)).rejects.toThrow(
      'Campaign not in the same world',
    );
  });

  it('should handle campaign not found error for moveToCampaign', async () => {
    invokeMock.mockRejectedValueOnce(new Error('Campaign not found'));

    await import('../../../src/preload');

    const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

    await expect(api.tokens.moveToCampaign(1, 99999)).rejects.toThrow(
      'Campaign not found',
    );
  });

  it('should handle token not found error for moveToCampaign', async () => {
    invokeMock.mockRejectedValueOnce(new Error('Token not found'));

    await import('../../../src/preload');

    const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

    await expect(api.tokens.moveToCampaign(99999, 1)).rejects.toThrow(
      'Token not found',
    );
  });
});
