import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SceneForm from '../components/scenes/SceneForm';
import WorldSidebar from '../components/worlds/WorldSidebar';

type AddSceneInput = Parameters<DbApi['scenes']['add']>[0];

export default function ScenesPage() {
  const { id, campaignId, sessionId } = useParams();

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

  const parsedCampaignId = useMemo(() => {
    if (!campaignId) {
      return null;
    }
    const parsed = Number(campaignId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }, [campaignId]);

  const parsedSessionId = useMemo(() => {
    if (!sessionId) {
      return null;
    }
    const parsed = Number(sessionId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }, [sessionId]);

  const [session, setSession] = useState<Session | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (
      worldId === null ||
      parsedCampaignId === null ||
      parsedSessionId === null
    ) {
      setSession(null);
      setScenes([]);
      setError('Invalid world, campaign, or session id.');
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const existingSession =
          await window.db.sessions.getById(parsedSessionId);
        if (!existingSession) {
          if (isMounted) {
            setSession(null);
            setError('Session not found.');
          }
          return;
        }

        const scenesList =
          await window.db.scenes.getAllBySession(parsedSessionId);
        if (isMounted) {
          setSession(existingSession);
          setScenes(scenesList);
        }
      } catch {
        if (isMounted) {
          setSession(null);
          setScenes([]);
          setError('Unable to load scenes right now.');
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
  }, [worldId, parsedCampaignId, parsedSessionId]);

  const handleCreateScene = async (data: AddSceneInput) => {
    const newScene = await window.db.scenes.add(data);
    setScenes((prev) => [
      newScene,
      ...prev.filter((s) => s.id !== newScene.id),
    ]);
    setIsCreateOpen(false);
  };

  const handleUpdateScene = async (data: AddSceneInput) => {
    if (!editingScene) {
      return;
    }

    const { name, notes, payload } = data;
    const updatedScene = await window.db.scenes.update(editingScene.id, {
      name,
      notes,
      payload,
    });
    setScenes((prev) =>
      prev.map((s) => (s.id === updatedScene.id ? updatedScene : s)),
    );
    setEditingScene(null);
  };

  const handleDeleteScene = async (scene: Scene) => {
    const isConfirmed = window.confirm(
      `Delete "${scene.name}"? This cannot be undone.`,
    );
    if (!isConfirmed) {
      return;
    }

    setDeletingId(scene.id);

    try {
      await window.db.scenes.delete(scene.id);
      setScenes((prev) => prev.filter((s) => s.id !== scene.id));
    } finally {
      setDeletingId((current) => (current === scene.id ? null : current));
    }
  };

  return (
    <div className="flex min-h-screen">
      <WorldSidebar worldId={worldId} />
      <main className="flex-1 space-y-6 p-6">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Link
              to={`/world/${worldId}/campaign/${parsedCampaignId}/sessions`}
              className="inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              Back to sessions
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {session?.name ?? 'Scenes'}
            </h1>
          </div>

          {worldId !== null &&
          parsedCampaignId !== null &&
          parsedSessionId !== null ? (
            <button
              type="button"
              className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              onClick={() => setIsCreateOpen(true)}
            >
              New Scene
            </button>
          ) : null}
        </header>

        {isLoading ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading scenes...
          </section>
        ) : null}

        {!isLoading && error ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm">
            {error}
          </section>
        ) : null}

        {!isLoading && !error && scenes.length === 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-600">No scenes yet.</p>
          </section>
        ) : null}

        {!isLoading && !error && scenes.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm text-slate-700">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Notes
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {scenes.map((scene) => (
                  <tr
                    key={scene.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{scene.name}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {scene.notes ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreateOpen(false);
                            setEditingScene(scene);
                          }}
                          className="text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={deletingId === scene.id}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleDeleteScene(scene);
                          }}
                          className="text-sm font-medium text-rose-600 transition hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={deletingId === scene.id}
                        >
                          {deletingId === scene.id ? 'Deleting...' : 'Delete'}
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

      {isCreateOpen && parsedSessionId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-scene-title"
            className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
          >
            <h2
              id="create-scene-title"
              className="mb-4 text-lg font-semibold text-slate-900"
            >
              New Scene
            </h2>
            <SceneForm
              mode="create"
              sessionId={parsedSessionId}
              onSubmit={handleCreateScene}
              onCancel={() => setIsCreateOpen(false)}
            />
          </section>
        </div>
      ) : null}

      {editingScene !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-scene-title"
            className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
          >
            <h2
              id="edit-scene-title"
              className="mb-4 text-lg font-semibold text-slate-900"
            >
              Edit Scene
            </h2>
            <SceneForm
              mode="edit"
              sessionId={editingScene.session_id}
              initialValues={editingScene}
              onSubmit={handleUpdateScene}
              onCancel={() => setEditingScene(null)}
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}
