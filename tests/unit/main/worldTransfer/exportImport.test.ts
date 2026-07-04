/* eslint-disable max-lines */
import type Database from 'better-sqlite3';
import { unzipSync, zipSync } from 'fflate';
import { describe, expect, it, vi } from 'vitest';
import { exportWorld } from '../../../../src/main/worldTransfer/exportWorld';
import { importWorld } from '../../../../src/main/worldTransfer/importWorld';
import { WorldImportError } from '../../../../src/main/worldTransfer/manifest';

const TIMESTAMPS = {
  created_at: '2026-07-04 10:00:00',
  updated_at: '2026-07-04 10:00:00',
};
type TableRow = Record<string, unknown>;
type FakeDb = Database.Database & {
  tables: Record<string, TableRow[]>;
  nextIds: Record<string, number>;
};

const TABLE_NAMES = [
  'worlds',
  'levels',
  'campaigns',
  'battlemaps',
  'tokens',
  'abilities',
  'characters',
  'faction_types',
  'factions',
  'backgrounds',
  'items',
  'lore_notes',
  'lore_note_tags',
  'campaign_notes',
  'campaign_note_tags',
  'world_maps',
  'statblocks',
  'ability_children',
  'arcs',
  'acts',
  'sessions',
  'scenes',
  'faction_members',
  'character_relationships',
  'faction_relationships',
  'statblock_token_links',
  'statblock_ability_assignments',
] as const;

function createWorldTransferDb(): FakeDb {
  const tables = Object.fromEntries(TABLE_NAMES.map((name) => [name, [] as TableRow[]])) as Record<
    string,
    TableRow[]
  >;
  const nextIds = Object.fromEntries(TABLE_NAMES.map((name) => [name, 1])) as Record<
    string,
    number
  >;

  const db = {
    tables,
    nextIds,
    prepare(sql: string) {
      const normalizedSql = sql.replace(/\s+/g, ' ').trim();
      return {
        get: (...args: unknown[]) => executeSelectOne(tables, normalizedSql, args),
        all: (...args: unknown[]) => executeSelectMany(tables, normalizedSql, args),
        run: (...args: unknown[]) => executeWrite(tables, nextIds, normalizedSql, args),
      };
    },
    transaction(callback: (...args: unknown[]) => unknown) {
      return (...args: unknown[]) => callback(...args);
    },
  } as FakeDb;

  return db;
}

function executeSelectOne(
  tables: Record<string, TableRow[]>,
  sql: string,
  args: unknown[],
): TableRow | undefined {
  const rows = executeSelectMany(tables, sql, args);
  return rows[0];
}

function executeSelectMany(
  tables: Record<string, TableRow[]>,
  sql: string,
  args: unknown[],
): TableRow[] {
  const byIdMatch = sql.match(/^SELECT \* FROM (\w+) WHERE id = \?$/);
  if (byIdMatch) {
    return tables[byIdMatch[1]].filter((row) => row.id === args[0]).map(cloneRow);
  }

  const byWorldMatch = sql.match(/^SELECT \* FROM (\w+) WHERE world_id = \?$/);
  if (byWorldMatch) {
    return tables[byWorldMatch[1]].filter((row) => row.world_id === args[0]).map(cloneRow);
  }

  const byParentMatch = sql.match(/^SELECT \* FROM (\w+) WHERE (\w+) IN \((.+)\)$/);
  if (byParentMatch) {
    const [, table, column] = byParentMatch;
    const allowed = new Set(args);
    return tables[table].filter((row) => allowed.has(row[column])).map(cloneRow);
  }

  throw new Error(`Unsupported SELECT in fake DB: ${sql}`);
}

function executeWrite(
  tables: Record<string, TableRow[]>,
  nextIds: Record<string, number>,
  sql: string,
  args: unknown[],
): { changes: number; lastInsertRowid: number; } {
  const insertMatch = sql.match(/^INSERT INTO (\w+) \((.+)\) VALUES \((.+)\)$/);
  if (insertMatch) {
    const [, table, columnsRaw] = insertMatch;
    const columns = columnsRaw.split(', ').map((column) => column.trim());
    const row = Object.fromEntries(columns.map((column, index) => [column, args[index]]));
    const id = nextIds[table];
    nextIds[table] += 1;
    tables[table].push({ id, ...row });
    return { changes: 1, lastInsertRowid: id };
  }

  const updateMatch = sql.match(/^UPDATE (\w+) SET (\w+) = \? WHERE id = \?$/);
  if (updateMatch) {
    const [, table, column] = updateMatch;
    const row = tables[table].find((entry) => entry.id === args[1]);
    if (row) {
      row[column] = args[0];
      return { changes: 1, lastInsertRowid: Number(args[1]) };
    }
    return { changes: 0, lastInsertRowid: 0 };
  }

  throw new Error(`Unsupported write in fake DB: ${sql}`);
}

function cloneRow<T extends TableRow>(row: T): T {
  return JSON.parse(JSON.stringify(row)) as T;
}

function insertRow(db: FakeDb, table: string, row: Record<string, unknown>): void {
  db.tables[table].push(cloneRow(row));
  if (typeof row.id === 'number') {
    db.nextIds[table] = Math.max(db.nextIds[table], row.id + 1);
  }
}

function seedWorldGraph(db: FakeDb, worldId = 1, name = 'Alpha'): void {
  insertRow(db, 'worlds', {
    id: worldId,
    name,
    thumbnail: 'vv-media://world-images/world.png',
    short_description: 'Export me',
    config: '{}',
    last_viewed_at: null,
    ...TIMESTAMPS,
  });
  insertRow(db, 'levels', {
    id: 10,
    world_id: worldId,
    name: 'Level One',
    category: 'Tier',
    description: null,
    ...TIMESTAMPS,
  });
  insertRow(db, 'campaigns', {
    id: 20,
    world_id: worldId,
    name: 'Campaign One',
    summary: null,
    config: '{}',
    ...TIMESTAMPS,
  });
  insertRow(db, 'battlemaps', {
    id: 30,
    world_id: worldId,
    name: 'Arena',
    config: '{}',
    ...TIMESTAMPS,
  });
  insertRow(db, 'tokens', {
    id: 40,
    world_id: worldId,
    campaign_id: 20,
    grid_type: 'square',
    name: 'Wolf',
    image_src: 'vv-media://token-images/token.png',
    config: '{}',
    is_visible: 1,
    ...TIMESTAMPS,
  });
  insertRow(db, 'abilities', {
    id: 50,
    world_id: worldId,
    name: 'Slash',
    description: null,
    type: 'active',
    passive_subtype: null,
    level_id: 10,
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
    ...TIMESTAMPS,
  });
  insertRow(db, 'abilities', {
    id: 51,
    world_id: worldId,
    name: 'Parry',
    description: null,
    type: 'active',
    passive_subtype: null,
    level_id: 10,
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
    ...TIMESTAMPS,
  });
  insertRow(db, 'characters', {
    id: 60,
    world_id: worldId,
    name: 'Hero',
    profile: null,
    is_player_character: 0,
    owner: null,
    author: null,
    image_src: 'vv-media://character-images/hero.png',
    sections: '[]',
    wiki_summary: '{}',
    last_viewed_at: null,
    ...TIMESTAMPS,
  });
  insertRow(db, 'characters', {
    id: 61,
    world_id: worldId,
    name: 'Rival',
    profile: null,
    is_player_character: 0,
    owner: null,
    author: null,
    image_src: null,
    sections: '[]',
    wiki_summary: '{}',
    last_viewed_at: null,
    ...TIMESTAMPS,
  });
  insertRow(db, 'faction_types', {
    id: 70,
    world_id: worldId,
    name: 'Guild',
    created_at: TIMESTAMPS.created_at,
  });
  insertRow(db, 'factions', {
    id: 80,
    world_id: worldId,
    name: 'Parent Guild',
    profile: null,
    image_src: 'vv-media://faction-images/parent.png',
    sections: '[]',
    wiki_summary: '{}',
    type_id: 70,
    parent_faction_id: null,
    last_viewed_at: null,
    ...TIMESTAMPS,
  });
  insertRow(db, 'factions', {
    id: 81,
    world_id: worldId,
    name: 'Child Guild',
    profile: null,
    image_src: 'vv-media://faction-images/child.png',
    sections: '[]',
    wiki_summary: '{}',
    type_id: 70,
    parent_faction_id: 80,
    last_viewed_at: null,
    ...TIMESTAMPS,
  });
  insertRow(db, 'backgrounds', {
    id: 90,
    world_id: worldId,
    name: 'Scholar',
    description: null,
    image_src: 'vv-media://background-images/background.png',
    last_viewed_at: null,
    ...TIMESTAMPS,
  });
  insertRow(db, 'items', {
    id: 100,
    world_id: worldId,
    name: 'Lantern',
    description: null,
    image_src: 'vv-media://item-images/item.png',
    last_viewed_at: null,
    ...TIMESTAMPS,
  });
  insertRow(db, 'lore_notes', {
    id: 110,
    world_id: worldId,
    name: 'Lore',
    content: 'Secrets',
    image_src: 'vv-media://lore-note-images/lore.png',
    canvas_enabled: 0,
    canvas_scene: null,
    canvas_preview_image: null,
    tags: '[]',
    last_viewed_at: null,
    ...TIMESTAMPS,
  });
  insertRow(db, 'lore_note_tags', {
    id: 111,
    world_id: worldId,
    lore_note_id: 110,
    tag: 'ancient',
  });
  insertRow(db, 'campaign_notes', {
    id: 120,
    world_id: worldId,
    campaign_id: 20,
    name: 'Prep',
    canvas_scene: null,
    canvas_preview_image: null,
    ...TIMESTAMPS,
  });
  insertRow(db, 'campaign_note_tags', {
    id: 121,
    world_id: worldId,
    campaign_id: 20,
    campaign_note_id: 120,
    tag: 'todo',
  });
  insertRow(db, 'world_maps', {
    id: 130,
    world_id: worldId,
    map_name: 'Alpha Map',
    storage_key: 'world-map-130.map.gz',
    generator_version: '1.0.0',
    ...TIMESTAMPS,
  });
  insertRow(db, 'statblocks', {
    id: 140,
    world_id: worldId,
    campaign_id: 20,
    character_id: 60,
    default_token_id: 40,
    name: 'Goblin',
    description: null,
    config: '{}',
    ...TIMESTAMPS,
  });
  insertRow(db, 'ability_children', { id: 141, parent_id: 50, child_id: 51 });
  insertRow(db, 'arcs', {
    id: 150,
    campaign_id: 20,
    name: 'Arc One',
    sort_order: 0,
    ...TIMESTAMPS,
  });
  insertRow(db, 'acts', {
    id: 160,
    arc_id: 150,
    name: 'Act One',
    sort_order: 0,
    ...TIMESTAMPS,
  });
  insertRow(db, 'sessions', {
    id: 170,
    act_id: 160,
    name: 'Session One',
    notes: null,
    planned_at: null,
    sort_order: 0,
    ...TIMESTAMPS,
  });
  insertRow(db, 'scenes', {
    id: 180,
    session_id: 170,
    name: 'Scene One',
    notes: null,
    payload: '{"runtime":{"battlemap_id":30}}',
    sort_order: 0,
    ...TIMESTAMPS,
  });
  insertRow(db, 'faction_members', {
    id: 190,
    faction_id: 80,
    character_id: 60,
    role: 'leader',
    is_primary: 1,
    created_at: TIMESTAMPS.created_at,
  });
  insertRow(db, 'character_relationships', {
    id: 200,
    character_id: 60,
    related_character_id: 61,
    character_label: 'ally',
    related_label: 'friend',
    ...TIMESTAMPS,
  });
  insertRow(db, 'faction_relationships', {
    id: 210,
    faction_id: 80,
    related_faction_id: 81,
    faction_label: 'parent',
    related_label: 'child',
    ...TIMESTAMPS,
  });
  insertRow(db, 'statblock_token_links', { id: 220, statblock_id: 140, token_id: 40 });
  insertRow(db, 'statblock_ability_assignments', {
    id: 230,
    statblock_id: 140,
    ability_id: 50,
  });
}

function buildMediaReader() {
  const mediaFiles: Record<string, Buffer> = {
    'world-images/world.png': Buffer.from('world-image'),
    'token-images/token.png': Buffer.from('token-image'),
    'character-images/hero.png': Buffer.from('character-image'),
    'faction-images/parent.png': Buffer.from('parent-faction-image'),
    'faction-images/child.png': Buffer.from('child-faction-image'),
    'background-images/background.png': Buffer.from('background-image'),
    'item-images/item.png': Buffer.from('item-image'),
    'lore-note-images/lore.png': Buffer.from('lore-image'),
  };

  return {
    readMedia(host: string, fileName: string) {
      return mediaFiles[`${host}/${fileName}`] ?? null;
    },
    readSnapshot(storageKey: string) {
      return storageKey === 'world-map-130.map.gz' ? Buffer.from('snapshot') : null;
    },
  };
}

describe('worldTransfer export/import', () => {
  it('exports one world with scoped rows, media, and snapshot files', () => {
    const db = createWorldTransferDb();
    seedWorldGraph(db, 1, 'Alpha');
    insertRow(db, 'worlds', {
      id: 2,
      name: 'Beta',
      thumbnail: null,
      short_description: null,
      config: '{}',
      last_viewed_at: null,
      ...TIMESTAMPS,
    });
    insertRow(db, 'backgrounds', {
      id: 901,
      world_id: 2,
      name: 'Ignored',
      description: null,
      image_src: null,
      last_viewed_at: null,
      ...TIMESTAMPS,
    });

    const result = exportWorld(db, 1, buildMediaReader(), '1.2.3');
    const files = unzipSync(result.zip);
    const manifest = JSON.parse(new TextDecoder().decode(files['manifest.json']));
    const data = JSON.parse(new TextDecoder().decode(files['data.json'])) as {
      tables: Record<string, Array<Record<string, unknown>>>;
    };

    expect(result.worldName).toBe('Alpha');
    expect(manifest.app).toBe('Verse Vault 1.2.3');
    expect(manifest.worldName).toBe('Alpha');
    expect(data.tables.worlds).toHaveLength(1);
    expect(data.tables.backgrounds).toHaveLength(1);
    expect(data.tables.scenes[0].payload).toBe('{"runtime":{"battlemap_id":30}}');
    expect(data.tables.worlds[0].name).toBe('Alpha');
    expect(files['media/world-images/world.png']).toBeInstanceOf(Uint8Array);
    expect(files['media/background-images/background.png']).toBeInstanceOf(Uint8Array);
    expect(files['world-maps/world-map-130.map.gz']).toBeInstanceOf(Uint8Array);
  });

  it('exports sparse worlds and skips empty parent/media branches', () => {
    const db = createWorldTransferDb();
    insertRow(db, 'worlds', {
      id: 5,
      name: 'Sparse',
      thumbnail: null,
      short_description: null,
      config: '{}',
      last_viewed_at: null,
      ...TIMESTAMPS,
    });

    const result = exportWorld(db, 5, buildMediaReader(), '1.0.0');
    const data = JSON.parse(new TextDecoder().decode(unzipSync(result.zip)['data.json'])) as {
      tables: Record<string, Array<Record<string, unknown>>>;
    };

    expect(data.tables.worlds).toHaveLength(1);
    expect(data.tables.backgrounds).toEqual([]);
    expect(data.tables.scenes).toEqual([]);
  });

  it('omits unreadable files during export and de-duplicates repeated asset refs', () => {
    const db = createWorldTransferDb();
    seedWorldGraph(db, 1, 'Alpha');
    insertRow(db, 'backgrounds', {
      id: 91,
      world_id: 1,
      name: 'Scholar Copy',
      description: null,
      image_src: 'vv-media://background-images/background.png',
      last_viewed_at: null,
      ...TIMESTAMPS,
    });

    const result = exportWorld(
      db,
      1,
      {
        readMedia(host: string, fileName: string) {
          if (host === 'world-images') {
            return null;
          }
          return buildMediaReader().readMedia(host, fileName);
        },
        readSnapshot() {
          return null;
        },
      },
      '1.0.0',
    );
    const files = unzipSync(result.zip);

    expect(files['media/world-images/world.png']).toBeUndefined();
    expect(files['world-maps/world-map-130.map.gz']).toBeUndefined();
    expect(files['media/background-images/background.png']).toBeInstanceOf(Uint8Array);
  });

  it('rejects invalid or unknown world ids during export', () => {
    const db = createWorldTransferDb();

    expect(() => exportWorld(db, 0, buildMediaReader(), '1.0.0'))
      .toThrowError('Export requires a valid world id');
    expect(() => exportWorld(db, 99, buildMediaReader(), '1.0.0'))
      .toThrowError('World 99 not found');
  });

  it('imports a bundle as a new world, remaps FKs, and rewrites files', () => {
    const sourceDb = createWorldTransferDb();
    seedWorldGraph(sourceDb, 1, 'Alpha');
    const exported = exportWorld(sourceDb, 1, buildMediaReader(), '1.0.0');

    const destDb = createWorldTransferDb();
    seedWorldGraph(destDb, 1, 'Alpha');
    insertRow(destDb, 'worlds', {
      id: 2,
      name: 'Existing',
      thumbnail: null,
      short_description: null,
      config: '{}',
      last_viewed_at: null,
      ...TIMESTAMPS,
    });

    const writtenMedia: string[] = [];
    const writtenSnapshots: string[] = [];
    const imported = importWorld(
      destDb,
      exported.zip,
      {
        writeMedia(host: string, originalFileName: string) {
          const fileName = `imported-${writtenMedia.length + 1}-${originalFileName}`;
          writtenMedia.push(`${host}/${fileName}`);
          return `vv-media://${host}/${encodeURIComponent(fileName)}`;
        },
        writeSnapshot(worldMapId: number) {
          const key = `imported-${worldMapId}.map.gz`;
          writtenSnapshots.push(key);
          return key;
        },
      },
      (candidate) => destDb.tables.worlds.some((row) => row.name === candidate),
    );

    expect(imported.worldName).toBe('Alpha (imported)');
    expect(imported.worldId).toBeGreaterThan(2);
    expect(writtenMedia).not.toHaveLength(0);
    expect(writtenSnapshots).toHaveLength(1);

    const importedWorld = destDb.tables.worlds.find((row) => row.id === imported.worldId) as
      | { name: string; thumbnail: string | null; }
      | undefined;
    expect(importedWorld?.name).toBe('Alpha (imported)');
    expect(importedWorld?.thumbnail).toContain('vv-media://world-images/imported-');

    const importedFactions = destDb.tables.factions.filter(
      (row) => row.world_id === imported.worldId,
    ) as Array<{ id: number; name: string; parent_faction_id: number | null; }>;
    const parentFaction = importedFactions.find((row) => row.name === 'Parent Guild');
    const childFaction = importedFactions.find((row) => row.name === 'Child Guild');
    expect(parentFaction).toBeDefined();
    expect(childFaction?.parent_faction_id).toBe(parentFaction?.id);

    const importedBattleMap = destDb.tables.battlemaps.find(
      (row) => row.world_id === imported.worldId,
    ) as { id: number; };
    const importedScene = destDb.tables.scenes.at(-1) as { payload: string; };
    expect(JSON.parse(importedScene.payload).runtime.battlemap_id).toBe(importedBattleMap.id);

    const importedWorldMap = destDb.tables.world_maps.find(
      (row) => row.world_id === imported.worldId,
    ) as { storage_key: string; };
    expect(importedWorldMap.storage_key).toBe(writtenSnapshots[0]);
  });

  it('drops missing media references and tolerates missing snapshots on import', () => {
    const sourceDb = createWorldTransferDb();
    seedWorldGraph(sourceDb, 1, 'Alpha');
    const exported = exportWorld(sourceDb, 1, buildMediaReader(), '1.0.0');
    const files = unzipSync(exported.zip);
    delete files['media/background-images/background.png'];
    delete files['world-maps/world-map-130.map.gz'];

    const destDb = createWorldTransferDb();
    const imported = importWorld(
      destDb,
      zipSync(files),
      {
        writeMedia(host: string, originalFileName: string) {
          return `vv-media://${host}/${originalFileName}`;
        },
        writeSnapshot(worldMapId: number) {
          return `unused-${worldMapId}.map.gz`;
        },
      },
      () => false,
    );

    const importedBackground = destDb.tables.backgrounds.find(
      (row) => row.world_id === imported.worldId,
    ) as { image_src: string | null; };
    const importedWorldMap = destDb.tables.world_maps.find(
      (row) => row.world_id === imported.worldId,
    ) as { storage_key: string; };

    expect(importedBackground.image_src).toBeNull();
    expect(importedWorldMap.storage_key).toBe('world-map-130.map.gz');
  });

  it('uses numbered imported names when base imported name is also taken', () => {
    const sourceDb = createWorldTransferDb();
    seedWorldGraph(sourceDb, 1, 'Alpha');
    const exported = exportWorld(sourceDb, 1, buildMediaReader(), '1.0.0');

    const destDb = createWorldTransferDb();
    insertRow(destDb, 'worlds', {
      id: 1,
      name: 'Alpha',
      thumbnail: null,
      short_description: null,
      config: '{}',
      last_viewed_at: null,
      ...TIMESTAMPS,
    });
    insertRow(destDb, 'worlds', {
      id: 2,
      name: 'Alpha (imported)',
      thumbnail: null,
      short_description: null,
      config: '{}',
      last_viewed_at: null,
      ...TIMESTAMPS,
    });

    const imported = importWorld(
      destDb,
      exported.zip,
      {
        writeMedia(host: string, originalFileName: string) {
          return `vv-media://${host}/${originalFileName}`;
        },
        writeSnapshot(worldMapId: number) {
          return `world-map-${worldMapId}.map.gz`;
        },
      },
      (candidate) => destDb.tables.worlds.some((row) => row.name === candidate),
    );

    expect(imported.worldName).toBe('Alpha (imported 2)');
  });

  it('falls back to timestamped imported names after repeated collisions', () => {
    const sourceDb = createWorldTransferDb();
    seedWorldGraph(sourceDb, 1, 'Alpha');
    const exported = exportWorld(sourceDb, 1, buildMediaReader(), '1.0.0');
    const db = createWorldTransferDb();
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(12345);

    try {
      const imported = importWorld(
        db,
        exported.zip,
        {
          writeMedia(host: string, originalFileName: string) {
            return `vv-media://${host}/${originalFileName}`;
          },
          writeSnapshot(worldMapId: number) {
            return `world-map-${worldMapId}.map.gz`;
          },
        },
        () => true,
      );

      expect(imported.worldName).toBe('Alpha (imported 12345)');
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('rejects malformed bundles during import', () => {
    const emptyZip = zipSync({});
    const noDataZip = zipSync({
      'manifest.json': new TextEncoder().encode(JSON.stringify({ formatVersion: 1 })),
    });
    const corruptDataZip = zipSync({
      'manifest.json': new TextEncoder().encode(JSON.stringify({ formatVersion: 1 })),
      'data.json': new TextEncoder().encode('{bad json'),
    });
    const futureManifestZip = zipSync({
      'manifest.json': new TextEncoder().encode(JSON.stringify({ formatVersion: 999 })),
      'data.json': new TextEncoder().encode(
        JSON.stringify({ tables: { worlds: [{ id: 1, name: 'Alpha' }] } }),
      ),
    });
    const multiWorldZip = zipSync({
      'manifest.json': new TextEncoder().encode(JSON.stringify({ formatVersion: 1 })),
      'data.json': new TextEncoder().encode(JSON.stringify({
        tables: {
          worlds: [{ id: 1, name: 'Alpha' }, { id: 2, name: 'Beta' }],
        },
      })),
    });

    const db = createWorldTransferDb();
    const writer = {
      writeMedia(host: string, originalFileName: string) {
        void host;
        void originalFileName;
        return 'vv-media://world-images/test.png';
      },
      writeSnapshot(worldMapId: number) {
        void worldMapId;
        return 'world-map-1.map.gz';
      },
    };

    expect(() => importWorld(db, emptyZip, writer, () => false))
      .toThrowError(WorldImportError);
    expect(() => importWorld(db, noDataZip, writer, () => false))
      .toThrowError('The world bundle is missing its data file.');
    expect(() => importWorld(db, corruptDataZip, writer, () => false))
      .toThrowError('The world bundle data file is corrupt (invalid JSON).');
    expect(() => importWorld(db, futureManifestZip, writer, () => false))
      .toThrowError(
        'This world was exported by a newer version of Verse Vault. Please update the app and try again.',
      );
    expect(() => importWorld(db, multiWorldZip, writer, () => false))
      .toThrowError('The world bundle does not contain exactly one world.');
  });
});
