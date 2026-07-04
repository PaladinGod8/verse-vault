import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import { formatPlannedAt } from '../../lib/formatPlannedAt';
import { markdownToPlainText } from '../ui/MarkdownView';

type SortableSessionRowProps = {
  session: Session;
  sequence: number;
  worldId: number | null;
  campaignId: number | null;
  arcId: number | null;
  actId: number | null;
  deletingId: number | null;
  isPersistingOrder: boolean;
  onEdit: (session: Session) => void;
  onDelete: (session: Session) => void;
  onMove: (session: Session) => void;
};

export default function SortableSessionRow({
  session,
  sequence,
  worldId,
  campaignId,
  arcId,
  actId,
  deletingId,
  isPersistingOrder,
  onEdit,
  onDelete,
  onMove,
}: SortableSessionRowProps) {
  const isDeleting = deletingId === session.id;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: session.id,
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
            aria-label={`Reorder session ${session.name}`}
            disabled={isDeleting || isPersistingOrder}
          >
            ::
          </button>
          <span className='tabular-nums'>{sequence}</span>
        </div>
      </td>
      <td className='px-4 py-3 font-medium'>{session.name}</td>
      <td className='px-4 py-3 text-slate-500'>{markdownToPlainText(session.notes) || '-'}</td>
      <td className='px-4 py-3 text-slate-500'>
        {formatPlannedAt(session.planned_at)}
      </td>
      <td className='px-4 py-3'>
        <div className='flex gap-3'>
          <Link
            to={`/world/${worldId}/campaign/${campaignId}/arc/${arcId}/act/${actId}/session/${session.id}/scenes`}
            className='text-sm font-medium text-slate-600 transition hover:text-slate-900'
          >
            Scenes
          </Link>
          <button
            type='button'
            onClick={() => onEdit(session)}
            className='text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
            disabled={isDeleting}
          >
            Edit
          </button>
          <button
            type='button'
            onClick={() => onMove(session)}
            disabled={isDeleting || isPersistingOrder}
            className='text-sm font-medium text-slate-500 transition hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50'
          >
            Move
          </button>
          <button
            type='button'
            onClick={() => onDelete(session)}
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
