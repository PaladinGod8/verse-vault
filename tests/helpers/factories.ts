let nextId = 1;

const DEFAULT_TIMESTAMP = '2025-01-01T00:00:00Z';

function getNextId(): number {
  return nextId++;
}

export function resetFactoryIds(): void {
  nextId = 1;
}

export function buildVerse(overrides: Partial<Verse> = {}): Verse {
  return {
    id: getNextId(),
    text: 'Test verse text',
    reference: 'Test 1:1',
    tags: '',
    created_at: DEFAULT_TIMESTAMP,
    updated_at: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function buildWorld(overrides: Partial<World> = {}): World {
  return {
    id: getNextId(),
    name: 'Test World',
    thumbnail: null,
    short_description: 'A test world description',
    last_viewed_at: null,
    config: '{}',
    created_at: DEFAULT_TIMESTAMP,
    updated_at: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function buildLevel(overrides: Partial<Level> = {}): Level {
  return {
    id: getNextId(),
    world_id: getNextId(),
    name: 'Test Level',
    category: 'General',
    description: 'A test level',
    created_at: DEFAULT_TIMESTAMP,
    updated_at: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function buildAbility(overrides: Partial<Ability> = {}): Ability {
  return {
    id: getNextId(),
    world_id: getNextId(),
    name: 'Test Ability',
    description: 'A test ability',
    type: 'active',
    passive_subtype: null,
    level_id: null,
    effects: '{}',
    conditions: '{}',
    cast_cost: '{}',
    trigger: null,
    pick_count: null,
    pick_timing: null,
    pick_is_permanent: 0,
    range_cells: null,
    aoe_shape: null,
    aoe_size_cells: null,
    target_type: null,
    created_at: DEFAULT_TIMESTAMP,
    updated_at: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function buildAbilityChild(
  overrides: Partial<AbilityChild> = {},
): AbilityChild {
  return {
    parent_id: getNextId(),
    child_id: getNextId(),
    ...overrides,
  };
}

export function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: getNextId(),
    world_id: getNextId(),
    name: 'Test Campaign',
    summary: 'A test campaign summary',
    config: '{}',
    created_at: DEFAULT_TIMESTAMP,
    updated_at: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function buildBattleMap(overrides: Partial<BattleMap> = {}): BattleMap {
  return {
    id: getNextId(),
    world_id: getNextId(),
    name: 'Test Battle Map',
    config: '{}',
    created_at: DEFAULT_TIMESTAMP,
    updated_at: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function buildToken(overrides: Partial<Token> = {}): Token {
  return {
    id: getNextId(),
    world_id: getNextId(),
    campaign_id: null,
    grid_type: 'square',
    name: 'Test Token',
    image_src: null,
    config: '{}',
    is_visible: 1,
    created_at: DEFAULT_TIMESTAMP,
    updated_at: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function buildArc(overrides: Partial<Arc> = {}): Arc {
  return {
    id: getNextId(),
    campaign_id: getNextId(),
    name: 'Test Arc',
    sort_order: 0,
    created_at: DEFAULT_TIMESTAMP,
    updated_at: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function buildAct(overrides: Partial<Act> = {}): Act {
  return {
    id: getNextId(),
    arc_id: getNextId(),
    name: 'Test Act',
    sort_order: 0,
    created_at: DEFAULT_TIMESTAMP,
    updated_at: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function buildSession(overrides: Partial<Session> = {}): Session {
  return {
    id: getNextId(),
    act_id: getNextId(),
    name: 'Test Session',
    notes: 'Test session notes',
    planned_at: null,
    sort_order: 0,
    created_at: DEFAULT_TIMESTAMP,
    updated_at: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function buildScene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: getNextId(),
    session_id: getNextId(),
    name: 'Test Scene',
    notes: 'Test scene notes',
    payload: '{}',
    sort_order: 0,
    created_at: DEFAULT_TIMESTAMP,
    updated_at: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function buildStatBlock(overrides: Partial<StatBlock> = {}): StatBlock {
  return {
    id: getNextId(),
    world_id: getNextId(),
    campaign_id: null,
    character_id: null,
    name: 'Test Stat Block',
    default_token_id: null,
    description: 'A test stat block',
    config: '{"skills":[]}',
    created_at: DEFAULT_TIMESTAMP,
    updated_at: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function buildStatBlockTokenLink(
  overrides: Partial<StatBlockTokenLink> = {},
): StatBlockTokenLink {
  return {
    statblock_id: getNextId(),
    token_id: getNextId(),
    ...overrides,
  };
}

export function buildStatBlockAbilityAssignment(
  overrides: Partial<StatBlockAbilityAssignment> = {},
): StatBlockAbilityAssignment {
  return {
    statblock_id: getNextId(),
    ability_id: getNextId(),
    ...overrides,
  };
}
