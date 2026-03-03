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
import MoveSceneDialog from '../components/scenes/MoveSceneDialog';
import SceneForm from '../components/scenes/SceneForm';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ModalShell from '../components/ui/ModalShell';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';

type AddSceneInput = Parameters<DbApi['scenes']['add']>[0];

const sortScenesByOrder = (scenes: Scene[]) =>
  [...scenes].sort(
    (left, right) => left.sort_order - right.sort_order || left.id - right.id,
  );

type SortableSceneRowProps = {
  scene: Scene;
  sequence: number;
  deletingId: number | null;
  isPersistingOrder: boolean;
  onEdit: (scene: Scene) => void;
  onMove: (scene: Scene) => void;
  onDelete: (scene: Scene) => void;
};

function SortableSceneRow({
  scene,
  sequence,
  deletingId,
  isPersistingOrder,
  onEdit,
  onMove,
  onDelete,
}: SortableSceneRowProps) {
  const isDeleting = deletingId === scene.id;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: scene.id,
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
            aria-label={`Reorder scene ${scene.name}`}
            disabled={isDeleting || isPersistingOrder}
          >
            ::
          </button>
          <span className="tabular-nums">{sequence}</span>
        </div>
      </td>
      <td className="px-4 py-3 font-medium">{scene.name}</td>
      <td className="px-4 py-3 text-slate-500">{scene.notes ?? '-'}</td>
      <td className="px-4 py-3">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onEdit(scene)}
            className="text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onMove(scene)}
            disabled={isDeleting || isPersistingOrder}
            className="text-sm font-medium text-slate-500 transition hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Move
          </button>
          <button
            type="button"
            onClick={() => onDelete(scene)}
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

export default function ScenesPage() {
  const toast = useToast();
  const { id, campaignId, arcId, actId, sessionId } = useParams();

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
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDeleteScene, setPendingDeleteScene] = useState<Scene | null>(
    null,
  );
  const [isPersistingOrder, setIsPersistingOrder] = useState(false);
  const [movingScene, setMovingScene] = useState<Scene | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const sortedScenes = useMemo(() => sortScenesByOrder(scenes), [scenes]);

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
          setScenes(sortScenesByOrder(scenesList));
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
    try {
      const newScene = await window.db.scenes.add(data);
      setReorderError(null);
      setScenes((prev) =>
        sortScenesByOrder([
          newScene,
          ...prev.filter((scene) => scene.id !== newScene.id),
        ]),
      );
      setIsCreateOpen(false);
      toast.success('Scene created.', `"${newScene.name}" was added.`);
    } catch (createError) {
      toast.error(
        'Failed to create scene.',
        createError instanceof Error
          ? createError.message
          : 'Please try again.',
      );
      throw createError;
    }
  };

  const handleUpdateScene = async (data: AddSceneInput) => {
    if (!editingScene) {
      return;
    }

    const { name, notes, payload } = data;

    try {
      const updatedScene = await window.db.scenes.update(editingScene.id, {
        name,
        notes,
        payload,
      });
      setReorderError(null);
      setScenes((prev) =>
        sortScenesByOrder(
          prev.map((scene) =>
            scene.id === updatedScene.id ? updatedScene : scene,
          ),
        ),
      );
      setEditingScene(null);
      toast.success('Scene updated.', `"${updatedScene.name}" was saved.`);
    } catch (updateError) {
      toast.error(
        'Failed to update scene.',
        updateError instanceof Error
          ? updateError.message
          : 'Please try again.',
      );
      throw updateError;
    }
  };

  const handleRequestDeleteScene = (scene: Scene) => {
    setPendingDeleteScene(scene);
  };

  const handleDeleteScene = async () => {
    if (!pendingDeleteScene) {
      return;
    }
    const scene = pendingDeleteScene;

    setDeletingId(scene.id);

    try {
      await window.db.scenes.delete(scene.id);
      setReorderError(null);
      setScenes((prev) => {
        const remainingScenes = sortScenesByOrder(
          prev.filter((existingScene) => existingScene.id !== scene.id),
        );
        return remainingScenes.map((remainingScene, index) => ({
          ...remainingScene,
          sort_order: index,
        }));
      });
      toast.success('Scene deleted.', `"${scene.name}" was removed.`);
    } catch (deleteError) {
      toast.error(
        'Failed to delete scene.',
        deleteError instanceof Error
          ? deleteError.message
          : 'Please try again.',
      );
    } finally {
      setDeletingId((current) => (current === scene.id ? null : current));
      setPendingDeleteScene((current) =>
        current?.id === scene.id ? null : current,
      );
    }
  };

  const handleMoveConfirm = async (newSessionId: number) => {
    if (!movingScene) {
      return;
    }

    const scene = movingScene;

    try {
      await window.db.scenes.moveTo(scene.id, newSessionId);
      const movedSceneId = scene.id;
      setMovingScene(null);
      setScenes((prev) => prev.filter((scene) => scene.id !== movedSceneId));
      toast.success(
        'Scene moved.',
        `"${scene.name}" was moved to another session.`,
      );
    } catch (moveError) {
      toast.error(
        'Failed to move scene.',
        moveError instanceof Error ? moveError.message : 'Please try again.',
      );
    }
  };

  const handleReorderScenes = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || parsedSessionId === null || isPersistingOrder) {
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

    const oldIndex = sortedScenes.findIndex((scene) => scene.id === activeId);
    const newIndex = sortedScenes.findIndex((scene) => scene.id === overId);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const previousScenes = sortedScenes;
    const previousSortOrderById = new Map(
      previousScenes.map((scene) => [scene.id, scene.sort_order]),
    );
    const reorderedScenes = arrayMove(previousScenes, oldIndex, newIndex).map(
      (scene, index) => ({
        ...scene,
        sort_order: index,
      }),
    );
    const scenesWithSortOrderChanges = reorderedScenes.filter(
      (scene) => previousSortOrderById.get(scene.id) !== scene.sort_order,
    );

    setReorderError(null);
    setScenes(reorderedScenes);
    setIsPersistingOrder(true);

    try {
      await Promise.all(
        scenesWithSortOrderChanges.map((scene) =>
          window.db.scenes.update(scene.id, {
            sort_order: scene.sort_order,
          }),
        ),
      );
    } catch (sortOrderError) {
      setReorderError(
        sortOrderError instanceof Error
          ? sortOrderError.message
          : 'Failed to save scene order. Restored the latest saved order.',
      );

      try {
        const canonicalScenes =
          await window.db.scenes.getAllBySession(parsedSessionId);
        setScenes(sortScenesByOrder(canonicalScenes));
      } catch {
        setScenes(previousScenes);
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
              <Link
                to={`/world/${worldId}/campaign/${parsedCampaignId}/arc/${parsedArcId}/act/${parsedActId}/sessions`}
                className="font-medium transition hover:text-slate-900"
              >
                Session
              </Link>
              <span>/</span>
              <span className="text-slate-700">Scenes</span>
            </nav>
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

        {!isLoading && !error && reorderError ? (
          <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm">
            {reorderError}
          </section>
        ) : null}

        {!isLoading && !error && scenes.length === 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-600">No scenes yet.</p>
          </section>
        ) : null}

        {!isLoading && !error && scenes.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => {
                void handleReorderScenes(event);
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
                  items={sortedScenes.map((scene) => scene.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
                    {sortedScenes.map((scene, index) => (
                      <SortableSceneRow
                        key={scene.id}
                        scene={scene}
                        sequence={index + 1}
                        deletingId={deletingId}
                        isPersistingOrder={isPersistingOrder}
                        onEdit={(selectedScene) => {
                          setIsCreateOpen(false);
                          setEditingScene(selectedScene);
                        }}
                        onMove={(selectedScene) => {
                          setMovingScene(selectedScene);
                        }}
                        onDelete={(selectedScene) => {
                          handleRequestDeleteScene(selectedScene);
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

      {isCreateOpen && parsedSessionId !== null ? (
        <ModalShell
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          labelledBy="create-scene-title"
          boxClassName="max-w-xl"
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
        </ModalShell>
      ) : null}

      {movingScene !== null &&
      parsedCampaignId !== null &&
      parsedSessionId !== null ? (
        <MoveSceneDialog
          scene={movingScene}
          currentSessionId={parsedSessionId}
          campaignId={parsedCampaignId}
          onConfirm={(newSessionId) => {
            void handleMoveConfirm(newSessionId);
          }}
          onCancel={() => {
            setMovingScene(null);
          }}
        />
      ) : null}

      {editingScene !== null ? (
        <ModalShell
          isOpen={editingScene !== null}
          onClose={() => setEditingScene(null)}
          labelledBy="edit-scene-title"
          boxClassName="max-w-xl"
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
        </ModalShell>
      ) : null}

      <ConfirmDialog
        isOpen={pendingDeleteScene !== null}
        title={`Delete "${pendingDeleteScene?.name ?? ''}"?`}
        message="This cannot be undone."
        onConfirm={() => {
          void handleDeleteScene();
        }}
        onCancel={() => setPendingDeleteScene(null)}
        confirmLabel="Delete"
        isConfirming={deletingId !== null}
      />
    </div>
  );
}
