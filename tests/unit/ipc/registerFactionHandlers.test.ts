import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerFactionHandlers } from '../../../src/main/ipc/registerFactionHandlers';
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
  const randomUUID = vi.fn(() => 'faction-uuid-9999');
  return { default: { randomUUID }, randomUUID };
});

function getHandlers(): Record<string, IpcHandler> {
  return Object.fromEntries(
    ipcHandleMock.mock.calls.map(([ch, handler]) => [ch as string, handler as IpcHandler]),
  );
}

function buildFaction(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    world_id: 10,
    name: 'Cult of Contagion',
    profile: null as null,
    image_src: null as null,
    sections: '{}',
    wiki_summary: '{}',
    type_id: null as null,
    parent_faction_id: null as null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('registerFactionHandlers', () => {
  let dbMock: Database.Database;
  let handlers: Record<string, IpcHandler>;

  function createDbMock(
    options: {
      insertedFaction?: unknown;
      ancestryRows?: Array<{ id: number; parent_faction_id: number | null; }>;
    } = {},
  ) {
    const defaultFaction = buildFaction();
    const runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));
    const getMock = vi.fn(() =>
      'insertedFaction' in options
        ? (options.insertedFaction === null ? undefined : options.insertedFaction)
        : defaultFaction
    );
    const allMock = vi.fn(() => options.ancestryRows ?? [defaultFaction]);
    return {
      prepare: vi.fn(() => ({ run: runMock, get: getMock, all: allMock })),
    } as unknown as Database.Database;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = createDbMock();
    registerFactionHandlers(dbMock);
    handlers = getHandlers();
  });

  describe(IPC.FACTIONS_GET_ALL_BY_WORLD, () => {
    it('returns all factions for a world', () => {
      const mockAll = vi.fn(() => [buildFaction()]);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });
      expect(handlers[IPC.FACTIONS_GET_ALL_BY_WORLD]({}, 10)).toEqual([buildFaction()]);
    });
  });

  describe(IPC.FACTIONS_GET_BY_ID, () => {
    it('returns faction by id', () => {
      const mockGet = vi.fn(() => buildFaction());
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });
      expect(handlers[IPC.FACTIONS_GET_BY_ID]({}, 1)).toEqual(buildFaction());
    });

    it('returns null when not found', () => {
      const mockGet = vi.fn(() => undefined);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });
      expect(handlers[IPC.FACTIONS_GET_BY_ID]({}, 999)).toBeNull();
    });
  });

  describe(IPC.FACTIONS_ADD, () => {
    it('creates faction with all fields', () => {
      const db = createDbMock({ insertedFaction: buildFaction({ name: 'New Faction' }) });
      vi.clearAllMocks();
      registerFactionHandlers(db);
      const h = getHandlers();
      const result = h[IPC.FACTIONS_ADD]({}, {
        world_id: 10,
        name: 'New Faction',
        profile: 'A short profile',
        image_src: 'vv-media://faction-images/test.png',
        sections: '{}',
        wiki_summary: '{}',
        type_id: 2,
        parent_faction_id: null,
      });
      expect(result).toMatchObject({ name: 'New Faction' });
    });

    it('throws when world_id is missing', () => {
      expect(() => handlers[IPC.FACTIONS_ADD]({}, { name: 'X' }))
        .toThrowError('Faction world_id is required');
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.FACTIONS_ADD]({}, { world_id: 10, name: '' }))
        .toThrowError('Faction name is required');
    });

    it('throws when sections is not valid JSON', () => {
      expect(() => handlers[IPC.FACTIONS_ADD]({}, { world_id: 10, name: 'X', sections: '{bad}' }))
        .toThrowError('Faction sections must be valid JSON');
    });

    it('throws when wiki_summary is not valid JSON', () => {
      expect(() =>
        handlers[IPC.FACTIONS_ADD]({}, { world_id: 10, name: 'X', wiki_summary: '{bad}' })
      ).toThrowError('Faction wiki_summary must be valid JSON');
    });

    it('throws when faction not found after insert', () => {
      const db = createDbMock({ insertedFaction: null });
      vi.clearAllMocks();
      registerFactionHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.FACTIONS_ADD]({}, { world_id: 10, name: 'X' }))
        .toThrowError('Failed to create faction');
    });
  });

  describe(IPC.FACTIONS_UPDATE, () => {
    it('updates name, profile, image_src, sections, wiki_summary, type_id', () => {
      const db = createDbMock({ insertedFaction: buildFaction({ name: 'Updated' }) });
      vi.clearAllMocks();
      registerFactionHandlers(db);
      const h = getHandlers();
      const result = h[IPC.FACTIONS_UPDATE]({}, 1, {
        name: 'Updated',
        profile: 'Desc',
        image_src: 'vv-media://faction-images/test.png',
        sections: '{}',
        wiki_summary: '{}',
        type_id: 3,
      });
      expect(result).toMatchObject({ name: 'Updated' });
    });

    it('touch-only update (no fields)', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerFactionHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.FACTIONS_UPDATE]({}, 1, {})).not.toThrow();
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.FACTIONS_UPDATE]({}, 1, { name: '' }))
        .toThrowError('Faction name is required');
    });

    it('throws when sections is invalid JSON', () => {
      expect(() => handlers[IPC.FACTIONS_UPDATE]({}, 1, { sections: '{bad}' }))
        .toThrowError('Faction sections must be valid JSON');
    });

    it('throws when faction not found after update', () => {
      const db = createDbMock({ insertedFaction: null });
      vi.clearAllMocks();
      registerFactionHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.FACTIONS_UPDATE]({}, 999, { name: 'X' }))
        .toThrowError('Faction not found');
    });

    it('rejects a parent_faction_id that would create a cycle (direct self-reference)', () => {
      const db = createDbMock({
        ancestryRows: [{ id: 1, parent_faction_id: null }],
      });
      vi.clearAllMocks();
      registerFactionHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.FACTIONS_UPDATE]({}, 1, { parent_faction_id: 1 }))
        .toThrowError('A faction cannot be its own ancestor.');
    });

    it('rejects a parent_faction_id that would create a multi-level cycle', () => {
      // Faction 1's candidate new parent is 4, but 4's ancestor chain already includes 1
      // (4 -> 3 -> 2 -> 1), so assigning 1's parent to 4 would create a cycle.
      const db = createDbMock({
        ancestryRows: [
          { id: 1, parent_faction_id: null },
          { id: 2, parent_faction_id: 1 },
          { id: 3, parent_faction_id: 2 },
          { id: 4, parent_faction_id: 3 },
        ],
      });
      vi.clearAllMocks();
      registerFactionHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.FACTIONS_UPDATE]({}, 1, { parent_faction_id: 4 }))
        .toThrowError('A faction cannot be its own ancestor.');
    });

    it('allows a valid, non-cyclic parent_faction_id reassignment', () => {
      const db = createDbMock({
        ancestryRows: [
          { id: 1, parent_faction_id: null },
          { id: 2, parent_faction_id: null },
        ],
      });
      vi.clearAllMocks();
      registerFactionHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.FACTIONS_UPDATE]({}, 1, { parent_faction_id: 2 })).not.toThrow();
    });

    it('allows clearing parent_faction_id to null', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerFactionHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.FACTIONS_UPDATE]({}, 1, { parent_faction_id: null })).not.toThrow();
    });
  });

  describe(IPC.FACTIONS_DELETE, () => {
    it('deletes faction and returns id', () => {
      const runMock = vi.fn();
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ run: runMock });
      expect(handlers[IPC.FACTIONS_DELETE]({}, 5)).toEqual({ id: 5 });
    });
  });

  describe(IPC.FACTIONS_IMPORT_IMAGE, () => {
    it('saves image and returns media URL', async () => {
      const payload = {
        fileName: 'faction.png',
        mimeType: 'image/png',
        bytes: new Uint8Array([1, 2, 3]),
      };
      const result = await (handlers[IPC.FACTIONS_IMPORT_IMAGE]({}, payload) as Promise<unknown>);
      expect(result).toMatchObject({
        image_src: expect.stringContaining('vv-media://faction-images/'),
      });
    });

    it('throws when fileName is empty', async () => {
      await expect(
        handlers[IPC.FACTIONS_IMPORT_IMAGE]({}, {
          fileName: '',
          mimeType: 'image/png',
          bytes: new Uint8Array([1]),
        }) as Promise<unknown>,
      ).rejects.toThrowError('Faction image fileName is required');
    });

    it('throws when mimeType is unsupported', async () => {
      await expect(
        handlers[IPC.FACTIONS_IMPORT_IMAGE]({}, {
          fileName: 'faction.bmp',
          mimeType: 'image/bmp',
          bytes: new Uint8Array([1]),
        }) as Promise<unknown>,
      ).rejects.toThrowError('Unsupported faction image mimeType');
    });

    it('throws when bytes exceeds 5 MB', async () => {
      const largeBytes = new Uint8Array(5 * 1024 * 1024 + 1);
      await expect(
        handlers[IPC.FACTIONS_IMPORT_IMAGE]({}, {
          fileName: 'faction.png',
          mimeType: 'image/png',
          bytes: largeBytes,
        }) as Promise<unknown>,
      ).rejects.toThrowError('Faction image exceeds 5 MB limit');
    });
  });
});
