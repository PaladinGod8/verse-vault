import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerVerseHandlers } from '../../../src/main/ipc/registerVerseHandlers';
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

function buildVerse(overrides?: Partial<Verse>): Verse {
  return {
    id: 1,
    text: 'For God so loved the world',
    reference: 'John 3:16',
    tags: 'love',
    created_at: '2026-01-01 00:00:00',
    updated_at: '2026-01-01 00:00:00',
    ...overrides,
  };
}

describe('registerVerseHandlers', () => {
  let runMock: ReturnType<typeof vi.fn>;
  let getMock: ReturnType<typeof vi.fn>;
  let allMock: ReturnType<typeof vi.fn>;
  let dbMock: Database.Database;
  let handlers: Record<string, IpcHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));
    getMock = vi.fn(() => buildVerse());
    allMock = vi.fn(() => [buildVerse()]);
    dbMock = {
      prepare: vi.fn(() => ({ run: runMock, get: getMock, all: allMock })),
    } as unknown as Database.Database;
    registerVerseHandlers(dbMock);
    handlers = getHandlers();
  });

  describe(IPC.VERSES_GET_ALL, () => {
    it('returns all verses ordered by created_at DESC', () => {
      const result = handlers[IPC.VERSES_GET_ALL]({});
      expect(result).toEqual([buildVerse()]);
      expect(allMock).toHaveBeenCalled();
    });
  });

  describe(IPC.VERSES_ADD, () => {
    it('inserts verse with all fields and returns the new verse', () => {
      const result = handlers[IPC.VERSES_ADD]({}, {
        text: 'Hello',
        reference: 'John 1:1',
        tags: 'greeting',
      });
      expect(result).toEqual(buildVerse());
      expect(runMock).toHaveBeenCalledWith('Hello', 'John 1:1', 'greeting');
    });

    it('defaults reference and tags to null when omitted', () => {
      handlers[IPC.VERSES_ADD]({}, { text: 'Hello' });
      expect(runMock).toHaveBeenCalledWith('Hello', null, null);
    });

    it('returns the looked-up verse row after insert', () => {
      const newVerse = buildVerse({ id: 42, text: 'New verse' });
      getMock.mockReturnValueOnce(newVerse);
      const result = handlers[IPC.VERSES_ADD]({}, { text: 'New verse' });
      expect(result).toEqual(newVerse);
    });
  });

  describe(IPC.VERSES_UPDATE, () => {
    it('runs update with all fields and returns updated verse', () => {
      const result = handlers[IPC.VERSES_UPDATE]({}, 1, {
        text: 'Updated',
        reference: 'Rev 1:1',
        tags: 'end',
      });
      expect(result).toEqual(buildVerse());
      expect(runMock).toHaveBeenCalledWith('Updated', 'Rev 1:1', 'end', 1);
    });

    it('defaults undefined fields to null', () => {
      handlers[IPC.VERSES_UPDATE]({}, 2, {});
      expect(runMock).toHaveBeenCalledWith(null, null, null, 2);
    });

    it('passes null explicitly for reference and tags', () => {
      handlers[IPC.VERSES_UPDATE]({}, 3, { reference: null, tags: null });
      expect(runMock).toHaveBeenCalledWith(null, null, null, 3);
    });
  });

  describe(IPC.VERSES_DELETE, () => {
    it('deletes verse and returns the id', () => {
      const result = handlers[IPC.VERSES_DELETE]({}, 5);
      expect(result).toEqual({ id: 5 });
      expect(runMock).toHaveBeenCalledWith(5);
    });
  });
});
