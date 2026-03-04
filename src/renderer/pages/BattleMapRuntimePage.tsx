import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BattleMapRuntimeCanvas from '../components/runtime/BattleMapRuntimeCanvas';
import RuntimeGridControls from '../components/runtime/RuntimeGridControls';
import { clampGridCellSize, DEFAULT_GRID_CELL_SIZE } from '../lib/runtimeMath';

const GRID_SAVE_DEBOUNCE_MS = 220;

const DEFAULT_RUNTIME_CONFIG: BattleMapRuntimeConfig = {
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

const BATTLEMAP_GRID_MODES = new Set<BattleMapGridMode>([
  'square',
  'hex',
  'none',
]);

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

function normalizeGridConfig(
  grid: BattleMapRuntimeGridConfig,
): BattleMapRuntimeGridConfig {
  return {
    mode: BATTLEMAP_GRID_MODES.has(grid.mode)
      ? grid.mode
      : DEFAULT_RUNTIME_CONFIG.grid.mode,
    cellSize: clampGridCellSize(
      asPositiveFiniteNumber(
        grid.cellSize,
        DEFAULT_RUNTIME_CONFIG.grid.cellSize,
      ),
      DEFAULT_RUNTIME_CONFIG.grid.cellSize,
    ),
    originX: asFiniteNumber(grid.originX, DEFAULT_RUNTIME_CONFIG.grid.originX),
    originY: asFiniteNumber(grid.originY, DEFAULT_RUNTIME_CONFIG.grid.originY),
  };
}

function normalizeBattleMapRuntimeConfig(
  parsedConfig: Record<string, unknown>,
): BattleMapRuntimeConfig {
  const runtime = asJsonRecord(parsedConfig.runtime) ?? {};
  const grid = asJsonRecord(runtime.grid) ?? {};
  const map = asJsonRecord(runtime.map) ?? {};
  const camera = asJsonRecord(runtime.camera) ?? {};

  const gridModeCandidate = grid.mode;
  const normalizedGridMode: BattleMapGridMode =
    typeof gridModeCandidate === 'string' &&
    BATTLEMAP_GRID_MODES.has(gridModeCandidate as BattleMapGridMode)
      ? (gridModeCandidate as BattleMapGridMode)
      : DEFAULT_RUNTIME_CONFIG.grid.mode;

  const backgroundColorCandidate = map.backgroundColor;
  const normalizedBackgroundColor =
    typeof backgroundColorCandidate === 'string' &&
    backgroundColorCandidate.trim().length > 0
      ? backgroundColorCandidate.trim()
      : DEFAULT_RUNTIME_CONFIG.map.backgroundColor;

  const imageSrcCandidate = map.imageSrc;
  const normalizedImageSrc =
    typeof imageSrcCandidate === 'string' && imageSrcCandidate.trim().length > 0
      ? imageSrcCandidate.trim()
      : null;

  return {
    grid: normalizeGridConfig({
      mode: normalizedGridMode,
      cellSize: asPositiveFiniteNumber(
        grid.cellSize,
        DEFAULT_RUNTIME_CONFIG.grid.cellSize,
      ),
      originX: asFiniteNumber(
        grid.originX,
        DEFAULT_RUNTIME_CONFIG.grid.originX,
      ),
      originY: asFiniteNumber(
        grid.originY,
        DEFAULT_RUNTIME_CONFIG.grid.originY,
      ),
    }),
    map: {
      imageSrc: normalizedImageSrc,
      backgroundColor: normalizedBackgroundColor,
    },
    camera: {
      x: asFiniteNumber(camera.x, DEFAULT_RUNTIME_CONFIG.camera.x),
      y: asFiniteNumber(camera.y, DEFAULT_RUNTIME_CONFIG.camera.y),
      zoom: asPositiveFiniteNumber(
        camera.zoom,
        DEFAULT_RUNTIME_CONFIG.camera.zoom,
      ),
    },
  };
}

function mergeBattleMapConfigWithRuntime(
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

function serializeGridConfig(grid: BattleMapRuntimeGridConfig): string {
  return JSON.stringify(grid);
}

export default function BattleMapRuntimePage() {
  const navigate = useNavigate();
  const { id, battleMapId } = useParams();

  const worldId = useMemo(() => {
    if (!id) {
      return null;
    }

    const parsed = Number(id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  }, [id]);

  const parsedBattleMapId = useMemo(() => {
    if (!battleMapId) {
      return null;
    }

    const parsed = Number(battleMapId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  }, [battleMapId]);

  const battleMapsRoute =
    worldId !== null ? `/world/${worldId}/battlemaps` : '/';

  const [battleMap, setBattleMap] = useState<BattleMap | null>(null);
  const [battleMapConfig, setBattleMapConfig] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [runtimeConfig, setRuntimeConfig] =
    useState<BattleMapRuntimeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingGridConfig, setIsSavingGridConfig] = useState(false);
  const [gridSaveError, setGridSaveError] = useState<string | null>(null);

  const battleMapConfigRef = useRef<Record<string, unknown> | null>(null);
  const runtimeConfigRef = useRef<BattleMapRuntimeConfig | null>(null);
  const gridSaveRequestIdRef = useRef(0);
  const gridSaveTimerRef = useRef<number | null>(null);
  const lastPersistedGridConfigRef = useRef<string | null>(null);

  const clearGridSaveTimer = useCallback(() => {
    if (gridSaveTimerRef.current !== null) {
      window.clearTimeout(gridSaveTimerRef.current);
      gridSaveTimerRef.current = null;
    }
  }, []);

  const persistRuntimeGridConfig = useCallback(async () => {
    if (parsedBattleMapId === null) {
      return;
    }

    const currentRuntimeConfig = runtimeConfigRef.current;
    const currentBattleMapConfig = battleMapConfigRef.current;
    if (!currentRuntimeConfig || !currentBattleMapConfig) {
      return;
    }

    const nextGridConfigKey = serializeGridConfig(currentRuntimeConfig.grid);
    if (nextGridConfigKey === lastPersistedGridConfigRef.current) {
      setIsSavingGridConfig(false);
      return;
    }

    const mergedConfig = mergeBattleMapConfigWithRuntime(
      currentBattleMapConfig,
      currentRuntimeConfig,
    );
    const requestId = gridSaveRequestIdRef.current + 1;
    gridSaveRequestIdRef.current = requestId;
    setIsSavingGridConfig(true);
    setGridSaveError(null);

    try {
      const updatedBattleMap = await window.db.battlemaps.update(
        parsedBattleMapId,
        {
          config: JSON.stringify(mergedConfig),
        },
      );
      if (requestId !== gridSaveRequestIdRef.current) {
        return;
      }

      const parsedUpdatedConfig = JSON.parse(updatedBattleMap.config);
      const parsedUpdatedConfigObject = asJsonRecord(parsedUpdatedConfig);
      if (!parsedUpdatedConfigObject) {
        throw new Error('BattleMap config must be a JSON object.');
      }

      const normalizedRuntimeConfig = normalizeBattleMapRuntimeConfig(
        parsedUpdatedConfigObject,
      );
      battleMapConfigRef.current = parsedUpdatedConfigObject;
      runtimeConfigRef.current = normalizedRuntimeConfig;
      lastPersistedGridConfigRef.current = serializeGridConfig(
        normalizedRuntimeConfig.grid,
      );
      setBattleMap(updatedBattleMap);
      setBattleMapConfig(parsedUpdatedConfigObject);
      setRuntimeConfig(normalizedRuntimeConfig);
      setIsSavingGridConfig(false);
      setGridSaveError(null);
    } catch (saveError) {
      if (requestId !== gridSaveRequestIdRef.current) {
        return;
      }

      setIsSavingGridConfig(false);
      setGridSaveError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to persist runtime grid settings right now.',
      );
    }
  }, [parsedBattleMapId]);

  const queueRuntimeGridPersist = useCallback(() => {
    clearGridSaveTimer();
    gridSaveTimerRef.current = window.setTimeout(() => {
      gridSaveTimerRef.current = null;
      void persistRuntimeGridConfig();
    }, GRID_SAVE_DEBOUNCE_MS);
  }, [clearGridSaveTimer, persistRuntimeGridConfig]);

  useEffect(() => {
    return () => {
      clearGridSaveTimer();
    };
  }, [clearGridSaveTimer]);

  useEffect(() => {
    battleMapConfigRef.current = battleMapConfig;
  }, [battleMapConfig]);

  useEffect(() => {
    runtimeConfigRef.current = runtimeConfig;
  }, [runtimeConfig]);

  useEffect(() => {
    let isMounted = true;
    clearGridSaveTimer();
    setIsSavingGridConfig(false);
    setGridSaveError(null);
    gridSaveRequestIdRef.current += 1;
    lastPersistedGridConfigRef.current = null;

    if (worldId === null || parsedBattleMapId === null) {
      setBattleMap(null);
      setBattleMapConfig(null);
      battleMapConfigRef.current = null;
      setRuntimeConfig(null);
      runtimeConfigRef.current = null;
      setError('Invalid world or BattleMap id.');
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadBattleMap = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const existingBattleMap =
          await window.db.battlemaps.getById(parsedBattleMapId);
        if (!existingBattleMap || existingBattleMap.world_id !== worldId) {
          if (isMounted) {
            setBattleMap(null);
            setBattleMapConfig(null);
            battleMapConfigRef.current = null;
            setRuntimeConfig(null);
            runtimeConfigRef.current = null;
            setError('BattleMap not found.');
          }
          return;
        }

        try {
          const parsedConfig = JSON.parse(existingBattleMap.config);
          const parsedConfigObject = asJsonRecord(parsedConfig);
          if (!parsedConfigObject) {
            throw new Error('BattleMap config must be a JSON object.');
          }

          const normalizedRuntimeConfig =
            normalizeBattleMapRuntimeConfig(parsedConfigObject);
          const normalizedGridConfigKey = serializeGridConfig(
            normalizedRuntimeConfig.grid,
          );

          if (isMounted) {
            setBattleMap(existingBattleMap);
            setBattleMapConfig(parsedConfigObject);
            battleMapConfigRef.current = parsedConfigObject;
            setRuntimeConfig(normalizedRuntimeConfig);
            runtimeConfigRef.current = normalizedRuntimeConfig;
            lastPersistedGridConfigRef.current = normalizedGridConfigKey;
          }
        } catch {
          if (isMounted) {
            setBattleMap(existingBattleMap);
            setBattleMapConfig(null);
            battleMapConfigRef.current = null;
            setRuntimeConfig(null);
            runtimeConfigRef.current = null;
            lastPersistedGridConfigRef.current = null;
            setError(
              'Invalid runtime config JSON. Update this BattleMap config before entering runtime.',
            );
          }
          return;
        }
      } catch {
        if (isMounted) {
          setBattleMap(null);
          setBattleMapConfig(null);
          battleMapConfigRef.current = null;
          setRuntimeConfig(null);
          runtimeConfigRef.current = null;
          lastPersistedGridConfigRef.current = null;
          setError('Unable to load BattleMap runtime right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadBattleMap();

    return () => {
      isMounted = false;
    };
  }, [clearGridSaveTimer, worldId, parsedBattleMapId]);

  const handleGridConfigChange = (
    nextGridConfig: BattleMapRuntimeGridConfig,
  ) => {
    const currentRuntimeConfig = runtimeConfigRef.current;
    if (!currentRuntimeConfig) {
      return;
    }

    const normalizedGridConfig = normalizeGridConfig(nextGridConfig);
    const nextRuntimeConfig: BattleMapRuntimeConfig = {
      ...currentRuntimeConfig,
      grid: normalizedGridConfig,
    };
    runtimeConfigRef.current = nextRuntimeConfig;
    setRuntimeConfig(nextRuntimeConfig);
    setGridSaveError(null);

    const nextGridConfigKey = serializeGridConfig(normalizedGridConfig);
    if (nextGridConfigKey !== lastPersistedGridConfigRef.current) {
      queueRuntimeGridPersist();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-4">
        <div className="space-y-2">
          <Link
            to={battleMapsRoute}
            className="inline-flex items-center text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Back to BattleMaps
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {battleMap ? `${battleMap.name} Runtime` : 'BattleMap Runtime'}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => navigate(battleMapsRoute)}
          className="shrink-0 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white"
        >
          Exit Runtime
        </button>
      </header>

      <main className="p-6">
        {isLoading ? (
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300 shadow-sm">
            Loading runtime...
          </section>
        ) : null}

        {!isLoading && error ? (
          <section className="max-w-2xl space-y-4 rounded-xl border border-amber-300/40 bg-amber-100 p-6 text-amber-900 shadow-sm">
            <h2 className="text-lg font-semibold">Runtime unavailable</h2>
            <p className="text-sm">{error}</p>
            <button
              type="button"
              onClick={() => navigate(battleMapsRoute)}
              className="inline-flex rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-950"
            >
              Exit Runtime
            </button>
          </section>
        ) : null}

        {!isLoading && !error ? (
          <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 shadow-sm">
            <div className="border-b border-slate-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">
                Runtime Canvas
              </h2>
              <p className="text-sm text-slate-300">
                Grid mode, cell size, and origin offsets update instantly and
                persist to BattleMap config.
              </p>
            </div>

            {runtimeConfig ? (
              <RuntimeGridControls
                gridConfig={runtimeConfig.grid}
                isSaving={isSavingGridConfig}
                saveError={gridSaveError}
                onChange={handleGridConfigChange}
              />
            ) : null}

            <div className="h-[55vh] min-h-[320px]">
              {runtimeConfig ? (
                <BattleMapRuntimeCanvas
                  runtimeConfig={runtimeConfig}
                  className="h-full w-full"
                />
              ) : null}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
