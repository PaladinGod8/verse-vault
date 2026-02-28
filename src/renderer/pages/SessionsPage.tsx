import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import MoveSessionDialog from '../components/sessions/MoveSessionDialog';
import SessionForm from '../components/sessions/SessionForm';
import WorldSidebar from '../components/worlds/WorldSidebar';

type AddSessionInput = Parameters<DbApi['sessions']['add']>[0];

const sortSessionsByOrder = (sessions: Session[]) =>
  [...sessions].sort(
    (left, right) => left.sort_order - right.sort_order || left.id - right.id,
  );

type SortableSessionRowProps = {
  session: Session;
  sequence: number;
  worldId: number | null;
  campaignId: number | null;
  arcId: number | null;
  actId: number | null;
  deletingId: number | null;
  isPersistingOrder: boolean;
  onEdit: (session: Session) => void;
  onDelete: (session: Session) => void;
  onMove: (session: Session) => void;
};

function SortableSessionRow({
  session,
  sequence,
  worldId,
  campaignId,
  arcId,
  actId,
  deletingId,
  isPersistingOrder,
  onEdit,
  onDelete,
  onMove,
}: SortableSessionRowProps) {
  const isDeleting = deletingId === session.id;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: session.id,
    disabled: isDeleting || isPersistingOrder,
  });

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`border-b border-slate-100 last:border-0 ${
        isDragging ? 'bg-slate-50' : ''
      }`}
    >
      <td className="w-28 px-4 py-3 text-slate-600">
        <div className="flex items-center gap-2">
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="inline-flex h-7 w-7 cursor-grab touch-none items-center justify-center rounded border border-slate-300 text-xs text-slate-500 transition hover:border-slate-400 hover:text-slate-700 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={`Reorder session ${session.name}`}
            disabled={isDeleting || isPersistingOrder}
          >
            ::
          </button>
          <span className="tabular-nums">{sequence}</span>
        </div>
      </td>
      <td className="px-4 py-3 font-medium">{session.name}</td>
      <td className="px-4 py-3 text-slate-500">{session.notes ?? '-'}</td>
      <td className="px-4 py-3">
        <div className="flex gap-3">
          <Link
            to={`/world/${worldId}/campaign/${campaignId}/arc/${arcId}/act/${actId}/session/${session.id}/scenes`}
            className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            Scenes
          </Link>
          <button
            type="button"
            onClick={() => onEdit(session)}
            className="text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onMove(session)}
            disabled={isDeleting || isPersistingOrder}
            className="text-sm font-medium text-slate-500 transition hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Move
          </button>
          <button
            type="button"
            onClick={() => onDelete(session)}
            className="text-sm font-medium text-rose-600 transition hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function SessionsPage() {
  const { id, campaignId, arcId, actId } = useParams();

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

  const parsedArcId = useMemo(() => {
    if (!arcId) {
      return null;
    }
    const parsed = Number(arcId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }, [arcId]);

  const parsedActId = useMemo(() => {
    if (!actId) {
      return null;
    }
    const parsed = Number(actId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }, [actId]);

  const [act, setAct] = useState<Act | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isPersistingOrder, setIsPersistingOrder] = useState(false);
  const [movingSession, setMovingSession] = useState<Session | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const sortedSessions = useMemo(
    () => sortSessionsByOrder(sessions),
    [sessions],
  );

  useEffect(() => {
    let isMounted = true;

    if (
      worldId === null ||
      parsedCampaignId === null ||
      parsedArcId === null ||
      parsedActId === null
    ) {
      setAct(null);
      setSessions([]);
      setError('Invalid world, campaign, arc, or act id.');
      setReorderError(null);
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      setReorderError(null);

      try {
        const existingAct = await window.db.acts.getById(parsedActId);
        if (!existingAct) {
          if (isMounted) {
            setAct(null);
            setError('Act not found.');
          }
          return;
        }

        const sessionsList = await window.db.sessions.getAllByAct(parsedActId);
        if (isMounted) {
          setAct(existingAct);
          setSessions(sortSessionsByOrder(sessionsList));
        }
      } catch {
        if (isMounted) {
          setAct(null);
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
  }, [worldId, parsedCampaignId, parsedArcId, parsedActId]);

  const handleCreateSession = async (data: AddSessionInput) => {
    const newSession = await window.db.sessions.add(data);
    setReorderError(null);
    setSessions((prev) =>
      sortSessionsByOrder([
        newSession,
        ...prev.filter((session) => session.id !== newSession.id),
      ]),
    );
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
    setReorderError(null);
    setSessions((prev) =>
      sortSessionsByOrder(
        prev.map((session) =>
          session.id === updatedSession.id ? updatedSession : session,
        ),
      ),
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
      setReorderError(null);
      setSessions((prev) => {
        const remainingSessions = sortSessionsByOrder(
          prev.filter((existingSession) => existingSession.id !== session.id),
        );
        return remainingSessions.map((remainingSession, index) => ({
          ...remainingSession,
          sort_order: index,
        }));
      });
    } finally {
      setDeletingId((current) => (current === session.id ? null : current));
    }
  };

  const handleMoveConfirm = async (newActId: number) => {
    if (!movingSession) {
      return;
    }
    try {
      await window.db.sessions.moveTo(movingSession.id, newActId);
      const movedId = movingSession.id;
      setMovingSession(null);
      setSessions((prev) => prev.filter((s) => s.id !== movedId));
    } catch {
      setMoveError('Failed to move session. Please try again.');
    }
  };

  const handleReorderSessions = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || parsedActId === null || isPersistingOrder) {
      return;
    }

    const activeId = Number(active.id);
    const overId = Number(over.id);
    if (
      !Number.isInteger(activeId) ||
      !Number.isInteger(overId) ||
      activeId === overId
    ) {
      return;
    }

    const oldIndex = sortedSessions.findIndex(
      (session) => session.id === activeId,
    );
    const newIndex = sortedSessions.findIndex(
      (session) => session.id === overId,
    );
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const previousSessions = sortedSessions;
    const previousSortOrderById = new Map(
      previousSessions.map((session) => [session.id, session.sort_order]),
    );
    const reorderedSessions = arrayMove(
      previousSessions,
      oldIndex,
      newIndex,
    ).map((session, index) => ({
      ...session,
      sort_order: index,
    }));
    const sessionsWithSortOrderChanges = reorderedSessions.filter(
      (session) => previousSortOrderById.get(session.id) !== session.sort_order,
    );

    setReorderError(null);
    setSessions(reorderedSessions);
    setIsPersistingOrder(true);

    try {
      await Promise.all(
        sessionsWithSortOrderChanges.map((session) =>
          window.db.sessions.update(session.id, {
            sort_order: session.sort_order,
          }),
        ),
      );
    } catch (sortOrderError) {
      setReorderError(
        sortOrderError instanceof Error
          ? sortOrderError.message
          : 'Failed to save session order. Restored the latest saved order.',
      );

      try {
        const canonicalSessions =
          await window.db.sessions.getAllByAct(parsedActId);
        setSessions(sortSessionsByOrder(canonicalSessions));
      } catch {
        setSessions(previousSessions);
      }
    } finally {
      setIsPersistingOrder(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <WorldSidebar worldId={worldId} />
      <main className="flex-1 space-y-6 p-6">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <nav className="flex items-center gap-2 text-sm text-slate-500">
              <Link
                to={`/world/${worldId}/campaigns`}
                className="font-medium transition hover:text-slate-900"
              >
                Campaign
              </Link>
              <span>/</span>
              <Link
                to={`/world/${worldId}/campaign/${parsedCampaignId}/arcs`}
                className="font-medium transition hover:text-slate-900"
              >
                Arc
              </Link>
              <span>/</span>
              <Link
                to={`/world/${worldId}/campaign/${parsedCampaignId}/arc/${parsedArcId}/acts`}
                className="font-medium transition hover:text-slate-900"
              >
                Act
              </Link>
              <span>/</span>
              <span className="text-slate-700">Sessions</span>
            </nav>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {act ? `${act.name} — Sessions` : 'Sessions'}
            </h1>
          </div>

          {worldId !== null && parsedActId !== null ? (
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

        {!isLoading && !error && reorderError ? (
          <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm">
            {reorderError}
          </section>
        ) : null}

        {!isLoading && !error && sessions.length === 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-600">No sessions yet.</p>
          </section>
        ) : null}

        {!isLoading && !error && sessions.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => {
                void handleReorderSessions(event);
              }}
            >
              <table className="w-full text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-medium text-slate-500">
                      Order
                    </th>
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
                <SortableContext
                  items={sortedSessions.map((session) => session.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
                    {sortedSessions.map((session, index) => (
                      <SortableSessionRow
                        key={session.id}
                        session={session}
                        sequence={index + 1}
                        worldId={worldId}
                        campaignId={parsedCampaignId}
                        arcId={parsedArcId}
                        actId={parsedActId}
                        deletingId={deletingId}
                        isPersistingOrder={isPersistingOrder}
                        onEdit={(selectedSession) => {
                          setIsCreateOpen(false);
                          setEditingSession(selectedSession);
                        }}
                        onDelete={(selectedSession) => {
                          void handleDeleteSession(selectedSession);
                        }}
                        onMove={(selectedSession) => {
                          setMoveError(null);
                          setMovingSession(selectedSession);
                        }}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </DndContext>
          </section>
        ) : null}
      </main>

      {isCreateOpen && parsedActId !== null ? (
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
              actId={parsedActId}
              onSubmit={handleCreateSession}
              onCancel={() => setIsCreateOpen(false)}
            />
          </section>
        </div>
      ) : null}

      {movingSession !== null &&
      parsedCampaignId !== null &&
      parsedActId !== null ? (
        <MoveSessionDialog
          session={movingSession}
          currentActId={parsedActId}
          campaignId={parsedCampaignId}
          onConfirm={(newActId) => {
            void handleMoveConfirm(newActId);
          }}
          onCancel={() => {
            setMovingSession(null);
            setMoveError(null);
          }}
        />
      ) : null}

      {moveError ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-md">
          {moveError}
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
              actId={editingSession.act_id}
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
