import { useEffect, useState } from 'react';
import WorldCard from '../components/worlds/WorldCard';

export default function WorldsHomePage() {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadWorlds = async () => {
      try {
        const data = await window.db.worlds.getAll();
        if (isMounted) {
          setWorlds(data);
        }
      } catch {
        if (isMounted) {
          setLoadError('Unable to load worlds right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadWorlds();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Worlds
        </h1>
        <p className="text-sm text-slate-600">
          Browse existing worlds. Editing tools are coming in a later step.
        </p>
      </header>

      {isLoading ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading worlds...
        </section>
      ) : null}

      {!isLoading && loadError ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 shadow-sm">
          {loadError}
        </section>
      ) : null}

      {!isLoading && !loadError && worlds.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            No worlds yet
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Once worlds are created, they will appear here.
          </p>
        </section>
      ) : null}

      {!isLoading && !loadError && worlds.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {worlds.map((world) => (
            <WorldCard key={world.id} world={world} />
          ))}
        </section>
      ) : null}
    </main>
  );
}
