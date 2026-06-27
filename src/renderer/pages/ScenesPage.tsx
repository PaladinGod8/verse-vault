import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import MoveSceneDialog from '../components/scenes/MoveSceneDialog';
import SceneForm from '../components/scenes/SceneForm';
import ScenesListSection from '../components/scenes/ScenesListSection';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ModalShell from '../components/ui/ModalShell';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';
import { sortScenesByOrder, useSessionScenesData } from '../hooks/useSessionScenesData';
import { parsePositiveIntParam } from '../lib/routeParams';

type AddSceneInput = Parameters<DbApi['scenes']['add']>[0];

export default function ScenesPage() {
  const toast = useToast();
  const { id, campaignId, arcId, actId, sessionId } = useParams();

  const worldId = useMemo(() => parsePositiveIntParam(id), [id]);
  const parsedCampaignId = useMemo(() => parsePositiveIntParam(campaignId), [campaignId]);
  const parsedArcId = useMemo(() => parsePositiveIntParam(arcId), [arcId]);
  const parsedActId = useMemo(() => parsePositiveIntParam(actId), [actId]);
  const parsedSessionId = useMemo(() => parsePositiveIntParam(sessionId), [sessionId]);

  const { session, scenes, isLoading, error, setScenes } = useSessionScenesData(
    worldId,
    parsedCampaignId,
    parsedSessionId,
  );
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
    setReorderError(null);
  }, [worldId, parsedCampaignId, parsedSessionId]);

  const handleCreateScene = async (data: AddSceneInput) => {
    try {
      const newScene = await window.db.scenes.add(data);
      setReorderError(null);
      setScenes((prev) =>
        sortScenesByOrder([
          newScene,
          ...prev.filter((scene) => scene.id !== newScene.id),
        ])
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
          prev.map((scene) => scene.id === updatedScene.id ? updatedScene : scene),
        )
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
      setPendingDeleteScene((current) => current?.id === scene.id ? null : current);
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
      !Number.isInteger(activeId)
      || !Number.isInteger(overId)
      || activeId === overId
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
          })
        ),
      );
    } catch (sortOrderError) {
      setReorderError(
        sortOrderError instanceof Error
          ? sortOrderError.message
          : 'Failed to save scene order. Restored the latest saved order.',
      );

      try {
        const canonicalScenes = await window.db.scenes.getAllBySession(parsedSessionId);
        setScenes(sortScenesByOrder(canonicalScenes));
      } catch {
        setScenes(previousScenes);
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
              <Link
                to={`/world/${worldId}/campaign/${parsedCampaignId}/arc/${parsedArcId}/act/${parsedActId}/sessions`}
                className='font-medium transition hover:text-slate-900'
              >
                Session
              </Link>
              <span>/</span>
              <span className='text-slate-700'>Scenes</span>
            </nav>
            <h1 className='text-2xl font-semibold tracking-tight text-slate-900'>
              {session?.name ?? 'Scenes'}
            </h1>
          </div>

          {worldId !== null
              && parsedCampaignId !== null
              && parsedSessionId !== null
            ? (
              <button
                type='button'
                className='shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800'
                onClick={() => setIsCreateOpen(true)}
              >
                New Scene
              </button>
            )
            : null}
        </header>

        <ScenesListSection
          isLoading={isLoading}
          error={error}
          reorderError={reorderError}
          scenes={scenes}
          sortedScenes={sortedScenes}
          sensors={sensors}
          deletingId={deletingId}
          isPersistingOrder={isPersistingOrder}
          onDragEnd={(event) => {
            void handleReorderScenes(event);
          }}
          onEdit={(selectedScene) => {
            setIsCreateOpen(false);
            setEditingScene(selectedScene);
          }}
          onMove={setMovingScene}
          onDelete={handleRequestDeleteScene}
        />
      </main>

      {isCreateOpen && parsedSessionId !== null
        ? (
          <ModalShell
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            labelledBy='create-scene-title'
            boxClassName='max-w-xl'
          >
            <h2
              id='create-scene-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              New Scene
            </h2>
            <SceneForm
              mode='create'
              sessionId={parsedSessionId}
              onSubmit={handleCreateScene}
              onCancel={() => setIsCreateOpen(false)}
            />
          </ModalShell>
        )
        : null}

      {movingScene !== null
          && parsedCampaignId !== null
          && parsedSessionId !== null
        ? (
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
        )
        : null}

      {editingScene !== null
        ? (
          <ModalShell
            isOpen={editingScene !== null}
            onClose={() => setEditingScene(null)}
            labelledBy='edit-scene-title'
            boxClassName='max-w-xl'
          >
            <h2
              id='edit-scene-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Edit Scene
            </h2>
            <SceneForm
              mode='edit'
              sessionId={editingScene.session_id}
              initialValues={editingScene}
              onSubmit={handleUpdateScene}
              onCancel={() => setEditingScene(null)}
            />
          </ModalShell>
        )
        : null}

      <ConfirmDialog
        isOpen={pendingDeleteScene !== null}
        title={`Delete "${pendingDeleteScene?.name ?? ''}"?`}
        message='This cannot be undone.'
        onConfirm={() => {
          void handleDeleteScene();
        }}
        onCancel={() => setPendingDeleteScene(null)}
        confirmLabel='Delete'
        isConfirming={deletingId !== null}
      />
    </div>
  );
}
