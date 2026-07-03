import type Database from 'better-sqlite3';

/**
 * Ensures the `world_maps` table exists on legacy databases created before the
 * Azgaar world-map integration. Additive and idempotent: one persistent map row
 * per world, enforced by the UNIQUE(world_id) constraint.
 */
export function runWorldMapsSchemaMigration(db: Database.Database): void {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS world_maps (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        world_id          INTEGER NOT NULL UNIQUE REFERENCES worlds(id) ON DELETE CASCADE,
        map_name          TEXT,
        storage_key       TEXT    NOT NULL,
        generator_version TEXT,
        created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_world_maps_world_id ON world_maps(world_id);
    `);
  } catch (err) {
    console.error('[db] Error running world maps schema migration:', err);
    throw err;
  }
}
