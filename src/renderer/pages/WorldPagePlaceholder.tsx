import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

function formatTimestamp(timestamp: string | null, fallback: string): string {
  if (!timestamp) {
    return fallback;
  }

  const normalized = timestamp.includes('T')
    ? timestamp
    : `${timestamp.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export default function WorldPagePlaceholder() {
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

        const viewedWorld = await window.db.worlds.markViewed(worldId);
        if (isMounted) {
          setWorld(viewedWorld);
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
    <main className="space-y-6">
      <header className="space-y-2">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          Back to worlds
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          World Placeholder
        </h1>
        <p className="text-sm text-slate-600">
          This route is ready for the upcoming full world workspace.
        </p>
      </header>

      {isLoading ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading world...
        </section>
      ) : null}

      {!isLoading && error ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm">
          {error}
        </section>
      ) : null}

      {!isLoading && !error && world ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">{world.name}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {world.short_description?.trim() || 'No description yet.'}
          </p>
          <dl className="mt-4 space-y-2 text-sm text-slate-600">
            <div className="flex items-start justify-between gap-3">
              <dt className="font-medium text-slate-700">World id</dt>
              <dd>{world.id}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="font-medium text-slate-700">Last viewed</dt>
              <dd>{formatTimestamp(world.last_viewed_at, 'Never')}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="font-medium text-slate-700">Updated</dt>
              <dd>{formatTimestamp(world.updated_at, 'Unknown')}</dd>
            </div>
          </dl>
        </section>
      ) : null}
    </main>
  );
}
