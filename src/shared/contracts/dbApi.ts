/**
 * @role Renderer-facing contract
 * @owns The typed window.db surface and its method inventory metadata
 * @seam Shared preload contract consumed by ambient typing, docs, and guards
 * @calls Shared domain row and payload types only
 */
import type {
  Ability,
  AbilityChild,
  Act,
  Arc,
  BattleMap,
  Campaign,
  CampaignSceneListItem,
  Level,
  Scene,
  Session,
  StatBlock,
  StatBlockAbilityAssignment,
  StatBlockTokenLink,
  Token,
  TokenGridType,
  TokenImageImportPayload,
  TokenImageImportResult,
  Verse,
  World,
} from './domainTypes';

export const DB_API_METHODS = {
  verses: ['getAll', 'add', 'update', 'delete'],
  worlds: ['getAll', 'getById', 'add', 'update', 'delete', 'markViewed', 'importImage'],
  levels: ['getAllByWorld', 'getById', 'add', 'update', 'delete'],
  abilities: [
    'getAllByWorld',
    'getById',
    'add',
    'update',
    'delete',
    'addChild',
    'removeChild',
    'getChildren',
  ],
  campaigns: ['getAllByWorld', 'getById', 'add', 'update', 'delete'],
  battlemaps: ['getAllByWorld', 'getById', 'add', 'update', 'delete'],
  tokens: [
    'getAllByWorld',
    'getAllByCampaign',
    'getById',
    'importImage',
    'add',
    'update',
    'moveToWorld',
    'moveToCampaign',
    'delete',
  ],
  arcs: ['getAllByCampaign', 'getById', 'add', 'update', 'delete'],
  acts: ['getAllByArc', 'getAllByCampaign', 'getById', 'add', 'update', 'delete', 'moveTo'],
  sessions: ['getAllByCampaign', 'getAllByAct', 'getById', 'add', 'update', 'delete', 'moveTo'],
  scenes: ['getAllByCampaign', 'getAllBySession', 'getById', 'add', 'update', 'delete', 'moveTo'],
  statblocks: [
    'getAllByWorld',
    'getAllByCampaign',
    'getById',
    'add',
    'update',
    'delete',
    'linkToken',
    'unlinkToken',
    'getLinkedTokens',
    'getLinkedStatblock',
    'attachAbility',
    'detachAbility',
    'listAbilities',
  ],
} as const;

export interface DbApi {
  verses: {
    getAll(): Promise<Verse[]>;
    add(data: {
      text: string;
      reference?: string;
      tags?: string;
    }): Promise<Verse>;
    update(
      id: number,
      data: { text?: string; reference?: string; tags?: string; },
    ): Promise<Verse>;
    delete(id: number): Promise<{ id: number; }>;
  };
  worlds: {
    getAll(): Promise<World[]>;
    getById(id: number): Promise<World | null>;
    add(data: {
      name: string;
      thumbnail?: string | null;
      short_description?: string | null;
      config?: string;
    }): Promise<World>;
    update(
      id: number,
      data: {
        name?: string;
        thumbnail?: string | null;
        short_description?: string | null;
        config?: string;
      },
    ): Promise<World>;
    delete(id: number): Promise<{ id: number; }>;
    markViewed(id: number): Promise<World>;
    importImage(
      payload: TokenImageImportPayload,
    ): Promise<TokenImageImportResult>;
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
      data: { name?: string; category?: string; description?: string | null; },
    ): Promise<Level>;
    delete(id: number): Promise<{ id: number; }>;
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
      range_cells?: number | null;
      aoe_shape?: 'circle' | 'rectangle' | 'cone' | 'line' | null;
      aoe_size_cells?: number | null;
      target_type?: 'tile' | 'token' | null;
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
        range_cells?: number | null;
        aoe_shape?: 'circle' | 'rectangle' | 'cone' | 'line' | null;
        aoe_size_cells?: number | null;
        target_type?: 'tile' | 'token' | null;
      },
    ): Promise<Ability>;
    delete(id: number): Promise<{ id: number; }>;
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
      data: { name?: string; summary?: string | null; config?: string; },
    ): Promise<Campaign>;
    delete(id: number): Promise<{ id: number; }>;
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
      data: { name?: string; config?: string; },
    ): Promise<BattleMap>;
    delete(id: number): Promise<{ id: number; }>;
  };
  tokens: {
    getAllByWorld(worldId: number): Promise<Token[]>;
    getAllByCampaign(campaignId: number): Promise<Token[]>;
    getById(id: number): Promise<Token | null>;
    importImage(
      payload: TokenImageImportPayload,
    ): Promise<TokenImageImportResult>;
    add(data: {
      world_id: number;
      campaign_id?: number | null;
      grid_type?: TokenGridType;
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
        grid_type?: TokenGridType;
        is_visible?: number;
      },
    ): Promise<Token>;
    moveToWorld(tokenId: number): Promise<Token>;
    moveToCampaign(tokenId: number, targetCampaignId: number): Promise<Token>;
    delete(id: number): Promise<{ id: number; }>;
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
      data: { name?: string; sort_order?: number; },
    ): Promise<Arc>;
    delete(id: number): Promise<{ id: number; }>;
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
      data: { name?: string; sort_order?: number; },
    ): Promise<Act>;
    delete(id: number): Promise<{ id: number; }>;
    moveTo(actId: number, newArcId: number): Promise<Act>;
  };
  sessions: {
    getAllByCampaign?(campaignId: number): Promise<Session[]>;
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
    delete(id: number): Promise<{ id: number; }>;
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
    delete(id: number): Promise<{ id: number; }>;
    moveTo(sceneId: number, newSessionId: number): Promise<Scene>;
  };
  statblocks: {
    getAllByWorld(worldId: number): Promise<StatBlock[]>;
    getAllByCampaign(campaignId: number): Promise<StatBlock[]>;
    getById(id: number): Promise<StatBlock | null>;
    add(data: {
      world_id: number;
      campaign_id?: number;
      name: string;
      description?: string;
      config?: string;
    }): Promise<StatBlock>;
    update(
      id: number,
      data: {
        name?: string;
        description?: string;
        config?: string;
      },
    ): Promise<StatBlock>;
    delete(id: number): Promise<{ id: number; }>;
    linkToken(data: StatBlockTokenLink): Promise<StatBlockTokenLink>;
    unlinkToken(data: StatBlockTokenLink): Promise<StatBlockTokenLink>;
    getLinkedTokens(statblockId: number): Promise<Token[]>;
    getLinkedStatblock(tokenId: number): Promise<StatBlock | null>;
    attachAbility(
      data: StatBlockAbilityAssignment,
    ): Promise<StatBlockAbilityAssignment>;
    detachAbility(
      data: StatBlockAbilityAssignment,
    ): Promise<StatBlockAbilityAssignment>;
    listAbilities(statblockId: number): Promise<Ability[]>;
  };
}
