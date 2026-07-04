/**
 * @role World-transfer table registry
 * @owns The declarative, FK-dependency-ordered list of world-scoped tables that a
 *   single-world export/import must walk, plus how to select each table's rows and
 *   which columns are foreign keys to remap on import.
 * @seam Pure data + types shared by exportWorld and importWorld; no DB or Electron
 *   imports so it is unit-testable under the Node/vitest runner.
 * @calls Nothing at runtime.
 *
 * Row *columns* are intentionally NOT enumerated here: export uses `SELECT *` and
 * import builds a dynamic `INSERT`, so columns added by future migrations travel
 * automatically. Only the FK graph and per-table row scope live in this registry.
 */
import type { MediaImageHost } from '../../shared/media/imageSource';

/** How to select a table's rows for one world during export. */
export type TableSelect =
  /** The `worlds` row itself, selected by primary key. */
  | { by: 'root'; }
  /** `WHERE world_id = ?` — table carries a direct `world_id` column. */
  | { by: 'world'; }
  /** `WHERE <column> IN (<already-collected parent ids>)` — no direct world_id. */
  | { by: 'parent'; parentTable: string; column: string; };

export interface TableForeignKey {
  /** Column holding the foreign key. */
  column: string;
  /** Registry table the key points at. */
  references: string;
  /**
   * True when the target may not yet be inserted at this row's insert time
   * (self-referential within the same table). Resolved by a second UPDATE pass.
   */
  deferred?: boolean;
}

export interface TableJsonForeignKey {
  /** JSON-text column that embeds a foreign key. */
  column: string;
  /** Object path to the numeric id inside the parsed JSON. */
  path: string[];
  /** Registry table the embedded id points at. */
  references: string;
}

export interface TableMedia {
  /** Column holding a `vv-media://` URL (image_src / thumbnail). */
  column: string;
  /** Media protocol host, i.e. the on-disk `userData/<host>` folder. */
  host: MediaImageHost;
}

export interface WorldTableSpec {
  name: string;
  select: TableSelect;
  foreignKeys?: TableForeignKey[];
  jsonForeignKeys?: TableJsonForeignKey[];
  media?: TableMedia;
  /** `world_maps` only: its `storage_key` points at a `.map.gz` snapshot file. */
  snapshot?: boolean;
}

/** Tables that are app-wide or not world-scoped and never travel with a world. */
export const EXCLUDED_TABLES = ['app_settings', 'verses'] as const;

const worldFk: TableForeignKey = { column: 'world_id', references: 'worlds' };

/**
 * Ordered parents-before-children so import can insert top-down while building an
 * old->new id map per table and remapping each row's FK columns as it goes.
 */
export const WORLD_TABLE_REGISTRY: WorldTableSpec[] = [
  { name: 'worlds', select: { by: 'root' }, media: { column: 'thumbnail', host: 'world-images' } },

  { name: 'levels', select: { by: 'world' }, foreignKeys: [worldFk] },
  { name: 'campaigns', select: { by: 'world' }, foreignKeys: [worldFk] },
  { name: 'battlemaps', select: { by: 'world' }, foreignKeys: [worldFk] },
  {
    name: 'tokens',
    select: { by: 'world' },
    foreignKeys: [worldFk, { column: 'campaign_id', references: 'campaigns' }],
    media: { column: 'image_src', host: 'token-images' },
  },
  {
    name: 'abilities',
    select: { by: 'world' },
    foreignKeys: [worldFk, { column: 'level_id', references: 'levels' }],
  },
  {
    name: 'characters',
    select: { by: 'world' },
    foreignKeys: [worldFk],
    media: { column: 'image_src', host: 'character-images' },
  },
  { name: 'faction_types', select: { by: 'world' }, foreignKeys: [worldFk] },
  {
    name: 'factions',
    select: { by: 'world' },
    foreignKeys: [
      worldFk,
      { column: 'type_id', references: 'faction_types' },
      { column: 'parent_faction_id', references: 'factions', deferred: true },
    ],
    media: { column: 'image_src', host: 'faction-images' },
  },
  {
    name: 'backgrounds',
    select: { by: 'world' },
    foreignKeys: [worldFk],
    media: { column: 'image_src', host: 'background-images' },
  },
  {
    name: 'items',
    select: { by: 'world' },
    foreignKeys: [worldFk],
    media: { column: 'image_src', host: 'item-images' },
  },
  {
    name: 'lore_notes',
    select: { by: 'world' },
    foreignKeys: [worldFk],
    media: { column: 'image_src', host: 'lore-note-images' },
  },
  {
    name: 'lore_note_tags',
    select: { by: 'world' },
    foreignKeys: [worldFk, { column: 'lore_note_id', references: 'lore_notes' }],
  },
  {
    name: 'campaign_notes',
    select: { by: 'world' },
    foreignKeys: [worldFk, { column: 'campaign_id', references: 'campaigns' }],
  },
  {
    name: 'campaign_note_tags',
    select: { by: 'world' },
    foreignKeys: [
      worldFk,
      { column: 'campaign_id', references: 'campaigns' },
      { column: 'campaign_note_id', references: 'campaign_notes' },
    ],
  },
  { name: 'world_maps', select: { by: 'world' }, foreignKeys: [worldFk], snapshot: true },
  {
    name: 'statblocks',
    select: { by: 'world' },
    foreignKeys: [
      worldFk,
      { column: 'campaign_id', references: 'campaigns' },
      { column: 'character_id', references: 'characters' },
      { column: 'default_token_id', references: 'tokens' },
    ],
  },

  {
    name: 'ability_children',
    select: { by: 'parent', parentTable: 'abilities', column: 'parent_id' },
    foreignKeys: [
      { column: 'parent_id', references: 'abilities' },
      { column: 'child_id', references: 'abilities' },
    ],
  },
  {
    name: 'arcs',
    select: { by: 'parent', parentTable: 'campaigns', column: 'campaign_id' },
    foreignKeys: [{ column: 'campaign_id', references: 'campaigns' }],
  },
  {
    name: 'acts',
    select: { by: 'parent', parentTable: 'arcs', column: 'arc_id' },
    foreignKeys: [{ column: 'arc_id', references: 'arcs' }],
  },
  {
    name: 'sessions',
    select: { by: 'parent', parentTable: 'acts', column: 'act_id' },
    foreignKeys: [{ column: 'act_id', references: 'acts' }],
  },
  {
    name: 'scenes',
    select: { by: 'parent', parentTable: 'sessions', column: 'session_id' },
    foreignKeys: [{ column: 'session_id', references: 'sessions' }],
    jsonForeignKeys: [
      { column: 'payload', path: ['runtime', 'battlemap_id'], references: 'battlemaps' },
    ],
  },
  {
    name: 'faction_members',
    select: { by: 'parent', parentTable: 'factions', column: 'faction_id' },
    foreignKeys: [
      { column: 'faction_id', references: 'factions' },
      { column: 'character_id', references: 'characters' },
    ],
  },
  {
    name: 'character_relationships',
    select: { by: 'parent', parentTable: 'characters', column: 'character_id' },
    foreignKeys: [
      { column: 'character_id', references: 'characters' },
      { column: 'related_character_id', references: 'characters' },
    ],
  },
  {
    name: 'faction_relationships',
    select: { by: 'parent', parentTable: 'factions', column: 'faction_id' },
    foreignKeys: [
      { column: 'faction_id', references: 'factions' },
      { column: 'related_faction_id', references: 'factions' },
    ],
  },
  {
    name: 'statblock_token_links',
    select: { by: 'parent', parentTable: 'statblocks', column: 'statblock_id' },
    foreignKeys: [
      { column: 'statblock_id', references: 'statblocks' },
      { column: 'token_id', references: 'tokens' },
    ],
  },
  {
    name: 'statblock_ability_assignments',
    select: { by: 'parent', parentTable: 'statblocks', column: 'statblock_id' },
    foreignKeys: [
      { column: 'statblock_id', references: 'statblocks' },
      { column: 'ability_id', references: 'abilities' },
    ],
  },
];
