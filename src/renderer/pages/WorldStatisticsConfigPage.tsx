import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import WorldSidebar from '../components/worlds/WorldSidebar';

export default function WorldStatisticsConfigPage() {
  const { id } = useParams();
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

  const [world, setWorld] = useState<World | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null) {
      setWorld(null);
      setError('Invalid world id.');
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadWorld = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const existingWorld = await window.db.worlds.getById(worldId);
        if (!existingWorld) {
          if (isMounted) {
            setWorld(null);
            setError('World not found.');
          }
          return;
        }

        if (isMounted) {
          setWorld(existingWorld);
        }
      } catch {
        if (isMounted) {
          setWorld(null);
          setError('Unable to load this world right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadWorld();

    return () => {
      isMounted = false;
    };
  }, [worldId]);

  return (
    <div className="flex min-h-screen">
      <WorldSidebar worldId={worldId} />
      <main className="flex-1 space-y-6 p-6">
        <header className="space-y-2">
          <Link
            to={worldId !== null ? `/world/${worldId}` : '/'}
            className="inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            Back to world
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Statistics Configuration
          </h1>
          {world ? (
            <p className="text-sm text-slate-600">
              Configure game system statistics for <strong>{world.name}</strong>
            </p>
          ) : null}
        </header>

        {isLoading ? (
          <p className="text-sm text-slate-600">Loading...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : world ? (
          <div className="space-y-8">
            <section>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Primary Resources
              </h2>
              <p className="text-sm text-slate-600">
                Resources have current and maximum values (e.g., HP, MP, AC).
              </p>
              {/* Resource CRUD will be added in Step 06 */}
            </section>

            <section>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Core Ability Scores & Passive Scores
              </h2>
              <p className="text-sm text-slate-600">
                Passive scores contribute to skill checks and saving throws
                (e.g., STR, DEX, Proficiency Bonus).
              </p>
              {/* Passive score CRUD will be added in Step 07 */}
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
