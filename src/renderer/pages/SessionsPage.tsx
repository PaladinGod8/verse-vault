import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SessionForm from '../components/sessions/SessionForm';
import WorldSidebar from '../components/worlds/WorldSidebar';

type AddSessionInput = Parameters<DbApi['sessions']['add']>[0];

export default function SessionsPage() {
  const { id, campaignId } = useParams();

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

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null || parsedCampaignId === null) {
      setCampaign(null);
      setSessions([]);
      setError('Invalid world or campaign id.');
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const existingCampaign =
          await window.db.campaigns.getById(parsedCampaignId);
        if (!existingCampaign) {
          if (isMounted) {
            setCampaign(null);
            setError('Campaign not found.');
          }
          return;
        }

        const sessionsList =
          await window.db.sessions.getAllByCampaign(parsedCampaignId);
        if (isMounted) {
          setCampaign(existingCampaign);
          setSessions(sessionsList);
        }
      } catch {
        if (isMounted) {
          setCampaign(null);
          setSessions([]);
          setError('Unable to load sessions right now.');
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
  }, [worldId, parsedCampaignId]);

  const handleCreateSession = async (data: AddSessionInput) => {
    const newSession = await window.db.sessions.add(data);
    setSessions((prev) => [
      newSession,
      ...prev.filter((s) => s.id !== newSession.id),
    ]);
    setIsCreateOpen(false);
  };

  const handleUpdateSession = async (data: AddSessionInput) => {
    if (!editingSession) {
      return;
    }

    const { name, notes } = data;
    const updatedSession = await window.db.sessions.update(editingSession.id, {
      name,
      notes,
    });
    setSessions((prev) =>
      prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)),
    );
    setEditingSession(null);
  };

  const handleDeleteSession = async (session: Session) => {
    const isConfirmed = window.confirm(
      `Delete "${session.name}"? This cannot be undone.`,
    );
    if (!isConfirmed) {
      return;
    }

    setDeletingId(session.id);

    try {
      await window.db.sessions.delete(session.id);
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
    } finally {
      setDeletingId((current) => (current === session.id ? null : current));
    }
  };

  return (
    <div className="flex min-h-screen">
      <WorldSidebar worldId={worldId} />
      <main className="flex-1 space-y-6 p-6">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Link
              to={`/world/${worldId}/campaigns`}
              className="inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              Back to campaigns
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {campaign?.name ?? 'Sessions'}
            </h1>
          </div>

          {worldId !== null && parsedCampaignId !== null ? (
            <button
              type="button"
              className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              onClick={() => setIsCreateOpen(true)}
            >
              New Session
            </button>
          ) : null}
        </header>

        {isLoading ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading sessions...
          </section>
        ) : null}

        {!isLoading && error ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm">
            {error}
          </section>
        ) : null}

        {!isLoading && !error && sessions.length === 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-600">No sessions yet.</p>
          </section>
        ) : null}

        {!isLoading && !error && sessions.length > 0 ? (
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
                {sessions.map((session) => (
                  <tr
                    key={session.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{session.name}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {session.notes ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <Link
                          to={`/world/${worldId}/campaign/${parsedCampaignId}/session/${session.id}/scenes`}
                          className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
                        >
                          Scenes
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreateOpen(false);
                            setEditingSession(session);
                          }}
                          className="text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={deletingId === session.id}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleDeleteSession(session);
                          }}
                          className="text-sm font-medium text-rose-600 transition hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={deletingId === session.id}
                        >
                          {deletingId === session.id ? 'Deleting...' : 'Delete'}
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

      {isCreateOpen && parsedCampaignId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-session-title"
            className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
          >
            <h2
              id="create-session-title"
              className="mb-4 text-lg font-semibold text-slate-900"
            >
              New Session
            </h2>
            <SessionForm
              mode="create"
              campaignId={parsedCampaignId}
              onSubmit={handleCreateSession}
              onCancel={() => setIsCreateOpen(false)}
            />
          </section>
        </div>
      ) : null}

      {editingSession !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-session-title"
            className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
          >
            <h2
              id="edit-session-title"
              className="mb-4 text-lg font-semibold text-slate-900"
            >
              Edit Session
            </h2>
            <SessionForm
              mode="edit"
              campaignId={editingSession.campaign_id}
              initialValues={editingSession}
              onSubmit={handleUpdateSession}
              onCancel={() => setEditingSession(null)}
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}
