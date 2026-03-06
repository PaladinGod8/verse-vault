import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';

export default function StatBlocksPage() {
  const toast = useToast();
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
  const [statblocks, setStatblocks] = useState<StatBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StatBlock | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null) {
      setWorld(null);
      setStatblocks([]);
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
            setStatblocks([]);
            setError('World not found.');
          }
          return;
        }

        const list = await window.db.statblocks.getAllByWorld(worldId);
        if (isMounted) {
          setWorld(existingWorld);
          setStatblocks(list);
        }
      } catch {
        if (isMounted) {
          setWorld(null);
          setStatblocks([]);
          setError('Unable to load statblocks right now.');
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

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }
    const sb = pendingDelete;

    setDeletingId(sb.id);

    try {
      await window.db.statblocks.delete(sb.id);
      setStatblocks((prev) => prev.filter((s) => s.id !== sb.id));
      toast.success('StatBlock deleted.', `"${sb.name}" was removed.`);
    } catch (deleteError) {
      toast.error(
        'Failed to delete statblock.',
        deleteError instanceof Error ? deleteError.message : 'Please try again.',
      );
    } finally {
      setDeletingId((current) => (current === sb.id ? null : current));
      setPendingDelete((current) => (current?.id === sb.id ? null : current));
    }
  };

  return (
    <div className="flex min-h-screen">
      <WorldSidebar worldId={worldId} />
      <main className="flex-1 space-y-6 p-6">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Link
              to={`/world/${worldId}`}
              className="inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              Back to world
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {world?.name ?? 'StatBlocks'}
            </h1>
          </div>

          {worldId !== null ? (
            <button
              type="button"
              className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              New StatBlock
            </button>
          ) : null}
        </header>

        {isLoading ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading statblocks...
          </section>
        ) : null}

        {!isLoading && error ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm">
            {error}
          </section>
        ) : null}

        {!isLoading && !error && statblocks.length === 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-600">No statblocks yet.</p>
          </section>
        ) : null}

        {!isLoading && !error && statblocks.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm text-slate-700">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {statblocks.map((sb) => (
                  <tr
                    key={sb.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{sb.name}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {sb.description ?? 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          className="text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={deletingId === sb.id}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(sb)}
                          className="text-sm font-medium text-rose-600 transition hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={deletingId === sb.id}
                        >
                          {deletingId === sb.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
      </main>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title={`Delete "${pendingDelete?.name ?? ''}"?`}
        message="This cannot be undone."
        onConfirm={() => {
          void handleDelete();
        }}
        onCancel={() => setPendingDelete(null)}
        confirmLabel="Delete"
        isConfirming={deletingId !== null}
      />
    </div>
  );
}
