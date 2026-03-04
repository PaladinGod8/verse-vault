// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from './shared/ipcChannels';

contextBridge.exposeInMainWorld('db', {
  verses: {
    getAll: (): Promise<Verse[]> => ipcRenderer.invoke(IPC.VERSES_GET_ALL),
    add: (data: {
      text: string;
      reference?: string;
      tags?: string;
    }): Promise<Verse> => ipcRenderer.invoke(IPC.VERSES_ADD, data),
    update: (
      id: number,
      data: { text?: string; reference?: string; tags?: string },
    ): Promise<Verse> => ipcRenderer.invoke(IPC.VERSES_UPDATE, id, data),
    delete: (id: number): Promise<{ id: number }> =>
      ipcRenderer.invoke(IPC.VERSES_DELETE, id),
  },
  levels: {
    getAllByWorld: (worldId: number): Promise<Level[]> =>
      ipcRenderer.invoke(IPC.LEVELS_GET_ALL_BY_WORLD, worldId),
    getById: (id: number): Promise<Level | null> =>
      ipcRenderer.invoke(IPC.LEVELS_GET_BY_ID, id),
    add: (data: {
      world_id: number;
      name: string;
      category: string;
      description?: string | null;
    }) => ipcRenderer.invoke(IPC.LEVELS_ADD, data),
    update: (
      id: number,
      data: { name?: string; category?: string; description?: string | null },
    ) => ipcRenderer.invoke(IPC.LEVELS_UPDATE, id, data),
    delete: (id: number) => ipcRenderer.invoke(IPC.LEVELS_DELETE, id),
  },
  abilities: {
    getAllByWorld: (worldId: number): Promise<Ability[]> =>
      ipcRenderer.invoke(IPC.ABILITIES_GET_ALL_BY_WORLD, worldId),
    getById: (id: number): Promise<Ability | null> =>
      ipcRenderer.invoke(IPC.ABILITIES_GET_BY_ID, id),
    add: (data: {
      world_id: number;
      name: string;
      description?: string | null;
      type: string;
      passive_subtype?: string | null;
      level_id?: number | null;
      effects?: string;
      conditions?: string;
      cast_cost?: string;
      trigger?: string | null;
      pick_count?: number | null;
      pick_timing?: string | null;
      pick_is_permanent?: number;
    }): Promise<Ability> => ipcRenderer.invoke(IPC.ABILITIES_ADD, data),
    update: (
      id: number,
      data: {
        name?: string;
        description?: string | null;
        type?: string;
        passive_subtype?: string | null;
        level_id?: number | null;
        effects?: string;
        conditions?: string;
        cast_cost?: string;
        trigger?: string | null;
        pick_count?: number | null;
        pick_timing?: string | null;
        pick_is_permanent?: number;
      },
    ): Promise<Ability> => ipcRenderer.invoke(IPC.ABILITIES_UPDATE, id, data),
    delete: (id: number): Promise<{ id: number }> =>
      ipcRenderer.invoke(IPC.ABILITIES_DELETE, id),
    addChild: (data: AbilityChild): Promise<AbilityChild> =>
      ipcRenderer.invoke(IPC.ABILITIES_ADD_CHILD, data),
    removeChild: (data: AbilityChild): Promise<AbilityChild> =>
      ipcRenderer.invoke(IPC.ABILITIES_REMOVE_CHILD, data),
    getChildren: (abilityId: number): Promise<Ability[]> =>
      ipcRenderer.invoke(IPC.ABILITIES_GET_CHILDREN, abilityId),
  },
  campaigns: {
    getAllByWorld: (worldId: number) =>
      ipcRenderer.invoke(IPC.CAMPAIGNS_GET_ALL_BY_WORLD, worldId),
    getById: (id: number) => ipcRenderer.invoke(IPC.CAMPAIGNS_GET_BY_ID, id),
    add: (data: {
      world_id: number;
      name: string;
      summary?: string | null;
      config?: string;
    }) => ipcRenderer.invoke(IPC.CAMPAIGNS_ADD, data),
    update: (
      id: number,
      data: { name?: string; summary?: string | null; config?: string },
    ) => ipcRenderer.invoke(IPC.CAMPAIGNS_UPDATE, id, data),
    delete: (id: number) => ipcRenderer.invoke(IPC.CAMPAIGNS_DELETE, id),
  },
  battlemaps: {
    getAllByWorld: (worldId: number): Promise<BattleMap[]> =>
      ipcRenderer.invoke(IPC.BATTLEMAPS_GET_ALL_BY_WORLD, worldId),
    getById: (id: number): Promise<BattleMap | null> =>
      ipcRenderer.invoke(IPC.BATTLEMAPS_GET_BY_ID, id),
    add: (data: {
      world_id: number;
      name: string;
      config?: string;
    }): Promise<BattleMap> => ipcRenderer.invoke(IPC.BATTLEMAPS_ADD, data),
    update: (
      id: number,
      data: { name?: string; config?: string },
    ): Promise<BattleMap> =>
      ipcRenderer.invoke(IPC.BATTLEMAPS_UPDATE, id, data),
    delete: (id: number): Promise<{ id: number }> =>
      ipcRenderer.invoke(IPC.BATTLEMAPS_DELETE, id),
  },
  tokens: {
    getAllByWorld: (worldId: number): Promise<Token[]> =>
      ipcRenderer.invoke(IPC.TOKENS_GET_ALL_BY_WORLD, worldId),
    getAllByCampaign: (campaignId: number): Promise<Token[]> =>
      ipcRenderer.invoke(IPC.TOKENS_GET_ALL_BY_CAMPAIGN, campaignId),
    moveToWorld: (tokenId: number): Promise<Token> =>
      ipcRenderer.invoke(IPC.TOKENS_MOVE_TO_WORLD, tokenId),
    moveToCampaign: (
      tokenId: number,
      targetCampaignId: number,
    ): Promise<Token> =>
      ipcRenderer.invoke(
        IPC.TOKENS_MOVE_TO_CAMPAIGN,
        tokenId,
        targetCampaignId,
      ),
    getById: (id: number): Promise<Token | null> =>
      ipcRenderer.invoke(IPC.TOKENS_GET_BY_ID, id),
    importImage: (
      payload: TokenImageImportPayload,
    ): Promise<TokenImageImportResult> => {
      if (!(payload.bytes instanceof Uint8Array)) {
        throw new Error('Token image bytes must be a Uint8Array');
      }
      return ipcRenderer.invoke(IPC.TOKENS_IMPORT_IMAGE, {
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        bytes: new Uint8Array(payload.bytes),
      });
    },
    add: (data: {
      world_id: number;
      campaign_id?: number | null;
      name: string;
      image_src?: string | null;
      config?: string;
      is_visible?: number;
    }): Promise<Token> => ipcRenderer.invoke(IPC.TOKENS_ADD, data),
    update: (
      id: number,
      data: {
        name?: string;
        image_src?: string | null;
        config?: string;
        is_visible?: number;
      },
    ): Promise<Token> => ipcRenderer.invoke(IPC.TOKENS_UPDATE, id, data),
    delete: (id: number): Promise<{ id: number }> =>
      ipcRenderer.invoke(IPC.TOKENS_DELETE, id),
  },
  arcs: {
    getAllByCampaign: (campaignId: number): Promise<Arc[]> =>
      ipcRenderer.invoke(IPC.ARCS_GET_ALL_BY_CAMPAIGN, campaignId),
    getById: (id: number): Promise<Arc | null> =>
      ipcRenderer.invoke(IPC.ARCS_GET_BY_ID, id),
    add: (data: {
      campaign_id: number;
      name: string;
      sort_order?: number;
    }): Promise<Arc> => ipcRenderer.invoke(IPC.ARCS_ADD, data),
    update: (
      id: number,
      data: { name?: string; sort_order?: number },
    ): Promise<Arc> => ipcRenderer.invoke(IPC.ARCS_UPDATE, id, data),
    delete: (id: number): Promise<{ id: number }> =>
      ipcRenderer.invoke(IPC.ARCS_DELETE, id),
  },
  acts: {
    getAllByArc: (arcId: number): Promise<Act[]> =>
      ipcRenderer.invoke(IPC.ACTS_GET_ALL_BY_ARC, arcId),
    getAllByCampaign: (campaignId: number): Promise<Act[]> =>
      ipcRenderer.invoke(IPC.ACTS_GET_ALL_BY_CAMPAIGN, campaignId),
    getById: (id: number): Promise<Act | null> =>
      ipcRenderer.invoke(IPC.ACTS_GET_BY_ID, id),
    add: (data: {
      arc_id: number;
      name: string;
      sort_order?: number;
    }): Promise<Act> => ipcRenderer.invoke(IPC.ACTS_ADD, data),
    update: (
      id: number,
      data: { name?: string; sort_order?: number },
    ): Promise<Act> => ipcRenderer.invoke(IPC.ACTS_UPDATE, id, data),
    delete: (id: number): Promise<{ id: number }> =>
      ipcRenderer.invoke(IPC.ACTS_DELETE, id),
    moveTo: (actId: number, newArcId: number): Promise<Act> =>
      ipcRenderer.invoke(IPC.ACTS_MOVE_TO_ARC, actId, newArcId),
  },
  sessions: {
    getAllByAct: (actId: number): Promise<Session[]> =>
      ipcRenderer.invoke(IPC.SESSIONS_GET_ALL_BY_ACT, actId),
    getById: (id: number) => ipcRenderer.invoke(IPC.SESSIONS_GET_BY_ID, id),
    add: (data: {
      act_id: number;
      name: string;
      notes?: string | null;
      planned_at?: string | null;
      sort_order?: number;
    }) => ipcRenderer.invoke(IPC.SESSIONS_ADD, data),
    update: (
      id: number,
      data: {
        name?: string;
        notes?: string | null;
        planned_at?: string | null;
        sort_order?: number;
      },
    ) => ipcRenderer.invoke(IPC.SESSIONS_UPDATE, id, data),
    delete: (id: number) => ipcRenderer.invoke(IPC.SESSIONS_DELETE, id),
    moveTo: (sessionId: number, newActId: number): Promise<Session> =>
      ipcRenderer.invoke(IPC.SESSIONS_MOVE_TO_ACT, sessionId, newActId),
  },
  scenes: {
    getAllByCampaign: (campaignId: number): Promise<CampaignSceneListItem[]> =>
      ipcRenderer.invoke(IPC.SCENES_GET_ALL_BY_CAMPAIGN, campaignId),
    getAllBySession: (sessionId: number) =>
      ipcRenderer.invoke(IPC.SCENES_GET_ALL_BY_SESSION, sessionId),
    getById: (id: number) => ipcRenderer.invoke(IPC.SCENES_GET_BY_ID, id),
    add: (data: {
      session_id: number;
      name: string;
      notes?: string | null;
      payload?: string;
      sort_order?: number;
    }) => ipcRenderer.invoke(IPC.SCENES_ADD, data),
    update: (
      id: number,
      data: {
        name?: string;
        notes?: string | null;
        payload?: string;
        sort_order?: number;
      },
    ) => ipcRenderer.invoke(IPC.SCENES_UPDATE, id, data),
    delete: (id: number) => ipcRenderer.invoke(IPC.SCENES_DELETE, id),
    moveTo: (sceneId: number, newSessionId: number): Promise<Scene> =>
      ipcRenderer.invoke(IPC.SCENES_MOVE_TO_SESSION, sceneId, newSessionId),
  },
  worlds: {
    getAll: (): Promise<World[]> => ipcRenderer.invoke(IPC.WORLDS_GET_ALL),
    getById: (id: number): Promise<World | null> =>
      ipcRenderer.invoke(IPC.WORLDS_GET_BY_ID, id),
    add: (data: {
      name: string;
      thumbnail?: string | null;
      short_description?: string | null;
    }): Promise<World> => ipcRenderer.invoke(IPC.WORLDS_ADD, data),
    update: (
      id: number,
      data: {
        name?: string;
        thumbnail?: string | null;
        short_description?: string | null;
      },
    ): Promise<World> => ipcRenderer.invoke(IPC.WORLDS_UPDATE, id, data),
    delete: (id: number): Promise<{ id: number }> =>
      ipcRenderer.invoke(IPC.WORLDS_DELETE, id),
    markViewed: (id: number): Promise<World> =>
      ipcRenderer.invoke(IPC.WORLDS_MARK_VIEWED, id),
  },
});
