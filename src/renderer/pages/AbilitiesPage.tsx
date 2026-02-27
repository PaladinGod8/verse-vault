import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import WorldSidebar from '../components/worlds/WorldSidebar';

export default function AbilitiesPage() {
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
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null) {
      setWorld(null);
      setAbilities([]);
      setError('Invalid world id.');
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const existingWorld = await window.db.worlds.getById(worldId);
        if (!existingWorld) {
          if (isMounted) {
            setWorld(null);
            setAbilities([]);
            setError('World not found.');
          }
          return;
        }

        const abilityList = await window.db.abilities.getAllByWorld(worldId);
        if (isMounted) {
          setWorld(existingWorld);
          setAbilities(abilityList);
        }
      } catch {
        if (isMounted) {
          setWorld(null);
          setAbilities([]);
          setError('Unable to load abilities right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

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
            to={`/world/${worldId}`}
            className="inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            Back to world
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {world?.name ?? 'Abilities'}
          </h1>
        </header>

        {isLoading ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading abilities...
          </section>
        ) : null}

        {!isLoading && error ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm">
            {error}
          </section>
        ) : null}

        {!isLoading && !error && abilities.length === 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-600">No abilities yet.</p>
          </section>
        ) : null}

        {!isLoading && !error && abilities.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm text-slate-700">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Subtype
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Trigger
                  </th>
                </tr>
              </thead>
              <tbody>
                {abilities.map((ability) => (
                  <tr
                    key={ability.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{ability.name}</td>
                    <td className="px-4 py-3">{ability.type}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {ability.passive_subtype || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {ability.trigger || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
      </main>
    </div>
  );
}
