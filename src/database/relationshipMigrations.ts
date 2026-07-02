import type Database from 'better-sqlite3';

/**
 * character_relationships and faction_relationships schema migrations, split out of
 * migrations.ts to stay within the file-size budget enforced by .eslintrc.cjs.
 */
function runCharacterRelationshipsSchemaMigration(db: Database.Database): void {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS character_relationships (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id         INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        related_character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        character_label      TEXT    NOT NULL,
        related_label        TEXT    NOT NULL,
        created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at           TEXT    NOT NULL DEFAULT (datetime('now')),
        CHECK (character_id != related_character_id),
        UNIQUE (character_id, related_character_id, character_label, related_label)
      );

      CREATE INDEX IF NOT EXISTS idx_character_relationships_character_id ON character_relationships(character_id);
      CREATE INDEX IF NOT EXISTS idx_character_relationships_related_character_id ON character_relationships(related_character_id);
    `);
  } catch (err) {
    console.error('[db] Error running character relationships schema migration:', err);
    throw err;
  }
}

function runFactionRelationshipsSchemaMigration(db: Database.Database): void {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS faction_relationships (
        id                 INTEGER PRIMARY KEY AUTOINCREMENT,
        faction_id         INTEGER NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
        related_faction_id INTEGER NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
        faction_label      TEXT    NOT NULL,
        related_label      TEXT    NOT NULL,
        created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at         TEXT    NOT NULL DEFAULT (datetime('now')),
        CHECK (faction_id != related_faction_id),
        UNIQUE (faction_id, related_faction_id, faction_label, related_label)
      );

      CREATE INDEX IF NOT EXISTS idx_faction_relationships_faction_id ON faction_relationships(faction_id);
      CREATE INDEX IF NOT EXISTS idx_faction_relationships_related_faction_id ON faction_relationships(related_faction_id);
    `);
  } catch (err) {
    console.error('[db] Error running faction relationships schema migration:', err);
    throw err;
  }
}

export function runRelationshipMigrations(db: Database.Database): void {
  runCharacterRelationshipsSchemaMigration(db);
  runFactionRelationshipsSchemaMigration(db);
}
