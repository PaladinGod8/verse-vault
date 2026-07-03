import { vi } from 'vitest';

/**
 * Create a fully-typed window.db mock with all methods as vi.fn().
 * getAll methods return [] by default; getById methods return undefined.
 */
export function createMockDb(): DbApi {
  const mockDb: DbApi = {
    verses: {
      getAll: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue({ id: 1 } as Verse),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    worlds: {
      getAll: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue({ id: 1 } as World),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      markViewed: vi.fn().mockResolvedValue(undefined),
      importImage: vi.fn().mockResolvedValue({ image_src: 'vv-media://world-images/mock.png' }),
    },
    levels: {
      getAllByWorld: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue({ id: 1 } as Level),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    abilities: {
      getAllByWorld: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue({ id: 1 } as Ability),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      addChild: vi.fn().mockResolvedValue({ parent_id: 1, child_id: 2 }),
      removeChild: vi.fn().mockResolvedValue({ parent_id: 1, child_id: 2 }),
      getChildren: vi.fn().mockResolvedValue([]),
    },
    campaigns: {
      getAllByWorld: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue({ id: 1 } as Campaign),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    campaignNotes: {
      getAllByCampaign: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue({ id: 1 } as CampaignNote),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      getAllTagsByCampaign: vi.fn().mockResolvedValue([]),
    },
    battlemaps: {
      getAllByWorld: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue({ id: 1 } as BattleMap),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    worldMaps: {
      getByWorld: vi.fn().mockResolvedValue(null),
      openEditor: vi.fn().mockResolvedValue({ opened: true, worldMapId: null }),
    },
    tokens: {
      getAllByWorld: vi.fn().mockResolvedValue([]),
      getAllByCampaign: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(undefined),
      importImage: vi.fn().mockResolvedValue({ image_src: 'vv-media://token-images/mock.png' }),
      add: vi.fn().mockResolvedValue({ id: 1 } as Token),
      update: vi.fn().mockResolvedValue(undefined),
      moveToWorld: vi.fn().mockResolvedValue(undefined),
      moveToCampaign: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    arcs: {
      getAllByCampaign: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue({ id: 1 } as Arc),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    acts: {
      getAllByArc: vi.fn().mockResolvedValue([]),
      getAllByCampaign: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue({ id: 1 } as Act),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      moveTo: vi.fn().mockResolvedValue(undefined),
    },
    sessions: {
      getAllByCampaign: vi.fn().mockResolvedValue([]),
      getAllByAct: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue({ id: 1 } as Session),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      moveTo: vi.fn().mockResolvedValue(undefined),
    },
    scenes: {
      getAllByCampaign: vi.fn().mockResolvedValue([]),
      getAllBySession: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue({ id: 1 } as Scene),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      moveTo: vi.fn().mockResolvedValue(undefined),
    },
    statblocks: {
      getAllByWorld: vi.fn().mockResolvedValue([]),
      getAllByCampaign: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue({ id: 1 } as StatBlock),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      linkToken: vi.fn().mockResolvedValue({ statblock_id: 1, token_id: 1 }),
      unlinkToken: vi.fn().mockResolvedValue({ statblock_id: 1, token_id: 1 }),
      getLinkedTokens: vi.fn().mockResolvedValue([]),
      getLinkedStatblock: vi.fn().mockResolvedValue(undefined),
      attachAbility: vi.fn().mockResolvedValue({ statblock_id: 1, ability_id: 1 }),
      detachAbility: vi.fn().mockResolvedValue({ statblock_id: 1, ability_id: 1 }),
      listAbilities: vi.fn().mockResolvedValue([]),
    },
    characters: {
      getAllByWorld: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue({ id: 1 } as Character),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      importImage: vi.fn().mockResolvedValue({
        image_src: 'vv-media://character-images/mock.png',
      }),
      searchByWorld: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
      markViewed: vi.fn().mockResolvedValue(undefined),
    },
    backgrounds: {
      getAllByWorld: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue({ id: 1 } as Background),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      importImage: vi.fn().mockResolvedValue({
        image_src: 'vv-media://background-images/mock.png',
      }),
      markViewed: vi.fn().mockResolvedValue(undefined),
    },
    items: {
      getAllByWorld: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue({ id: 1 } as Item),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      importImage: vi.fn().mockResolvedValue({
        image_src: 'vv-media://item-images/mock.png',
      }),
      markViewed: vi.fn().mockResolvedValue(undefined),
    },
    loreNotes: {
      getAllByWorld: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue({ id: 1 } as LoreNote),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      importImage: vi.fn().mockResolvedValue({
        image_src: 'vv-media://lore-note-images/mock.png',
      }),
      markViewed: vi.fn().mockResolvedValue(undefined),
      getAllTagsByWorld: vi.fn().mockResolvedValue([]),
    },
    factions: {
      getAllByWorld: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue({ id: 1 } as Faction),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      importImage: vi.fn().mockResolvedValue({
        image_src: 'vv-media://faction-images/mock.png',
      }),
      markViewed: vi.fn().mockResolvedValue(undefined),
    },
    factionTypes: {
      getAllByWorld: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue({ id: 1 } as FactionType),
      rename: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    factionMembers: {
      getAllByFaction: vi.fn().mockResolvedValue([]),
      getAllByCharacter: vi.fn().mockResolvedValue([]),
      getAllPrimaryByWorld: vi.fn().mockResolvedValue([]),
      setForFaction: vi.fn().mockResolvedValue({ faction_id: 1 }),
      setPrimary: vi.fn().mockResolvedValue({ character_id: 1, faction_id: 1 }),
    },
    characterRelationships: {
      getAllByCharacter: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue({ id: 1 } as CharacterRelationship),
      update: vi.fn().mockResolvedValue({ id: 1 } as CharacterRelationship),
      delete: vi.fn().mockResolvedValue({ id: 1 }),
    },
    factionRelationships: {
      getAllByFaction: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue({ id: 1 } as FactionRelationship),
      update: vi.fn().mockResolvedValue({ id: 1 } as FactionRelationship),
      delete: vi.fn().mockResolvedValue({ id: 1 }),
    },
    settings: {
      get: vi.fn().mockResolvedValue({
        id: 1,
        config: '{}',
        created_at: '2026-01-01 00:00:00',
        updated_at: '2026-01-01 00:00:00',
      } as AppSettings),
      update: vi.fn(async (config: string) => ({
        id: 1,
        config,
        created_at: '2026-01-01 00:00:00',
        updated_at: '2026-01-01 00:00:00',
      } as AppSettings)),
    },
  };

  return mockDb;
}

/**
 * Install the mock on window.db. Call in beforeEach.
 */
export function setupWindowDb(): DbApi {
  const mockDb = createMockDb();
  window.db = mockDb;
  return mockDb;
}

/**
 * Clear all mocks on the current window.db. Call in beforeEach after setup.
 */
export function resetWindowDb(): void {
  vi.clearAllMocks();
}
