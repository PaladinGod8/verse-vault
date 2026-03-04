import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BattleMapRuntimeCanvas from '../components/runtime/BattleMapRuntimeCanvas';

const DEFAULT_RUNTIME_CONFIG: BattleMapRuntimeConfig = {
  grid: {
    mode: 'square',
    cellSize: 50,
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
    grid: {
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
    },
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
  const [runtimeConfig, setRuntimeConfig] =
    useState<BattleMapRuntimeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null || parsedBattleMapId === null) {
      setBattleMap(null);
      setRuntimeConfig(null);
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
            setRuntimeConfig(null);
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
          if (isMounted) {
            setBattleMap(existingBattleMap);
            setRuntimeConfig(normalizedRuntimeConfig);
          }
        } catch {
          if (isMounted) {
            setBattleMap(existingBattleMap);
            setRuntimeConfig(null);
            setError(
              'Invalid runtime config JSON. Update this BattleMap config before entering runtime.',
            );
          }
          return;
        }
      } catch {
        if (isMounted) {
          setBattleMap(null);
          setRuntimeConfig(null);
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
  }, [worldId, parsedBattleMapId]);

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
                Pixi stage bootstrap is active for background and map layers.
              </p>
            </div>
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
