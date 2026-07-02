import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerCampaignNoteHandlers } from '../../../src/main/ipc/registerCampaignNoteHandlers';
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

function buildCampaignNoteRow(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    world_id: 10,
    campaign_id: 20,
    name: 'War Board',
    canvas_scene: JSON.stringify({ elements: [], appState: {}, files: {} }),
    canvas_preview_image: 'data:image/png;base64,abc',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('registerCampaignNoteHandlers', () => {
  let dbMock: Database.Database;
  let handlers: Record<string, IpcHandler>;

  function createDbMock(options: { selectedCampaignNote?: unknown; } = {}) {
    const defaultCampaignNote = buildCampaignNoteRow();
    const runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));
    const getMock = vi.fn(() =>
      'selectedCampaignNote' in options
        ? (options.selectedCampaignNote === null ? undefined : options.selectedCampaignNote)
        : defaultCampaignNote
    );
    const allMock = vi.fn(() => [defaultCampaignNote]);
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
    registerCampaignNoteHandlers(dbMock);
    handlers = getHandlers();
  });

  it('returns all campaign notes with parsed canvas and tags attached', () => {
    const noteAll = vi.fn(() => [buildCampaignNoteRow({ id: 1 })]);
    const tagAll = vi.fn(() => [
      { campaign_note_id: 1, tag_name: 'Strategy' },
      { campaign_note_id: 1, tag_name: 'Boss' },
    ]);
    (dbMock.prepare as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ all: noteAll })
      .mockReturnValueOnce({ all: tagAll });

    expect(handlers[IPC.CAMPAIGN_NOTES_GET_ALL_BY_CAMPAIGN]({}, 20)).toEqual([
      expect.objectContaining({
        id: 1,
        tags: ['Strategy', 'Boss'],
        canvas_scene: { elements: [], appState: {}, files: {} },
      }),
    ]);
  });

  it('returns campaign note by id with parsed scene and tags', () => {
    const noteGet = vi.fn(() => buildCampaignNoteRow());
    const tagAll = vi.fn(() => [{ tag_name: 'Strategy' }]);
    (dbMock.prepare as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ get: noteGet })
      .mockReturnValueOnce({ all: tagAll });

    expect(handlers[IPC.CAMPAIGN_NOTES_GET_BY_ID]({}, 1)).toEqual(
      expect.objectContaining({
        name: 'War Board',
        tags: ['Strategy'],
        canvas_scene: { elements: [], appState: {}, files: {} },
      }),
    );
  });

  it('creates campaign note with deduped tags and scene data', () => {
    const result = handlers[IPC.CAMPAIGN_NOTES_ADD]({}, {
      world_id: 10,
      campaign_id: 20,
      name: 'War Board',
      tags: ['Strategy', ' strategy ', 'Boss'],
      canvas_scene: { elements: [], appState: {}, files: {} },
      canvas_preview_image: 'data:image/png;base64,abc',
    });

    expect(result).toEqual(
      expect.objectContaining({
        name: 'War Board',
        tags: ['Strategy', 'Boss'],
        canvas_scene: { elements: [], appState: {}, files: {} },
        canvas_preview_image: 'data:image/png;base64,abc',
      }),
    );
  });

  it('throws when campaign_id missing on create', () => {
    expect(() => handlers[IPC.CAMPAIGN_NOTES_ADD]({}, { world_id: 10, name: 'War Board' }))
      .toThrowError('Campaign note campaign_id is required');
  });

  it('throws when name empty on create', () => {
    expect(() =>
      handlers[IPC.CAMPAIGN_NOTES_ADD]({}, { world_id: 10, campaign_id: 20, name: '   ' })
    ).toThrowError('Campaign note name is required');
  });

  it('updates campaign note fields and replaces tags when tags provided', () => {
    const existingGet = vi.fn(() => buildCampaignNoteRow());
    const updateRun = vi.fn();
    const finalGet = vi.fn(() =>
      buildCampaignNoteRow({
        name: 'Updated Board',
        canvas_scene: JSON.stringify({
          elements: [],
          appState: { viewBackgroundColor: '#fff' },
          files: {},
        }),
      })
    );
    (dbMock.prepare as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ get: existingGet })
      .mockReturnValueOnce({ run: updateRun })
      .mockReturnValueOnce({ run: vi.fn() })
      .mockReturnValueOnce({ run: vi.fn() })
      .mockReturnValueOnce({ get: finalGet });

    const result = handlers[IPC.CAMPAIGN_NOTES_UPDATE]({}, 1, {
      name: 'Updated Board',
      tags: ['Magic'],
      canvas_scene: { elements: [], appState: { viewBackgroundColor: '#fff' }, files: {} },
    });

    expect(result).toEqual(
      expect.objectContaining({
        name: 'Updated Board',
        tags: ['Magic'],
        canvas_scene: {
          elements: [],
          appState: { viewBackgroundColor: '#fff' },
          files: {},
        },
      }),
    );
  });

  it('returns distinct campaign tag vocabulary ordered case-insensitively', () => {
    const tagAll = vi.fn(() => [{ tag_name: 'Boss' }, { tag_name: 'strategy' }]);
    (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: tagAll });

    expect(handlers[IPC.CAMPAIGN_NOTE_TAGS_GET_ALL_BY_CAMPAIGN]({}, 20)).toEqual([
      'Boss',
      'strategy',
    ]);
  });
});
