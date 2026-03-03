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
import ArcForm from '../components/arcs/ArcForm';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ModalShell from '../components/ui/ModalShell';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';

const sortArcsByOrder = (arcs: Arc[]) =>
  [...arcs].sort(
    (left, right) => left.sort_order - right.sort_order || left.id - right.id,
  );

type SortableArcRowProps = {
  arc: Arc;
  sequence: number;
  worldId: number | null;
  campaignId: number | null;
  deletingId: number | null;
  isPersistingOrder: boolean;
  onEdit: (arc: Arc) => void;
  onDelete: (arc: Arc) => void;
};

function SortableArcRow({
  arc,
  sequence,
  worldId,
  campaignId,
  deletingId,
  isPersistingOrder,
  onEdit,
  onDelete,
}: SortableArcRowProps) {
  const isDeleting = deletingId === arc.id;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: arc.id,
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
            aria-label={`Reorder arc ${arc.name}`}
            disabled={isDeleting || isPersistingOrder}
          >
            ::
          </button>
          <span className="tabular-nums">{sequence}</span>
        </div>
      </td>
      <td className="px-4 py-3 font-medium">{arc.name}</td>
      <td className="px-4 py-3">
        <div className="flex gap-3">
          <Link
            to={`/world/${worldId}/campaign/${campaignId}/arc/${arc.id}/acts`}
            className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            Acts
          </Link>
          <button
            type="button"
            onClick={() => onEdit(arc)}
            className="text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(arc)}
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

export default function ArcsPage() {
  const toast = useToast();
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
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingArc, setEditingArc] = useState<Arc | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDeleteArc, setPendingDeleteArc] = useState<Arc | null>(null);
  const [isPersistingOrder, setIsPersistingOrder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const sortedArcs = useMemo(() => sortArcsByOrder(arcs), [arcs]);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null || parsedCampaignId === null) {
      setCampaign(null);
      setArcs([]);
      setError('Invalid world or campaign id.');
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
        const existingCampaign =
          await window.db.campaigns.getById(parsedCampaignId);
        if (!existingCampaign) {
          if (isMounted) {
            setCampaign(null);
            setError('Campaign not found.');
          }
          return;
        }

        const arcsList =
          await window.db.arcs.getAllByCampaign(parsedCampaignId);
        if (isMounted) {
          setCampaign(existingCampaign);
          setArcs(sortArcsByOrder(arcsList));
        }
      } catch {
        if (isMounted) {
          setCampaign(null);
          setArcs([]);
          setError('Unable to load arcs right now.');
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

  const handleCreateArc = async (data: { name: string }) => {
    if (parsedCampaignId === null) {
      return;
    }

    try {
      const newArc = await window.db.arcs.add({
        campaign_id: parsedCampaignId,
        name: data.name,
      });
      setReorderError(null);
      setArcs((prev) =>
        sortArcsByOrder([
          newArc,
          ...prev.filter((arc) => arc.id !== newArc.id),
        ]),
      );
      setIsCreateOpen(false);
      toast.success('Arc created.', `"${newArc.name}" was added.`);
    } catch (createError) {
      toast.error(
        'Failed to create arc.',
        createError instanceof Error
          ? createError.message
          : 'Please try again.',
      );
    }
  };

  const handleUpdateArc = async (data: { name: string }) => {
    if (!editingArc) {
      return;
    }
    try {
      const updatedArc = await window.db.arcs.update(editingArc.id, {
        name: data.name,
      });
      setReorderError(null);
      setArcs((prev) =>
        sortArcsByOrder(
          prev.map((arc) => (arc.id === updatedArc.id ? updatedArc : arc)),
        ),
      );
      setEditingArc(null);
      toast.success('Arc updated.', `"${updatedArc.name}" was saved.`);
    } catch (updateError) {
      toast.error(
        'Failed to update arc.',
        updateError instanceof Error
          ? updateError.message
          : 'Please try again.',
      );
    }
  };

  const handleRequestDeleteArc = (arc: Arc) => {
    setPendingDeleteArc(arc);
  };

  const handleDeleteArc = async () => {
    if (!pendingDeleteArc) {
      return;
    }
    const arc = pendingDeleteArc;

    setDeletingId(arc.id);

    try {
      await window.db.arcs.delete(arc.id);
      setReorderError(null);
      setArcs((prev) => {
        const remainingArcs = sortArcsByOrder(
          prev.filter((existingArc) => existingArc.id !== arc.id),
        );
        return remainingArcs.map((remainingArc, index) => ({
          ...remainingArc,
          sort_order: index,
        }));
      });
      toast.success('Arc deleted.', `"${arc.name}" was removed.`);
    } catch (deleteError) {
      toast.error(
        'Failed to delete arc.',
        deleteError instanceof Error
          ? deleteError.message
          : 'Please try again.',
      );
    } finally {
      setDeletingId((current) => (current === arc.id ? null : current));
      setPendingDeleteArc((current) =>
        current?.id === arc.id ? null : current,
      );
    }
  };

  const handleReorderArcs = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || parsedCampaignId === null || isPersistingOrder) {
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

    const oldIndex = sortedArcs.findIndex((arc) => arc.id === activeId);
    const newIndex = sortedArcs.findIndex((arc) => arc.id === overId);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const previousArcs = sortedArcs;
    const previousSortOrderById = new Map(
      previousArcs.map((arc) => [arc.id, arc.sort_order]),
    );
    const reorderedArcs = arrayMove(previousArcs, oldIndex, newIndex).map(
      (arc, index) => ({
        ...arc,
        sort_order: index,
      }),
    );
    const arcsWithSortOrderChanges = reorderedArcs.filter(
      (arc) => previousSortOrderById.get(arc.id) !== arc.sort_order,
    );

    setReorderError(null);
    setArcs(reorderedArcs);
    setIsPersistingOrder(true);

    try {
      await Promise.all(
        arcsWithSortOrderChanges.map((arc) =>
          window.db.arcs.update(arc.id, {
            sort_order: arc.sort_order,
          }),
        ),
      );
    } catch (sortOrderError) {
      setReorderError(
        sortOrderError instanceof Error
          ? sortOrderError.message
          : 'Failed to save arc order. Restored the latest saved order.',
      );

      try {
        const canonicalArcs =
          await window.db.arcs.getAllByCampaign(parsedCampaignId);
        setArcs(sortArcsByOrder(canonicalArcs));
      } catch {
        setArcs(previousArcs);
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
            <Link
              to={`/world/${worldId}/campaigns`}
              className="inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              Back to campaigns
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {campaign ? `${campaign.name} — Arcs` : 'Arcs'}
            </h1>
          </div>

          {worldId !== null && parsedCampaignId !== null ? (
            <button
              type="button"
              className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              onClick={() => setIsCreateOpen(true)}
            >
              New Arc
            </button>
          ) : null}
        </header>

        {isLoading ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading arcs...
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

        {!isLoading && !error && arcs.length === 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-600">No arcs yet.</p>
          </section>
        ) : null}

        {!isLoading && !error && arcs.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => {
                void handleReorderArcs(event);
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
                  items={sortedArcs.map((arc) => arc.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
                    {sortedArcs.map((arc, index) => (
                      <SortableArcRow
                        key={arc.id}
                        arc={arc}
                        sequence={index + 1}
                        worldId={worldId}
                        campaignId={parsedCampaignId}
                        deletingId={deletingId}
                        isPersistingOrder={isPersistingOrder}
                        onEdit={(selectedArc) => {
                          setIsCreateOpen(false);
                          setEditingArc(selectedArc);
                        }}
                        onDelete={(selectedArc) => {
                          handleRequestDeleteArc(selectedArc);
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

      {isCreateOpen && parsedCampaignId !== null ? (
        <ModalShell
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          labelledBy="create-arc-title"
          boxClassName="max-w-xl"
        >
          <h2
            id="create-arc-title"
            className="mb-4 text-lg font-semibold text-slate-900"
          >
            New Arc
          </h2>
          <ArcForm
            onSubmit={(data) => {
              void handleCreateArc(data);
            }}
            onCancel={() => setIsCreateOpen(false)}
            submitLabel="Create Arc"
          />
        </ModalShell>
      ) : null}

      {editingArc !== null ? (
        <ModalShell
          isOpen={editingArc !== null}
          onClose={() => setEditingArc(null)}
          labelledBy="edit-arc-title"
          boxClassName="max-w-xl"
        >
          <h2
            id="edit-arc-title"
            className="mb-4 text-lg font-semibold text-slate-900"
          >
            Edit Arc
          </h2>
          <ArcForm
            initialValues={editingArc}
            onSubmit={(data) => {
              void handleUpdateArc(data);
            }}
            onCancel={() => setEditingArc(null)}
            submitLabel="Save"
          />
        </ModalShell>
      ) : null}

      <ConfirmDialog
        isOpen={pendingDeleteArc !== null}
        title={`Delete "${pendingDeleteArc?.name ?? ''}"?`}
        message="This cannot be undone."
        onConfirm={() => {
          void handleDeleteArc();
        }}
        onCancel={() => setPendingDeleteArc(null)}
        confirmLabel="Delete"
        isConfirming={deletingId !== null}
      />
    </div>
  );
}
