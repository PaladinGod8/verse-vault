import type Database from 'better-sqlite3';

/**
 * Runs all additive, idempotent schema migrations in the order they must apply against a
 * legacy database. Order is load-bearing — do not reorder without verifying against a real
 * upgraded user database, not just fresh-DB tests.
 */
export function runMigrations(db: Database.Database): void {
  runArcActMigration(db);
  runSessionPlannedAtMigration(db);
  runTokenWorldIdMigration(db);
  runTokenCampaignNullableMigration(db);
  runTokenGridTypeMigration(db);
  ensureTokenCampaignIdIndex(db);
  ensureTokenWorldIdIndex(db);
  runAbilitiesRangeShapeTargetMigration(db);
  runStatBlocksSchemaMigration(db);
  runStatBlockLinkageSchemaMigration(db);
  runWorldConfigMigration(db);
  runCharactersSchemaMigration(db);
  runFactionTypesSchemaMigration(db);
  runFactionsSchemaMigration(db);
  runFactionMembersSchemaMigration(db);
  ensureCharacterNameIndex(db);
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
  addColumn(
    'name',
    "ALTER TABLE characters ADD COLUMN name TEXT NOT NULL DEFAULT ''",
  );
  addColumn('profile', 'ALTER TABLE characters ADD COLUMN profile TEXT');
  addColumn(
    'is_player_character',
    'ALTER TABLE characters ADD COLUMN is_player_character INTEGER NOT NULL DEFAULT 0 CHECK (is_player_character IN (0, 1))',
  );
  addColumn('owner', 'ALTER TABLE characters ADD COLUMN owner TEXT');
  addColumn('author', 'ALTER TABLE characters ADD COLUMN author TEXT');
  addColumn('image_src', 'ALTER TABLE characters ADD COLUMN image_src TEXT');
  addColumn(
    'sections',
    "ALTER TABLE characters ADD COLUMN sections TEXT NOT NULL DEFAULT '{}'",
  );
  addColumn(
    'wiki_summary',
    "ALTER TABLE characters ADD COLUMN wiki_summary TEXT NOT NULL DEFAULT '{}'",
  );

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

    // Guard: if tableInfo is undefined or empty, the worlds table might not exist yet
    // In that case, skip the migration as the table will be created with the config column
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
        planned_at TEXT,
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

    // Swap tables (scenes' FK references session IDs which are preserved)
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

    // Skip orphaned legacy rows that cannot be mapped to a world.
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

  // Normalize legacy rows to a safe default before grid variants are used.
  db.exec(`
    UPDATE tokens
    SET grid_type = 'square'
    WHERE grid_type IS NULL OR grid_type NOT IN ('square', 'hex')
  `);
}

function ensureTokenCampaignIdIndex(db: Database.Database): void {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tokens_campaign_id ON tokens(campaign_id)
  `);
}

function ensureCharacterNameIndex(db: Database.Database): void {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_characters_world_id_name ON characters(world_id, name COLLATE NOCASE)
  `);
}

function ensureTokenWorldIdIndex(db: Database.Database): void {
  const cols = db.pragma('table_info(tokens)') as { name: string; }[];
  if (!cols.some((c) => c.name === 'world_id')) {
    return;
  }

  db.exec(`CREATE INDEX IF NOT EXISTS idx_tokens_world_id ON tokens(world_id)`);
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
