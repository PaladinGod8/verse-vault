import { clampGridCellSize, DEFAULT_GRID_CELL_SIZE } from './runtimeMath';

const BATTLEMAP_GRID_MODES = new Set<BattleMapGridMode>([
  'square',
  'hex',
  'none',
]);

export const DEFAULT_BATTLEMAP_RUNTIME_CONFIG: BattleMapRuntimeConfig = {
  grid: {
    mode: 'square',
    cellSize: DEFAULT_GRID_CELL_SIZE,
    originX: 0,
    originY: 0,
  },
  map: {
    imageSrc: null,
    backgroundColor: '#000000',
  },
  camera: {
    x: 0,
    y: 0,
    zoom: 1,
  },
};

function asJsonRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

function asPositiveFiniteNumber(value: unknown, fallback: number): number {
  const normalized = asFiniteNumber(value, fallback);
  if (normalized <= 0) {
    return fallback;
  }
  return normalized;
}

function normalizeGridMode(value: unknown): BattleMapGridMode {
  if (
    typeof value === 'string'
    && BATTLEMAP_GRID_MODES.has(value as BattleMapGridMode)
  ) {
    return value as BattleMapGridMode;
  }
  return DEFAULT_BATTLEMAP_RUNTIME_CONFIG.grid.mode;
}

export function normalizeRuntimeGridConfig(
  grid: BattleMapRuntimeGridConfig,
): BattleMapRuntimeGridConfig {
  return {
    mode: normalizeGridMode(grid.mode),
    cellSize: clampGridCellSize(
      asPositiveFiniteNumber(
        grid.cellSize,
        DEFAULT_BATTLEMAP_RUNTIME_CONFIG.grid.cellSize,
      ),
      DEFAULT_BATTLEMAP_RUNTIME_CONFIG.grid.cellSize,
    ),
    originX: asFiniteNumber(
      grid.originX,
      DEFAULT_BATTLEMAP_RUNTIME_CONFIG.grid.originX,
    ),
    originY: asFiniteNumber(
      grid.originY,
      DEFAULT_BATTLEMAP_RUNTIME_CONFIG.grid.originY,
    ),
  };
}

export function normalizeBattleMapRuntimeConfig(
  parsedConfig: Record<string, unknown>,
): BattleMapRuntimeConfig {
  const runtime = asJsonRecord(parsedConfig.runtime) ?? {};
  const grid = asJsonRecord(runtime.grid) ?? {};
  const map = asJsonRecord(runtime.map) ?? {};
  const camera = asJsonRecord(runtime.camera) ?? {};

  const backgroundColorCandidate = map.backgroundColor;
  const normalizedBackgroundColor = typeof backgroundColorCandidate === 'string'
      && backgroundColorCandidate.trim().length > 0
    ? backgroundColorCandidate.trim()
    : DEFAULT_BATTLEMAP_RUNTIME_CONFIG.map.backgroundColor;

  const imageSrcCandidate = map.imageSrc;
  const normalizedImageSrc =
    typeof imageSrcCandidate === 'string' && imageSrcCandidate.trim().length > 0
      ? imageSrcCandidate.trim()
      : null;

  return {
    grid: normalizeRuntimeGridConfig({
      mode: normalizeGridMode(grid.mode),
      cellSize: asPositiveFiniteNumber(
        grid.cellSize,
        DEFAULT_BATTLEMAP_RUNTIME_CONFIG.grid.cellSize,
      ),
      originX: asFiniteNumber(
        grid.originX,
        DEFAULT_BATTLEMAP_RUNTIME_CONFIG.grid.originX,
      ),
      originY: asFiniteNumber(
        grid.originY,
        DEFAULT_BATTLEMAP_RUNTIME_CONFIG.grid.originY,
      ),
    }),
    map: {
      imageSrc: normalizedImageSrc,
      backgroundColor: normalizedBackgroundColor,
    },
    camera: {
      x: asFiniteNumber(camera.x, DEFAULT_BATTLEMAP_RUNTIME_CONFIG.camera.x),
      y: asFiniteNumber(camera.y, DEFAULT_BATTLEMAP_RUNTIME_CONFIG.camera.y),
      zoom: asPositiveFiniteNumber(
        camera.zoom,
        DEFAULT_BATTLEMAP_RUNTIME_CONFIG.camera.zoom,
      ),
    },
  };
}

export function mergeBattleMapConfigWithRuntime(
  baseConfig: Record<string, unknown>,
  runtimeConfig: BattleMapRuntimeConfig,
): Record<string, unknown> {
  const runtime = asJsonRecord(baseConfig.runtime) ?? {};
  const runtimeGrid = asJsonRecord(runtime.grid) ?? {};
  const runtimeMap = asJsonRecord(runtime.map) ?? {};
  const runtimeCamera = asJsonRecord(runtime.camera) ?? {};

  return {
    ...baseConfig,
    runtime: {
      ...runtime,
      grid: {
        ...runtimeGrid,
        ...runtimeConfig.grid,
      },
      map: {
        ...runtimeMap,
        ...runtimeConfig.map,
      },
      camera: {
        ...runtimeCamera,
        ...runtimeConfig.camera,
      },
    },
  };
}

export type ParsedBattleMapRuntimeState = {
  battleMapConfig: Record<string, unknown>;
  runtimeConfig: BattleMapRuntimeConfig;
  runtimeConfigKey: string;
};

export function serializeRuntimeConfig(
  runtimeConfig: BattleMapRuntimeConfig,
): string {
  const normalizedRuntimeConfig = normalizeBattleMapRuntimeConfig({
    runtime: runtimeConfig,
  });

  return JSON.stringify({
    grid: {
      mode: normalizedRuntimeConfig.grid.mode,
      cellSize: normalizedRuntimeConfig.grid.cellSize,
      originX: normalizedRuntimeConfig.grid.originX,
      originY: normalizedRuntimeConfig.grid.originY,
    },
    map: {
      imageSrc: normalizedRuntimeConfig.map.imageSrc,
      backgroundColor: normalizedRuntimeConfig.map.backgroundColor,
    },
    camera: {
      x: normalizedRuntimeConfig.camera.x,
      y: normalizedRuntimeConfig.camera.y,
      zoom: normalizedRuntimeConfig.camera.zoom,
    },
  });
}

export function parseBattleMapRuntimeState(
  rawConfigJson: string,
): ParsedBattleMapRuntimeState {
  const parsedConfig = JSON.parse(rawConfigJson);
  const battleMapConfig = asJsonRecord(parsedConfig);
  if (!battleMapConfig) {
    throw new Error('BattleMap config must be a JSON object.');
  }

  const runtimeConfig = normalizeBattleMapRuntimeConfig(battleMapConfig);
  return {
    battleMapConfig,
    runtimeConfig,
    runtimeConfigKey: serializeRuntimeConfig(runtimeConfig),
  };
}
