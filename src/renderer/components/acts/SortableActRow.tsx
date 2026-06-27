import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';

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

export default function SortableActRow({
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
            aria-label={`Reorder act ${act.name}`}
            disabled={isDeleting || isPersistingOrder}
          >
            ::
          </button>
          <span className='tabular-nums'>{sequence}</span>
        </div>
      </td>
      <td className='px-4 py-3 font-medium'>{act.name}</td>
      <td className='px-4 py-3'>
        <div className='flex gap-3'>
          <Link
            to={`/world/${worldId}/campaign/${campaignId}/arc/${arcId}/act/${act.id}/sessions`}
            className='text-sm font-medium text-slate-600 transition hover:text-slate-900'
          >
            Sessions
          </Link>
          <button
            type='button'
            onClick={() => onEdit(act)}
            className='text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
            disabled={isDeleting}
          >
            Edit
          </button>
          <button
            type='button'
            onClick={() => onMove(act)}
            className='text-sm font-medium text-slate-500 transition hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50'
            disabled={isDeleting || isPersistingOrder}
          >
            Move
          </button>
          <button
            type='button'
            onClick={() => onDelete(act)}
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
