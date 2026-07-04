import type Database from 'better-sqlite3';

/**
 * Creates all core tables via `CREATE TABLE IF NOT EXISTS` for migration-safe startup on
 * existing user databases. Additive schema evolution after first creation belongs in
 * `migrations.ts`, not here.
 */
export function createCoreTables(db: Database.Database): void {
  createWorldScopedTables(db);
  createCampaignScopedTables(db);
  createAbilityAndCharacterTables(db);
  createSettingsTable(db);
}

function createSettingsTable(db: Database.Database): void {
  // Singleton row (id = 1) holding a JSON `config` blob for app-wide user
  // preferences (e.g. theme, card size). New preference fields are added
  // inside the JSON shape, not as new columns, so this table never needs schema migrations.
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id         INTEGER PRIMARY KEY CHECK (id = 1),
      config     TEXT    NOT NULL DEFAULT '{}',
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

function createWorldScopedTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS verses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      reference TEXT,
      tags TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS worlds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      thumbnail TEXT,
      original_thumbnail_src TEXT,
      thumbnail_crop TEXT,
      short_description TEXT,
      last_viewed_at TEXT,
      config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS levels (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      world_id    INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
      name        TEXT    NOT NULL,
      category    TEXT    NOT NULL,
      description TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      world_id   INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
      name       TEXT    NOT NULL,
      summary    TEXT,
      config     TEXT    NOT NULL DEFAULT '{}',
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS battlemaps (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      world_id   INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
      name       TEXT    NOT NULL,
      config     TEXT    NOT NULL DEFAULT '{}',
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tokens (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      world_id    INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
      campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
      grid_type   TEXT    NOT NULL DEFAULT 'square' CHECK (grid_type IN ('square', 'hex')),
      name        TEXT    NOT NULL,
      image_src   TEXT,
      config      TEXT    NOT NULL DEFAULT '{}',
      is_visible  INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0, 1)),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tokens_campaign_id
      ON tokens(campaign_id);

    CREATE TABLE IF NOT EXISTS world_maps (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      world_id          INTEGER NOT NULL UNIQUE REFERENCES worlds(id) ON DELETE CASCADE,
      map_name          TEXT,
      storage_key       TEXT    NOT NULL,
      generator_version TEXT,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_world_maps_world_id
      ON world_maps(world_id);
  `);

  createWorldCodexTables(db);
}

function createWorldCodexTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS backgrounds (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      world_id       INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
      name           TEXT    NOT NULL,
      description    TEXT,
      image_src      TEXT,
      original_image_src TEXT,
      image_crop     TEXT,
      last_viewed_at TEXT,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_backgrounds_world_id
      ON backgrounds(world_id);

    CREATE TABLE IF NOT EXISTS items (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      world_id       INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
      name           TEXT    NOT NULL,
      description    TEXT,
      image_src      TEXT,
      original_image_src TEXT,
      image_crop     TEXT,
      last_viewed_at TEXT,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_items_world_id
      ON items(world_id);

    CREATE TABLE IF NOT EXISTS lore_notes (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      world_id       INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
      name           TEXT    NOT NULL,
      content        TEXT,
      image_src      TEXT,
      original_image_src TEXT,
      image_crop     TEXT,
      canvas_enabled INTEGER NOT NULL DEFAULT 0,
      canvas_scene   TEXT,
      canvas_preview_image TEXT,
      last_viewed_at TEXT,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_lore_notes_world_id
      ON lore_notes(world_id);

    CREATE TABLE IF NOT EXISTS lore_note_tags (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      lore_note_id INTEGER NOT NULL REFERENCES lore_notes(id) ON DELETE CASCADE,
      world_id     INTEGER NOT NULL,
      tag_name     TEXT    NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_lore_note_tags_unique
      ON lore_note_tags(lore_note_id, tag_name COLLATE NOCASE);

    CREATE INDEX IF NOT EXISTS idx_lore_note_tags_world_tag
      ON lore_note_tags(world_id, tag_name COLLATE NOCASE);
  `);
}

function createCampaignScopedTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaign_notes (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      world_id             INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
      campaign_id          INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      name                 TEXT    NOT NULL,
      canvas_scene         TEXT,
      canvas_preview_image TEXT,
      created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at           TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_campaign_notes_campaign_id
      ON campaign_notes(campaign_id);

    CREATE INDEX IF NOT EXISTS idx_campaign_notes_campaign_id_name
      ON campaign_notes(campaign_id, name COLLATE NOCASE);

    CREATE TABLE IF NOT EXISTS campaign_note_tags (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_note_id INTEGER NOT NULL REFERENCES campaign_notes(id) ON DELETE CASCADE,
      world_id         INTEGER NOT NULL,
      campaign_id      INTEGER NOT NULL,
      tag_name         TEXT    NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_note_tags_unique
      ON campaign_note_tags(campaign_note_id, tag_name COLLATE NOCASE);

    CREATE INDEX IF NOT EXISTS idx_campaign_note_tags_campaign_tag
      ON campaign_note_tags(campaign_id, tag_name COLLATE NOCASE);

    CREATE TABLE IF NOT EXISTS arcs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      name        TEXT    NOT NULL,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS acts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      arc_id     INTEGER NOT NULL REFERENCES arcs(id) ON DELETE CASCADE,
      name       TEXT    NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      act_id     INTEGER NOT NULL REFERENCES acts(id) ON DELETE CASCADE,
      name       TEXT    NOT NULL,
      notes      TEXT,
      planned_at TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scenes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      name       TEXT    NOT NULL,
      notes      TEXT,
      payload    TEXT    NOT NULL DEFAULT '{}',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function createAbilityAndCharacterTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS abilities (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      world_id          INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
      name              TEXT    NOT NULL,
      description       TEXT,
      type              TEXT    NOT NULL CHECK (type IN ('active', 'passive')),
      passive_subtype   TEXT    CHECK (
        passive_subtype IS NULL OR passive_subtype IN ('linchpin', 'keystone', 'rostering')
      ),
      level_id          INTEGER REFERENCES levels(id) ON DELETE SET NULL,
      effects           TEXT    NOT NULL DEFAULT '[]',
      conditions        TEXT    NOT NULL DEFAULT '[]',
      cast_cost         TEXT    NOT NULL DEFAULT '{}',
      trigger           TEXT,
      pick_count        INTEGER,
      pick_timing       TEXT    CHECK (pick_timing IN ('obtain', 'rest')),
      pick_is_permanent INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ability_children (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER NOT NULL REFERENCES abilities(id) ON DELETE CASCADE,
      child_id  INTEGER NOT NULL REFERENCES abilities(id) ON DELETE CASCADE,
      UNIQUE (parent_id, child_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      world_id            INTEGER REFERENCES worlds(id) ON DELETE CASCADE,
      name                TEXT    NOT NULL DEFAULT '',
      profile             TEXT,
      is_player_character INTEGER NOT NULL DEFAULT 0 CHECK (is_player_character IN (0, 1)),
      owner               TEXT,
      author              TEXT,
      image_src           TEXT,
      original_image_src  TEXT,
      image_crop          TEXT,
      sections            TEXT    NOT NULL DEFAULT '{}',
      wiki_summary        TEXT    NOT NULL DEFAULT '{}',
      last_viewed_at      TEXT,
      created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
}
