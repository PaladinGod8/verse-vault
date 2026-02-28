import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'verse-vault.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database): void {
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
      short_description TEXT,
      last_viewed_at TEXT,
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

  runArcActMigration(db);
}

function runArcActMigration(db: Database.Database): void {
  // Check if sessions table already uses act_id (new schema or fresh DB)
  const cols = db.prepare('PRAGMA table_info(sessions)').all() as Array<{
    name: string;
  }>;
  const hasActId = cols.some((c) => c.name === 'act_id');
  if (hasActId) return; // Already on new schema

  // sessions still has campaign_id — run migration inside a transaction
  db.transaction(() => {
    // For each campaign, create Arc 1 + Act 1 and record the campaign→act mapping
    const campaigns = db.prepare('SELECT id FROM campaigns').all() as Array<{
      id: number;
    }>;
    const campaignToActId = new Map<number, number>();

    for (const campaign of campaigns) {
      const arcResult = db
        .prepare(
          "INSERT INTO arcs (campaign_id, name, sort_order) VALUES (?, 'Arc 1', 0)",
        )
        .run(campaign.id);
      const actResult = db
        .prepare(
          "INSERT INTO acts (arc_id, name, sort_order) VALUES (?, 'Act 1', 0)",
        )
        .run(arcResult.lastInsertRowid);
      campaignToActId.set(campaign.id, Number(actResult.lastInsertRowid));
    }

    // Create the new sessions table with act_id
    db.exec(`
      CREATE TABLE sessions_new (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        act_id     INTEGER NOT NULL REFERENCES acts(id) ON DELETE CASCADE,
        name       TEXT    NOT NULL,
        notes      TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Copy existing sessions, mapping campaign_id → act_id
    const sessions = db.prepare('SELECT * FROM sessions').all() as Array<{
      id: number;
      campaign_id: number;
      name: string;
      notes: string | null;
      sort_order: number;
      created_at: string;
      updated_at: string;
    }>;

    const insertNewSession = db.prepare(
      'INSERT INTO sessions_new (id, act_id, name, notes, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );

    for (const session of sessions) {
      const actId = campaignToActId.get(session.campaign_id);
      if (actId !== undefined) {
        insertNewSession.run(
          session.id,
          actId,
          session.name,
          session.notes ?? null,
          session.sort_order,
          session.created_at,
          session.updated_at,
        );
      }
    }

    // Swap tables (scenes' FK references session IDs which are preserved)
    db.exec(`
      DROP TABLE sessions;
      ALTER TABLE sessions_new RENAME TO sessions;
    `);
  })();
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
