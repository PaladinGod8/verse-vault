import { sortScenesByOrder } from '../../hooks/useActScenesData';
import { markdownToPlainText } from '../ui/MarkdownView';

type ActScenesListSectionProps = {
  isLoading: boolean;
  error: string | null;
  scenes: Scene[];
  sessions: Session[];
  deletingId: number | null;
  onEdit: (scene: Scene) => void;
  onMove: (scene: Scene) => void;
  onDelete: (scene: Scene) => void;
};

function SceneRow({
  scene,
  deletingId,
  onEdit,
  onMove,
  onDelete,
}: {
  scene: Scene;
  deletingId: number | null;
  onEdit: (scene: Scene) => void;
  onMove: (scene: Scene) => void;
  onDelete: (scene: Scene) => void;
}) {
  const isDeleting = deletingId === scene.id;

  return (
    <tr className='border-b border-slate-100 last:border-0'>
      <td className='px-4 py-3 font-medium'>{scene.name}</td>
      <td className='px-4 py-3 text-slate-500'>{markdownToPlainText(scene.notes) || '-'}</td>
      <td className='px-4 py-3'>
        <div className='flex gap-3'>
          <button
            type='button'
            onClick={() => onEdit(scene)}
            className='text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
            disabled={isDeleting}
          >
            Edit
          </button>
          <button
            type='button'
            onClick={() => onMove(scene)}
            disabled={isDeleting}
            className='text-sm font-medium text-slate-500 transition hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50'
          >
            Move
          </button>
          <button
            type='button'
            onClick={() => onDelete(scene)}
            className='text-sm font-medium text-rose-600 transition hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60'
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </td>
    </tr>
  );
}

function SceneGroup({
  title,
  scenes,
  deletingId,
  onEdit,
  onMove,
  onDelete,
}: {
  title: string;
  scenes: Scene[];
  deletingId: number | null;
  onEdit: (scene: Scene) => void;
  onMove: (scene: Scene) => void;
  onDelete: (scene: Scene) => void;
}) {
  return (
    <section className='rounded-xl border border-slate-200 bg-white shadow-sm'>
      <h2 className='border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700'>
        {title}
      </h2>
      <table className='w-full text-sm text-slate-700'>
        <thead>
          <tr className='border-b border-slate-200'>
            <th className='px-4 py-3 text-left font-medium text-slate-500'>Name</th>
            <th className='px-4 py-3 text-left font-medium text-slate-500'>Notes</th>
            <th className='px-4 py-3 text-left font-medium text-slate-500'>Actions</th>
          </tr>
        </thead>
        <tbody>
          {scenes.map((scene) => (
            <SceneRow
              key={scene.id}
              scene={scene}
              deletingId={deletingId}
              onEdit={onEdit}
              onMove={onMove}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default function ActScenesListSection({
  isLoading,
  error,
  scenes,
  sessions,
  deletingId,
  onEdit,
  onMove,
  onDelete,
}: ActScenesListSectionProps) {
  if (isLoading) {
    return (
      <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
        Loading scenes...
      </section>
    );
  }

  if (error) {
    return (
      <section className='rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm'>
        {error}
      </section>
    );
  }

  if (scenes.length === 0) {
    return (
      <section className='rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
        <p className='text-sm text-slate-600'>No scenes yet.</p>
      </section>
    );
  }

  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const strayScenes = sortScenesByOrder(scenes.filter((scene) => scene.session_id === null));
  const groupedSessionIds = Array.from(
    new Set(
      scenes
        .map((scene) => scene.session_id)
        .filter((sessionId): sessionId is number => sessionId !== null),
    ),
  )
    .map((sessionId) => sessionById.get(sessionId))
    .filter((session): session is Session => session !== undefined)
    .sort((left, right) => left.sort_order - right.sort_order || left.id - right.id)
    .map((session) => session.id);

  return (
    <div className='space-y-6'>
      {strayScenes.length > 0
        ? (
          <SceneGroup
            title='Stray Scenes'
            scenes={strayScenes}
            deletingId={deletingId}
            onEdit={onEdit}
            onMove={onMove}
            onDelete={onDelete}
          />
        )
        : null}
      {groupedSessionIds.map((sessionId) => {
        const session = sessionById.get(sessionId);
        if (!session) {
          return null;
        }
        const groupScenes = sortScenesByOrder(
          scenes.filter((scene) => scene.session_id === sessionId),
        );
        return (
          <SceneGroup
            key={sessionId}
            title={`Session: ${session.name}`}
            scenes={groupScenes}
            deletingId={deletingId}
            onEdit={onEdit}
            onMove={onMove}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}
