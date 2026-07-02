import type { MouseEvent } from 'react';

type CampaignNoteCardProps = {
  note: CampaignNote;
  onOpen: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
};

function formatUpdatedAt(updatedAt: string): string {
  const parsed = Date.parse(updatedAt);
  if (Number.isNaN(parsed)) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(parsed));
}

export default function CampaignNoteCard({
  note,
  onOpen,
  onDelete,
  isDeleting = false,
}: CampaignNoteCardProps) {
  const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onDelete();
  };

  return (
    <article className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'>
      <button
        type='button'
        className='w-full text-left'
        onClick={onOpen}
        aria-label={`Open ${note.name}`}
      >
        <div className='flex h-44 items-center justify-center bg-slate-100'>
          {note.canvas_preview_image
            ? (
              <img
                src={note.canvas_preview_image}
                alt={note.name}
                className='h-full w-full object-cover'
              />
            )
            : <div className='text-sm font-medium text-slate-500'>Blank canvas</div>}
        </div>
        <div className='space-y-3 p-4'>
          <div className='space-y-1'>
            <h2 className='line-clamp-2 text-lg font-semibold text-slate-900'>{note.name}</h2>
            <p className='text-xs text-slate-500'>Updated {formatUpdatedAt(note.updated_at)}</p>
          </div>

          {note.tags.length > 0
            ? (
              <div className='flex flex-wrap gap-1'>
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className='rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600'
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )
            : null}
        </div>
      </button>

      <div className='flex gap-2 border-t border-slate-200 px-4 py-3'>
        <button type='button' className='btn btn-sm btn-ghost' onClick={onOpen}>
          Open
        </button>
        <button
          type='button'
          className='btn btn-sm btn-error btn-outline'
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label={`Delete ${note.name}`}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </article>
  );
}
