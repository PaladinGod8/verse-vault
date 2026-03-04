import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

function isJsonObject(value: unknown): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null || parsedBattleMapId === null) {
      setBattleMap(null);
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
            setError('BattleMap not found.');
          }
          return;
        }

        try {
          const parsedConfig = JSON.parse(existingBattleMap.config);
          if (!isJsonObject(parsedConfig)) {
            throw new Error('BattleMap config must be a JSON object.');
          }
        } catch {
          if (isMounted) {
            setBattleMap(existingBattleMap);
            setError(
              'Invalid runtime config JSON. Update this BattleMap config before entering runtime.',
            );
          }
          return;
        }

        if (isMounted) {
          setBattleMap(existingBattleMap);
        }
      } catch {
        if (isMounted) {
          setBattleMap(null);
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
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 shadow-sm">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-white">
                Runtime Shell
              </h2>
              <p className="text-sm text-slate-300">
                Pixi renderer is not mounted in this step. Runtime canvas and
                controls will be added in the next runtime steps.
              </p>
            </div>
            <div className="mt-6 h-[55vh] rounded-lg border border-slate-700 bg-black" />
          </section>
        ) : null}
      </main>
    </div>
  );
}
