import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let databaseConnection: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!databaseConnection) {
    const dbPath = path.join(app.getPath('userData'), 'verse-vault.db');
    databaseConnection = new Database(dbPath);
    databaseConnection.pragma('journal_mode = WAL');
    initializeSchema(databaseConnection);
  }
  return databaseConnection;
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

  // `statblocks.character_id` references `characters(id)`. Keep this table
  // present even before character features are implemented to avoid FK errors.
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  runArcActMigration(db);
  runSessionPlannedAtMigration(db);
  runTokenWorldIdMigration(db);
  runTokenCampaignNullableMigration(db);
  runTokenGridTypeMigration(db);
  ensureTokenCampaignIdIndex(db);
  ensureTokenWorldIdIndex(db);
  runAbilitiesRangeShapeTargetMigration(db);
  runStatBlocksSchemaMigration(db);
  runWorldConfigMigration(db);
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

function runWorldConfigMigration(db: Database.Database): void {
  try {
    const tableInfo = db.pragma('table_info(worlds)') as Array<{
      name: string;
    }>;
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
  const cols = db.pragma('table_info(tokens)') as { name: string }[];
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
  const cols = db.pragma('table_info(tokens)') as { name: string }[];
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

function ensureTokenWorldIdIndex(db: Database.Database): void {
  const cols = db.pragma('table_info(tokens)') as { name: string }[];
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

export function closeDatabase(): void {
  if (databaseConnection) {
    databaseConnection.close();
    databaseConnection = null;
  }
}

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonText(value: unknown, fieldName: string): unknown {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a JSON string`);
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${fieldName} must be valid JSON text`);
  }
}

function ensureFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number`);
  }
  return value;
}

function ensurePositiveFiniteNumber(value: unknown, fieldName: string): number {
  const normalized = ensureFiniteNumber(value, fieldName);
  if (normalized <= 0) {
    throw new Error(`${fieldName} must be greater than 0`);
  }
  return normalized;
}

function ensureInteger(value: unknown, fieldName: string): number {
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer`);
  }
  return value as number;
}

function normalizeSquareFootprintCells(
  value: unknown,
): TokenSquareFootprintCell[] {
  if (!Array.isArray(value)) {
    throw new Error('Token config footprint.square_cells must be an array');
  }

  const deduped = new Map<string, TokenSquareFootprintCell>();
  for (const [index, cell] of value.entries()) {
    if (!isJsonRecord(cell)) {
      throw new Error(
        `Token config footprint.square_cells[${index}] must be an object`,
      );
    }

    const col = ensureInteger(
      cell.col,
      `Token config footprint.square_cells[${index}].col`,
    );
    const row = ensureInteger(
      cell.row,
      `Token config footprint.square_cells[${index}].row`,
    );
    deduped.set(`${col}:${row}`, { col, row });
  }

  return [...deduped.values()].sort((a, b) => {
    if (a.col !== b.col) {
      return a.col - b.col;
    }
    return a.row - b.row;
  });
}

function normalizeHexFootprintCells(value: unknown): TokenHexFootprintCell[] {
  if (!Array.isArray(value)) {
    throw new Error('Token config footprint.hex_cells must be an array');
  }

  const deduped = new Map<string, TokenHexFootprintCell>();
  for (const [index, cell] of value.entries()) {
    if (!isJsonRecord(cell)) {
      throw new Error(
        `Token config footprint.hex_cells[${index}] must be an object`,
      );
    }

    const q = ensureInteger(
      cell.q,
      `Token config footprint.hex_cells[${index}].q`,
    );
    const r = ensureInteger(
      cell.r,
      `Token config footprint.hex_cells[${index}].r`,
    );
    deduped.set(`${q}:${r}`, { q, r });
  }

  return [...deduped.values()].sort((a, b) => {
    if (a.q !== b.q) {
      return a.q - b.q;
    }
    return a.r - b.r;
  });
}

function normalizeTokenFootprintConfig(input: unknown): TokenFootprintConfig {
  if (!isJsonRecord(input)) {
    throw new Error('Token config footprint must be a JSON object');
  }

  const normalized: TokenFootprintConfig = { ...input };

  if (Object.prototype.hasOwnProperty.call(input, 'version')) {
    const version = ensureInteger(
      input.version,
      'Token config footprint.version',
    );
    if (version !== 1) {
      throw new Error('Token config footprint.version must be 1');
    }
    normalized.version = 1;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'grid_type')) {
    if (input.grid_type !== 'square' && input.grid_type !== 'hex') {
      throw new Error(
        "Token config footprint.grid_type must be 'square' or 'hex'",
      );
    }
    normalized.grid_type = input.grid_type;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'square_cells')) {
    normalized.square_cells = normalizeSquareFootprintCells(input.square_cells);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'hex_cells')) {
    normalized.hex_cells = normalizeHexFootprintCells(input.hex_cells);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'width_cells')) {
    normalized.width_cells = ensurePositiveFiniteNumber(
      input.width_cells,
      'Token config footprint.width_cells',
    );
  }

  if (Object.prototype.hasOwnProperty.call(input, 'height_cells')) {
    normalized.height_cells = ensurePositiveFiniteNumber(
      input.height_cells,
      'Token config footprint.height_cells',
    );
  }

  if (Object.prototype.hasOwnProperty.call(input, 'radius_cells')) {
    normalized.radius_cells = ensurePositiveFiniteNumber(
      input.radius_cells,
      'Token config footprint.radius_cells',
    );
  }

  return normalized;
}

function normalizeTokenFramingConfig(input: unknown): TokenFramingConfig {
  if (!isJsonRecord(input)) {
    throw new Error('Token config framing must be a JSON object');
  }

  const normalized: TokenFramingConfig = { ...input };
  const finiteFields: Array<keyof TokenFramingConfig> = [
    'center_x_cells',
    'center_y_cells',
    'extent_x_cells',
    'extent_y_cells',
    'max_extent_cells',
    'anchor_x',
    'anchor_y',
    'offset_x_px',
    'offset_y_px',
  ];

  for (const fieldName of finiteFields) {
    if (Object.prototype.hasOwnProperty.call(input, fieldName)) {
      normalized[fieldName] = ensureFiniteNumber(
        input[fieldName],
        `Token config framing.${fieldName}`,
      );
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(normalized, 'extent_x_cells') &&
    normalized.extent_x_cells !== undefined &&
    normalized.extent_x_cells <= 0
  ) {
    throw new Error(
      'Token config framing.extent_x_cells must be greater than 0',
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(normalized, 'extent_y_cells') &&
    normalized.extent_y_cells !== undefined &&
    normalized.extent_y_cells <= 0
  ) {
    throw new Error(
      'Token config framing.extent_y_cells must be greater than 0',
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(normalized, 'max_extent_cells') &&
    normalized.max_extent_cells !== undefined &&
    normalized.max_extent_cells <= 0
  ) {
    throw new Error(
      'Token config framing.max_extent_cells must be greater than 0',
    );
  }

  return normalized;
}

export function ensureTokenConfigJsonText(config: unknown): string {
  const parsedConfig = parseJsonText(config, 'Token config');
  if (!isJsonRecord(parsedConfig)) {
    throw new Error('Token config must be a JSON object');
  }

  const normalizedConfig: TokenConfigShape = { ...parsedConfig };

  if (Object.prototype.hasOwnProperty.call(parsedConfig, 'footprint')) {
    normalizedConfig.footprint = normalizeTokenFootprintConfig(
      parsedConfig.footprint,
    );
  }

  if (Object.prototype.hasOwnProperty.call(parsedConfig, 'framing')) {
    normalizedConfig.framing = normalizeTokenFramingConfig(
      parsedConfig.framing,
    );
  }

  return JSON.stringify(normalizedConfig);
}

function ensurePositiveInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid ${fieldName}`);
  }
}

export const db = {
  tokens: {
    moveToWorld(tokenId: number): Token {
      ensurePositiveInteger(tokenId, 'tokenId');

      const database = getDatabase();
      const moveTokenToWorld = database.transaction((id: number): Token => {
        const existingToken = database
          .prepare('SELECT * FROM tokens WHERE id = ?')
          .get(id) as Token | undefined;
        if (!existingToken) {
          throw new Error('Token not found');
        }

        database
          .prepare(
            "UPDATE tokens SET campaign_id = NULL, updated_at = datetime('now') WHERE id = ?",
          )
          .run(id);

        const updatedToken = database
          .prepare('SELECT * FROM tokens WHERE id = ?')
          .get(id) as Token | undefined;
        if (!updatedToken) {
          throw new Error('Token not found');
        }

        return updatedToken;
      });

      return moveTokenToWorld(tokenId);
    },
    moveToCampaign(tokenId: number, targetCampaignId: number): Token {
      ensurePositiveInteger(tokenId, 'tokenId');
      ensurePositiveInteger(targetCampaignId, 'targetCampaignId');

      const database = getDatabase();
      const moveTokenToCampaign = database.transaction(
        (id: number, campaignId: number): Token => {
          const existingToken = database
            .prepare('SELECT id, world_id FROM tokens WHERE id = ?')
            .get(id) as { id: number; world_id: number } | undefined;
          if (!existingToken) {
            throw new Error('Token not found');
          }

          const targetCampaign = database
            .prepare('SELECT id, world_id FROM campaigns WHERE id = ?')
            .get(campaignId) as { id: number; world_id: number } | undefined;
          if (!targetCampaign) {
            throw new Error('Campaign not found');
          }

          if (targetCampaign.world_id !== existingToken.world_id) {
            throw new Error('Campaign not in the same world');
          }

          database
            .prepare(
              "UPDATE tokens SET campaign_id = ?, updated_at = datetime('now') WHERE id = ?",
            )
            .run(campaignId, id);

          const updatedToken = database
            .prepare('SELECT * FROM tokens WHERE id = ?')
            .get(id) as Token | undefined;
          if (!updatedToken) {
            throw new Error('Token not found');
          }

          return updatedToken;
        },
      );

      return moveTokenToCampaign(tokenId, targetCampaignId);
    },
  },
};
