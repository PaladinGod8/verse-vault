import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ActScenesListSection from '../components/scenes/ActScenesListSection';
import MoveSceneDialog from '../components/scenes/MoveSceneDialog';
import SceneForm from '../components/scenes/SceneForm';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ModalShell from '../components/ui/ModalShell';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';
import { sortScenesByOrder, useActScenesData } from '../hooks/useActScenesData';
import { parsePositiveIntParam } from '../lib/routeParams';

type AddSceneInput = Parameters<DbApi['scenes']['add']>[0];

export default function ActScenesPage() {
  const toast = useToast();
  const { id, campaignId, arcId, actId } = useParams();

  const worldId = useMemo(() => parsePositiveIntParam(id), [id]);
  const parsedCampaignId = useMemo(() => parsePositiveIntParam(campaignId), [campaignId]);
  const parsedArcId = useMemo(() => parsePositiveIntParam(arcId), [arcId]);
  const parsedActId = useMemo(() => parsePositiveIntParam(actId), [actId]);

  const { act, scenes, sessions, isLoading, error, setScenes } = useActScenesData(
    worldId,
    parsedCampaignId,
    parsedArcId,
    parsedActId,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDeleteScene, setPendingDeleteScene] = useState<Scene | null>(null);
  const [movingScene, setMovingScene] = useState<Scene | null>(null);

  const handleCreateScene = async (data: AddSceneInput) => {
    try {
      const newScene = await window.db.scenes.add(data);
      setScenes((prev) =>
        sortScenesByOrder([newScene, ...prev.filter((s) => s.id !== newScene.id)])
      );
      setIsCreateOpen(false);
      toast.success('Scene created.', `"${newScene.name}" was added.`);
    } catch (createError) {
      toast.error(
        'Failed to create scene.',
        createError instanceof Error ? createError.message : 'Please try again.',
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
      const updatedScene = await window.db.scenes.update(editingScene.id, { name, notes, payload });
      setScenes((prev) =>
        sortScenesByOrder(prev.map((scene) => scene.id === updatedScene.id ? updatedScene : scene))
      );
      setEditingScene(null);
      toast.success('Scene updated.', `"${updatedScene.name}" was saved.`);
    } catch (updateError) {
      toast.error(
        'Failed to update scene.',
        updateError instanceof Error ? updateError.message : 'Please try again.',
      );
      throw updateError;
    }
  };

  const handleDeleteScene = async () => {
    if (!pendingDeleteScene) {
      return;
    }
    const scene = pendingDeleteScene;

    setDeletingId(scene.id);

    try {
      await window.db.scenes.delete(scene.id);
      setScenes((prev) => prev.filter((existingScene) => existingScene.id !== scene.id));
      toast.success('Scene deleted.', `"${scene.name}" was removed.`);
    } catch (deleteError) {
      toast.error(
        'Failed to delete scene.',
        deleteError instanceof Error ? deleteError.message : 'Please try again.',
      );
    } finally {
      setDeletingId((current) => current === scene.id ? null : current);
      setPendingDeleteScene((current) => current?.id === scene.id ? null : current);
    }
  };

  const handleMoveConfirm = async (newActId: number, newSessionId: number | null) => {
    if (!movingScene) {
      return;
    }
    const scene = movingScene;

    try {
      const updatedScene = await window.db.scenes.moveTo(scene.id, newActId, newSessionId);
      setMovingScene(null);
      if (newActId === parsedActId) {
        setScenes((prev) =>
          sortScenesByOrder(
            prev.map((existingScene) =>
              existingScene.id === updatedScene.id ? updatedScene : existingScene
            ),
          )
        );
      } else {
        setScenes((prev) => prev.filter((existingScene) => existingScene.id !== scene.id));
      }
      toast.success('Scene moved.', `"${scene.name}" was moved.`);
    } catch (moveError) {
      toast.error(
        'Failed to move scene.',
        moveError instanceof Error ? moveError.message : 'Please try again.',
      );
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
              <span className='text-slate-700'>Scenes</span>
            </nav>
            <h1 className='text-2xl font-semibold tracking-tight text-slate-900'>
              {act ? `${act.name} — Scenes` : 'Scenes'}
            </h1>
          </div>

          {worldId !== null && parsedActId !== null
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

        <ActScenesListSection
          isLoading={isLoading}
          error={error}
          scenes={scenes}
          sessions={sessions}
          deletingId={deletingId}
          worldId={worldId}
          onEdit={(selectedScene) => {
            setIsCreateOpen(false);
            setEditingScene(selectedScene);
          }}
          onMove={setMovingScene}
          onDelete={setPendingDeleteScene}
        />
      </main>

      {isCreateOpen && parsedActId !== null
        ? (
          <ModalShell
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            labelledBy='create-act-scene-title'
            boxClassName='max-w-xl'
          >
            <h2
              id='create-act-scene-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              New Scene
            </h2>
            <SceneForm
              mode='create'
              actId={parsedActId}
              onSubmit={handleCreateScene}
              onCancel={() => setIsCreateOpen(false)}
            />
          </ModalShell>
        )
        : null}

      {movingScene !== null && parsedCampaignId !== null && parsedActId !== null
        ? (
          <MoveSceneDialog
            scene={movingScene}
            currentActId={parsedActId}
            currentSessionId={movingScene.session_id}
            campaignId={parsedCampaignId}
            onConfirm={(newActId, newSessionId) => {
              void handleMoveConfirm(newActId, newSessionId);
            }}
            onCancel={() => setMovingScene(null)}
          />
        )
        : null}

      {editingScene !== null && parsedActId !== null
        ? (
          <ModalShell
            isOpen={editingScene !== null}
            onClose={() => setEditingScene(null)}
            labelledBy='edit-act-scene-title'
            boxClassName='max-w-xl'
          >
            <h2
              id='edit-act-scene-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Edit Scene
            </h2>
            <SceneForm
              mode='edit'
              actId={parsedActId}
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
