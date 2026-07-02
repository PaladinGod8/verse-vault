import type Database from 'better-sqlite3';

export function runLegacyShapeMigrations(db: Database.Database): void {
  runArcActMigration(db);
  runSessionPlannedAtMigration(db);
  runTokenWorldIdMigration(db);
  runTokenCampaignNullableMigration(db);
  runTokenGridTypeMigration(db);
  runAbilitiesRangeShapeTargetMigration(db);
}

function runArcActMigration(db: Database.Database): void {
  const cols = db.prepare('PRAGMA table_info(sessions)').all() as Array<{
    name: string;
  }>;
  const hasActId = cols.some((c) => c.name === 'act_id');
  if (hasActId) return;

  db.transaction(() => {
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

    db.exec(`
      CREATE TABLE sessions_new (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        act_id     INTEGER NOT NULL REFERENCES acts(id) ON DELETE CASCADE,
        name       TEXT    NOT NULL,
        notes      TEXT,
        planned_at TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
      )
    `);

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
      'INSERT INTO sessions_new (id, act_id, name, notes, planned_at, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    );

    for (const session of sessions) {
      const actId = campaignToActId.get(session.campaign_id);
      if (actId !== undefined) {
        insertNewSession.run(
          session.id,
          actId,
          session.name,
          session.notes ?? null,
          null,
          session.sort_order,
          session.created_at,
          session.updated_at,
        );
      }
    }

    db.exec(`
      DROP TABLE sessions;
      ALTER TABLE sessions_new RENAME TO sessions;
    `);
  })();
}

function runTokenWorldIdMigration(db: Database.Database): void {
  const cols = db.pragma('table_info(tokens)') as { name: string; }[];
  if (cols.some((c) => c.name === 'world_id')) return;

  db.exec(
    `ALTER TABLE tokens ADD COLUMN world_id INTEGER REFERENCES worlds(id) ON DELETE CASCADE`,
  );

  db.exec(`
    UPDATE tokens
    SET world_id = (
      SELECT world_id FROM campaigns WHERE campaigns.id = tokens.campaign_id
    )
    WHERE world_id IS NULL AND campaign_id IS NOT NULL
  `);
}

function runTokenCampaignNullableMigration(db: Database.Database): void {
  const cols = db.pragma('table_info(tokens)') as Array<{
    name: string;
    notnull: number;
  }>;
  const campaignIdColumn = cols.find((c) => c.name === 'campaign_id');
  if (!campaignIdColumn || campaignIdColumn.notnull === 0) {
    return;
  }

  db.transaction(() => {
    db.exec(`
      CREATE TABLE tokens_new (
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
      )
    `);

    db.exec(`
      INSERT INTO tokens_new (
        id,
        world_id,
        campaign_id,
        grid_type,
        name,
        image_src,
        config,
        is_visible,
        created_at,
        updated_at
      )
      SELECT
        id,
        COALESCE(
          world_id,
          (SELECT world_id FROM campaigns WHERE campaigns.id = tokens.campaign_id)
        ) AS world_id,
        campaign_id,
        'square' AS grid_type,
        name,
        image_src,
        config,
        is_visible,
        created_at,
        updated_at
      FROM tokens
      WHERE COALESCE(
        world_id,
        (SELECT world_id FROM campaigns WHERE campaigns.id = tokens.campaign_id)
      ) IS NOT NULL
    `);

    db.exec(`
      DROP TABLE tokens;
      ALTER TABLE tokens_new RENAME TO tokens;
    `);
  })();
}

function runTokenGridTypeMigration(db: Database.Database): void {
  const cols = db.pragma('table_info(tokens)') as { name: string; }[];
  if (!cols.some((c) => c.name === 'grid_type')) {
    db.exec(
      "ALTER TABLE tokens ADD COLUMN grid_type TEXT NOT NULL DEFAULT 'square' CHECK (grid_type IN ('square', 'hex'))",
    );
  }

  db.exec(`
    UPDATE tokens
    SET grid_type = 'square'
    WHERE grid_type IS NULL OR grid_type NOT IN ('square', 'hex')
  `);
}

function runSessionPlannedAtMigration(db: Database.Database): void {
  const cols = db.prepare('PRAGMA table_info(sessions)').all() as Array<{
    name: string;
  }>;
  const hasPlannedAt = cols.some((c) => c.name === 'planned_at');
  if (hasPlannedAt) {
    return;
  }

  db.exec('ALTER TABLE sessions ADD COLUMN planned_at TEXT');
}

function runAbilitiesRangeShapeTargetMigration(db: Database.Database): void {
  const addColumn = (sql: string) => {
    try {
      db.exec(sql);
    } catch {
      // intentional: ignore if column already exists
    }
  };
  addColumn(`ALTER TABLE abilities ADD COLUMN range_cells INTEGER`);
  addColumn(
    `ALTER TABLE abilities ADD COLUMN aoe_shape TEXT CHECK (aoe_shape IS NULL OR aoe_shape IN ('circle','rectangle','cone','line'))`,
  );
  addColumn(`ALTER TABLE abilities ADD COLUMN aoe_size_cells INTEGER`);
  addColumn(
    `ALTER TABLE abilities ADD COLUMN target_type TEXT CHECK (target_type IS NULL OR target_type IN ('tile','token'))`,
  );
}
