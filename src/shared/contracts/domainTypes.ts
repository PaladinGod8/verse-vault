export interface Verse {
  id: number;
  text: string;
  reference: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
}

export interface World {
  id: number;
  name: string;
  thumbnail: string | null;
  short_description: string | null;
  last_viewed_at: string | null;
  config: string;
  created_at: string;
  updated_at: string;
}

export interface Level {
  id: number;
  world_id: number;
  name: string;
  category: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ability {
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
  range_cells: number | null;
  aoe_shape: 'circle' | 'rectangle' | 'cone' | 'line' | null;
  aoe_size_cells: number | null;
  target_type: 'tile' | 'token' | null;
  created_at: string;
  updated_at: string;
}

export interface AbilityChild {
  parent_id: number;
  child_id: number;
}

export interface Campaign {
  id: number;
  world_id: number;
  name: string;
  summary: string | null;
  config: string;
  created_at: string;
  updated_at: string;
}

export interface BattleMap {
  id: number;
  world_id: number;
  name: string;
  config: string;
  created_at: string;
  updated_at: string;
}

export type BattleMapGridMode = 'square' | 'hex' | 'none';

export interface BattleMapRuntimeGridConfig {
  mode: BattleMapGridMode;
  cellSize: number;
  originX: number;
  originY: number;
}

export interface BattleMapRuntimeMapConfig {
  imageSrc: string | null;
  backgroundColor: string;
}

export interface BattleMapRuntimeCameraConfig {
  x: number;
  y: number;
  zoom: number;
}

export interface BattleMapRuntimeConfig {
  grid: BattleMapRuntimeGridConfig;
  map: BattleMapRuntimeMapConfig;
  camera: BattleMapRuntimeCameraConfig;
  [key: string]: unknown;
}

export interface BattleMapConfig {
  runtime?: BattleMapRuntimeConfig;
  [key: string]: unknown;
}

export interface ScenePayloadRuntime {
  battlemap_id?: number | null;
  [key: string]: unknown;
}

export interface ScenePayload {
  runtime?: ScenePayloadRuntime;
  [key: string]: unknown;
}

export interface TokenImageImportPayload {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}

export interface TokenImageImportResult {
  image_src: string;
}

export type TokenGridType = 'square' | 'hex';

export interface TokenSquareFootprintCell {
  col: number;
  row: number;
}

export interface TokenHexFootprintCell {
  q: number;
  r: number;
}

export interface TokenFootprintConfig {
  version?: 1;
  grid_type?: TokenGridType;
  square_cells?: TokenSquareFootprintCell[];
  hex_cells?: TokenHexFootprintCell[];
  width_cells?: number;
  height_cells?: number;
  radius_cells?: number;
  [key: string]: unknown;
}

export interface TokenFramingConfig {
  center_x_cells?: number;
  center_y_cells?: number;
  extent_x_cells?: number;
  extent_y_cells?: number;
  max_extent_cells?: number;
  anchor_x?: number;
  anchor_y?: number;
  offset_x_px?: number;
  offset_y_px?: number;
  [key: string]: unknown;
}

export interface TokenConfigShape {
  footprint?: TokenFootprintConfig;
  framing?: TokenFramingConfig;
  [key: string]: unknown;
}

export interface Token {
  id: number;
  world_id: number;
  campaign_id: number | null;
  grid_type: TokenGridType;
  name: string;
  image_src: string | null;
  config: string;
  is_visible: number;
  created_at: string;
  updated_at: string;
}

export interface Arc {
  id: number;
  campaign_id: number;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Act {
  id: number;
  arc_id: number;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: number;
  act_id: number;
  name: string;
  notes: string | null;
  planned_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: number;
  session_id: number;
  name: string;
  notes: string | null;
  payload: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignSceneListItem extends Scene {
  session_name: string;
  act_id: number;
  act_name: string;
  arc_id: number;
  arc_name: string;
}

export interface StatBlockTokenLink {
  statblock_id: number;
  token_id: number;
}

export interface StatBlockAbilityAssignment {
  statblock_id: number;
  ability_id: number;
}

export interface StatBlockSkillValue {
  key: string;
  rank: number;
}

export interface StatBlockConfig {
  skills?: StatBlockSkillValue[];
  [key: string]: unknown;
}

export interface StatBlock {
  id: number;
  world_id: number;
  campaign_id: number | null;
  character_id: number | null;
  name: string;
  default_token_id: number | null;
  description: string | null;
  config: string;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: number;
  world_id: number;
  name: string;
  profile: string | null;
  is_player_character: number;
  owner: string | null;
  author: string | null;
  image_src: string | null;
  sections: string; // JSON text of CharacterSections
  wiki_summary: string; // JSON text of CharacterWikiSummary
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Background {
  id: number;
  world_id: number;
  name: string;
  description: string | null;
  image_src: string | null;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Faction {
  id: number;
  world_id: number;
  name: string;
  profile: string | null;
  image_src: string | null;
  sections: string; // JSON text of FactionSections
  wiki_summary: string; // JSON text of FactionWikiSummary
  type_id: number | null;
  parent_faction_id: number | null;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FactionType {
  id: number;
  world_id: number;
  name: string;
  created_at: string;
}

export interface FactionMember {
  id: number;
  faction_id: number;
  character_id: number;
  role: string;
  is_primary: number; // 0 | 1
  created_at: string;
}

export interface CharacterRelationship {
  id: number;
  character_id: number;
  related_character_id: number;
  character_label: string;
  related_label: string;
  created_at: string;
  updated_at: string;
}

export interface FactionRelationship {
  id: number;
  faction_id: number;
  related_faction_id: number;
  faction_label: string;
  related_label: string;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  id: number;
  config: string; // JSON text of AppSettingsConfig
  created_at: string;
  updated_at: string;
}
