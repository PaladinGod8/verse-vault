import { useEffect, useState } from 'react';
import WorldCard from '../components/worlds/WorldCard';
import WorldForm from '../components/worlds/WorldForm';

export default function WorldsHomePage() {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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

  const handleCreateWorld = async (
    data: Parameters<DbApi['worlds']['add']>[0],
  ) => {
    const createdWorld = await window.db.worlds.add(data);
    setWorlds((previousWorlds) => [
      createdWorld,
      ...previousWorlds.filter((world) => world.id !== createdWorld.id),
    ]);
    setLoadError(null);
    setIsCreateOpen(false);
  };

  return (
    <>
      <main className="space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Worlds
            </h1>
            <p className="text-sm text-slate-600">
              Create and browse worlds. Editing tools are coming in a later
              step.
            </p>
          </div>

          <button
            type="button"
            className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            onClick={() => setIsCreateOpen(true)}
          >
            Create world
          </button>
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
              Create your first world to get started.
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

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-world-title"
            className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
          >
            <h2
              id="create-world-title"
              className="mb-4 text-lg font-semibold text-slate-900"
            >
              Create world
            </h2>
            <WorldForm
              onCreate={handleCreateWorld}
              onCancel={() => setIsCreateOpen(false)}
            />
          </section>
        </div>
      ) : null}
    </>
  );
}
