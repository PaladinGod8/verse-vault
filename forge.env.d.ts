export {}; // Make this a module

declare global {
  interface Verse {
    id: number;
    text: string;
    reference: string | null;
    tags: string | null;
    created_at: string;
    updated_at: string;
  }

  interface World {
    id: number;
    name: string;
    thumbnail: string | null;
    short_description: string | null;
    last_viewed_at: string | null;
    created_at: string;
    updated_at: string;
  }

  interface Level {
    id: number;
    world_id: number;
    name: string;
    category: string;
    description: string | null;
    created_at: string;
    updated_at: string;
  }

  interface Ability {
    id: number;
    world_id: number;
    name: string;
    description: string | null;
    type: string;
    passive_subtype: string | null;
    level_id: number | null;
    effects: string;
    conditions: string;
    cast_cost: string;
    trigger: string | null;
    pick_count: number | null;
    pick_timing: string | null;
    pick_is_permanent: number;
    created_at: string;
    updated_at: string;
  }

  interface AbilityChild {
    parent_id: number;
    child_id: number;
  }

  interface Campaign {
    id: number;
    world_id: number;
    name: string;
    summary: string | null;
    config: string;
    created_at: string;
    updated_at: string;
  }

  interface BattleMap {
    id: number;
    world_id: number;
    name: string;
    config: string;
    created_at: string;
    updated_at: string;
  }

  type BattleMapGridMode = 'square' | 'hex' | 'none';

  interface BattleMapRuntimeGridConfig {
    mode: BattleMapGridMode;
    cellSize: number;
    originX: number;
    originY: number;
  }

  interface BattleMapRuntimeMapConfig {
    imageSrc: string | null;
    backgroundColor: string;
  }

  interface BattleMapRuntimeCameraConfig {
    x: number;
    y: number;
    zoom: number;
  }

  interface BattleMapRuntimeConfig {
    grid: BattleMapRuntimeGridConfig;
    map: BattleMapRuntimeMapConfig;
    camera: BattleMapRuntimeCameraConfig;
    [key: string]: unknown;
  }

  interface BattleMapConfig {
    runtime?: BattleMapRuntimeConfig;
    [key: string]: unknown;
  }

  interface ScenePayloadRuntime {
    battlemap_id?: number | null;
    [key: string]: unknown;
  }

  interface ScenePayload {
    runtime?: ScenePayloadRuntime;
    [key: string]: unknown;
  }

  interface Token {
    id: number;
    campaign_id: number;
    name: string;
    image_src: string | null;
    config: string;
    is_visible: number;
    created_at: string;
    updated_at: string;
  }

  interface Arc {
    id: number;
    campaign_id: number;
    name: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
  }

  interface Act {
    id: number;
    arc_id: number;
    name: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
  }

  interface Session {
    id: number;
    act_id: number;
    name: string;
    notes: string | null;
    planned_at: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
  }

  interface Scene {
    id: number;
    session_id: number;
    name: string;
    notes: string | null;
    payload: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
  }

  interface CampaignSceneListItem extends Scene {
    session_name: string;
    act_id: number;
    act_name: string;
    arc_id: number;
    arc_name: string;
  }

  interface DbApi {
    verses: {
      getAll(): Promise<Verse[]>;
      add(data: {
        text: string;
        reference?: string;
        tags?: string;
      }): Promise<Verse>;
      update(
        id: number,
        data: { text?: string; reference?: string; tags?: string },
      ): Promise<Verse>;
      delete(id: number): Promise<{ id: number }>;
    };
    worlds: {
      getAll(): Promise<World[]>;
      getById(id: number): Promise<World | null>;
      add(data: {
        name: string;
        thumbnail?: string | null;
        short_description?: string | null;
      }): Promise<World>;
      update(
        id: number,
        data: {
          name?: string;
          thumbnail?: string | null;
          short_description?: string | null;
        },
      ): Promise<World>;
      delete(id: number): Promise<{ id: number }>;
      markViewed(id: number): Promise<World>;
    };
    levels: {
      getAllByWorld(worldId: number): Promise<Level[]>;
      getById(id: number): Promise<Level | null>;
      add(data: {
        world_id: number;
        name: string;
        category: string;
        description?: string | null;
      }): Promise<Level>;
      update(
        id: number,
        data: { name?: string; category?: string; description?: string | null },
      ): Promise<Level>;
      delete(id: number): Promise<{ id: number }>;
    };
    abilities: {
      getAllByWorld(worldId: number): Promise<Ability[]>;
      getById(id: number): Promise<Ability | null>;
      add(data: {
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
      }): Promise<Ability>;
      update(
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
      ): Promise<Ability>;
      delete(id: number): Promise<{ id: number }>;
      addChild(data: AbilityChild): Promise<AbilityChild>;
      removeChild(data: AbilityChild): Promise<AbilityChild>;
      getChildren(abilityId: number): Promise<Ability[]>;
    };
    campaigns: {
      getAllByWorld(worldId: number): Promise<Campaign[]>;
      getById(id: number): Promise<Campaign | null>;
      add(data: {
        world_id: number;
        name: string;
        summary?: string | null;
        config?: string;
      }): Promise<Campaign>;
      update(
        id: number,
        data: { name?: string; summary?: string | null; config?: string },
      ): Promise<Campaign>;
      delete(id: number): Promise<{ id: number }>;
    };
    battlemaps: {
      getAllByWorld(worldId: number): Promise<BattleMap[]>;
      getById(id: number): Promise<BattleMap | null>;
      add(data: {
        world_id: number;
        name: string;
        config?: string;
      }): Promise<BattleMap>;
      update(
        id: number,
        data: { name?: string; config?: string },
      ): Promise<BattleMap>;
      delete(id: number): Promise<{ id: number }>;
    };
    tokens: {
      getAllByCampaign(campaignId: number): Promise<Token[]>;
      getById(id: number): Promise<Token | null>;
      add(data: {
        campaign_id: number;
        name: string;
        image_src?: string | null;
        config?: string;
        is_visible?: number;
      }): Promise<Token>;
      update(
        id: number,
        data: {
          name?: string;
          image_src?: string | null;
          config?: string;
          is_visible?: number;
        },
      ): Promise<Token>;
      delete(id: number): Promise<{ id: number }>;
    };
    arcs: {
      getAllByCampaign(campaignId: number): Promise<Arc[]>;
      getById(id: number): Promise<Arc | null>;
      add(data: {
        campaign_id: number;
        name: string;
        sort_order?: number;
      }): Promise<Arc>;
      update(
        id: number,
        data: { name?: string; sort_order?: number },
      ): Promise<Arc>;
      delete(id: number): Promise<{ id: number }>;
    };
    acts: {
      getAllByArc(arcId: number): Promise<Act[]>;
      getAllByCampaign(campaignId: number): Promise<Act[]>;
      getById(id: number): Promise<Act | null>;
      add(data: {
        arc_id: number;
        name: string;
        sort_order?: number;
      }): Promise<Act>;
      update(
        id: number,
        data: { name?: string; sort_order?: number },
      ): Promise<Act>;
      delete(id: number): Promise<{ id: number }>;
      moveTo(actId: number, newArcId: number): Promise<Act>;
    };
    sessions: {
      getAllByAct(actId: number): Promise<Session[]>;
      getById(id: number): Promise<Session | null>;
      add(data: {
        act_id: number;
        name: string;
        notes?: string | null;
        planned_at?: string | null;
        sort_order?: number;
      }): Promise<Session>;
      update(
        id: number,
        data: {
          name?: string;
          notes?: string | null;
          planned_at?: string | null;
          sort_order?: number;
        },
      ): Promise<Session>;
      delete(id: number): Promise<{ id: number }>;
      moveTo(sessionId: number, newActId: number): Promise<Session>;
    };
    scenes: {
      getAllByCampaign(campaignId: number): Promise<CampaignSceneListItem[]>;
      getAllBySession(sessionId: number): Promise<Scene[]>;
      getById(id: number): Promise<Scene | null>;
      add(data: {
        session_id: number;
        name: string;
        notes?: string | null;
        payload?: string;
        sort_order?: number;
      }): Promise<Scene>;
      update(
        id: number,
        data: {
          name?: string;
          notes?: string | null;
          payload?: string;
          sort_order?: number;
        },
      ): Promise<Scene>;
      delete(id: number): Promise<{ id: number }>;
      moveTo(sceneId: number, newSessionId: number): Promise<Scene>;
    };
  }

  interface Window {
    db: DbApi;
  }
  // This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Vite
  // plugin that tells the Electron app where to look for the Vite-bundled app code (depending on
  // whether you're running in development or production).
  const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
  const MAIN_WINDOW_VITE_NAME: string;

  namespace NodeJS {
    interface Process {
      // Used for hot reload after preload scripts.
      viteDevServers: Record<string, import('vite').ViteDevServer>;
    }
  }

  type VitePluginConfig = ConstructorParameters<
    typeof import('@electron-forge/plugin-vite').VitePlugin
  >[0];

  interface VitePluginRuntimeKeys {
    VITE_DEV_SERVER_URL: `${string}_VITE_DEV_SERVER_URL`;
    VITE_NAME: `${string}_VITE_NAME`;
  }
}

declare module 'vite' {
  interface ConfigEnv<
    K extends keyof VitePluginConfig = keyof VitePluginConfig,
  > {
    root: string;
    forgeConfig: VitePluginConfig;
    forgeConfigSelf: VitePluginConfig[K][number];
  }
}
