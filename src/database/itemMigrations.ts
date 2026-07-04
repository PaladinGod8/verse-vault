import type Database from 'better-sqlite3';

export function runItemsSchemaMigration(db: Database.Database): void {
  try {
    db.exec(`
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

      CREATE INDEX IF NOT EXISTS idx_items_world_id ON items(world_id);
    `);
  } catch (err) {
    console.error('[db] Error running items schema migration:', err);
    throw err;
  }

  const cols = db.pragma('table_info(items)') as Array<{ name: string; }>;
  if (Array.isArray(cols) && cols.length > 0) {
    if (!cols.some((c) => c.name === 'original_image_src')) {
      db.exec('ALTER TABLE items ADD COLUMN original_image_src TEXT');
    }
    if (!cols.some((c) => c.name === 'image_crop')) {
      db.exec('ALTER TABLE items ADD COLUMN image_crop TEXT');
    }
    if (!cols.some((c) => c.name === 'last_viewed_at')) {
      db.exec('ALTER TABLE items ADD COLUMN last_viewed_at TEXT');
    }
  }
}
