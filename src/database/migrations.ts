import type Database from 'better-sqlite3';
import { runBackgroundsSchemaMigration } from './backgroundMigrations';
import { runItemsSchemaMigration } from './itemMigrations';
import { runLegacyShapeMigrations } from './legacyShapeMigrations';
import { runLoreNotesSchemaMigration } from './loreNoteMigrations';
import { runOfflineMediaImageMigration } from './offlineMediaImageMigration';
import { runRelationshipMigrations } from './relationshipMigrations';
import { ensureTokenIndexes } from './tokenIndexMigrations';

/**
 * Runs all additive, idempotent schema migrations in the order they must apply against a
 * legacy database. Order is load-bearing â€” do not reorder without verifying against a real
 * upgraded user database, not just fresh-DB tests.
 */
export function runMigrations(db: Database.Database): void {
  runLegacyShapeMigrations(db);
  ensureTokenIndexes(db);
  runStatBlocksSchemaMigration(db);
  runStatBlockLinkageSchemaMigration(db);
  runWorldConfigMigration(db);
  runCharactersSchemaMigration(db);
  runBackgroundsSchemaMigration(db);
  runItemsSchemaMigration(db);
  runLoreNotesSchemaMigration(db);
  runFactionTypesSchemaMigration(db);
  runFactionsSchemaMigration(db);
  runFactionsLastViewedMigration(db);
  runFactionMembersSchemaMigration(db);
  runRelationshipMigrations(db);
  ensureCharacterNameIndex(db);
  runOfflineMediaImageMigration(db);
}

function runFactionTypesSchemaMigration(db: Database.Database): void {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS faction_types (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        world_id   INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
        name       TEXT    NOT NULL,
        created_at TEXT    NOT NULL DEFAULT (datetime('now')),
        UNIQUE(world_id, name)
      );
    `);
  } catch (err) {
    console.error('[db] Error running faction types schema migration:', err);
    throw err;
  }
}

function runFactionsSchemaMigration(db: Database.Database): void {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS factions (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        world_id          INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
        name              TEXT    NOT NULL,
        profile           TEXT,
        image_src         TEXT,
        sections          TEXT    NOT NULL DEFAULT '{}',
        wiki_summary      TEXT    NOT NULL DEFAULT '{}',
        type_id           INTEGER REFERENCES faction_types(id) ON DELETE SET NULL,
        parent_faction_id INTEGER REFERENCES factions(id) ON DELETE SET NULL,
        last_viewed_at    TEXT,
        created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_factions_world_id ON factions(world_id);
      CREATE INDEX IF NOT EXISTS idx_factions_type_id ON factions(type_id);
      CREATE INDEX IF NOT EXISTS idx_factions_parent_faction_id ON factions(parent_faction_id);
    `);
  } catch (err) {
    console.error('[db] Error running factions schema migration:', err);
    throw err;
  }
}

function runFactionsLastViewedMigration(db: Database.Database): void {
  const cols = db.pragma('table_info(factions)') as Array<{ name: string; }>;
  if (Array.isArray(cols) && cols.length > 0 && !cols.some((c) => c.name === 'last_viewed_at')) {
    db.exec('ALTER TABLE factions ADD COLUMN last_viewed_at TEXT');
  }
}

function runFactionMembersSchemaMigration(db: Database.Database): void {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS faction_members (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        faction_id   INTEGER NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
        character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        role         TEXT    NOT NULL,
        is_primary   INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
        created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_faction_members_faction_id ON faction_members(faction_id);
      CREATE INDEX IF NOT EXISTS idx_faction_members_character_id ON faction_members(character_id);
    `);
  } catch (err) {
    console.error('[db] Error running faction members schema migration:', err);
    throw err;
  }
}

function runCharactersSchemaMigration(db: Database.Database): void {
  const cols = db.pragma('table_info(characters)') as Array<{ name: string; }>;
  if (!cols || !Array.isArray(cols)) {
    return;
  }

  const addColumn = (columnName: string, sql: string) => {
    if (!cols.some((c) => c.name === columnName)) {
      db.exec(sql);
    }
  };

  addColumn(
    'world_id',
    'ALTER TABLE characters ADD COLUMN world_id INTEGER REFERENCES worlds(id) ON DELETE CASCADE',
  );
  addColumn('name', "ALTER TABLE characters ADD COLUMN name TEXT NOT NULL DEFAULT ''");
  addColumn('profile', 'ALTER TABLE characters ADD COLUMN profile TEXT');
  addColumn(
    'is_player_character',
    'ALTER TABLE characters ADD COLUMN is_player_character INTEGER NOT NULL DEFAULT 0 CHECK (is_player_character IN (0, 1))',
  );
  addColumn('owner', 'ALTER TABLE characters ADD COLUMN owner TEXT');
  addColumn('author', 'ALTER TABLE characters ADD COLUMN author TEXT');
  addColumn('image_src', 'ALTER TABLE characters ADD COLUMN image_src TEXT');
  addColumn('sections', "ALTER TABLE characters ADD COLUMN sections TEXT NOT NULL DEFAULT '{}'");
  addColumn(
    'wiki_summary',
    "ALTER TABLE characters ADD COLUMN wiki_summary TEXT NOT NULL DEFAULT '{}'",
  );
  addColumn('last_viewed_at', 'ALTER TABLE characters ADD COLUMN last_viewed_at TEXT');

  db.exec('CREATE INDEX IF NOT EXISTS idx_characters_world_id ON characters(world_id)');
}

function runStatBlocksSchemaMigration(db: Database.Database): void {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS statblocks (
        id                    INTEGER PRIMARY KEY AUTOINCREMENT,
        world_id              INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
        campaign_id           INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
        character_id          INTEGER REFERENCES characters(id) ON DELETE CASCADE,
        name                  TEXT NOT NULL,
        default_token_id      INTEGER REFERENCES tokens(id) ON DELETE SET NULL,
        description           TEXT,
        config                TEXT NOT NULL DEFAULT '{}',
        created_at            TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_statblocks_world_id ON statblocks(world_id);
      CREATE INDEX IF NOT EXISTS idx_statblocks_campaign_id ON statblocks(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_statblocks_character_id ON statblocks(character_id);
      CREATE INDEX IF NOT EXISTS idx_statblocks_default_token_id ON statblocks(default_token_id);
    `);
  } catch (err) {
    console.error('[db] Error running statblocks schema migration:', err);
    throw err;
  }
}

function runStatBlockLinkageSchemaMigration(db: Database.Database): void {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS statblock_token_links (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        statblock_id INTEGER NOT NULL REFERENCES statblocks(id) ON DELETE CASCADE,
        token_id     INTEGER NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
        created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
        UNIQUE (token_id),
        UNIQUE (statblock_id, token_id)
      );

      CREATE INDEX IF NOT EXISTS idx_statblock_token_links_statblock_id
        ON statblock_token_links(statblock_id);
      CREATE INDEX IF NOT EXISTS idx_statblock_token_links_token_id
        ON statblock_token_links(token_id);

      CREATE TABLE IF NOT EXISTS statblock_ability_assignments (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        statblock_id INTEGER NOT NULL REFERENCES statblocks(id) ON DELETE CASCADE,
        ability_id   INTEGER NOT NULL REFERENCES abilities(id) ON DELETE CASCADE,
        created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
        UNIQUE (statblock_id, ability_id)
      );

      CREATE INDEX IF NOT EXISTS idx_statblock_ability_assignments_statblock_id
        ON statblock_ability_assignments(statblock_id);
      CREATE INDEX IF NOT EXISTS idx_statblock_ability_assignments_ability_id
        ON statblock_ability_assignments(ability_id);
    `);
  } catch (err) {
    console.error('[db] Error running statblock linkage schema migration:', err);
    throw err;
  }
}

function runWorldConfigMigration(db: Database.Database): void {
  try {
    const tableInfo = db.pragma('table_info(worlds)') as Array<{
      name: string;
    }>;

    if (!tableInfo || !Array.isArray(tableInfo)) {
      console.log(
        '[db] Skipping world config migration: worlds table not found',
      );
      return;
    }

    const hasConfig = tableInfo.some((col) => col.name === 'config');

    if (!hasConfig) {
      console.log('[db] Adding config column to worlds table...');
      db.exec(
        `ALTER TABLE worlds ADD COLUMN config TEXT NOT NULL DEFAULT '{}'`,
      );
      console.log('[db] World config column added successfully.');
    }
  } catch (err) {
    console.error('[db] Error running world config migration:', err);
    throw err;
  }
}

function ensureCharacterNameIndex(db: Database.Database): void {
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_characters_world_id_name ON characters(world_id, name COLLATE NOCASE)',
  );
}
