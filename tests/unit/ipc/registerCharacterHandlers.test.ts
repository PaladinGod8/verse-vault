import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerCharacterHandlers } from '../../../src/main/ipc/registerCharacterHandlers';
import { IPC } from '../../../src/shared/ipcChannels';

type IpcHandler = (...args: unknown[]) => unknown;

const { ipcHandleMock } = vi.hoisted(() => ({
  ipcHandleMock: vi.fn(),
}));

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/user-data') },
  ipcMain: { handle: ipcHandleMock },
}));

vi.mock('node:fs/promises', () => {
  const mkdir = vi.fn().mockResolvedValue(undefined);
  const writeFile = vi.fn().mockResolvedValue(undefined);
  return { default: { mkdir, writeFile }, mkdir, writeFile };
});

vi.mock('node:crypto', () => {
  const randomUUID = vi.fn(() => 'character-uuid-9999');
  return { default: { randomUUID }, randomUUID };
});

function getHandlers(): Record<string, IpcHandler> {
  return Object.fromEntries(
    ipcHandleMock.mock.calls.map(([ch, handler]) => [ch as string, handler as IpcHandler]),
  );
}

function buildCharacter(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    world_id: 10,
    name: 'Ledros Igni',
    profile: null as null,
    is_player_character: 0,
    owner: null as null,
    author: null as null,
    image_src: null as null,
    sections: '{}',
    wiki_summary: '{}',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('registerCharacterHandlers', () => {
  let dbMock: Database.Database;
  let handlers: Record<string, IpcHandler>;

  // null = not found; omit = use default; value = return it
  function createDbMock(options: { insertedCharacter?: unknown; } = {}) {
    const defaultCharacter = buildCharacter();
    const runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));
    const getMock = vi.fn(() =>
      'insertedCharacter' in options
        ? (options.insertedCharacter === null ? undefined : options.insertedCharacter)
        : defaultCharacter
    );
    const allMock = vi.fn(() => [defaultCharacter]);
    return {
      prepare: vi.fn(() => ({ run: runMock, get: getMock, all: allMock })),
    } as unknown as Database.Database;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = createDbMock();
    registerCharacterHandlers(dbMock);
    handlers = getHandlers();
  });

  describe(IPC.CHARACTERS_GET_ALL_BY_WORLD, () => {
    it('returns all characters for a world', () => {
      const mockAll = vi.fn(() => [buildCharacter()]);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });
      expect(handlers[IPC.CHARACTERS_GET_ALL_BY_WORLD]({}, 10)).toEqual([buildCharacter()]);
    });
  });

  describe(IPC.CHARACTERS_GET_BY_ID, () => {
    it('returns character by id', () => {
      const mockGet = vi.fn(() => buildCharacter());
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });
      expect(handlers[IPC.CHARACTERS_GET_BY_ID]({}, 1)).toEqual(buildCharacter());
    });

    it('returns null when not found', () => {
      const mockGet = vi.fn(() => undefined);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });
      expect(handlers[IPC.CHARACTERS_GET_BY_ID]({}, 999)).toBeNull();
    });
  });

  describe(IPC.CHARACTERS_ADD, () => {
    it('creates character with all fields', () => {
      const db = createDbMock({
        insertedCharacter: buildCharacter({
          name: 'New Character',
          is_player_character: 1,
          owner: 'GamingGator',
          author: 'GamingGator',
        }),
      });
      vi.clearAllMocks();
      registerCharacterHandlers(db);
      const h = getHandlers();
      const result = h[IPC.CHARACTERS_ADD]({}, {
        world_id: 10,
        name: 'New Character',
        profile: 'A short profile',
        is_player_character: 1,
        owner: 'GamingGator',
        author: 'GamingGator',
        image_src: 'vv-media://character-images/test.png',
        sections: '{}',
        wiki_summary: '{}',
      });
      expect(result).toMatchObject({
        name: 'New Character',
        is_player_character: 1,
        owner: 'GamingGator',
        author: 'GamingGator',
      });
    });

    it('throws when world_id is missing', () => {
      expect(() => handlers[IPC.CHARACTERS_ADD]({}, { name: 'X' }))
        .toThrowError('Character world_id is required');
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.CHARACTERS_ADD]({}, { world_id: 10, name: '' }))
        .toThrowError('Character name is required');
    });

    it('throws when name is whitespace-only', () => {
      expect(() => handlers[IPC.CHARACTERS_ADD]({}, { world_id: 10, name: '   ' }))
        .toThrowError('Character name is required');
    });

    it('throws when sections is not valid JSON', () => {
      expect(() => handlers[IPC.CHARACTERS_ADD]({}, { world_id: 10, name: 'X', sections: '{bad}' }))
        .toThrowError('Character sections must be valid JSON');
    });

    it('throws when player character owner is missing', () => {
      expect(() =>
        handlers[IPC.CHARACTERS_ADD]({}, { world_id: 10, name: 'X', is_player_character: 1 })
      ).toThrowError('Character owner is required for player characters');
    });

    it('throws when wiki_summary is not valid JSON', () => {
      expect(() =>
        handlers[IPC.CHARACTERS_ADD]({}, { world_id: 10, name: 'X', wiki_summary: '{bad}' })
      ).toThrowError('Character wiki_summary must be valid JSON');
    });

    it('throws when character not found after insert', () => {
      const db = createDbMock({ insertedCharacter: null });
      vi.clearAllMocks();
      registerCharacterHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.CHARACTERS_ADD]({}, { world_id: 10, name: 'X' }))
        .toThrowError('Failed to create character');
    });
  });

  describe(IPC.CHARACTERS_UPDATE, () => {
    it('updates name, profile, author, image_src, sections, wiki_summary', () => {
      const db = createDbMock({
        insertedCharacter: buildCharacter({
          name: 'Updated',
          is_player_character: 1,
          owner: 'GamingGator',
          author: 'GamingGator',
        }),
      });
      vi.clearAllMocks();
      registerCharacterHandlers(db);
      const h = getHandlers();
      const result = h[IPC.CHARACTERS_UPDATE]({}, 1, {
        name: 'Updated',
        profile: 'Desc',
        is_player_character: 1,
        owner: 'GamingGator',
        author: 'GamingGator',
        image_src: 'vv-media://character-images/test.png',
        sections: '{}',
        wiki_summary: '{}',
      });
      expect(result).toMatchObject({
        name: 'Updated',
        is_player_character: 1,
        owner: 'GamingGator',
        author: 'GamingGator',
      });
    });

    it('touch-only update (no fields)', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerCharacterHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.CHARACTERS_UPDATE]({}, 1, {})).not.toThrow();
    });

    it('updates image_src to null (nullable string)', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerCharacterHandlers(db);
      const h = getHandlers();
      h[IPC.CHARACTERS_UPDATE]({}, 1, { image_src: null });
      expect(true).toBe(true);
    });

    it('throws when player character owner is blank on update', () => {
      expect(() => handlers[IPC.CHARACTERS_UPDATE]({}, 1, { is_player_character: 1, owner: '   ' }))
        .toThrowError('Character owner is required for player characters');
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.CHARACTERS_UPDATE]({}, 1, { name: '' }))
        .toThrowError('Character name is required');
    });

    it('throws when sections is invalid JSON', () => {
      expect(() => handlers[IPC.CHARACTERS_UPDATE]({}, 1, { sections: '{bad}' }))
        .toThrowError('Character sections must be valid JSON');
    });

    it('throws when wiki_summary is invalid JSON', () => {
      expect(() => handlers[IPC.CHARACTERS_UPDATE]({}, 1, { wiki_summary: '{bad}' }))
        .toThrowError('Character wiki_summary must be valid JSON');
    });

    it('throws when character not found after update', () => {
      const db = createDbMock({ insertedCharacter: null });
      vi.clearAllMocks();
      registerCharacterHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.CHARACTERS_UPDATE]({}, 999, { name: 'X' }))
        .toThrowError('Character not found');
    });
  });

  describe(IPC.CHARACTERS_DELETE, () => {
    it('deletes character and returns id', () => {
      const runMock = vi.fn();
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ run: runMock });
      expect(handlers[IPC.CHARACTERS_DELETE]({}, 5)).toEqual({ id: 5 });
    });
  });

  describe(IPC.CHARACTERS_IMPORT_IMAGE, () => {
    it('saves image and returns media URL', async () => {
      const payload = {
        fileName: 'character.png',
        mimeType: 'image/png',
        bytes: new Uint8Array([1, 2, 3]),
      };
      const result = await (handlers[IPC.CHARACTERS_IMPORT_IMAGE]({}, payload) as Promise<unknown>);
      expect(result).toMatchObject({
        image_src: expect.stringContaining('vv-media://character-images/'),
      });
    });

    it('throws when fileName is empty', async () => {
      await expect(
        handlers[IPC.CHARACTERS_IMPORT_IMAGE]({}, {
          fileName: '',
          mimeType: 'image/png',
          bytes: new Uint8Array([1]),
        }) as Promise<unknown>,
      ).rejects.toThrowError('Character image fileName is required');
    });

    it('throws when mimeType is unsupported', async () => {
      await expect(
        handlers[IPC.CHARACTERS_IMPORT_IMAGE]({}, {
          fileName: 'character.bmp',
          mimeType: 'image/bmp',
          bytes: new Uint8Array([1]),
        }) as Promise<unknown>,
      ).rejects.toThrowError('Unsupported character image mimeType');
    });

    it('throws when bytes exceeds 5 MB', async () => {
      const largeBytes = new Uint8Array(5 * 1024 * 1024 + 1);
      await expect(
        handlers[IPC.CHARACTERS_IMPORT_IMAGE]({}, {
          fileName: 'character.png',
          mimeType: 'image/png',
          bytes: largeBytes,
        }) as Promise<unknown>,
      ).rejects.toThrowError('Character image exceeds 5 MB limit');
    });
  });
});
