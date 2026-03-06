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

const mockStatBlock: StatBlock = {
  id: 1,
  world_id: 1,
  campaign_id: null,
  character_id: null,
  name: 'Test Statblock',
  default_token_id: null,
  description: 'A test statblock',
  config: '{}',
  created_at: '2026-03-06T00:00:00Z',
  updated_at: '2026-03-06T00:00:00Z',
};

describe('preload - statblock methods', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('getAllByWorld', () => {
    it('invokes STATBLOCKS_GET_ALL_BY_WORLD with worldId', async () => {
      invokeMock.mockResolvedValueOnce([mockStatBlock]);
      await import('../../../src/preload');
      const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

      const result = await api.statblocks.getAllByWorld(1);

      expect(invokeMock).toHaveBeenCalledWith(
        IPC.STATBLOCKS_GET_ALL_BY_WORLD,
        1,
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('returns empty array when no statblocks', async () => {
      invokeMock.mockResolvedValueOnce([]);
      await import('../../../src/preload');
      const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

      const result = await api.statblocks.getAllByWorld(99);

      expect(result).toEqual([]);
    });
  });

  describe('getAllByCampaign', () => {
    it('invokes STATBLOCKS_GET_ALL_BY_CAMPAIGN with campaignId', async () => {
      const campaignSB = { ...mockStatBlock, campaign_id: 2 };
      invokeMock.mockResolvedValueOnce([campaignSB]);
      await import('../../../src/preload');
      const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

      const result = await api.statblocks.getAllByCampaign(2);

      expect(invokeMock).toHaveBeenCalledWith(
        IPC.STATBLOCKS_GET_ALL_BY_CAMPAIGN,
        2,
      );
      expect(result[0].campaign_id).toBe(2);
    });

    it('returns empty array when no campaign statblocks', async () => {
      invokeMock.mockResolvedValueOnce([]);
      await import('../../../src/preload');
      const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

      const result = await api.statblocks.getAllByCampaign(99);

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('invokes STATBLOCKS_GET_BY_ID with id', async () => {
      invokeMock.mockResolvedValueOnce(mockStatBlock);
      await import('../../../src/preload');
      const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

      const result = await api.statblocks.getById(1);

      expect(invokeMock).toHaveBeenCalledWith(IPC.STATBLOCKS_GET_BY_ID, 1);
      expect(result).not.toBeNull();
      expect((result as { id: number }).id).toBe(1);
    });

    it('returns null when not found', async () => {
      invokeMock.mockResolvedValueOnce(null);
      await import('../../../src/preload');
      const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

      const result = await api.statblocks.getById(999);

      expect(result).toBeNull();
    });
  });

  describe('add', () => {
    it('invokes STATBLOCKS_ADD with payload and returns created statblock', async () => {
      const payload = {
        world_id: 1,
        name: 'Barbarian',
        description: 'Strong fighter',
      };
      invokeMock.mockResolvedValueOnce({ ...mockStatBlock, ...payload });
      await import('../../../src/preload');
      const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

      const result = await api.statblocks.add(payload);

      expect(invokeMock).toHaveBeenCalledWith(IPC.STATBLOCKS_ADD, payload);
      expect(result.name).toBe('Barbarian');
      expect(result.id).toBeDefined();
    });

    it('propagates errors from main process', async () => {
      invokeMock.mockRejectedValueOnce(new Error('name is required'));
      await import('../../../src/preload');
      const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

      await expect(
        api.statblocks.add({ world_id: 1, name: '' }),
      ).rejects.toThrow('name is required');
    });
  });

  describe('update', () => {
    it('invokes STATBLOCKS_UPDATE with id and data', async () => {
      const updated = {
        ...mockStatBlock,
        name: 'Wizard',
        updated_at: '2026-03-06T01:00:00Z',
      };
      invokeMock.mockResolvedValueOnce(updated);
      await import('../../../src/preload');
      const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

      const result = await api.statblocks.update(1, { name: 'Wizard' });

      expect(invokeMock).toHaveBeenCalledWith(IPC.STATBLOCKS_UPDATE, 1, {
        name: 'Wizard',
      });
      expect(result.name).toBe('Wizard');
    });

    it('propagates errors from main process', async () => {
      invokeMock.mockRejectedValueOnce(new Error('StatBlock not found'));
      await import('../../../src/preload');
      const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

      await expect(api.statblocks.update(999, { name: 'X' })).rejects.toThrow(
        'StatBlock not found',
      );
    });
  });

  describe('delete', () => {
    it('invokes STATBLOCKS_DELETE with id and returns { id }', async () => {
      invokeMock.mockResolvedValueOnce({ id: 1 });
      await import('../../../src/preload');
      const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

      const result = await api.statblocks.delete(1);

      expect(invokeMock).toHaveBeenCalledWith(IPC.STATBLOCKS_DELETE, 1);
      expect(result).toEqual({ id: 1 });
    });

    it('returns id even for non-existent row (idempotent)', async () => {
      invokeMock.mockResolvedValueOnce({ id: 999 });
      await import('../../../src/preload');
      const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

      const result = await api.statblocks.delete(999);

      expect(result).toEqual({ id: 999 });
    });
  });
});
