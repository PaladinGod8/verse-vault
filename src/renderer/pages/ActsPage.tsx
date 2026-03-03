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
import ActForm from '../components/acts/ActForm';
import MoveActDialog from '../components/acts/MoveActDialog';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ModalShell from '../components/ui/ModalShell';
import WorldSidebar from '../components/worlds/WorldSidebar';

const sortActsByOrder = (acts: Act[]) =>
  [...acts].sort(
    (left, right) => left.sort_order - right.sort_order || left.id - right.id,
  );

type SortableActRowProps = {
  act: Act;
  sequence: number;
  worldId: number | null;
  campaignId: number | null;
  arcId: number | null;
  deletingId: number | null;
  isPersistingOrder: boolean;
  onEdit: (act: Act) => void;
  onDelete: (act: Act) => void;
  onMove: (act: Act) => void;
};

function SortableActRow({
  act,
  sequence,
  worldId,
  campaignId,
  arcId,
  deletingId,
  isPersistingOrder,
  onEdit,
  onDelete,
  onMove,
}: SortableActRowProps) {
  const isDeleting = deletingId === act.id;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: act.id,
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
            aria-label={`Reorder act ${act.name}`}
            disabled={isDeleting || isPersistingOrder}
          >
            ::
          </button>
          <span className="tabular-nums">{sequence}</span>
        </div>
      </td>
      <td className="px-4 py-3 font-medium">{act.name}</td>
      <td className="px-4 py-3">
        <div className="flex gap-3">
          <Link
            to={`/world/${worldId}/campaign/${campaignId}/arc/${arcId}/act/${act.id}/sessions`}
            className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            Sessions
          </Link>
          <button
            type="button"
            onClick={() => onEdit(act)}
            className="text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onMove(act)}
            className="text-sm font-medium text-slate-500 transition hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isDeleting || isPersistingOrder}
          >
            Move
          </button>
          <button
            type="button"
            onClick={() => onDelete(act)}
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

export default function ActsPage() {
  const { id, campaignId, arcId } = useParams();

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

  const [arc, setArc] = useState<Arc | null>(null);
  const [acts, setActs] = useState<Act[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAct, setEditingAct] = useState<Act | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDeleteAct, setPendingDeleteAct] = useState<Act | null>(null);
  const [isPersistingOrder, setIsPersistingOrder] = useState(false);
  const [movingAct, setMovingAct] = useState<Act | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

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
    let isMounted = true;

    if (worldId === null || parsedCampaignId === null || parsedArcId === null) {
      setArc(null);
      setActs([]);
      setError('Invalid world, campaign, or arc id.');
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
        const existingArc = await window.db.arcs.getById(parsedArcId);
        if (!existingArc) {
          if (isMounted) {
            setArc(null);
            setError('Arc not found.');
          }
          return;
        }

        const actsList = await window.db.acts.getAllByArc(parsedArcId);
        if (isMounted) {
          setArc(existingArc);
          setActs(sortActsByOrder(actsList));
        }
      } catch {
        if (isMounted) {
          setArc(null);
          setActs([]);
          setError('Unable to load acts right now.');
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
  }, [worldId, parsedCampaignId, parsedArcId]);

  const handleCreateAct = async (data: { name: string }) => {
    if (parsedArcId === null) {
      return;
    }
    const newAct = await window.db.acts.add({
      arc_id: parsedArcId,
      name: data.name,
    });
    setReorderError(null);
    setActs((prev) =>
      sortActsByOrder([newAct, ...prev.filter((act) => act.id !== newAct.id)]),
    );
    setIsCreateOpen(false);
  };

  const handleUpdateAct = async (data: { name: string }) => {
    if (!editingAct) {
      return;
    }
    const updatedAct = await window.db.acts.update(editingAct.id, {
      name: data.name,
    });
    setReorderError(null);
    setActs((prev) =>
      sortActsByOrder(
        prev.map((act) => (act.id === updatedAct.id ? updatedAct : act)),
      ),
    );
    setEditingAct(null);
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
    } finally {
      setDeletingId((current) => (current === act.id ? null : current));
      setPendingDeleteAct((current) =>
        current?.id === act.id ? null : current,
      );
    }
  };

  const handleMoveConfirm = async (newArcId: number) => {
    if (!movingAct) return;
    try {
      await window.db.acts.moveTo(movingAct.id, newArcId);
      setMovingAct(null);
      setMoveError(null);
      setActs((prev) => prev.filter((a) => a.id !== movingAct.id));
    } catch {
      setMoveError('Failed to move act. Please try again.');
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
      !Number.isInteger(activeId) ||
      !Number.isInteger(overId) ||
      activeId === overId
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
          }),
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
                Arcs
              </Link>
              <span>/</span>
              <span className="text-slate-700">Acts</span>
            </nav>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {arc ? `${arc.name} — Acts` : 'Acts'}
            </h1>
          </div>

          {worldId !== null && parsedArcId !== null ? (
            <button
              type="button"
              className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              onClick={() => setIsCreateOpen(true)}
            >
              New Act
            </button>
          ) : null}
        </header>

        {isLoading ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading acts...
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

        {!isLoading && !error && acts.length === 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-600">No acts yet.</p>
          </section>
        ) : null}

        {!isLoading && !error && acts.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => {
                void handleReorderActs(event);
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
                      Actions
                    </th>
                  </tr>
                </thead>
                <SortableContext
                  items={sortedActs.map((act) => act.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
                    {sortedActs.map((act, index) => (
                      <SortableActRow
                        key={act.id}
                        act={act}
                        sequence={index + 1}
                        worldId={worldId}
                        campaignId={parsedCampaignId}
                        arcId={parsedArcId}
                        deletingId={deletingId}
                        isPersistingOrder={isPersistingOrder}
                        onEdit={(selectedAct) => {
                          setIsCreateOpen(false);
                          setEditingAct(selectedAct);
                        }}
                        onDelete={(selectedAct) => {
                          handleRequestDeleteAct(selectedAct);
                        }}
                        onMove={(selectedAct) => {
                          setMovingAct(selectedAct);
                          setMoveError(null);
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

      {isCreateOpen && parsedArcId !== null ? (
        <ModalShell
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          labelledBy="create-act-title"
          boxClassName="max-w-xl"
        >
          <h2
            id="create-act-title"
            className="mb-4 text-lg font-semibold text-slate-900"
          >
            New Act
          </h2>
          <ActForm
            onSubmit={(data) => {
              void handleCreateAct(data);
            }}
            onCancel={() => setIsCreateOpen(false)}
            submitLabel="Create Act"
          />
        </ModalShell>
      ) : null}

      {editingAct !== null ? (
        <ModalShell
          isOpen={editingAct !== null}
          onClose={() => setEditingAct(null)}
          labelledBy="edit-act-title"
          boxClassName="max-w-xl"
        >
          <h2
            id="edit-act-title"
            className="mb-4 text-lg font-semibold text-slate-900"
          >
            Edit Act
          </h2>
          <ActForm
            initialValues={editingAct}
            onSubmit={(data) => {
              void handleUpdateAct(data);
            }}
            onCancel={() => setEditingAct(null)}
            submitLabel="Save"
          />
        </ModalShell>
      ) : null}

      {movingAct !== null &&
      parsedArcId !== null &&
      parsedCampaignId !== null ? (
        <MoveActDialog
          act={movingAct}
          currentArcId={parsedArcId}
          campaignId={parsedCampaignId}
          onConfirm={(newArcId) => {
            void handleMoveConfirm(newArcId);
          }}
          onCancel={() => {
            setMovingAct(null);
            setMoveError(null);
          }}
        />
      ) : null}

      {moveError ? (
        <p className="fixed right-4 bottom-4 rounded bg-rose-50 px-4 py-2 text-sm text-rose-700 shadow">
          {moveError}
        </p>
      ) : null}

      <ConfirmDialog
        isOpen={pendingDeleteAct !== null}
        title={`Delete "${pendingDeleteAct?.name ?? ''}"?`}
        message="This cannot be undone."
        onConfirm={() => {
          void handleDeleteAct();
        }}
        onCancel={() => setPendingDeleteAct(null)}
        confirmLabel="Delete"
        isConfirming={deletingId !== null}
      />
    </div>
  );
}
