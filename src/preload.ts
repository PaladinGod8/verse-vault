/**
 * @role Renderer bridge adapter
 * @owns The full window.db surface exposed to renderer code
 * @seam Main-to-renderer IPC contract via contextBridge
 * @calls ipcRenderer.invoke and shared IPC constants only
 */
import { contextBridge, ipcRenderer } from 'electron';
import type { DbApi } from './shared/contracts/dbApi';
import { IPC } from './shared/ipcChannels';

const dbApi: DbApi = {
  verses: {
    getAll: () => ipcRenderer.invoke(IPC.VERSES_GET_ALL),
    add: (data) => ipcRenderer.invoke(IPC.VERSES_ADD, data),
    update: (id, data) => ipcRenderer.invoke(IPC.VERSES_UPDATE, id, data),
    delete: (id) => ipcRenderer.invoke(IPC.VERSES_DELETE, id),
  },
  levels: {
    getAllByWorld: (worldId) => ipcRenderer.invoke(IPC.LEVELS_GET_ALL_BY_WORLD, worldId),
    getById: (id) => ipcRenderer.invoke(IPC.LEVELS_GET_BY_ID, id),
    add: (data) => ipcRenderer.invoke(IPC.LEVELS_ADD, data),
    update: (id, data) => ipcRenderer.invoke(IPC.LEVELS_UPDATE, id, data),
    delete: (id) => ipcRenderer.invoke(IPC.LEVELS_DELETE, id),
  },
  abilities: {
    getAllByWorld: (worldId) => ipcRenderer.invoke(IPC.ABILITIES_GET_ALL_BY_WORLD, worldId),
    getById: (id) => ipcRenderer.invoke(IPC.ABILITIES_GET_BY_ID, id),
    add: (data) => ipcRenderer.invoke(IPC.ABILITIES_ADD, data),
    update: (id, data) => ipcRenderer.invoke(IPC.ABILITIES_UPDATE, id, data),
    delete: (id) => ipcRenderer.invoke(IPC.ABILITIES_DELETE, id),
    addChild: (data) => ipcRenderer.invoke(IPC.ABILITIES_ADD_CHILD, data),
    removeChild: (data) => ipcRenderer.invoke(IPC.ABILITIES_REMOVE_CHILD, data),
    getChildren: (abilityId) => ipcRenderer.invoke(IPC.ABILITIES_GET_CHILDREN, abilityId),
  },
  campaigns: {
    getAllByWorld: (worldId) => ipcRenderer.invoke(IPC.CAMPAIGNS_GET_ALL_BY_WORLD, worldId),
    getById: (id) => ipcRenderer.invoke(IPC.CAMPAIGNS_GET_BY_ID, id),
    add: (data) => ipcRenderer.invoke(IPC.CAMPAIGNS_ADD, data),
    update: (id, data) => ipcRenderer.invoke(IPC.CAMPAIGNS_UPDATE, id, data),
    delete: (id) => ipcRenderer.invoke(IPC.CAMPAIGNS_DELETE, id),
  },
  campaignNotes: {
    getAllByCampaign: (campaignId) =>
      ipcRenderer.invoke(IPC.CAMPAIGN_NOTES_GET_ALL_BY_CAMPAIGN, campaignId),
    getById: (id) => ipcRenderer.invoke(IPC.CAMPAIGN_NOTES_GET_BY_ID, id),
    add: (data) => ipcRenderer.invoke(IPC.CAMPAIGN_NOTES_ADD, data),
    update: (id, data) => ipcRenderer.invoke(IPC.CAMPAIGN_NOTES_UPDATE, id, data),
    delete: (id) => ipcRenderer.invoke(IPC.CAMPAIGN_NOTES_DELETE, id),
    getAllTagsByCampaign: (campaignId) =>
      ipcRenderer.invoke(IPC.CAMPAIGN_NOTE_TAGS_GET_ALL_BY_CAMPAIGN, campaignId),
  },
  battlemaps: {
    getAllByWorld: (worldId) => ipcRenderer.invoke(IPC.BATTLEMAPS_GET_ALL_BY_WORLD, worldId),
    getById: (id) => ipcRenderer.invoke(IPC.BATTLEMAPS_GET_BY_ID, id),
    add: (data) => ipcRenderer.invoke(IPC.BATTLEMAPS_ADD, data),
    update: (id, data) => ipcRenderer.invoke(IPC.BATTLEMAPS_UPDATE, id, data),
    delete: (id) => ipcRenderer.invoke(IPC.BATTLEMAPS_DELETE, id),
  },
  worldMaps: {
    getByWorld: (worldId) => ipcRenderer.invoke(IPC.WORLD_MAPS_GET_BY_WORLD, worldId),
    openEditor: (worldId) => ipcRenderer.invoke(IPC.WORLD_MAPS_OPEN_EDITOR, worldId),
  },
  tokens: {
    getAllByWorld: (worldId) => ipcRenderer.invoke(IPC.TOKENS_GET_ALL_BY_WORLD, worldId),
    getAllByCampaign: (campaignId) =>
      ipcRenderer.invoke(IPC.TOKENS_GET_ALL_BY_CAMPAIGN, campaignId),
    moveToWorld: (tokenId) => ipcRenderer.invoke(IPC.TOKENS_MOVE_TO_WORLD, tokenId),
    moveToCampaign: (tokenId, targetCampaignId) =>
      ipcRenderer.invoke(IPC.TOKENS_MOVE_TO_CAMPAIGN, tokenId, targetCampaignId),
    getById: (id) => ipcRenderer.invoke(IPC.TOKENS_GET_BY_ID, id),
    importImage: (payload) => {
      if (!(payload.bytes instanceof Uint8Array)) {
        throw new Error('Token image bytes must be a Uint8Array');
      }
      return ipcRenderer.invoke(IPC.TOKENS_IMPORT_IMAGE, {
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        bytes: new Uint8Array(payload.bytes),
      });
    },
    add: (data) => ipcRenderer.invoke(IPC.TOKENS_ADD, data),
    update: (id, data) => ipcRenderer.invoke(IPC.TOKENS_UPDATE, id, data),
    delete: (id) => ipcRenderer.invoke(IPC.TOKENS_DELETE, id),
  },
  arcs: {
    getAllByCampaign: (campaignId) => ipcRenderer.invoke(IPC.ARCS_GET_ALL_BY_CAMPAIGN, campaignId),
    getById: (id) => ipcRenderer.invoke(IPC.ARCS_GET_BY_ID, id),
    add: (data) => ipcRenderer.invoke(IPC.ARCS_ADD, data),
    update: (id, data) => ipcRenderer.invoke(IPC.ARCS_UPDATE, id, data),
    delete: (id) => ipcRenderer.invoke(IPC.ARCS_DELETE, id),
  },
  acts: {
    getAllByArc: (arcId) => ipcRenderer.invoke(IPC.ACTS_GET_ALL_BY_ARC, arcId),
    getAllByCampaign: (campaignId) => ipcRenderer.invoke(IPC.ACTS_GET_ALL_BY_CAMPAIGN, campaignId),
    getById: (id) => ipcRenderer.invoke(IPC.ACTS_GET_BY_ID, id),
    add: (data) => ipcRenderer.invoke(IPC.ACTS_ADD, data),
    update: (id, data) => ipcRenderer.invoke(IPC.ACTS_UPDATE, id, data),
    delete: (id) => ipcRenderer.invoke(IPC.ACTS_DELETE, id),
    moveTo: (actId, newArcId) => ipcRenderer.invoke(IPC.ACTS_MOVE_TO_ARC, actId, newArcId),
  },
  sessions: {
    getAllByCampaign: (campaignId) =>
      ipcRenderer.invoke(IPC.SESSIONS_GET_ALL_BY_CAMPAIGN, campaignId),
    getAllByAct: (actId) => ipcRenderer.invoke(IPC.SESSIONS_GET_ALL_BY_ACT, actId),
    getById: (id) => ipcRenderer.invoke(IPC.SESSIONS_GET_BY_ID, id),
    add: (data) => ipcRenderer.invoke(IPC.SESSIONS_ADD, data),
    update: (id, data) => ipcRenderer.invoke(IPC.SESSIONS_UPDATE, id, data),
    delete: (id) => ipcRenderer.invoke(IPC.SESSIONS_DELETE, id),
    moveTo: (sessionId, newActId) =>
      ipcRenderer.invoke(IPC.SESSIONS_MOVE_TO_ACT, sessionId, newActId),
  },
  scenes: {
    getAllByCampaign: (campaignId) =>
      ipcRenderer.invoke(IPC.SCENES_GET_ALL_BY_CAMPAIGN, campaignId),
    getAllBySession: (sessionId) => ipcRenderer.invoke(IPC.SCENES_GET_ALL_BY_SESSION, sessionId),
    getById: (id) => ipcRenderer.invoke(IPC.SCENES_GET_BY_ID, id),
    add: (data) => ipcRenderer.invoke(IPC.SCENES_ADD, data),
    update: (id, data) => ipcRenderer.invoke(IPC.SCENES_UPDATE, id, data),
    delete: (id) => ipcRenderer.invoke(IPC.SCENES_DELETE, id),
    moveTo: (sceneId, newSessionId) =>
      ipcRenderer.invoke(IPC.SCENES_MOVE_TO_SESSION, sceneId, newSessionId),
  },
  statblocks: {
    getAllByWorld: (worldId) => ipcRenderer.invoke(IPC.STATBLOCKS_GET_ALL_BY_WORLD, worldId),
    getAllByCampaign: (campaignId) =>
      ipcRenderer.invoke(IPC.STATBLOCKS_GET_ALL_BY_CAMPAIGN, campaignId),
    getById: (id) => ipcRenderer.invoke(IPC.STATBLOCKS_GET_BY_ID, id),
    add: (data) => ipcRenderer.invoke(IPC.STATBLOCKS_ADD, data),
    update: (id, data) => ipcRenderer.invoke(IPC.STATBLOCKS_UPDATE, id, data),
    delete: (id) => ipcRenderer.invoke(IPC.STATBLOCKS_DELETE, id),
    linkToken: (data) => ipcRenderer.invoke(IPC.STATBLOCKS_LINK_TOKEN, data),
    unlinkToken: (data) => ipcRenderer.invoke(IPC.STATBLOCKS_UNLINK_TOKEN, data),
    getLinkedTokens: (statblockId) =>
      ipcRenderer.invoke(IPC.STATBLOCKS_GET_LINKED_TOKENS, statblockId),
    getLinkedStatblock: (tokenId) =>
      ipcRenderer.invoke(IPC.STATBLOCKS_GET_LINKED_STATBLOCK, tokenId),
    attachAbility: (data) => ipcRenderer.invoke(IPC.STATBLOCKS_ATTACH_ABILITY, data),
    detachAbility: (data) => ipcRenderer.invoke(IPC.STATBLOCKS_DETACH_ABILITY, data),
    listAbilities: (statblockId) => ipcRenderer.invoke(IPC.STATBLOCKS_LIST_ABILITIES, statblockId),
  },
  worlds: {
    getAll: () => ipcRenderer.invoke(IPC.WORLDS_GET_ALL),
    getById: (id) => ipcRenderer.invoke(IPC.WORLDS_GET_BY_ID, id),
    add: (data) => ipcRenderer.invoke(IPC.WORLDS_ADD, data),
    update: (id, data) => ipcRenderer.invoke(IPC.WORLDS_UPDATE, id, data),
    delete: (id) => ipcRenderer.invoke(IPC.WORLDS_DELETE, id),
    markViewed: (id) => ipcRenderer.invoke(IPC.WORLDS_MARK_VIEWED, id),
    importImage: (payload) => {
      if (!(payload.bytes instanceof Uint8Array)) {
        throw new Error('World image bytes must be a Uint8Array');
      }
      return ipcRenderer.invoke(IPC.WORLDS_IMPORT_IMAGE, {
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        bytes: new Uint8Array(payload.bytes),
      });
    },
    export: (worldId) => ipcRenderer.invoke(IPC.WORLDS_EXPORT, worldId),
    import: () => ipcRenderer.invoke(IPC.WORLDS_IMPORT),
  },
  characters: {
    getAllByWorld: (worldId) => ipcRenderer.invoke(IPC.CHARACTERS_GET_ALL_BY_WORLD, worldId),
    getById: (id) => ipcRenderer.invoke(IPC.CHARACTERS_GET_BY_ID, id),
    add: (data) => ipcRenderer.invoke(IPC.CHARACTERS_ADD, data),
    update: (id, data) => ipcRenderer.invoke(IPC.CHARACTERS_UPDATE, id, data),
    delete: (id) => ipcRenderer.invoke(IPC.CHARACTERS_DELETE, id),
    importImage: (payload) => {
      if (!(payload.bytes instanceof Uint8Array)) {
        throw new Error('Character image bytes must be a Uint8Array');
      }
      return ipcRenderer.invoke(IPC.CHARACTERS_IMPORT_IMAGE, {
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        bytes: new Uint8Array(payload.bytes),
      });
    },
    searchByWorld: (query) => ipcRenderer.invoke(IPC.CHARACTERS_SEARCH_BY_WORLD, query),
    markViewed: (id) => ipcRenderer.invoke(IPC.CHARACTERS_MARK_VIEWED, id),
  },
  backgrounds: {
    getAllByWorld: (worldId) => ipcRenderer.invoke(IPC.BACKGROUNDS_GET_ALL_BY_WORLD, worldId),
    getById: (id) => ipcRenderer.invoke(IPC.BACKGROUNDS_GET_BY_ID, id),
    add: (data) => ipcRenderer.invoke(IPC.BACKGROUNDS_ADD, data),
    update: (id, data) => ipcRenderer.invoke(IPC.BACKGROUNDS_UPDATE, id, data),
    delete: (id) => ipcRenderer.invoke(IPC.BACKGROUNDS_DELETE, id),
    importImage: (payload) => {
      if (!(payload.bytes instanceof Uint8Array)) {
        throw new Error('Background image bytes must be a Uint8Array');
      }
      return ipcRenderer.invoke(IPC.BACKGROUNDS_IMPORT_IMAGE, {
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        bytes: new Uint8Array(payload.bytes),
      });
    },
    markViewed: (id) => ipcRenderer.invoke(IPC.BACKGROUNDS_MARK_VIEWED, id),
  },
  items: {
    getAllByWorld: (worldId) => ipcRenderer.invoke(IPC.ITEMS_GET_ALL_BY_WORLD, worldId),
    getById: (id) => ipcRenderer.invoke(IPC.ITEMS_GET_BY_ID, id),
    add: (data) => ipcRenderer.invoke(IPC.ITEMS_ADD, data),
    update: (id, data) => ipcRenderer.invoke(IPC.ITEMS_UPDATE, id, data),
    delete: (id) => ipcRenderer.invoke(IPC.ITEMS_DELETE, id),
    importImage: (payload) => {
      if (!(payload.bytes instanceof Uint8Array)) {
        throw new Error('Item image bytes must be a Uint8Array');
      }
      return ipcRenderer.invoke(IPC.ITEMS_IMPORT_IMAGE, {
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        bytes: new Uint8Array(payload.bytes),
      });
    },
    markViewed: (id) => ipcRenderer.invoke(IPC.ITEMS_MARK_VIEWED, id),
  },
  loreNotes: {
    getAllByWorld: (worldId) => ipcRenderer.invoke(IPC.LORE_NOTES_GET_ALL_BY_WORLD, worldId),
    getById: (id) => ipcRenderer.invoke(IPC.LORE_NOTES_GET_BY_ID, id),
    add: (data) => ipcRenderer.invoke(IPC.LORE_NOTES_ADD, data),
    update: (id, data) => ipcRenderer.invoke(IPC.LORE_NOTES_UPDATE, id, data),
    delete: (id) => ipcRenderer.invoke(IPC.LORE_NOTES_DELETE, id),
    importImage: (payload) => {
      if (!(payload.bytes instanceof Uint8Array)) {
        throw new Error('Lore note image bytes must be a Uint8Array');
      }
      return ipcRenderer.invoke(IPC.LORE_NOTES_IMPORT_IMAGE, {
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        bytes: new Uint8Array(payload.bytes),
      });
    },
    markViewed: (id) => ipcRenderer.invoke(IPC.LORE_NOTES_MARK_VIEWED, id),
    getAllTagsByWorld: (worldId) =>
      ipcRenderer.invoke(IPC.LORE_NOTE_TAGS_GET_ALL_BY_WORLD, worldId),
  },
  factions: {
    getAllByWorld: (worldId) => ipcRenderer.invoke(IPC.FACTIONS_GET_ALL_BY_WORLD, worldId),
    getById: (id) => ipcRenderer.invoke(IPC.FACTIONS_GET_BY_ID, id),
    add: (data) => ipcRenderer.invoke(IPC.FACTIONS_ADD, data),
    update: (id, data) => ipcRenderer.invoke(IPC.FACTIONS_UPDATE, id, data),
    delete: (id) => ipcRenderer.invoke(IPC.FACTIONS_DELETE, id),
    importImage: (payload) => {
      if (!(payload.bytes instanceof Uint8Array)) {
        throw new Error('Faction image bytes must be a Uint8Array');
      }
      return ipcRenderer.invoke(IPC.FACTIONS_IMPORT_IMAGE, {
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        bytes: new Uint8Array(payload.bytes),
      });
    },
    markViewed: (id) => ipcRenderer.invoke(IPC.FACTIONS_MARK_VIEWED, id),
  },
  factionTypes: {
    getAllByWorld: (worldId) => ipcRenderer.invoke(IPC.FACTION_TYPES_GET_ALL_BY_WORLD, worldId),
    add: (data) => ipcRenderer.invoke(IPC.FACTION_TYPES_ADD, data),
    rename: (id, name) => ipcRenderer.invoke(IPC.FACTION_TYPES_RENAME, id, name),
    delete: (id) => ipcRenderer.invoke(IPC.FACTION_TYPES_DELETE, id),
  },
  factionMembers: {
    getAllByFaction: (factionId) =>
      ipcRenderer.invoke(IPC.FACTION_MEMBERS_GET_ALL_BY_FACTION, factionId),
    getAllByCharacter: (characterId) =>
      ipcRenderer.invoke(IPC.FACTION_MEMBERS_GET_ALL_BY_CHARACTER, characterId),
    getAllPrimaryByWorld: (worldId) =>
      ipcRenderer.invoke(IPC.FACTION_MEMBERS_GET_ALL_PRIMARY_BY_WORLD, worldId),
    setForFaction: (factionId, members) =>
      ipcRenderer.invoke(IPC.FACTION_MEMBERS_SET_FOR_FACTION, factionId, members),
    setPrimary: (characterId, factionId) =>
      ipcRenderer.invoke(IPC.FACTION_MEMBERS_SET_PRIMARY, characterId, factionId),
  },
  characterRelationships: {
    getAllByCharacter: (characterId) =>
      ipcRenderer.invoke(IPC.CHARACTER_RELATIONSHIPS_GET_ALL_BY_CHARACTER, characterId),
    add: (data) => ipcRenderer.invoke(IPC.CHARACTER_RELATIONSHIPS_ADD, data),
    update: (id, data) => ipcRenderer.invoke(IPC.CHARACTER_RELATIONSHIPS_UPDATE, id, data),
    delete: (id) => ipcRenderer.invoke(IPC.CHARACTER_RELATIONSHIPS_DELETE, id),
  },
  factionRelationships: {
    getAllByFaction: (factionId) =>
      ipcRenderer.invoke(IPC.FACTION_RELATIONSHIPS_GET_ALL_BY_FACTION, factionId),
    add: (data) => ipcRenderer.invoke(IPC.FACTION_RELATIONSHIPS_ADD, data),
    update: (id, data) => ipcRenderer.invoke(IPC.FACTION_RELATIONSHIPS_UPDATE, id, data),
    delete: (id) => ipcRenderer.invoke(IPC.FACTION_RELATIONSHIPS_DELETE, id),
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC.SETTINGS_GET),
    update: (config) => ipcRenderer.invoke(IPC.SETTINGS_UPDATE, config),
  },
};

contextBridge.exposeInMainWorld('db', dbApi);
