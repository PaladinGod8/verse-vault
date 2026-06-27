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
  battlemaps: {
    getAllByWorld: (worldId) => ipcRenderer.invoke(IPC.BATTLEMAPS_GET_ALL_BY_WORLD, worldId),
    getById: (id) => ipcRenderer.invoke(IPC.BATTLEMAPS_GET_BY_ID, id),
    add: (data) => ipcRenderer.invoke(IPC.BATTLEMAPS_ADD, data),
    update: (id, data) => ipcRenderer.invoke(IPC.BATTLEMAPS_UPDATE, id, data),
    delete: (id) => ipcRenderer.invoke(IPC.BATTLEMAPS_DELETE, id),
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
  },
};

contextBridge.exposeInMainWorld('db', dbApi);
