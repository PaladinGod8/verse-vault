import { app, BrowserWindow, ipcMain, net, protocol } from 'electron';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'path';
import { getDatabase, closeDatabase } from './database/db';
import { IPC } from './shared/ipcChannels';

function isAbilityChildDuplicateError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code =
    'code' in error && typeof error.code === 'string' ? error.code : '';
  if (code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.includes(
    'UNIQUE constraint failed: ability_children.parent_id, ability_children.child_id',
  );
}

type JsonRecord = Record<string, unknown>;

const BATTLEMAP_GRID_MODES = new Set(['square', 'hex', 'none']);
const TOKEN_IMAGE_MIME_TO_EXTENSION = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
} as const;
const TOKEN_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const TOKEN_IMAGE_PROTOCOL = 'vv-media';
const TOKEN_IMAGE_HOST = 'token-images';

const DEFAULT_BATTLEMAP_RUNTIME_CONFIG = {
  grid: {
    mode: 'square',
    cellSize: 50,
    originX: 0,
    originY: 0,
  },
  map: {
    imageSrc: null as string | null,
    backgroundColor: '#000000',
  },
  camera: {
    x: 0,
    y: 0,
    zoom: 1,
  },
} as const;

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
  const normalizedValue = ensureFiniteNumber(value, fieldName);
  if (normalizedValue <= 0) {
    throw new Error(`${fieldName} must be greater than 0`);
  }
  return normalizedValue;
}

function ensureSqliteBooleanNumber(value: unknown, fieldName: string): number {
  if (value !== 0 && value !== 1) {
    throw new Error(`${fieldName} must be 0 or 1`);
  }
  return value;
}

function normalizeBattleMapRuntimeGridConfig(input: unknown): JsonRecord {
  if (input !== undefined && !isJsonRecord(input)) {
    throw new Error('BattleMap config runtime.grid must be a JSON object');
  }

  const grid = isJsonRecord(input) ? input : {};
  const modeCandidate = Object.prototype.hasOwnProperty.call(grid, 'mode')
    ? grid.mode
    : DEFAULT_BATTLEMAP_RUNTIME_CONFIG.grid.mode;
  if (
    typeof modeCandidate !== 'string' ||
    !BATTLEMAP_GRID_MODES.has(modeCandidate)
  ) {
    throw new Error(
      "BattleMap config runtime.grid.mode must be one of: 'square', 'hex', 'none'",
    );
  }

  const cellSizeCandidate = Object.prototype.hasOwnProperty.call(
    grid,
    'cellSize',
  )
    ? grid.cellSize
    : DEFAULT_BATTLEMAP_RUNTIME_CONFIG.grid.cellSize;
  const originXCandidate = Object.prototype.hasOwnProperty.call(grid, 'originX')
    ? grid.originX
    : DEFAULT_BATTLEMAP_RUNTIME_CONFIG.grid.originX;
  const originYCandidate = Object.prototype.hasOwnProperty.call(grid, 'originY')
    ? grid.originY
    : DEFAULT_BATTLEMAP_RUNTIME_CONFIG.grid.originY;

  return {
    mode: modeCandidate,
    cellSize: ensurePositiveFiniteNumber(
      cellSizeCandidate,
      'BattleMap config runtime.grid.cellSize',
    ),
    originX: ensureFiniteNumber(
      originXCandidate,
      'BattleMap config runtime.grid.originX',
    ),
    originY: ensureFiniteNumber(
      originYCandidate,
      'BattleMap config runtime.grid.originY',
    ),
  };
}

function normalizeBattleMapRuntimeMapConfig(input: unknown): JsonRecord {
  if (input !== undefined && !isJsonRecord(input)) {
    throw new Error('BattleMap config runtime.map must be a JSON object');
  }

  const map = isJsonRecord(input) ? input : {};
  const imageSrcCandidate = Object.prototype.hasOwnProperty.call(
    map,
    'imageSrc',
  )
    ? map.imageSrc
    : DEFAULT_BATTLEMAP_RUNTIME_CONFIG.map.imageSrc;
  const backgroundColorCandidate = Object.prototype.hasOwnProperty.call(
    map,
    'backgroundColor',
  )
    ? map.backgroundColor
    : DEFAULT_BATTLEMAP_RUNTIME_CONFIG.map.backgroundColor;

  if (imageSrcCandidate !== null && typeof imageSrcCandidate !== 'string') {
    throw new Error(
      'BattleMap config runtime.map.imageSrc must be a string or null',
    );
  }

  if (typeof backgroundColorCandidate !== 'string') {
    throw new Error(
      'BattleMap config runtime.map.backgroundColor must be a string',
    );
  }
  const backgroundColor = backgroundColorCandidate.trim();
  if (!backgroundColor) {
    throw new Error(
      'BattleMap config runtime.map.backgroundColor cannot be empty',
    );
  }

  const imageSrc =
    typeof imageSrcCandidate === 'string' &&
    imageSrcCandidate.trim().length === 0
      ? null
      : imageSrcCandidate;

  return {
    imageSrc,
    backgroundColor,
  };
}

function normalizeBattleMapRuntimeCameraConfig(input: unknown): JsonRecord {
  if (input !== undefined && !isJsonRecord(input)) {
    throw new Error('BattleMap config runtime.camera must be a JSON object');
  }

  const camera = isJsonRecord(input) ? input : {};
  const xCandidate = Object.prototype.hasOwnProperty.call(camera, 'x')
    ? camera.x
    : DEFAULT_BATTLEMAP_RUNTIME_CONFIG.camera.x;
  const yCandidate = Object.prototype.hasOwnProperty.call(camera, 'y')
    ? camera.y
    : DEFAULT_BATTLEMAP_RUNTIME_CONFIG.camera.y;
  const zoomCandidate = Object.prototype.hasOwnProperty.call(camera, 'zoom')
    ? camera.zoom
    : DEFAULT_BATTLEMAP_RUNTIME_CONFIG.camera.zoom;

  return {
    x: ensureFiniteNumber(xCandidate, 'BattleMap config runtime.camera.x'),
    y: ensureFiniteNumber(yCandidate, 'BattleMap config runtime.camera.y'),
    zoom: ensurePositiveFiniteNumber(
      zoomCandidate,
      'BattleMap config runtime.camera.zoom',
    ),
  };
}

function normalizeBattleMapRuntimeConfig(input: unknown): JsonRecord {
  if (input !== undefined && !isJsonRecord(input)) {
    throw new Error('BattleMap config runtime must be a JSON object');
  }

  const runtime = isJsonRecord(input) ? input : {};
  const normalizedRuntime: JsonRecord = isJsonRecord(input)
    ? { ...runtime }
    : {};

  normalizedRuntime.grid = normalizeBattleMapRuntimeGridConfig(
    Object.prototype.hasOwnProperty.call(runtime, 'grid')
      ? runtime.grid
      : undefined,
  );
  normalizedRuntime.map = normalizeBattleMapRuntimeMapConfig(
    Object.prototype.hasOwnProperty.call(runtime, 'map')
      ? runtime.map
      : undefined,
  );
  normalizedRuntime.camera = normalizeBattleMapRuntimeCameraConfig(
    Object.prototype.hasOwnProperty.call(runtime, 'camera')
      ? runtime.camera
      : undefined,
  );

  return normalizedRuntime;
}

function ensureScenePayloadJsonText(payload: unknown): string {
  const parsedPayload = parseJsonText(payload, 'Scene payload');

  if (
    isJsonRecord(parsedPayload) &&
    Object.prototype.hasOwnProperty.call(parsedPayload, 'runtime')
  ) {
    const runtimePayload = parsedPayload.runtime;
    if (!isJsonRecord(runtimePayload)) {
      throw new Error('Scene payload runtime must be a JSON object');
    }
    if (Object.prototype.hasOwnProperty.call(runtimePayload, 'battlemap_id')) {
      const battleMapId = runtimePayload.battlemap_id;
      if (
        battleMapId !== null &&
        (!Number.isInteger(battleMapId) || battleMapId <= 0)
      ) {
        throw new Error(
          'Scene payload runtime.battlemap_id must be a positive integer or null',
        );
      }
    }
  }

  return payload as string;
}

function ensureBattleMapConfigJsonText(config: unknown): string {
  const parsedConfig = parseJsonText(config, 'BattleMap config');
  if (!isJsonRecord(parsedConfig)) {
    throw new Error('BattleMap config must be a JSON object');
  }

  const normalizedConfig: JsonRecord = { ...parsedConfig };
  normalizedConfig.runtime = normalizeBattleMapRuntimeConfig(
    Object.prototype.hasOwnProperty.call(parsedConfig, 'runtime')
      ? parsedConfig.runtime
      : undefined,
  );

  return JSON.stringify(normalizedConfig);
}

function ensureTokenConfigJsonText(config: unknown): string {
  const parsedConfig = parseJsonText(config, 'Token config');
  if (!isJsonRecord(parsedConfig)) {
    throw new Error('Token config must be a JSON object');
  }

  return config as string;
}

function ensureTokenImageImportPayload(payload: TokenImageImportPayload): {
  mimeType: keyof typeof TOKEN_IMAGE_MIME_TO_EXTENSION;
  bytes: Uint8Array;
} {
  const fileName =
    typeof payload.fileName === 'string' ? payload.fileName.trim() : '';
  if (!fileName) {
    throw new Error('Token image fileName is required');
  }

  const mimeType =
    typeof payload.mimeType === 'string'
      ? payload.mimeType.trim().toLowerCase()
      : '';
  if (
    !Object.prototype.hasOwnProperty.call(
      TOKEN_IMAGE_MIME_TO_EXTENSION,
      mimeType,
    )
  ) {
    throw new Error(
      'Unsupported token image mimeType. Allowed: image/png, image/jpeg, image/webp, image/gif',
    );
  }

  if (!(payload.bytes instanceof Uint8Array)) {
    throw new Error('Token image bytes must be a Uint8Array');
  }
  if (payload.bytes.byteLength === 0) {
    throw new Error('Token image bytes cannot be empty');
  }
  if (payload.bytes.byteLength > TOKEN_IMAGE_MAX_SIZE_BYTES) {
    throw new Error('Token image exceeds 5 MB limit');
  }

  return {
    mimeType: mimeType as keyof typeof TOKEN_IMAGE_MIME_TO_EXTENSION,
    bytes: payload.bytes,
  };
}

function tokenImagesDirectoryPath(): string {
  return path.join(app.getPath('userData'), 'token-images');
}

function buildTokenImageMediaUrl(fileName: string): string {
  return `${TOKEN_IMAGE_PROTOCOL}://${TOKEN_IMAGE_HOST}/${encodeURIComponent(fileName)}`;
}

function registerTokenImageProtocol(): void {
  protocol.handle(TOKEN_IMAGE_PROTOCOL, async (request) => {
    let requestUrl: URL;
    try {
      requestUrl = new URL(request.url);
    } catch {
      return new Response('Invalid token image request URL', { status: 400 });
    }

    if (requestUrl.hostname !== TOKEN_IMAGE_HOST) {
      return new Response('Token image not found', { status: 404 });
    }

    const requestedPath = decodeURIComponent(requestUrl.pathname).replace(
      /^\/+/,
      '',
    );
    const fileName = path.basename(requestedPath);
    if (!fileName || fileName !== requestedPath) {
      return new Response('Invalid token image path', { status: 400 });
    }

    const tokenImagesDir = path.resolve(tokenImagesDirectoryPath());
    const filePath = path.resolve(path.join(tokenImagesDir, fileName));
    if (path.dirname(filePath) !== tokenImagesDir) {
      return new Response('Invalid token image path', { status: 400 });
    }

    try {
      return await net.fetch(pathToFileURL(filePath).toString());
    } catch {
      return new Response('Token image not found', { status: 404 });
    }
  });
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open DevTools only in development.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
};

// Register IPC handlers for database operations.
function registerIpcHandlers() {
  const db = getDatabase();
  const getSessionByIdStmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
  const getSceneByIdStmt = db.prepare('SELECT * FROM scenes WHERE id = ?');
  const getTokenByIdStmt = db.prepare('SELECT * FROM tokens WHERE id = ?');
  const getArcByIdStmt = db.prepare('SELECT * FROM arcs WHERE id = ?');
  const getActByIdStmt = db.prepare('SELECT * FROM acts WHERE id = ?');
  const insertSessionStmt = db.prepare(
    'INSERT INTO sessions (act_id, name, notes, planned_at, sort_order) VALUES (?, ?, ?, ?, ?)',
  );
  const insertSceneStmt = db.prepare(
    'INSERT INTO scenes (session_id, name, notes, payload, sort_order) VALUES (?, ?, ?, ?, ?)',
  );
  const insertArcStmt = db.prepare(
    'INSERT INTO arcs (campaign_id, name, sort_order) VALUES (?, ?, ?)',
  );
  const insertActStmt = db.prepare(
    'INSERT INTO acts (arc_id, name, sort_order) VALUES (?, ?, ?)',
  );
  const updateSessionSortOrderStmt = db.prepare(
    'UPDATE sessions SET sort_order = ? WHERE id = ?',
  );
  const updateSceneSortOrderStmt = db.prepare(
    'UPDATE scenes SET sort_order = ? WHERE id = ?',
  );
  const updateArcSortOrderStmt = db.prepare(
    'UPDATE arcs SET sort_order = ? WHERE id = ?',
  );
  const updateActSortOrderStmt = db.prepare(
    'UPDATE acts SET sort_order = ? WHERE id = ?',
  );

  const resequenceSessionsInAct = (actId: number): void => {
    const siblingRows = db
      .prepare(
        'SELECT id FROM sessions WHERE act_id = ? ORDER BY sort_order ASC, id ASC',
      )
      .all(actId) as Array<{ id: number }>;

    siblingRows.forEach((row, index) => {
      updateSessionSortOrderStmt.run(index, row.id);
    });
  };

  const resequenceArcsInCampaign = (campaignId: number): void => {
    const rows = db
      .prepare(
        'SELECT id FROM arcs WHERE campaign_id = ? ORDER BY sort_order ASC, id ASC',
      )
      .all(campaignId) as Array<{ id: number }>;
    rows.forEach((row, index) => {
      updateArcSortOrderStmt.run(index, row.id);
    });
  };

  const resequenceActsInArc = (arcId: number): void => {
    const rows = db
      .prepare(
        'SELECT id FROM acts WHERE arc_id = ? ORDER BY sort_order ASC, id ASC',
      )
      .all(arcId) as Array<{ id: number }>;
    rows.forEach((row, index) => {
      updateActSortOrderStmt.run(index, row.id);
    });
  };

  const resequenceScenesInSession = (sessionId: number): void => {
    const siblingRows = db
      .prepare(
        'SELECT id FROM scenes WHERE session_id = ? ORDER BY sort_order ASC, id ASC',
      )
      .all(sessionId) as Array<{ id: number }>;

    siblingRows.forEach((row, index) => {
      updateSceneSortOrderStmt.run(index, row.id);
    });
  };

  const insertSession = db.transaction(
    (data: {
      act_id: number;
      name: string;
      notes?: string | null;
      planned_at?: string | null;
      sort_order?: number;
    }) => {
      const sortOrder =
        data.sort_order === undefined
          ? (
              db
                .prepare(
                  'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order FROM sessions WHERE act_id = ?',
                )
                .get(data.act_id) as { next_sort_order: number }
            ).next_sort_order
          : data.sort_order;

      const result = insertSessionStmt.run(
        data.act_id,
        data.name,
        data.notes ?? null,
        data.planned_at ?? null,
        sortOrder,
      );

      const session = getSessionByIdStmt.get(result.lastInsertRowid);
      if (!session) {
        throw new Error('Failed to create session');
      }
      return session;
    },
  );

  const insertArc = db.transaction(
    (data: { campaign_id: number; name: string; sort_order?: number }) => {
      const sortOrder =
        data.sort_order === undefined
          ? (
              db
                .prepare(
                  'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM arcs WHERE campaign_id = ?',
                )
                .get(data.campaign_id) as { next: number }
            ).next
          : data.sort_order;
      const result = insertArcStmt.run(data.campaign_id, data.name, sortOrder);
      const arc = getArcByIdStmt.get(result.lastInsertRowid);
      if (!arc) throw new Error('Failed to create arc');
      return arc;
    },
  );

  const deleteArcAndCompact = db.transaction((id: number) => {
    const arc = db
      .prepare('SELECT campaign_id FROM arcs WHERE id = ?')
      .get(id) as { campaign_id: number } | undefined;
    if (!arc) return { id };
    db.prepare('DELETE FROM arcs WHERE id = ?').run(id);
    resequenceArcsInCampaign(arc.campaign_id);
    return { id };
  });

  const insertAct = db.transaction(
    (data: { arc_id: number; name: string; sort_order?: number }) => {
      const sortOrder =
        data.sort_order === undefined
          ? (
              db
                .prepare(
                  'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM acts WHERE arc_id = ?',
                )
                .get(data.arc_id) as { next: number }
            ).next
          : data.sort_order;
      const result = insertActStmt.run(data.arc_id, data.name, sortOrder);
      const act = getActByIdStmt.get(result.lastInsertRowid);
      if (!act) throw new Error('Failed to create act');
      return act;
    },
  );

  const deleteActAndCompact = db.transaction((id: number) => {
    const act = db.prepare('SELECT arc_id FROM acts WHERE id = ?').get(id) as
      | { arc_id: number }
      | undefined;
    if (!act) return { id };
    db.prepare('DELETE FROM acts WHERE id = ?').run(id);
    resequenceActsInArc(act.arc_id);
    return { id };
  });

  const insertScene = db.transaction(
    (data: {
      session_id: number;
      name: string;
      notes?: string | null;
      payload: string;
      sort_order?: number;
    }) => {
      const sortOrder =
        data.sort_order === undefined
          ? (
              db
                .prepare(
                  'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order FROM scenes WHERE session_id = ?',
                )
                .get(data.session_id) as { next_sort_order: number }
            ).next_sort_order
          : data.sort_order;

      const result = insertSceneStmt.run(
        data.session_id,
        data.name,
        data.notes ?? null,
        data.payload,
        sortOrder,
      );

      const scene = getSceneByIdStmt.get(result.lastInsertRowid);
      if (!scene) {
        throw new Error('Failed to create scene');
      }
      return scene;
    },
  );

  const deleteSessionAndCompact = db.transaction((id: number) => {
    const sessionToDelete = db
      .prepare('SELECT act_id FROM sessions WHERE id = ?')
      .get(id) as { act_id: number } | undefined;
    if (!sessionToDelete) {
      return { id };
    }

    db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    resequenceSessionsInAct(sessionToDelete.act_id);
    return { id };
  });

  const deleteSceneAndCompact = db.transaction((id: number) => {
    const sceneToDelete = db
      .prepare('SELECT session_id FROM scenes WHERE id = ?')
      .get(id) as { session_id: number } | undefined;
    if (!sceneToDelete) {
      return { id };
    }

    db.prepare('DELETE FROM scenes WHERE id = ?').run(id);
    resequenceScenesInSession(sceneToDelete.session_id);
    return { id };
  });

  ipcMain.handle(IPC.VERSES_GET_ALL, () => {
    return db.prepare('SELECT * FROM verses ORDER BY created_at DESC').all();
  });

  ipcMain.handle(IPC.WORLDS_GET_ALL, () => {
    return db.prepare('SELECT * FROM worlds ORDER BY updated_at DESC').all();
  });

  ipcMain.handle(IPC.WORLDS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM worlds WHERE id = ?').get(id) ?? null;
  });

  ipcMain.handle(
    IPC.WORLDS_ADD,
    (
      _event,
      data: {
        name: string;
        thumbnail?: string | null;
        short_description?: string | null;
      },
    ) => {
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) {
        throw new Error('World name is required');
      }

      const stmt = db.prepare(
        'INSERT INTO worlds (name, thumbnail, short_description) VALUES (?, ?, ?)',
      );
      const result = stmt.run(
        name,
        data.thumbnail ?? null,
        data.short_description ?? null,
      );

      const world = db
        .prepare('SELECT * FROM worlds WHERE id = ?')
        .get(result.lastInsertRowid);
      if (!world) {
        throw new Error('Failed to create world');
      }
      return world;
    },
  );

  ipcMain.handle(
    IPC.WORLDS_UPDATE,
    (
      _event,
      id: number,
      data: {
        name?: string;
        thumbnail?: string | null;
        short_description?: string | null;
      },
    ) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasThumbnail = Object.prototype.hasOwnProperty.call(
        data,
        'thumbnail',
      );
      const hasShortDescription = Object.prototype.hasOwnProperty.call(
        data,
        'short_description',
      );

      const setClauses: string[] = [];
      const values: Array<string | null> = [];

      if (hasName) {
        const trimmedName =
          typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
          throw new Error('World name is required');
        }
        setClauses.push('name = ?');
        values.push(trimmedName);
      }

      if (hasThumbnail && data.thumbnail !== undefined) {
        setClauses.push('thumbnail = ?');
        values.push(data.thumbnail);
      }

      if (hasShortDescription && data.short_description !== undefined) {
        setClauses.push('short_description = ?');
        values.push(data.short_description);
      }

      const updateSql =
        setClauses.length > 0
          ? `UPDATE worlds SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
          : "UPDATE worlds SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(updateSql).run(...values, id);

      const world = db.prepare('SELECT * FROM worlds WHERE id = ?').get(id);
      if (!world) {
        throw new Error('World not found');
      }
      return world;
    },
  );

  ipcMain.handle(IPC.WORLDS_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM worlds WHERE id = ?').run(id);
    return { id };
  });

  ipcMain.handle(IPC.WORLDS_MARK_VIEWED, (_event, id: number) => {
    db.prepare(
      "UPDATE worlds SET last_viewed_at = datetime('now') WHERE id = ?",
    ).run(id);
    return db.prepare('SELECT * FROM worlds WHERE id = ?').get(id) ?? null;
  });

  ipcMain.handle(IPC.LEVELS_GET_ALL_BY_WORLD, (_event, worldId: number) => {
    return db
      .prepare(
        'SELECT * FROM levels WHERE world_id = ? ORDER BY updated_at DESC',
      )
      .all(worldId);
  });

  ipcMain.handle(IPC.LEVELS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM levels WHERE id = ?').get(id) ?? null;
  });

  ipcMain.handle(
    IPC.LEVELS_ADD,
    (
      _event,
      data: {
        world_id: number;
        name: string;
        category: string;
        description?: string | null;
      },
    ) => {
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) {
        throw new Error('Level name is required');
      }
      const category =
        typeof data.category === 'string' ? data.category.trim() : '';
      if (!category) {
        throw new Error('Level category is required');
      }

      const result = db
        .prepare(
          'INSERT INTO levels (world_id, name, category, description) VALUES (?, ?, ?, ?)',
        )
        .run(data.world_id, name, category, data.description ?? null);

      const level = db
        .prepare('SELECT * FROM levels WHERE id = ?')
        .get(result.lastInsertRowid);
      if (!level) {
        throw new Error('Failed to create level');
      }
      return level;
    },
  );

  ipcMain.handle(
    IPC.LEVELS_UPDATE,
    (
      _event,
      id: number,
      data: { name?: string; category?: string; description?: string | null },
    ) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasCategory = Object.prototype.hasOwnProperty.call(
        data,
        'category',
      );
      const hasDescription = Object.prototype.hasOwnProperty.call(
        data,
        'description',
      );

      const setClauses: string[] = [];
      const values: Array<string | null> = [];

      if (hasName) {
        const trimmedName =
          typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
          throw new Error('Level name cannot be empty');
        }
        setClauses.push('name = ?');
        values.push(trimmedName);
      }

      if (hasCategory) {
        const trimmedCategory =
          typeof data.category === 'string' ? data.category.trim() : '';
        if (!trimmedCategory) {
          throw new Error('Level category cannot be empty');
        }
        setClauses.push('category = ?');
        values.push(trimmedCategory);
      }

      if (hasDescription && data.description !== undefined) {
        setClauses.push('description = ?');
        values.push(data.description);
      }

      const updateSql =
        setClauses.length > 0
          ? `UPDATE levels SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
          : "UPDATE levels SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(updateSql).run(...values, id);

      const level = db.prepare('SELECT * FROM levels WHERE id = ?').get(id);
      if (!level) {
        throw new Error('Level not found');
      }
      return level;
    },
  );

  ipcMain.handle(IPC.LEVELS_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM levels WHERE id = ?').run(id);
    return { id };
  });

  ipcMain.handle(IPC.CAMPAIGNS_GET_ALL_BY_WORLD, (_event, worldId: number) => {
    return db
      .prepare(
        'SELECT * FROM campaigns WHERE world_id = ? ORDER BY updated_at DESC',
      )
      .all(worldId);
  });

  ipcMain.handle(IPC.CAMPAIGNS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) ?? null;
  });

  ipcMain.handle(
    IPC.CAMPAIGNS_ADD,
    (
      _event,
      data: {
        world_id: number;
        name: string;
        summary?: string | null;
        config?: string;
      },
    ) => {
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) {
        throw new Error('Campaign name is required');
      }

      const result = db
        .prepare(
          'INSERT INTO campaigns (world_id, name, summary, config) VALUES (?, ?, ?, ?)',
        )
        .run(data.world_id, name, data.summary ?? null, data.config ?? '{}');

      const campaign = db
        .prepare('SELECT * FROM campaigns WHERE id = ?')
        .get(result.lastInsertRowid);
      if (!campaign) {
        throw new Error('Failed to create campaign');
      }
      return campaign;
    },
  );

  ipcMain.handle(
    IPC.CAMPAIGNS_UPDATE,
    (
      _event,
      id: number,
      data: { name?: string; summary?: string | null; config?: string },
    ) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasSummary = Object.prototype.hasOwnProperty.call(data, 'summary');
      const hasConfig = Object.prototype.hasOwnProperty.call(data, 'config');

      const setClauses: string[] = [];
      const values: Array<string | null> = [];

      if (hasName) {
        const trimmedName =
          typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
          throw new Error('Campaign name cannot be empty');
        }
        setClauses.push('name = ?');
        values.push(trimmedName);
      }

      if (hasSummary && data.summary !== undefined) {
        setClauses.push('summary = ?');
        values.push(data.summary);
      }

      if (hasConfig && data.config !== undefined) {
        setClauses.push('config = ?');
        values.push(data.config);
      }

      const updateSql =
        setClauses.length > 0
          ? `UPDATE campaigns SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
          : "UPDATE campaigns SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(updateSql).run(...values, id);

      const campaign = db
        .prepare('SELECT * FROM campaigns WHERE id = ?')
        .get(id);
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      return campaign;
    },
  );

  ipcMain.handle(IPC.CAMPAIGNS_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
    return { id };
  });

  ipcMain.handle(IPC.BATTLEMAPS_GET_ALL_BY_WORLD, (_event, worldId: number) => {
    return db
      .prepare(
        'SELECT * FROM battlemaps WHERE world_id = ? ORDER BY updated_at DESC, id DESC',
      )
      .all(worldId);
  });

  ipcMain.handle(IPC.BATTLEMAPS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM battlemaps WHERE id = ?').get(id) ?? null;
  });

  ipcMain.handle(
    IPC.BATTLEMAPS_ADD,
    (
      _event,
      data: {
        world_id: number;
        name: string;
        config?: string;
      },
    ) => {
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) {
        throw new Error('BattleMap name is required');
      }

      const config = ensureBattleMapConfigJsonText(data.config ?? '{}');

      const result = db
        .prepare(
          'INSERT INTO battlemaps (world_id, name, config) VALUES (?, ?, ?)',
        )
        .run(data.world_id, name, config);

      const battleMap = db
        .prepare('SELECT * FROM battlemaps WHERE id = ?')
        .get(result.lastInsertRowid);
      if (!battleMap) {
        throw new Error('Failed to create BattleMap');
      }
      return battleMap;
    },
  );

  ipcMain.handle(
    IPC.BATTLEMAPS_UPDATE,
    (_event, id: number, data: { name?: string; config?: string }) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasConfig = Object.prototype.hasOwnProperty.call(data, 'config');

      const setClauses: string[] = [];
      const values: string[] = [];

      if (hasName) {
        const trimmedName =
          typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
          throw new Error('BattleMap name cannot be empty');
        }
        setClauses.push('name = ?');
        values.push(trimmedName);
      }

      if (hasConfig && data.config !== undefined) {
        setClauses.push('config = ?');
        values.push(ensureBattleMapConfigJsonText(data.config));
      }

      const updateSql =
        setClauses.length > 0
          ? `UPDATE battlemaps SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
          : "UPDATE battlemaps SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(updateSql).run(...values, id);

      const battleMap = db
        .prepare('SELECT * FROM battlemaps WHERE id = ?')
        .get(id);
      if (!battleMap) {
        throw new Error('BattleMap not found');
      }
      return battleMap;
    },
  );

  ipcMain.handle(IPC.BATTLEMAPS_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM battlemaps WHERE id = ?').run(id);
    return { id };
  });

  ipcMain.handle(
    IPC.TOKENS_GET_ALL_BY_CAMPAIGN,
    (_event, campaignId: number): Token[] => {
      return db
        .prepare(
          'SELECT * FROM tokens WHERE campaign_id = ? ORDER BY updated_at DESC, id DESC',
        )
        .all(campaignId) as Token[];
    },
  );

  ipcMain.handle(
    IPC.TOKENS_GET_ALL_BY_WORLD,
    (_event, worldId: number): Token[] => {
      if (!Number.isInteger(worldId) || worldId <= 0) {
        throw new Error('Invalid worldId');
      }
      return db
        .prepare('SELECT * FROM tokens WHERE world_id = ? ORDER BY name ASC')
        .all(worldId) as Token[];
    },
  );

  ipcMain.handle(IPC.TOKENS_GET_BY_ID, (_event, id: number): Token | null => {
    return (getTokenByIdStmt.get(id) as Token | undefined) ?? null;
  });

  ipcMain.handle(
    IPC.TOKENS_IMPORT_IMAGE,
    async (
      _event,
      payload: TokenImageImportPayload,
    ): Promise<TokenImageImportResult> => {
      const { mimeType, bytes } = ensureTokenImageImportPayload(payload);

      const tokenImagesDir = tokenImagesDirectoryPath();
      await mkdir(tokenImagesDir, { recursive: true });

      const extension = TOKEN_IMAGE_MIME_TO_EXTENSION[mimeType];
      const uniqueFileName = `${Date.now()}-${randomUUID()}.${extension}`;
      const savedAbsolutePath = path.join(tokenImagesDir, uniqueFileName);
      await writeFile(savedAbsolutePath, bytes);

      return {
        image_src: buildTokenImageMediaUrl(uniqueFileName),
      };
    },
  );

  ipcMain.handle(
    IPC.TOKENS_ADD,
    (
      _event,
      data: {
        world_id: number;
        campaign_id?: number | null;
        name: string;
        image_src?: string | null;
        config?: string;
        is_visible?: number;
      },
    ): Token => {
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) {
        throw new Error('Token name is required');
      }
      if (!Number.isInteger(data.world_id) || data.world_id <= 0) {
        throw new Error('Invalid world_id');
      }
      if (
        data.campaign_id != null &&
        (!Number.isInteger(data.campaign_id) || data.campaign_id <= 0)
      ) {
        throw new Error('Invalid campaign_id');
      }

      const config =
        data.config === undefined
          ? '{}'
          : ensureTokenConfigJsonText(data.config);
      const isVisible =
        data.is_visible === undefined
          ? 1
          : ensureSqliteBooleanNumber(data.is_visible, 'Token visibility');
      const campaignId = data.campaign_id ?? null;

      const result = db
        .prepare(
          'INSERT INTO tokens (world_id, campaign_id, name, image_src, config, is_visible) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(
          data.world_id,
          campaignId,
          name,
          data.image_src ?? null,
          config,
          isVisible,
        );

      const token = getTokenByIdStmt.get(result.lastInsertRowid) as
        | Token
        | undefined;
      if (!token) {
        throw new Error('Failed to create token');
      }
      return token;
    },
  );

  ipcMain.handle(
    IPC.TOKENS_UPDATE,
    (
      _event,
      id: number,
      data: {
        name?: string;
        image_src?: string | null;
        config?: string;
        is_visible?: number;
      },
    ): Token => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasImageSrc = Object.prototype.hasOwnProperty.call(
        data,
        'image_src',
      );
      const hasConfig = Object.prototype.hasOwnProperty.call(data, 'config');
      const hasIsVisible = Object.prototype.hasOwnProperty.call(
        data,
        'is_visible',
      );

      const setClauses: string[] = [];
      const values: Array<string | number | null> = [];

      if (hasName) {
        const trimmedName =
          typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
          throw new Error('Token name cannot be empty');
        }
        setClauses.push('name = ?');
        values.push(trimmedName);
      }

      if (hasImageSrc && data.image_src !== undefined) {
        setClauses.push('image_src = ?');
        values.push(data.image_src);
      }

      if (hasConfig && data.config !== undefined) {
        setClauses.push('config = ?');
        values.push(ensureTokenConfigJsonText(data.config));
      }

      if (hasIsVisible && data.is_visible !== undefined) {
        setClauses.push('is_visible = ?');
        values.push(
          ensureSqliteBooleanNumber(data.is_visible, 'Token visibility'),
        );
      }

      const updateSql =
        setClauses.length > 0
          ? `UPDATE tokens SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
          : "UPDATE tokens SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(updateSql).run(...values, id);

      const token = getTokenByIdStmt.get(id) as Token | undefined;
      if (!token) {
        throw new Error('Token not found');
      }
      return token;
    },
  );

  ipcMain.handle(IPC.TOKENS_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM tokens WHERE id = ?').run(id);
    return { id };
  });

  ipcMain.handle(IPC.ARCS_GET_ALL_BY_CAMPAIGN, (_event, campaignId: number) => {
    return db
      .prepare(
        'SELECT * FROM arcs WHERE campaign_id = ? ORDER BY sort_order ASC, id ASC',
      )
      .all(campaignId);
  });

  ipcMain.handle(IPC.ARCS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM arcs WHERE id = ?').get(id) ?? null;
  });

  ipcMain.handle(
    IPC.ARCS_ADD,
    (
      _event,
      data: { campaign_id: number; name: string; sort_order?: number },
    ) => {
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) throw new Error('Arc name is required');
      return insertArc({
        campaign_id: data.campaign_id,
        name,
        sort_order: data.sort_order,
      });
    },
  );

  ipcMain.handle(
    IPC.ARCS_UPDATE,
    (_event, id: number, data: { name?: string; sort_order?: number }) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasSortOrder = Object.prototype.hasOwnProperty.call(
        data,
        'sort_order',
      );
      const setClauses: string[] = [];
      const values: Array<string | number | null> = [];

      if (hasName) {
        const trimmedName =
          typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) throw new Error('Arc name cannot be empty');
        setClauses.push('name = ?');
        values.push(trimmedName);
      }
      if (hasSortOrder && data.sort_order !== undefined) {
        setClauses.push('sort_order = ?');
        values.push(data.sort_order);
      }

      const sql =
        setClauses.length > 0
          ? `UPDATE arcs SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
          : "UPDATE arcs SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(sql).run(...values, id);

      const arc = db.prepare('SELECT * FROM arcs WHERE id = ?').get(id);
      if (!arc) throw new Error('Arc not found');
      return arc;
    },
  );

  ipcMain.handle(IPC.ARCS_DELETE, (_event, id: number) => {
    return deleteArcAndCompact(id);
  });

  ipcMain.handle(IPC.ACTS_GET_ALL_BY_ARC, (_event, arcId: number) => {
    return db
      .prepare(
        'SELECT * FROM acts WHERE arc_id = ? ORDER BY sort_order ASC, id ASC',
      )
      .all(arcId);
  });

  ipcMain.handle(IPC.ACTS_GET_ALL_BY_CAMPAIGN, (_event, campaignId: number) => {
    return db
      .prepare(
        `SELECT acts.* FROM acts
           JOIN arcs ON acts.arc_id = arcs.id
           WHERE arcs.campaign_id = ?
           ORDER BY arcs.sort_order ASC, arcs.id ASC, acts.sort_order ASC, acts.id ASC`,
      )
      .all(campaignId);
  });

  ipcMain.handle(IPC.ACTS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM acts WHERE id = ?').get(id) ?? null;
  });

  ipcMain.handle(
    IPC.ACTS_ADD,
    (_event, data: { arc_id: number; name: string; sort_order?: number }) => {
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) throw new Error('Act name is required');
      return insertAct({
        arc_id: data.arc_id,
        name,
        sort_order: data.sort_order,
      });
    },
  );

  ipcMain.handle(
    IPC.ACTS_UPDATE,
    (_event, id: number, data: { name?: string; sort_order?: number }) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasSortOrder = Object.prototype.hasOwnProperty.call(
        data,
        'sort_order',
      );
      const setClauses: string[] = [];
      const values: Array<string | number | null> = [];

      if (hasName) {
        const trimmedName =
          typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) throw new Error('Act name cannot be empty');
        setClauses.push('name = ?');
        values.push(trimmedName);
      }
      if (hasSortOrder && data.sort_order !== undefined) {
        setClauses.push('sort_order = ?');
        values.push(data.sort_order);
      }

      const sql =
        setClauses.length > 0
          ? `UPDATE acts SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
          : "UPDATE acts SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(sql).run(...values, id);

      const act = db.prepare('SELECT * FROM acts WHERE id = ?').get(id);
      if (!act) throw new Error('Act not found');
      return act;
    },
  );

  ipcMain.handle(IPC.ACTS_DELETE, (_event, id: number) => {
    return deleteActAndCompact(id);
  });

  ipcMain.handle(
    IPC.ACTS_MOVE_TO_ARC,
    (_event, actId: number, newArcId: number) => {
      return db.transaction(() => {
        const act = db.prepare('SELECT * FROM acts WHERE id = ?').get(actId) as
          | Act
          | undefined;
        if (!act) throw new Error('Act not found');
        const oldArcId = (act as unknown as { arc_id: number }).arc_id;

        const { next: newSortOrder } = db
          .prepare(
            'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM acts WHERE arc_id = ?',
          )
          .get(newArcId) as { next: number };

        db.prepare(
          "UPDATE acts SET arc_id = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?",
        ).run(newArcId, newSortOrder, actId);

        resequenceActsInArc(oldArcId);

        return db.prepare('SELECT * FROM acts WHERE id = ?').get(actId);
      })();
    },
  );

  ipcMain.handle(IPC.SESSIONS_GET_ALL_BY_ACT, (_event, actId: number) => {
    return db
      .prepare(
        'SELECT * FROM sessions WHERE act_id = ? ORDER BY sort_order ASC, id ASC',
      )
      .all(actId);
  });

  ipcMain.handle(IPC.SESSIONS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) ?? null;
  });

  ipcMain.handle(
    IPC.SESSIONS_ADD,
    (
      _event,
      data: {
        act_id: number;
        name: string;
        notes?: string | null;
        planned_at?: string | null;
        sort_order?: number;
      },
    ) => {
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) {
        throw new Error('Session name is required');
      }

      return insertSession({
        act_id: data.act_id,
        name,
        notes: data.notes,
        planned_at: data.planned_at,
        sort_order: data.sort_order,
      });
    },
  );

  ipcMain.handle(
    IPC.SESSIONS_UPDATE,
    (
      _event,
      id: number,
      data: {
        name?: string;
        notes?: string | null;
        planned_at?: string | null;
        sort_order?: number;
      },
    ) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasNotes = Object.prototype.hasOwnProperty.call(data, 'notes');
      const hasPlannedAt = Object.prototype.hasOwnProperty.call(
        data,
        'planned_at',
      );
      const hasSortOrder = Object.prototype.hasOwnProperty.call(
        data,
        'sort_order',
      );

      const setClauses: string[] = [];
      const values: Array<string | number | null> = [];

      if (hasName) {
        const trimmedName =
          typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
          throw new Error('Session name cannot be empty');
        }
        setClauses.push('name = ?');
        values.push(trimmedName);
      }

      if (hasNotes && data.notes !== undefined) {
        setClauses.push('notes = ?');
        values.push(data.notes);
      }

      if (hasPlannedAt && data.planned_at !== undefined) {
        setClauses.push('planned_at = ?');
        values.push(data.planned_at);
      }

      if (hasSortOrder && data.sort_order !== undefined) {
        setClauses.push('sort_order = ?');
        values.push(data.sort_order);
      }

      const updateSql =
        setClauses.length > 0
          ? `UPDATE sessions SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
          : "UPDATE sessions SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(updateSql).run(...values, id);

      const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
      if (!session) {
        throw new Error('Session not found');
      }
      return session;
    },
  );

  ipcMain.handle(IPC.SESSIONS_DELETE, (_event, id: number) => {
    return deleteSessionAndCompact(id);
  });

  ipcMain.handle(
    IPC.SESSIONS_MOVE_TO_ACT,
    (_event, sessionId: number, newActId: number) => {
      return db.transaction(() => {
        const session = db
          .prepare('SELECT * FROM sessions WHERE id = ?')
          .get(sessionId) as Session | undefined;
        if (!session) throw new Error('Session not found');
        const oldActId = (session as unknown as { act_id: number }).act_id;

        const { next: newSortOrder } = db
          .prepare(
            'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM sessions WHERE act_id = ?',
          )
          .get(newActId) as { next: number };

        db.prepare(
          "UPDATE sessions SET act_id = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?",
        ).run(newActId, newSortOrder, sessionId);

        resequenceSessionsInAct(oldActId);

        return db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
      })();
    },
  );

  ipcMain.handle(
    IPC.SCENES_GET_ALL_BY_CAMPAIGN,
    (_event, campaignId: number): CampaignSceneListItem[] => {
      return db
        .prepare(
          `
          SELECT
            scenes.id,
            scenes.session_id,
            scenes.name,
            scenes.notes,
            scenes.payload,
            scenes.sort_order,
            scenes.created_at,
            scenes.updated_at,
            sessions.name AS session_name,
            acts.id AS act_id,
            acts.name AS act_name,
            arcs.id AS arc_id,
            arcs.name AS arc_name
          FROM scenes
          INNER JOIN sessions ON sessions.id = scenes.session_id
          INNER JOIN acts ON acts.id = sessions.act_id
          INNER JOIN arcs ON arcs.id = acts.arc_id
          WHERE arcs.campaign_id = ?
          ORDER BY
            arcs.sort_order ASC,
            arcs.id ASC,
            acts.sort_order ASC,
            acts.id ASC,
            sessions.sort_order ASC,
            sessions.id ASC,
            scenes.sort_order ASC,
            scenes.id ASC
          `,
        )
        .all(campaignId) as CampaignSceneListItem[];
    },
  );

  ipcMain.handle(IPC.SCENES_GET_ALL_BY_SESSION, (_event, sessionId: number) => {
    return db
      .prepare(
        'SELECT * FROM scenes WHERE session_id = ? ORDER BY sort_order ASC, id ASC',
      )
      .all(sessionId);
  });

  ipcMain.handle(IPC.SCENES_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM scenes WHERE id = ?').get(id) ?? null;
  });

  ipcMain.handle(
    IPC.SCENES_ADD,
    (
      _event,
      data: {
        session_id: number;
        name: string;
        notes?: string | null;
        payload?: string;
        sort_order?: number;
      },
    ) => {
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) {
        throw new Error('Scene name is required');
      }

      const payload =
        data.payload === undefined
          ? '{}'
          : ensureScenePayloadJsonText(data.payload);

      return insertScene({
        session_id: data.session_id,
        name,
        notes: data.notes,
        payload,
        sort_order: data.sort_order,
      });
    },
  );

  ipcMain.handle(
    IPC.SCENES_UPDATE,
    (
      _event,
      id: number,
      data: {
        name?: string;
        notes?: string | null;
        payload?: string;
        sort_order?: number;
      },
    ) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasNotes = Object.prototype.hasOwnProperty.call(data, 'notes');
      const hasPayload = Object.prototype.hasOwnProperty.call(data, 'payload');
      const hasSortOrder = Object.prototype.hasOwnProperty.call(
        data,
        'sort_order',
      );

      const setClauses: string[] = [];
      const values: Array<string | number | null> = [];

      if (hasName) {
        const trimmedName =
          typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
          throw new Error('Scene name cannot be empty');
        }
        setClauses.push('name = ?');
        values.push(trimmedName);
      }

      if (hasNotes && data.notes !== undefined) {
        setClauses.push('notes = ?');
        values.push(data.notes);
      }

      if (hasPayload && data.payload !== undefined) {
        setClauses.push('payload = ?');
        values.push(ensureScenePayloadJsonText(data.payload));
      }

      if (hasSortOrder && data.sort_order !== undefined) {
        setClauses.push('sort_order = ?');
        values.push(data.sort_order);
      }

      const updateSql =
        setClauses.length > 0
          ? `UPDATE scenes SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
          : "UPDATE scenes SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(updateSql).run(...values, id);

      const scene = db.prepare('SELECT * FROM scenes WHERE id = ?').get(id);
      if (!scene) {
        throw new Error('Scene not found');
      }
      return scene;
    },
  );

  ipcMain.handle(IPC.SCENES_DELETE, (_event, id: number) => {
    return deleteSceneAndCompact(id);
  });

  ipcMain.handle(
    IPC.SCENES_MOVE_TO_SESSION,
    (_event, sceneId: number, newSessionId: number) => {
      return db.transaction(() => {
        const scene = getSceneByIdStmt.get(sceneId) as Scene | undefined;
        if (!scene) {
          throw new Error('Scene not found');
        }

        const targetSession = getSessionByIdStmt.get(newSessionId) as
          | Session
          | undefined;
        if (!targetSession) {
          throw new Error('Target session not found');
        }

        const oldSessionId = (scene as unknown as { session_id: number })
          .session_id;
        if (newSessionId === oldSessionId) {
          return scene;
        }

        const { nextSortOrder } = db
          .prepare(
            'SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextSortOrder FROM scenes WHERE session_id = ?',
          )
          .get(newSessionId) as { nextSortOrder: number };

        db.prepare(
          "UPDATE scenes SET session_id = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?",
        ).run(newSessionId, nextSortOrder, sceneId);

        resequenceScenesInSession(oldSessionId);

        const movedScene = getSceneByIdStmt.get(sceneId) as Scene | undefined;
        if (!movedScene) {
          throw new Error('Scene not found');
        }
        return movedScene;
      })();
    },
  );

  ipcMain.handle(IPC.ABILITIES_GET_ALL_BY_WORLD, (_event, worldId: number) => {
    return db
      .prepare(
        'SELECT * FROM abilities WHERE world_id = ? ORDER BY updated_at DESC',
      )
      .all(worldId);
  });

  ipcMain.handle(IPC.ABILITIES_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM abilities WHERE id = ?').get(id) ?? null;
  });

  ipcMain.handle(
    IPC.ABILITIES_ADD,
    (
      _event,
      data: {
        world_id: number;
        name: string;
        description?: string | null;
        type: string;
        passive_subtype?: string | null;
        level_id?: number | null;
        effects?: string;
        conditions?: string;
        cast_cost?: string;
        trigger?: string | null;
        pick_count?: number | null;
        pick_timing?: string | null;
        pick_is_permanent?: number;
      },
    ) => {
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) {
        throw new Error('Ability name is required');
      }
      const type = typeof data.type === 'string' ? data.type.trim() : '';
      if (!type) {
        throw new Error('Ability type is required');
      }

      const result = db
        .prepare(
          `
          INSERT INTO abilities (
            world_id,
            name,
            description,
            type,
            passive_subtype,
            level_id,
            effects,
            conditions,
            cast_cost,
            trigger,
            pick_count,
            pick_timing,
            pick_is_permanent
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
        )
        .run(
          data.world_id,
          name,
          data.description ?? null,
          type,
          data.passive_subtype ?? null,
          data.level_id ?? null,
          data.effects ?? '[]',
          data.conditions ?? '[]',
          data.cast_cost ?? '{}',
          data.trigger ?? null,
          data.pick_count ?? null,
          data.pick_timing ?? null,
          data.pick_is_permanent ?? 0,
        );

      const ability = db
        .prepare('SELECT * FROM abilities WHERE id = ?')
        .get(result.lastInsertRowid);
      if (!ability) {
        throw new Error('Failed to create ability');
      }
      return ability;
    },
  );

  ipcMain.handle(
    IPC.ABILITIES_UPDATE,
    (
      _event,
      id: number,
      data: {
        name?: string;
        description?: string | null;
        type?: string;
        passive_subtype?: string | null;
        level_id?: number | null;
        effects?: string;
        conditions?: string;
        cast_cost?: string;
        trigger?: string | null;
        pick_count?: number | null;
        pick_timing?: string | null;
        pick_is_permanent?: number;
      },
    ) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasDescription = Object.prototype.hasOwnProperty.call(
        data,
        'description',
      );
      const hasType = Object.prototype.hasOwnProperty.call(data, 'type');
      const hasPassiveSubtype = Object.prototype.hasOwnProperty.call(
        data,
        'passive_subtype',
      );
      const hasLevelId = Object.prototype.hasOwnProperty.call(data, 'level_id');
      const hasEffects = Object.prototype.hasOwnProperty.call(data, 'effects');
      const hasConditions = Object.prototype.hasOwnProperty.call(
        data,
        'conditions',
      );
      const hasCastCost = Object.prototype.hasOwnProperty.call(
        data,
        'cast_cost',
      );
      const hasTrigger = Object.prototype.hasOwnProperty.call(data, 'trigger');
      const hasPickCount = Object.prototype.hasOwnProperty.call(
        data,
        'pick_count',
      );
      const hasPickTiming = Object.prototype.hasOwnProperty.call(
        data,
        'pick_timing',
      );
      const hasPickIsPermanent = Object.prototype.hasOwnProperty.call(
        data,
        'pick_is_permanent',
      );

      const setClauses: string[] = [];
      const values: Array<string | number | null> = [];

      if (hasName) {
        const trimmedName =
          typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
          throw new Error('Ability name cannot be empty');
        }
        setClauses.push('name = ?');
        values.push(trimmedName);
      }

      if (hasDescription && data.description !== undefined) {
        setClauses.push('description = ?');
        values.push(data.description);
      }

      if (hasType) {
        const trimmedType =
          typeof data.type === 'string' ? data.type.trim() : '';
        if (!trimmedType) {
          throw new Error('Ability type cannot be empty');
        }
        setClauses.push('type = ?');
        values.push(trimmedType);
      }

      if (hasPassiveSubtype && data.passive_subtype !== undefined) {
        setClauses.push('passive_subtype = ?');
        values.push(data.passive_subtype);
      }

      if (hasLevelId && data.level_id !== undefined) {
        setClauses.push('level_id = ?');
        values.push(data.level_id);
      }

      if (hasEffects && data.effects !== undefined) {
        setClauses.push('effects = ?');
        values.push(data.effects);
      }

      if (hasConditions && data.conditions !== undefined) {
        setClauses.push('conditions = ?');
        values.push(data.conditions);
      }

      if (hasCastCost && data.cast_cost !== undefined) {
        setClauses.push('cast_cost = ?');
        values.push(data.cast_cost);
      }

      if (hasTrigger && data.trigger !== undefined) {
        setClauses.push('trigger = ?');
        values.push(data.trigger);
      }

      if (hasPickCount && data.pick_count !== undefined) {
        setClauses.push('pick_count = ?');
        values.push(data.pick_count);
      }

      if (hasPickTiming && data.pick_timing !== undefined) {
        setClauses.push('pick_timing = ?');
        values.push(data.pick_timing);
      }

      if (hasPickIsPermanent && data.pick_is_permanent !== undefined) {
        setClauses.push('pick_is_permanent = ?');
        values.push(data.pick_is_permanent);
      }

      const updateSql =
        setClauses.length > 0
          ? `UPDATE abilities SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
          : "UPDATE abilities SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(updateSql).run(...values, id);

      const ability = db
        .prepare('SELECT * FROM abilities WHERE id = ?')
        .get(id);
      if (!ability) {
        throw new Error('Ability not found');
      }
      return ability;
    },
  );

  ipcMain.handle(IPC.ABILITIES_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM abilities WHERE id = ?').run(id);
    return { id };
  });

  ipcMain.handle(
    IPC.ABILITIES_ADD_CHILD,
    (_event, data: { parent_id: number; child_id: number }) => {
      if (data.parent_id === data.child_id) {
        throw new Error('Parent ability cannot be linked to itself');
      }

      const parent = db
        .prepare('SELECT id, world_id FROM abilities WHERE id = ?')
        .get(data.parent_id) as { id: number; world_id: number } | undefined;
      if (!parent) {
        throw new Error('Parent ability not found');
      }

      const child = db
        .prepare('SELECT id, world_id FROM abilities WHERE id = ?')
        .get(data.child_id) as { id: number; world_id: number } | undefined;
      if (!child) {
        throw new Error('Child ability not found');
      }

      if (parent.world_id !== child.world_id) {
        throw new Error(
          'Parent and child abilities must belong to the same world',
        );
      }

      try {
        db.prepare(
          'INSERT INTO ability_children (parent_id, child_id) VALUES (?, ?)',
        ).run(data.parent_id, data.child_id);
      } catch (error) {
        if (isAbilityChildDuplicateError(error)) {
          throw new Error('Child ability link already exists');
        }
        throw error;
      }

      return {
        parent_id: data.parent_id,
        child_id: data.child_id,
      };
    },
  );

  ipcMain.handle(
    IPC.ABILITIES_REMOVE_CHILD,
    (_event, data: { parent_id: number; child_id: number }) => {
      db.prepare(
        'DELETE FROM ability_children WHERE parent_id = ? AND child_id = ?',
      ).run(data.parent_id, data.child_id);
      return {
        parent_id: data.parent_id,
        child_id: data.child_id,
      };
    },
  );

  ipcMain.handle(IPC.ABILITIES_GET_CHILDREN, (_event, abilityId: number) => {
    return db
      .prepare(
        `
        SELECT child.*
        FROM ability_children AS relation
        INNER JOIN abilities AS child ON child.id = relation.child_id
        WHERE relation.parent_id = ?
        ORDER BY child.updated_at DESC
        `,
      )
      .all(abilityId);
  });

  ipcMain.handle(
    IPC.VERSES_ADD,
    (_event, data: { text: string; reference?: string; tags?: string }) => {
      const stmt = db.prepare(
        'INSERT INTO verses (text, reference, tags) VALUES (?, ?, ?)',
      );
      const result = stmt.run(
        data.text,
        data.reference ?? null,
        data.tags ?? null,
      );
      return db
        .prepare('SELECT * FROM verses WHERE id = ?')
        .get(result.lastInsertRowid);
    },
  );

  ipcMain.handle(
    IPC.VERSES_UPDATE,
    (
      _event,
      id: number,
      data: { text?: string; reference?: string; tags?: string },
    ) => {
      db.prepare(
        `
      UPDATE verses SET
        text = COALESCE(?, text),
        reference = COALESCE(?, reference),
        tags = COALESCE(?, tags),
        updated_at = datetime('now')
      WHERE id = ?
    `,
      ).run(data.text ?? null, data.reference ?? null, data.tags ?? null, id);
      return db.prepare('SELECT * FROM verses WHERE id = ?').get(id);
    },
  );

  ipcMain.handle(IPC.VERSES_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM verses WHERE id = ?').run(id);
    return { id };
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  registerIpcHandlers();
  registerTokenImageProtocol();

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const { installExtension, REACT_DEVELOPER_TOOLS } =
      await import('electron-devtools-installer');
    await installExtension(REACT_DEVELOPER_TOOLS).catch((err: unknown) => {
      console.error('Failed to install React DevTools:', err);
    });
  }

  createWindow();
});

app.on('before-quit', () => {
  closeDatabase();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
