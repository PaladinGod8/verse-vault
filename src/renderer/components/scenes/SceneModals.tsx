import ModalShell from '../ui/ModalShell';
import MoveSceneDialog from './MoveSceneDialog';
import SceneForm from './SceneForm';

type AddSceneInput = Parameters<DbApi['scenes']['add']>[0];

export function CreateSceneModal({
  isOpen,
  actId,
  sessionId,
  onSubmit,
  onCancel,
}: {
  isOpen: boolean;
  actId: number | null;
  sessionId: number | null;
  onSubmit: (data: AddSceneInput) => Promise<void>;
  onCancel: () => void;
}) {
  if (!isOpen || actId === null || sessionId === null) {
    return null;
  }

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
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
        actId={actId}
        sessionId={sessionId}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </ModalShell>
  );
}

export function MoveSceneModal({
  scene,
  campaignId,
  currentActId,
  onConfirm,
  onCancel,
}: {
  scene: Scene | null;
  campaignId: number | null;
  currentActId: number | null;
  onConfirm: (newActId: number, newSessionId: number | null) => void;
  onCancel: () => void;
}) {
  if (scene === null || campaignId === null || currentActId === null) {
    return null;
  }

  return (
    <MoveSceneDialog
      scene={scene}
      currentActId={currentActId}
      currentSessionId={scene.session_id}
      campaignId={campaignId}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

export function EditSceneModal({
  scene,
  actId,
  onSubmit,
  onCancel,
}: {
  scene: Scene | null;
  actId: number | null;
  onSubmit: (data: AddSceneInput) => Promise<void>;
  onCancel: () => void;
}) {
  if (scene === null) {
    return null;
  }

  return (
    <ModalShell
      isOpen
      onClose={onCancel}
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
        actId={actId ?? scene.act_id ?? 0}
        sessionId={scene.session_id}
        initialValues={scene}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </ModalShell>
  );
}
