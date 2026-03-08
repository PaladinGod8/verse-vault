import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerCampaignHandlers } from '../../../src/main/ipc/registerCampaignHandlers';
import { IPC } from '../../../src/shared/ipcChannels';

type IpcHandler = (...args: unknown[]) => unknown;

const { ipcHandleMock } = vi.hoisted(() => ({
  ipcHandleMock: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: { handle: ipcHandleMock },
}));

function getHandlers(): Record<string, IpcHandler> {
  return Object.fromEntries(
    ipcHandleMock.mock.calls.map(([ch, handler]) => [ch as string, handler as IpcHandler]),
  );
}

function buildCampaign(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    world_id: 10,
    name: 'Test Campaign',
    summary: null as null,
    config: '{}',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('registerCampaignHandlers', () => {
  let runMock: ReturnType<typeof vi.fn>;
  let getMock: ReturnType<typeof vi.fn>;
  let allMock: ReturnType<typeof vi.fn>;
  let dbMock: Database.Database;
  let handlers: Record<string, IpcHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));
    getMock = vi.fn(() => buildCampaign());
    allMock = vi.fn(() => [buildCampaign()]);
    dbMock = {
      prepare: vi.fn(() => ({ run: runMock, get: getMock, all: allMock })),
    } as unknown as Database.Database;
    registerCampaignHandlers(dbMock);
    handlers = getHandlers();
  });

  describe(IPC.CAMPAIGNS_GET_ALL_BY_WORLD, () => {
    it('returns all campaigns for a world', () => {
      expect(handlers[IPC.CAMPAIGNS_GET_ALL_BY_WORLD]({}, 10)).toEqual([buildCampaign()]);
      expect(allMock).toHaveBeenCalledWith(10);
    });
  });

  describe(IPC.CAMPAIGNS_GET_BY_ID, () => {
    it('returns campaign by id', () => {
      expect(handlers[IPC.CAMPAIGNS_GET_BY_ID]({}, 1)).toEqual(buildCampaign());
    });

    it('returns null when not found', () => {
      getMock.mockReturnValueOnce(undefined);
      expect(handlers[IPC.CAMPAIGNS_GET_BY_ID]({}, 999)).toBeNull();
    });
  });

  describe(IPC.CAMPAIGNS_ADD, () => {
    it('creates and returns campaign with all fields', () => {
      const result = handlers[IPC.CAMPAIGNS_ADD]({}, {
        world_id: 10,
        name: 'New Campaign',
        summary: 'A summary',
        config: '{"key":"val"}',
      });
      expect(result).toEqual(buildCampaign());
      expect(runMock).toHaveBeenCalledWith(10, 'New Campaign', 'A summary', '{"key":"val"}');
    });

    it('uses null defaults for optional fields', () => {
      handlers[IPC.CAMPAIGNS_ADD]({}, { world_id: 10, name: 'New' });
      expect(runMock).toHaveBeenCalledWith(10, 'New', null, '{}');
    });

    it('trims whitespace from name', () => {
      handlers[IPC.CAMPAIGNS_ADD]({}, { world_id: 10, name: '  Trimmed  ' });
      expect(runMock).toHaveBeenCalledWith(10, 'Trimmed', null, '{}');
    });

    it('throws when name is empty string', () => {
      expect(() => handlers[IPC.CAMPAIGNS_ADD]({}, { world_id: 10, name: '' }))
        .toThrowError('Campaign name is required');
    });

    it('throws when name is whitespace-only', () => {
      expect(() => handlers[IPC.CAMPAIGNS_ADD]({}, { world_id: 10, name: '   ' }))
        .toThrowError('Campaign name is required');
    });

    it('throws when name is not a string', () => {
      expect(() => handlers[IPC.CAMPAIGNS_ADD]({}, { world_id: 10, name: null }))
        .toThrowError('Campaign name is required');
    });

    it('throws when campaign not found after insert', () => {
      getMock.mockReturnValueOnce(undefined);
      expect(() => handlers[IPC.CAMPAIGNS_ADD]({}, { world_id: 10, name: 'New' }))
        .toThrowError('Failed to create campaign');
    });
  });

  describe(IPC.CAMPAIGNS_UPDATE, () => {
    it('updates name, summary, config and returns campaign', () => {
      const result = handlers[IPC.CAMPAIGNS_UPDATE]({}, 1, {
        name: 'Updated',
        summary: 'new summary',
        config: '{"a":1}',
      });
      expect(result).toEqual(buildCampaign());
    });

    it('touch-only update (no fields) still returns campaign', () => {
      const result = handlers[IPC.CAMPAIGNS_UPDATE]({}, 1, {});
      expect(result).toEqual(buildCampaign());
    });

    it('updates only name when only name is provided', () => {
      handlers[IPC.CAMPAIGNS_UPDATE]({}, 1, { name: 'OnlyName' });
      expect(runMock).toHaveBeenCalledWith('OnlyName', 1);
    });

    it('updates only summary when only summary is provided', () => {
      handlers[IPC.CAMPAIGNS_UPDATE]({}, 1, { summary: 'New summary' });
      expect(runMock).toHaveBeenCalledWith('New summary', 1);
    });

    it('updates only config when only config is provided', () => {
      handlers[IPC.CAMPAIGNS_UPDATE]({}, 1, { config: '{"x":2}' });
      expect(runMock).toHaveBeenCalledWith('{"x":2}', 1);
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.CAMPAIGNS_UPDATE]({}, 1, { name: '' }))
        .toThrowError('Campaign name cannot be empty');
    });

    it('throws when name is whitespace-only', () => {
      expect(() => handlers[IPC.CAMPAIGNS_UPDATE]({}, 1, { name: '   ' }))
        .toThrowError('Campaign name cannot be empty');
    });

    it('throws when campaign not found after update', () => {
      getMock.mockReturnValueOnce(undefined);
      expect(() => handlers[IPC.CAMPAIGNS_UPDATE]({}, 999, { name: 'X' }))
        .toThrowError('Campaign not found');
    });
  });

  describe(IPC.CAMPAIGNS_DELETE, () => {
    it('deletes campaign and returns id', () => {
      expect(handlers[IPC.CAMPAIGNS_DELETE]({}, 5)).toEqual({ id: 5 });
      expect(runMock).toHaveBeenCalledWith(5);
    });
  });
});
