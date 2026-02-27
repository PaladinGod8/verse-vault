import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LevelForm from '../components/levels/LevelForm';
import WorldSidebar from '../components/worlds/WorldSidebar';

type AddLevelInput = Parameters<DbApi['levels']['add']>[0];

export default function LevelsPage() {
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
  const [levels, setLevels] = useState<Level[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null) {
      setWorld(null);
      setLevels([]);
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
            setError('World not found.');
          }
          return;
        }

        const levelsList = await window.db.levels.getAllByWorld(worldId);
        if (isMounted) {
          setWorld(existingWorld);
          setLevels(levelsList);
        }
      } catch {
        if (isMounted) {
          setWorld(null);
          setLevels([]);
          setError('Unable to load levels right now.');
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

  const handleCreateLevel = async (data: AddLevelInput) => {
    const newLevel = await window.db.levels.add(data);
    setLevels((prev) => [newLevel, ...prev.filter((l) => l.id !== newLevel.id)]);
    setIsCreateOpen(false);
  };

  const handleUpdateLevel = async (data: AddLevelInput) => {
    if (!editingLevel) {
      return;
    }

    const { name, category, description } = data;
    const updatedLevel = await window.db.levels.update(editingLevel.id, {
      name,
      category,
      description,
    });
    setLevels((prev) =>
      prev.map((l) => (l.id === updatedLevel.id ? updatedLevel : l)),
    );
    setEditingLevel(null);
  };

  const handleDeleteLevel = async (level: Level) => {
    const isConfirmed = window.confirm(
      `Delete "${level.name}"? This cannot be undone.`,
    );
    if (!isConfirmed) {
      return;
    }

    setDeletingId(level.id);

    try {
      await window.db.levels.delete(level.id);
      setLevels((prev) => prev.filter((l) => l.id !== level.id));
    } finally {
      setDeletingId((current) => (current === level.id ? null : current));
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
              {world?.name ?? 'Levels'}
            </h1>
          </div>

          {worldId !== null ? (
            <button
              type="button"
              className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              onClick={() => setIsCreateOpen(true)}
            >
              New Level
            </button>
          ) : null}
        </header>

        {isLoading ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading levels...
          </section>
        ) : null}

        {!isLoading && error ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm">
            {error}
          </section>
        ) : null}

        {!isLoading && !error && levels.length === 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-600">No levels yet.</p>
          </section>
        ) : null}

        {!isLoading && !error && levels.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm text-slate-700">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Category
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
                {levels.map((level) => (
                  <tr
                    key={level.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{level.name}</td>
                    <td className="px-4 py-3">{level.category}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {level.description ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreateOpen(false);
                            setEditingLevel(level);
                          }}
                          className="text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={deletingId === level.id}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleDeleteLevel(level);
                          }}
                          className="text-sm font-medium text-rose-600 transition hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={deletingId === level.id}
                        >
                          {deletingId === level.id ? 'Deleting...' : 'Delete'}
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

      {isCreateOpen && worldId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-level-title"
            className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
          >
            <h2
              id="create-level-title"
              className="mb-4 text-lg font-semibold text-slate-900"
            >
              New Level
            </h2>
            <LevelForm
              mode="create"
              worldId={worldId}
              onSubmit={handleCreateLevel}
              onCancel={() => setIsCreateOpen(false)}
            />
          </section>
        </div>
      ) : null}

      {editingLevel !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-level-title"
            className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
          >
            <h2
              id="edit-level-title"
              className="mb-4 text-lg font-semibold text-slate-900"
            >
              Edit Level
            </h2>
            <LevelForm
              mode="edit"
              worldId={editingLevel.world_id}
              initialValues={editingLevel}
              onSubmit={handleUpdateLevel}
              onCancel={() => setEditingLevel(null)}
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}
