import type Database from 'better-sqlite3';

export function runCampaignNotesSchemaMigration(db: Database.Database): void {
  try {
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
    `);
  } catch (err) {
    console.error('[db] Error running campaign notes schema migration:', err);
    throw err;
  }
}
