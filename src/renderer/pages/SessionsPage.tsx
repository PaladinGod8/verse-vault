import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import MoveSessionDialog from '../components/sessions/MoveSessionDialog';
import SessionForm from '../components/sessions/SessionForm';
import SessionsListSection from '../components/sessions/SessionsListSection';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ModalShell from '../components/ui/ModalShell';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';
import { sortSessionsByOrder, useActSessionsData } from '../hooks/useActSessionsData';
import { parsePositiveIntParam } from '../lib/routeParams';

type AddSessionInput = Parameters<DbApi['sessions']['add']>[0];

export default function SessionsPage() {
  const toast = useToast();
  const { id, campaignId, arcId, actId } = useParams();

  const worldId = useMemo(() => parsePositiveIntParam(id), [id]);
  const parsedCampaignId = useMemo(() => parsePositiveIntParam(campaignId), [campaignId]);
  const parsedArcId = useMemo(() => parsePositiveIntParam(arcId), [arcId]);
  const parsedActId = useMemo(() => parsePositiveIntParam(actId), [actId]);

  const { act, sessions, isLoading, error, setSessions } = useActSessionsData(
    worldId,
    parsedCampaignId,
    parsedArcId,
    parsedActId,
  );
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDeleteSession, setPendingDeleteSession] = useState<Session | null>(null);
  const [isPersistingOrder, setIsPersistingOrder] = useState(false);
  const [movingSession, setMovingSession] = useState<Session | null>(null);

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
    setReorderError(null);
  }, [worldId, parsedCampaignId, parsedArcId, parsedActId]);

  const handleCreateSession = async (data: AddSessionInput) => {
    try {
      const newSession = await window.db.sessions.add(data);
      setReorderError(null);
      setSessions((prev) =>
        sortSessionsByOrder([
          newSession,
          ...prev.filter((session) => session.id !== newSession.id),
        ])
      );
      setIsCreateOpen(false);
      toast.success('Session created.', `"${newSession.name}" was added.`);
    } catch (createError) {
      toast.error(
        'Failed to create session.',
        createError instanceof Error
          ? createError.message
          : 'Please try again.',
      );
      throw createError;
    }
  };

  const handleUpdateSession = async (data: AddSessionInput) => {
    if (!editingSession) {
      return;
    }

    const { name, notes, planned_at } = data;

    try {
      const updatedSession = await window.db.sessions.update(editingSession.id, {
        name,
        notes,
        planned_at,
      });
      setReorderError(null);
      setSessions((prev) =>
        sortSessionsByOrder(
          prev.map((session) => session.id === updatedSession.id ? updatedSession : session),
        )
      );
      setEditingSession(null);
      toast.success('Session updated.', `"${updatedSession.name}" was saved.`);
    } catch (updateError) {
      toast.error(
        'Failed to update session.',
        updateError instanceof Error
          ? updateError.message
          : 'Please try again.',
      );
      throw updateError;
    }
  };

  const handleRequestDeleteSession = (session: Session) => {
    setPendingDeleteSession(session);
  };

  const handleDeleteSession = async () => {
    if (!pendingDeleteSession) {
      return;
    }
    const session = pendingDeleteSession;

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
      toast.success('Session deleted.', `"${session.name}" was removed.`);
    } catch (deleteError) {
      toast.error(
        'Failed to delete session.',
        deleteError instanceof Error
          ? deleteError.message
          : 'Please try again.',
      );
    } finally {
      setDeletingId((current) => (current === session.id ? null : current));
      setPendingDeleteSession((current) => current?.id === session.id ? null : current);
    }
  };

  const handleMoveConfirm = async (newActId: number) => {
    if (!movingSession) {
      return;
    }

    const session = movingSession;

    try {
      await window.db.sessions.moveTo(session.id, newActId);
      const movedId = session.id;
      setMovingSession(null);
      setSessions((prev) => prev.filter((s) => s.id !== movedId));
      toast.success(
        'Session moved.',
        `"${session.name}" was moved to another act.`,
      );
    } catch (moveError) {
      toast.error(
        'Failed to move session.',
        moveError instanceof Error ? moveError.message : 'Please try again.',
      );
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
      !Number.isInteger(activeId)
      || !Number.isInteger(overId)
      || activeId === overId
    ) {
      return;
    }

    const oldIndex = sortedSessions.findIndex((session) => session.id === activeId);
    const newIndex = sortedSessions.findIndex((session) => session.id === overId);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const previousSessions = sortedSessions;
    const previousSortOrderById = new Map(
      previousSessions.map((session) => [session.id, session.sort_order]),
    );
    const reorderedSessions = arrayMove(previousSessions, oldIndex, newIndex).map(
      (session, index) => ({ ...session, sort_order: index }),
    );
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
          })
        ),
      );
    } catch (sortOrderError) {
      setReorderError(
        sortOrderError instanceof Error
          ? sortOrderError.message
          : 'Failed to save session order. Restored the latest saved order.',
      );

      try {
        const canonicalSessions = await window.db.sessions.getAllByAct(parsedActId);
        setSessions(sortSessionsByOrder(canonicalSessions));
      } catch {
        setSessions(previousSessions);
      }
    } finally {
      setIsPersistingOrder(false);
    }
  };

  return (
    <div className='flex min-h-screen'>
      <WorldSidebar worldId={worldId} />
      <main className='flex-1 space-y-6 p-6'>
        <header className='flex items-start justify-between gap-4'>
          <div className='space-y-2'>
            <nav className='flex items-center gap-2 text-sm text-slate-500'>
              <Link
                to={`/world/${worldId}/campaigns`}
                className='font-medium transition hover:text-slate-900'
              >
                Campaign
              </Link>
              <span>/</span>
              <Link
                to={`/world/${worldId}/campaign/${parsedCampaignId}/arcs`}
                className='font-medium transition hover:text-slate-900'
              >
                Arc
              </Link>
              <span>/</span>
              <Link
                to={`/world/${worldId}/campaign/${parsedCampaignId}/arc/${parsedArcId}/acts`}
                className='font-medium transition hover:text-slate-900'
              >
                Act
              </Link>
              <span>/</span>
              <span className='text-slate-700'>Sessions</span>
            </nav>
            <h1 className='text-2xl font-semibold tracking-tight text-slate-900'>
              {act ? `${act.name} — Sessions` : 'Sessions'}
            </h1>
          </div>

          {worldId !== null && parsedActId !== null
            ? (
              <button
                type='button'
                className='shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800'
                onClick={() => setIsCreateOpen(true)}
              >
                New Session
              </button>
            )
            : null}
        </header>

        <SessionsListSection
          isLoading={isLoading}
          error={error}
          reorderError={reorderError}
          sessions={sessions}
          sortedSessions={sortedSessions}
          sensors={sensors}
          worldId={worldId}
          campaignId={parsedCampaignId}
          arcId={parsedArcId}
          actId={parsedActId}
          deletingId={deletingId}
          isPersistingOrder={isPersistingOrder}
          onDragEnd={(event) => {
            void handleReorderSessions(event);
          }}
          onEdit={(selectedSession) => {
            setIsCreateOpen(false);
            setEditingSession(selectedSession);
          }}
          onDelete={handleRequestDeleteSession}
          onMove={setMovingSession}
        />
      </main>

      {isCreateOpen && parsedActId !== null
        ? (
          <ModalShell
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            labelledBy='create-session-title'
            boxClassName='max-w-xl'
          >
            <h2
              id='create-session-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              New Session
            </h2>
            <SessionForm
              mode='create'
              actId={parsedActId}
              onSubmit={handleCreateSession}
              onCancel={() => setIsCreateOpen(false)}
            />
          </ModalShell>
        )
        : null}

      {movingSession !== null
          && parsedCampaignId !== null
          && parsedActId !== null
        ? (
          <MoveSessionDialog
            session={movingSession}
            currentActId={parsedActId}
            campaignId={parsedCampaignId}
            onConfirm={(newActId) => {
              void handleMoveConfirm(newActId);
            }}
            onCancel={() => {
              setMovingSession(null);
            }}
          />
        )
        : null}

      {editingSession !== null
        ? (
          <ModalShell
            isOpen={editingSession !== null}
            onClose={() => setEditingSession(null)}
            labelledBy='edit-session-title'
            boxClassName='max-w-xl'
          >
            <h2
              id='edit-session-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Edit Session
            </h2>
            <SessionForm
              mode='edit'
              actId={editingSession.act_id}
              initialValues={editingSession}
              onSubmit={handleUpdateSession}
              onCancel={() => setEditingSession(null)}
            />
          </ModalShell>
        )
        : null}

      <ConfirmDialog
        isOpen={pendingDeleteSession !== null}
        title={`Delete "${pendingDeleteSession?.name ?? ''}"?`}
        message='This cannot be undone.'
        onConfirm={() => {
          void handleDeleteSession();
        }}
        onCancel={() => setPendingDeleteSession(null)}
        confirmLabel='Delete'
        isConfirming={deletingId !== null}
      />
    </div>
  );
}
