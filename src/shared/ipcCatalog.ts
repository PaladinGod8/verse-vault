/* eslint-disable max-lines */
/**
 * @role IPC metadata catalog
 * @owns Doc-generation and guard metadata for every registered IPC channel
 * @seam Shared mapping between IPC constants, preload bridges, and handler files
 * @calls Shared IPC constants only
 */
import { IPC } from './ipcChannels';

export interface IpcCatalogEntry {
  key: keyof typeof IPC;
  domain: string;
  bridge: `window.db.${string}`;
  handler: string;
  typeSource: `DbApi.${string}`;
  note?: string;
}

const HANDLERS = {
  verses: 'src/main/ipc/registerVerseHandlers.ts',
  worlds: 'src/main/ipc/registerWorldHandlers.ts',
  levels: 'src/main/ipc/registerLevelHandlers.ts',
  abilities: 'src/main/ipc/registerAbilityHandlers.ts',
  campaigns: 'src/main/ipc/registerCampaignHandlers.ts',
  campaignNotes: 'src/main/ipc/registerCampaignNoteHandlers.ts',
  battlemaps: 'src/main/ipc/registerBattleMapHandlers.ts',
  tokens: 'src/main/ipc/registerTokenHandlers.ts',
  arcs: 'src/main/ipc/registerArcHandlers.ts',
  acts: 'src/main/ipc/registerActHandlers.ts',
  sessions: 'src/main/ipc/registerSessionHandlers.ts',
  scenes: 'src/main/ipc/registerSceneHandlers.ts',
  statblocks: 'src/main/ipc/registerStatBlockHandlers.ts',
  characters: 'src/main/ipc/registerCharacterHandlers.ts',
  backgrounds: 'src/main/ipc/registerBackgroundHandlers.ts',
  items: 'src/main/ipc/registerItemHandlers.ts',
  loreNotes: 'src/main/ipc/registerLoreNoteHandlers.ts',
  factions: 'src/main/ipc/registerFactionHandlers.ts',
  factionTypes: 'src/main/ipc/registerFactionTypeHandlers.ts',
  factionMembers: 'src/main/ipc/registerFactionMemberHandlers.ts',
  characterRelationships: 'src/main/ipc/registerCharacterRelationshipHandlers.ts',
  factionRelationships: 'src/main/ipc/registerFactionRelationshipHandlers.ts',
  settings: 'src/main/ipc/registerSettingsHandlers.ts',
} as const;

function entries(
  domain: IpcCatalogEntry['domain'],
  handler: string,
  items: Array<
    [
      key: IpcCatalogEntry['key'],
      bridge: IpcCatalogEntry['bridge'],
      typeSource: IpcCatalogEntry['typeSource'],
      note?: string,
    ]
  >,
): IpcCatalogEntry[] {
  return items.map(([key, bridge, typeSource, note]) => ({
    key,
    domain,
    bridge,
    handler,
    typeSource,
    note,
  }));
}

export const IPC_CATALOG: IpcCatalogEntry[] = [
  ...entries('verses', HANDLERS.verses, [
    ['VERSES_GET_ALL', 'window.db.verses.getAll', 'DbApi.verses.getAll'],
    ['VERSES_ADD', 'window.db.verses.add', 'DbApi.verses.add'],
    ['VERSES_UPDATE', 'window.db.verses.update', 'DbApi.verses.update'],
    ['VERSES_DELETE', 'window.db.verses.delete', 'DbApi.verses.delete'],
  ]),
  ...entries('worlds', HANDLERS.worlds, [
    ['WORLDS_GET_ALL', 'window.db.worlds.getAll', 'DbApi.worlds.getAll'],
    ['WORLDS_GET_BY_ID', 'window.db.worlds.getById', 'DbApi.worlds.getById'],
    ['WORLDS_ADD', 'window.db.worlds.add', 'DbApi.worlds.add'],
    ['WORLDS_UPDATE', 'window.db.worlds.update', 'DbApi.worlds.update'],
    ['WORLDS_DELETE', 'window.db.worlds.delete', 'DbApi.worlds.delete'],
    ['WORLDS_MARK_VIEWED', 'window.db.worlds.markViewed', 'DbApi.worlds.markViewed'],
    ['WORLDS_IMPORT_IMAGE', 'window.db.worlds.importImage', 'DbApi.worlds.importImage'],
  ]),
  ...entries('levels', HANDLERS.levels, [
    ['LEVELS_GET_ALL_BY_WORLD', 'window.db.levels.getAllByWorld', 'DbApi.levels.getAllByWorld'],
    ['LEVELS_GET_BY_ID', 'window.db.levels.getById', 'DbApi.levels.getById'],
    ['LEVELS_ADD', 'window.db.levels.add', 'DbApi.levels.add'],
    ['LEVELS_UPDATE', 'window.db.levels.update', 'DbApi.levels.update'],
    ['LEVELS_DELETE', 'window.db.levels.delete', 'DbApi.levels.delete'],
  ]),
  ...entries('abilities', HANDLERS.abilities, [
    [
      'ABILITIES_GET_ALL_BY_WORLD',
      'window.db.abilities.getAllByWorld',
      'DbApi.abilities.getAllByWorld',
    ],
    ['ABILITIES_GET_BY_ID', 'window.db.abilities.getById', 'DbApi.abilities.getById'],
    ['ABILITIES_ADD', 'window.db.abilities.add', 'DbApi.abilities.add'],
    ['ABILITIES_UPDATE', 'window.db.abilities.update', 'DbApi.abilities.update'],
    ['ABILITIES_DELETE', 'window.db.abilities.delete', 'DbApi.abilities.delete'],
    ['ABILITIES_ADD_CHILD', 'window.db.abilities.addChild', 'DbApi.abilities.addChild'],
    ['ABILITIES_REMOVE_CHILD', 'window.db.abilities.removeChild', 'DbApi.abilities.removeChild'],
    ['ABILITIES_GET_CHILDREN', 'window.db.abilities.getChildren', 'DbApi.abilities.getChildren'],
  ]),
  ...entries('campaigns', HANDLERS.campaigns, [
    [
      'CAMPAIGNS_GET_ALL_BY_WORLD',
      'window.db.campaigns.getAllByWorld',
      'DbApi.campaigns.getAllByWorld',
    ],
    ['CAMPAIGNS_GET_BY_ID', 'window.db.campaigns.getById', 'DbApi.campaigns.getById'],
    ['CAMPAIGNS_ADD', 'window.db.campaigns.add', 'DbApi.campaigns.add'],
    ['CAMPAIGNS_UPDATE', 'window.db.campaigns.update', 'DbApi.campaigns.update'],
    ['CAMPAIGNS_DELETE', 'window.db.campaigns.delete', 'DbApi.campaigns.delete'],
  ]),
  ...entries('campaignNotes', HANDLERS.campaignNotes, [
    [
      'CAMPAIGN_NOTES_GET_ALL_BY_CAMPAIGN',
      'window.db.campaignNotes.getAllByCampaign',
      'DbApi.campaignNotes.getAllByCampaign',
    ],
    [
      'CAMPAIGN_NOTES_GET_BY_ID',
      'window.db.campaignNotes.getById',
      'DbApi.campaignNotes.getById',
    ],
    ['CAMPAIGN_NOTES_ADD', 'window.db.campaignNotes.add', 'DbApi.campaignNotes.add'],
    ['CAMPAIGN_NOTES_UPDATE', 'window.db.campaignNotes.update', 'DbApi.campaignNotes.update'],
    ['CAMPAIGN_NOTES_DELETE', 'window.db.campaignNotes.delete', 'DbApi.campaignNotes.delete'],
    [
      'CAMPAIGN_NOTE_TAGS_GET_ALL_BY_CAMPAIGN',
      'window.db.campaignNotes.getAllTagsByCampaign',
      'DbApi.campaignNotes.getAllTagsByCampaign',
    ],
  ]),
  ...entries('battlemaps', HANDLERS.battlemaps, [
    [
      'BATTLEMAPS_GET_ALL_BY_WORLD',
      'window.db.battlemaps.getAllByWorld',
      'DbApi.battlemaps.getAllByWorld',
    ],
    ['BATTLEMAPS_GET_BY_ID', 'window.db.battlemaps.getById', 'DbApi.battlemaps.getById'],
    ['BATTLEMAPS_ADD', 'window.db.battlemaps.add', 'DbApi.battlemaps.add'],
    ['BATTLEMAPS_UPDATE', 'window.db.battlemaps.update', 'DbApi.battlemaps.update'],
    ['BATTLEMAPS_DELETE', 'window.db.battlemaps.delete', 'DbApi.battlemaps.delete'],
  ]),
  ...entries('tokens', HANDLERS.tokens, [
    [
      'TOKENS_GET_ALL_BY_CAMPAIGN',
      'window.db.tokens.getAllByCampaign',
      'DbApi.tokens.getAllByCampaign',
    ],
    ['TOKENS_GET_BY_ID', 'window.db.tokens.getById', 'DbApi.tokens.getById'],
    ['TOKENS_ADD', 'window.db.tokens.add', 'DbApi.tokens.add'],
    ['TOKENS_UPDATE', 'window.db.tokens.update', 'DbApi.tokens.update'],
    ['TOKENS_DELETE', 'window.db.tokens.delete', 'DbApi.tokens.delete'],
    ['TOKENS_GET_ALL_BY_WORLD', 'window.db.tokens.getAllByWorld', 'DbApi.tokens.getAllByWorld'],
    ['TOKENS_IMPORT_IMAGE', 'window.db.tokens.importImage', 'DbApi.tokens.importImage'],
    ['TOKENS_MOVE_TO_WORLD', 'window.db.tokens.moveToWorld', 'DbApi.tokens.moveToWorld'],
    ['TOKENS_MOVE_TO_CAMPAIGN', 'window.db.tokens.moveToCampaign', 'DbApi.tokens.moveToCampaign'],
  ]),
  ...entries('arcs', HANDLERS.arcs, [
    ['ARCS_GET_ALL_BY_CAMPAIGN', 'window.db.arcs.getAllByCampaign', 'DbApi.arcs.getAllByCampaign'],
    ['ARCS_GET_BY_ID', 'window.db.arcs.getById', 'DbApi.arcs.getById'],
    ['ARCS_ADD', 'window.db.arcs.add', 'DbApi.arcs.add'],
    ['ARCS_UPDATE', 'window.db.arcs.update', 'DbApi.arcs.update'],
    ['ARCS_DELETE', 'window.db.arcs.delete', 'DbApi.arcs.delete'],
  ]),
  ...entries('acts', HANDLERS.acts, [
    ['ACTS_GET_ALL_BY_ARC', 'window.db.acts.getAllByArc', 'DbApi.acts.getAllByArc'],
    ['ACTS_GET_ALL_BY_CAMPAIGN', 'window.db.acts.getAllByCampaign', 'DbApi.acts.getAllByCampaign'],
    ['ACTS_GET_BY_ID', 'window.db.acts.getById', 'DbApi.acts.getById'],
    ['ACTS_ADD', 'window.db.acts.add', 'DbApi.acts.add'],
    ['ACTS_UPDATE', 'window.db.acts.update', 'DbApi.acts.update'],
    ['ACTS_DELETE', 'window.db.acts.delete', 'DbApi.acts.delete'],
    ['ACTS_MOVE_TO_ARC', 'window.db.acts.moveTo', 'DbApi.acts.moveTo'],
  ]),
  ...entries('sessions', HANDLERS.sessions, [
    [
      'SESSIONS_GET_ALL_BY_CAMPAIGN',
      'window.db.sessions.getAllByCampaign',
      'DbApi.sessions.getAllByCampaign',
    ],
    ['SESSIONS_GET_ALL_BY_ACT', 'window.db.sessions.getAllByAct', 'DbApi.sessions.getAllByAct'],
    ['SESSIONS_GET_BY_ID', 'window.db.sessions.getById', 'DbApi.sessions.getById'],
    ['SESSIONS_ADD', 'window.db.sessions.add', 'DbApi.sessions.add'],
    ['SESSIONS_UPDATE', 'window.db.sessions.update', 'DbApi.sessions.update'],
    ['SESSIONS_DELETE', 'window.db.sessions.delete', 'DbApi.sessions.delete'],
    ['SESSIONS_MOVE_TO_ACT', 'window.db.sessions.moveTo', 'DbApi.sessions.moveTo'],
  ]),
  ...entries('scenes', HANDLERS.scenes, [
    [
      'SCENES_GET_ALL_BY_CAMPAIGN',
      'window.db.scenes.getAllByCampaign',
      'DbApi.scenes.getAllByCampaign',
    ],
    [
      'SCENES_GET_ALL_BY_SESSION',
      'window.db.scenes.getAllBySession',
      'DbApi.scenes.getAllBySession',
    ],
    ['SCENES_GET_BY_ID', 'window.db.scenes.getById', 'DbApi.scenes.getById'],
    ['SCENES_ADD', 'window.db.scenes.add', 'DbApi.scenes.add'],
    ['SCENES_UPDATE', 'window.db.scenes.update', 'DbApi.scenes.update'],
    ['SCENES_DELETE', 'window.db.scenes.delete', 'DbApi.scenes.delete'],
    ['SCENES_MOVE_TO_SESSION', 'window.db.scenes.moveTo', 'DbApi.scenes.moveTo'],
  ]),
  ...entries('statblocks', HANDLERS.statblocks, [
    [
      'STATBLOCKS_GET_ALL_BY_WORLD',
      'window.db.statblocks.getAllByWorld',
      'DbApi.statblocks.getAllByWorld',
    ],
    [
      'STATBLOCKS_GET_ALL_BY_CAMPAIGN',
      'window.db.statblocks.getAllByCampaign',
      'DbApi.statblocks.getAllByCampaign',
    ],
    ['STATBLOCKS_GET_BY_ID', 'window.db.statblocks.getById', 'DbApi.statblocks.getById'],
    ['STATBLOCKS_ADD', 'window.db.statblocks.add', 'DbApi.statblocks.add'],
    ['STATBLOCKS_UPDATE', 'window.db.statblocks.update', 'DbApi.statblocks.update'],
    ['STATBLOCKS_DELETE', 'window.db.statblocks.delete', 'DbApi.statblocks.delete'],
    ['STATBLOCKS_LINK_TOKEN', 'window.db.statblocks.linkToken', 'DbApi.statblocks.linkToken'],
    ['STATBLOCKS_UNLINK_TOKEN', 'window.db.statblocks.unlinkToken', 'DbApi.statblocks.unlinkToken'],
    [
      'STATBLOCKS_GET_LINKED_TOKENS',
      'window.db.statblocks.getLinkedTokens',
      'DbApi.statblocks.getLinkedTokens',
    ],
    [
      'STATBLOCKS_GET_LINKED_STATBLOCK',
      'window.db.statblocks.getLinkedStatblock',
      'DbApi.statblocks.getLinkedStatblock',
    ],
    [
      'STATBLOCKS_ATTACH_ABILITY',
      'window.db.statblocks.attachAbility',
      'DbApi.statblocks.attachAbility',
    ],
    [
      'STATBLOCKS_DETACH_ABILITY',
      'window.db.statblocks.detachAbility',
      'DbApi.statblocks.detachAbility',
    ],
    [
      'STATBLOCKS_LIST_ABILITIES',
      'window.db.statblocks.listAbilities',
      'DbApi.statblocks.listAbilities',
    ],
  ]),
  ...entries('characters', HANDLERS.characters, [
    [
      'CHARACTERS_GET_ALL_BY_WORLD',
      'window.db.characters.getAllByWorld',
      'DbApi.characters.getAllByWorld',
    ],
    ['CHARACTERS_GET_BY_ID', 'window.db.characters.getById', 'DbApi.characters.getById'],
    ['CHARACTERS_ADD', 'window.db.characters.add', 'DbApi.characters.add'],
    ['CHARACTERS_UPDATE', 'window.db.characters.update', 'DbApi.characters.update'],
    ['CHARACTERS_DELETE', 'window.db.characters.delete', 'DbApi.characters.delete'],
    [
      'CHARACTERS_IMPORT_IMAGE',
      'window.db.characters.importImage',
      'DbApi.characters.importImage',
    ],
    [
      'CHARACTERS_SEARCH_BY_WORLD',
      'window.db.characters.searchByWorld',
      'DbApi.characters.searchByWorld',
    ],
    ['CHARACTERS_MARK_VIEWED', 'window.db.characters.markViewed', 'DbApi.characters.markViewed'],
  ]),
  ...entries('backgrounds', HANDLERS.backgrounds, [
    [
      'BACKGROUNDS_GET_ALL_BY_WORLD',
      'window.db.backgrounds.getAllByWorld',
      'DbApi.backgrounds.getAllByWorld',
    ],
    ['BACKGROUNDS_GET_BY_ID', 'window.db.backgrounds.getById', 'DbApi.backgrounds.getById'],
    ['BACKGROUNDS_ADD', 'window.db.backgrounds.add', 'DbApi.backgrounds.add'],
    ['BACKGROUNDS_UPDATE', 'window.db.backgrounds.update', 'DbApi.backgrounds.update'],
    ['BACKGROUNDS_DELETE', 'window.db.backgrounds.delete', 'DbApi.backgrounds.delete'],
    [
      'BACKGROUNDS_IMPORT_IMAGE',
      'window.db.backgrounds.importImage',
      'DbApi.backgrounds.importImage',
    ],
    ['BACKGROUNDS_MARK_VIEWED', 'window.db.backgrounds.markViewed', 'DbApi.backgrounds.markViewed'],
  ]),
  ...entries('items', HANDLERS.items, [
    ['ITEMS_GET_ALL_BY_WORLD', 'window.db.items.getAllByWorld', 'DbApi.items.getAllByWorld'],
    ['ITEMS_GET_BY_ID', 'window.db.items.getById', 'DbApi.items.getById'],
    ['ITEMS_ADD', 'window.db.items.add', 'DbApi.items.add'],
    ['ITEMS_UPDATE', 'window.db.items.update', 'DbApi.items.update'],
    ['ITEMS_DELETE', 'window.db.items.delete', 'DbApi.items.delete'],
    ['ITEMS_IMPORT_IMAGE', 'window.db.items.importImage', 'DbApi.items.importImage'],
    ['ITEMS_MARK_VIEWED', 'window.db.items.markViewed', 'DbApi.items.markViewed'],
  ]),
  ...entries('loreNotes', HANDLERS.loreNotes, [
    [
      'LORE_NOTES_GET_ALL_BY_WORLD',
      'window.db.loreNotes.getAllByWorld',
      'DbApi.loreNotes.getAllByWorld',
    ],
    ['LORE_NOTES_GET_BY_ID', 'window.db.loreNotes.getById', 'DbApi.loreNotes.getById'],
    ['LORE_NOTES_ADD', 'window.db.loreNotes.add', 'DbApi.loreNotes.add'],
    ['LORE_NOTES_UPDATE', 'window.db.loreNotes.update', 'DbApi.loreNotes.update'],
    ['LORE_NOTES_DELETE', 'window.db.loreNotes.delete', 'DbApi.loreNotes.delete'],
    [
      'LORE_NOTES_IMPORT_IMAGE',
      'window.db.loreNotes.importImage',
      'DbApi.loreNotes.importImage',
    ],
    ['LORE_NOTES_MARK_VIEWED', 'window.db.loreNotes.markViewed', 'DbApi.loreNotes.markViewed'],
    [
      'LORE_NOTE_TAGS_GET_ALL_BY_WORLD',
      'window.db.loreNotes.getAllTagsByWorld',
      'DbApi.loreNotes.getAllTagsByWorld',
    ],
  ]),
  ...entries('factions', HANDLERS.factions, [
    [
      'FACTIONS_GET_ALL_BY_WORLD',
      'window.db.factions.getAllByWorld',
      'DbApi.factions.getAllByWorld',
    ],
    ['FACTIONS_GET_BY_ID', 'window.db.factions.getById', 'DbApi.factions.getById'],
    ['FACTIONS_ADD', 'window.db.factions.add', 'DbApi.factions.add'],
    ['FACTIONS_UPDATE', 'window.db.factions.update', 'DbApi.factions.update'],
    ['FACTIONS_DELETE', 'window.db.factions.delete', 'DbApi.factions.delete'],
    [
      'FACTIONS_IMPORT_IMAGE',
      'window.db.factions.importImage',
      'DbApi.factions.importImage',
    ],
    ['FACTIONS_MARK_VIEWED', 'window.db.factions.markViewed', 'DbApi.factions.markViewed'],
  ]),
  ...entries('factionTypes', HANDLERS.factionTypes, [
    [
      'FACTION_TYPES_GET_ALL_BY_WORLD',
      'window.db.factionTypes.getAllByWorld',
      'DbApi.factionTypes.getAllByWorld',
    ],
    ['FACTION_TYPES_ADD', 'window.db.factionTypes.add', 'DbApi.factionTypes.add'],
    ['FACTION_TYPES_RENAME', 'window.db.factionTypes.rename', 'DbApi.factionTypes.rename'],
    ['FACTION_TYPES_DELETE', 'window.db.factionTypes.delete', 'DbApi.factionTypes.delete'],
  ]),
  ...entries('factionMembers', HANDLERS.factionMembers, [
    [
      'FACTION_MEMBERS_GET_ALL_BY_FACTION',
      'window.db.factionMembers.getAllByFaction',
      'DbApi.factionMembers.getAllByFaction',
    ],
    [
      'FACTION_MEMBERS_GET_ALL_BY_CHARACTER',
      'window.db.factionMembers.getAllByCharacter',
      'DbApi.factionMembers.getAllByCharacter',
    ],
    [
      'FACTION_MEMBERS_GET_ALL_PRIMARY_BY_WORLD',
      'window.db.factionMembers.getAllPrimaryByWorld',
      'DbApi.factionMembers.getAllPrimaryByWorld',
    ],
    [
      'FACTION_MEMBERS_SET_FOR_FACTION',
      'window.db.factionMembers.setForFaction',
      'DbApi.factionMembers.setForFaction',
    ],
    [
      'FACTION_MEMBERS_SET_PRIMARY',
      'window.db.factionMembers.setPrimary',
      'DbApi.factionMembers.setPrimary',
    ],
  ]),
  ...entries('characterRelationships', HANDLERS.characterRelationships, [
    [
      'CHARACTER_RELATIONSHIPS_GET_ALL_BY_CHARACTER',
      'window.db.characterRelationships.getAllByCharacter',
      'DbApi.characterRelationships.getAllByCharacter',
    ],
    [
      'CHARACTER_RELATIONSHIPS_ADD',
      'window.db.characterRelationships.add',
      'DbApi.characterRelationships.add',
    ],
    [
      'CHARACTER_RELATIONSHIPS_UPDATE',
      'window.db.characterRelationships.update',
      'DbApi.characterRelationships.update',
    ],
    [
      'CHARACTER_RELATIONSHIPS_DELETE',
      'window.db.characterRelationships.delete',
      'DbApi.characterRelationships.delete',
    ],
  ]),
  ...entries('factionRelationships', HANDLERS.factionRelationships, [
    [
      'FACTION_RELATIONSHIPS_GET_ALL_BY_FACTION',
      'window.db.factionRelationships.getAllByFaction',
      'DbApi.factionRelationships.getAllByFaction',
    ],
    [
      'FACTION_RELATIONSHIPS_ADD',
      'window.db.factionRelationships.add',
      'DbApi.factionRelationships.add',
    ],
    [
      'FACTION_RELATIONSHIPS_UPDATE',
      'window.db.factionRelationships.update',
      'DbApi.factionRelationships.update',
    ],
    [
      'FACTION_RELATIONSHIPS_DELETE',
      'window.db.factionRelationships.delete',
      'DbApi.factionRelationships.delete',
    ],
  ]),
  ...entries('settings', HANDLERS.settings, [
    ['SETTINGS_GET', 'window.db.settings.get', 'DbApi.settings.get'],
    ['SETTINGS_UPDATE', 'window.db.settings.update', 'DbApi.settings.update'],
  ]),
];

export const IPC_CATALOG_BY_KEY = Object.fromEntries(
  IPC_CATALOG.map((entry) => [entry.key, entry]),
) as Record<IpcCatalogEntry['key'], IpcCatalogEntry>;
