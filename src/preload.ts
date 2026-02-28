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
  sessions: {
    getAllByCampaign: (campaignId: number) =>
      ipcRenderer.invoke(IPC.SESSIONS_GET_ALL_BY_CAMPAIGN, campaignId),
    getById: (id: number) => ipcRenderer.invoke(IPC.SESSIONS_GET_BY_ID, id),
    add: (data: {
      campaign_id: number;
      name: string;
      notes?: string | null;
      sort_order?: number;
    }) => ipcRenderer.invoke(IPC.SESSIONS_ADD, data),
    update: (
      id: number,
      data: { name?: string; notes?: string | null; sort_order?: number },
    ) => ipcRenderer.invoke(IPC.SESSIONS_UPDATE, id, data),
    delete: (id: number) => ipcRenderer.invoke(IPC.SESSIONS_DELETE, id),
  },
  scenes: {
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
