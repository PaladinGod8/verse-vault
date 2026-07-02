import type Database from 'better-sqlite3';

export function runLoreNotesSchemaMigration(db: Database.Database): void {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS lore_notes (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        world_id       INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
        name           TEXT    NOT NULL,
        content        TEXT,
        image_src      TEXT,
        canvas_enabled INTEGER NOT NULL DEFAULT 0,
        canvas_scene   TEXT,
        canvas_preview_image TEXT,
        last_viewed_at TEXT,
        created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_lore_notes_world_id ON lore_notes(world_id);

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
  } catch (err) {
    console.error('[db] Error running lore notes schema migration:', err);
    throw err;
  }

  const cols = db.pragma('table_info(lore_notes)') as Array<{ name: string; }>;
  if (Array.isArray(cols) && cols.length > 0) {
    if (!cols.some((c) => c.name === 'canvas_enabled')) {
      db.exec('ALTER TABLE lore_notes ADD COLUMN canvas_enabled INTEGER NOT NULL DEFAULT 0');
    }
    if (!cols.some((c) => c.name === 'canvas_scene')) {
      db.exec('ALTER TABLE lore_notes ADD COLUMN canvas_scene TEXT');
    }
    if (!cols.some((c) => c.name === 'canvas_preview_image')) {
      db.exec('ALTER TABLE lore_notes ADD COLUMN canvas_preview_image TEXT');
    }
    if (!cols.some((c) => c.name === 'last_viewed_at')) {
      db.exec('ALTER TABLE lore_notes ADD COLUMN last_viewed_at TEXT');
    }
  }
}
