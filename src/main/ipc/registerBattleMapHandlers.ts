import type Database from 'better-sqlite3';
import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipcChannels';
import {
  ensureFiniteNumber,
  ensurePositiveFiniteNumber,
  isJsonRecord,
  parseJsonText,
} from './validation';

type JsonRecord = Record<string, unknown>;

const BATTLEMAP_GRID_MODES = new Set(['square', 'hex', 'none']);

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

function normalizeBattleMapRuntimeGridConfig(
  input: unknown,
): JsonRecord {
  if (input !== undefined && !isJsonRecord(input)) {
    throw new Error('BattleMap config runtime.grid must be a JSON object');
  }

  const grid = isJsonRecord(input) ? input : {};
  const modeCandidate = Object.prototype.hasOwnProperty.call(grid, 'mode')
    ? grid.mode
    : DEFAULT_BATTLEMAP_RUNTIME_CONFIG.grid.mode;
  if (
    typeof modeCandidate !== 'string'
    || !BATTLEMAP_GRID_MODES.has(modeCandidate)
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

function normalizeBattleMapRuntimeMapConfig(
  input: unknown,
): JsonRecord {
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

  const imageSrc = typeof imageSrcCandidate === 'string'
      && imageSrcCandidate.trim().length === 0
    ? null
    : imageSrcCandidate;

  return {
    imageSrc,
    backgroundColor,
  };
}

function normalizeBattleMapRuntimeCameraConfig(
  input: unknown,
): JsonRecord {
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
    x: ensureFiniteNumber(
      xCandidate,
      'BattleMap config runtime.camera.x',
    ),
    y: ensureFiniteNumber(
      yCandidate,
      'BattleMap config runtime.camera.y',
    ),
    zoom: ensurePositiveFiniteNumber(
      zoomCandidate,
      'BattleMap config runtime.camera.zoom',
    ),
  };
}

function normalizeBattleMapRuntimeConfig(
  input: unknown,
): JsonRecord {
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

function ensureBattleMapConfigJsonText(
  config: unknown,
): string {
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

export function registerBattleMapHandlers(
  db: Database.Database,
): void {
  registerBattleMapReadHandlers(db);
  registerBattleMapMutationHandlers(db);
}

function registerBattleMapReadHandlers(db: Database.Database): void {
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
}

function registerBattleMapMutationHandlers(
  db: Database.Database,
): void {
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
    (_event, id: number, data: { name?: string; config?: string; }) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasConfig = Object.prototype.hasOwnProperty.call(data, 'config');

      const setClauses: string[] = [];
      const values: string[] = [];

      if (hasName) {
        const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
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

      const updateSql = setClauses.length > 0
        ? `UPDATE battlemaps SET ${
          setClauses.join(', ')
        }, updated_at = datetime('now') WHERE id = ?`
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
}
