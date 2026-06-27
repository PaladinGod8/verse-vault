import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type SortableSceneRowProps = {
  scene: Scene;
  sequence: number;
  deletingId: number | null;
  isPersistingOrder: boolean;
  onEdit: (scene: Scene) => void;
  onMove: (scene: Scene) => void;
  onDelete: (scene: Scene) => void;
};

export default function SortableSceneRow({
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
      className={`border-b border-slate-100 last:border-0 ${isDragging ? 'bg-slate-50' : ''}`}
    >
      <td className='w-28 px-4 py-3 text-slate-600'>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className='inline-flex h-7 w-7 cursor-grab touch-none items-center justify-center rounded border border-slate-300 text-xs text-slate-500 transition hover:border-slate-400 hover:text-slate-700 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-60'
            aria-label={`Reorder scene ${scene.name}`}
            disabled={isDeleting || isPersistingOrder}
          >
            ::
          </button>
          <span className='tabular-nums'>{sequence}</span>
        </div>
      </td>
      <td className='px-4 py-3 font-medium'>{scene.name}</td>
      <td className='px-4 py-3 text-slate-500'>{scene.notes ?? '-'}</td>
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
            disabled={isDeleting || isPersistingOrder}
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
