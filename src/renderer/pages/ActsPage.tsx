import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ActForm from '../components/acts/ActForm';
import ActsListSection from '../components/acts/ActsListSection';
import MoveActDialog from '../components/acts/MoveActDialog';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ModalShell from '../components/ui/ModalShell';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';
import { sortActsByOrder, useArcActsData } from '../hooks/useArcActsData';
import { parsePositiveIntParam } from '../lib/routeParams';

export default function ActsPage() {
  const toast = useToast();
  const { id, campaignId, arcId } = useParams();

  const worldId = useMemo(() => parsePositiveIntParam(id), [id]);
  const parsedCampaignId = useMemo(() => parsePositiveIntParam(campaignId), [campaignId]);
  const parsedArcId = useMemo(() => parsePositiveIntParam(arcId), [arcId]);

  const { arc, acts, isLoading, error, setActs } = useArcActsData(
    worldId,
    parsedCampaignId,
    parsedArcId,
  );
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAct, setEditingAct] = useState<Act | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDeleteAct, setPendingDeleteAct] = useState<Act | null>(null);
  const [isPersistingOrder, setIsPersistingOrder] = useState(false);
  const [movingAct, setMovingAct] = useState<Act | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const sortedActs = useMemo(() => sortActsByOrder(acts), [acts]);

  useEffect(() => {
    setReorderError(null);
  }, [worldId, parsedCampaignId, parsedArcId]);

  const handleCreateAct = async (data: { name: string; }) => {
    if (parsedArcId === null) {
      return;
    }

    try {
      const newAct = await window.db.acts.add({
        arc_id: parsedArcId,
        name: data.name,
      });
      setReorderError(null);
      setActs((prev) =>
        sortActsByOrder([
          newAct,
          ...prev.filter((act) => act.id !== newAct.id),
        ])
      );
      setIsCreateOpen(false);
      toast.success('Act created.', `"${newAct.name}" was added.`);
    } catch (createError) {
      toast.error(
        'Failed to create act.',
        createError instanceof Error
          ? createError.message
          : 'Please try again.',
      );
    }
  };

  const handleUpdateAct = async (data: { name: string; }) => {
    if (!editingAct) {
      return;
    }
    try {
      const updatedAct = await window.db.acts.update(editingAct.id, {
        name: data.name,
      });
      setReorderError(null);
      setActs((prev) =>
        sortActsByOrder(
          prev.map((act) => (act.id === updatedAct.id ? updatedAct : act)),
        )
      );
      setEditingAct(null);
      toast.success('Act updated.', `"${updatedAct.name}" was saved.`);
    } catch (updateError) {
      toast.error(
        'Failed to update act.',
        updateError instanceof Error
          ? updateError.message
          : 'Please try again.',
      );
    }
  };

  const handleRequestDeleteAct = (act: Act) => {
    setPendingDeleteAct(act);
  };

  const handleDeleteAct = async () => {
    if (!pendingDeleteAct) {
      return;
    }
    const act = pendingDeleteAct;

    setDeletingId(act.id);

    try {
      await window.db.acts.delete(act.id);
      setReorderError(null);
      setActs((prev) => {
        const remainingActs = sortActsByOrder(
          prev.filter((existingAct) => existingAct.id !== act.id),
        );
        return remainingActs.map((remainingAct, index) => ({
          ...remainingAct,
          sort_order: index,
        }));
      });
      toast.success('Act deleted.', `"${act.name}" was removed.`);
    } catch (deleteError) {
      toast.error(
        'Failed to delete act.',
        deleteError instanceof Error
          ? deleteError.message
          : 'Please try again.',
      );
    } finally {
      setDeletingId((current) => (current === act.id ? null : current));
      setPendingDeleteAct((current) => current?.id === act.id ? null : current);
    }
  };

  const handleMoveConfirm = async (newArcId: number) => {
    if (!movingAct) {
      return;
    }

    const act = movingAct;

    try {
      await window.db.acts.moveTo(act.id, newArcId);
      setMovingAct(null);
      setActs((prev) => prev.filter((a) => a.id !== act.id));
      toast.success('Act moved.', `"${act.name}" was moved to another arc.`);
    } catch (moveError) {
      toast.error(
        'Failed to move act.',
        moveError instanceof Error ? moveError.message : 'Please try again.',
      );
    }
  };

  const handleReorderActs = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || parsedArcId === null || isPersistingOrder) {
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

    const oldIndex = sortedActs.findIndex((act) => act.id === activeId);
    const newIndex = sortedActs.findIndex((act) => act.id === overId);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const previousActs = sortedActs;
    const previousSortOrderById = new Map(
      previousActs.map((act) => [act.id, act.sort_order]),
    );
    const reorderedActs = arrayMove(previousActs, oldIndex, newIndex).map(
      (act, index) => ({
        ...act,
        sort_order: index,
      }),
    );
    const actsWithSortOrderChanges = reorderedActs.filter(
      (act) => previousSortOrderById.get(act.id) !== act.sort_order,
    );

    setReorderError(null);
    setActs(reorderedActs);
    setIsPersistingOrder(true);

    try {
      await Promise.all(
        actsWithSortOrderChanges.map((act) =>
          window.db.acts.update(act.id, {
            sort_order: act.sort_order,
          })
        ),
      );
    } catch (sortOrderError) {
      setReorderError(
        sortOrderError instanceof Error
          ? sortOrderError.message
          : 'Failed to save act order. Restored the latest saved order.',
      );

      try {
        const canonicalActs = await window.db.acts.getAllByArc(parsedArcId);
        setActs(sortActsByOrder(canonicalActs));
      } catch {
        setActs(previousActs);
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
                Arcs
              </Link>
              <span>/</span>
              <span className='text-slate-700'>Acts</span>
            </nav>
            <h1 className='text-2xl font-semibold tracking-tight text-slate-900'>
              {arc ? `${arc.name} — Acts` : 'Acts'}
            </h1>
          </div>

          {worldId !== null && parsedArcId !== null
            ? (
              <button
                type='button'
                className='shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800'
                onClick={() => setIsCreateOpen(true)}
              >
                New Act
              </button>
            )
            : null}
        </header>

        <ActsListSection
          isLoading={isLoading}
          error={error}
          reorderError={reorderError}
          acts={acts}
          sortedActs={sortedActs}
          sensors={sensors}
          worldId={worldId}
          campaignId={parsedCampaignId}
          arcId={parsedArcId}
          deletingId={deletingId}
          isPersistingOrder={isPersistingOrder}
          onDragEnd={(event) => {
            void handleReorderActs(event);
          }}
          onEdit={(selectedAct) => {
            setIsCreateOpen(false);
            setEditingAct(selectedAct);
          }}
          onDelete={handleRequestDeleteAct}
          onMove={setMovingAct}
        />
      </main>

      {isCreateOpen && parsedArcId !== null
        ? (
          <ModalShell
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            labelledBy='create-act-title'
            boxClassName='max-w-xl'
          >
            <h2
              id='create-act-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              New Act
            </h2>
            <ActForm
              onSubmit={(data) => {
                void handleCreateAct(data);
              }}
              onCancel={() => setIsCreateOpen(false)}
              submitLabel='Create Act'
            />
          </ModalShell>
        )
        : null}

      {editingAct !== null
        ? (
          <ModalShell
            isOpen={editingAct !== null}
            onClose={() => setEditingAct(null)}
            labelledBy='edit-act-title'
            boxClassName='max-w-xl'
          >
            <h2
              id='edit-act-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Edit Act
            </h2>
            <ActForm
              initialValues={editingAct}
              onSubmit={(data) => {
                void handleUpdateAct(data);
              }}
              onCancel={() => setEditingAct(null)}
              submitLabel='Save'
            />
          </ModalShell>
        )
        : null}

      {movingAct !== null
          && parsedArcId !== null
          && parsedCampaignId !== null
        ? (
          <MoveActDialog
            act={movingAct}
            currentArcId={parsedArcId}
            campaignId={parsedCampaignId}
            onConfirm={(newArcId) => {
              void handleMoveConfirm(newArcId);
            }}
            onCancel={() => {
              setMovingAct(null);
            }}
          />
        )
        : null}

      <ConfirmDialog
        isOpen={pendingDeleteAct !== null}
        title={`Delete "${pendingDeleteAct?.name ?? ''}"?`}
        message='This cannot be undone.'
        onConfirm={() => {
          void handleDeleteAct();
        }}
        onCancel={() => setPendingDeleteAct(null)}
        confirmLabel='Delete'
        isConfirming={deletingId !== null}
      />
    </div>
  );
}
