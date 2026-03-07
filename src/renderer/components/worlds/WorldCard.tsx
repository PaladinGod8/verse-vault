import { type KeyboardEvent, type MouseEvent, useEffect, useMemo, useState } from 'react';

type WorldCardProps = {
  world: World;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
};

function formatTimestamp(timestamp: string | null, fallback: string): string {
  if (!timestamp) {
    return fallback;
  }

  const normalized = timestamp.includes('T')
    ? timestamp
    : `${timestamp.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export default function WorldCard({
  world,
  onOpen,
  onEdit,
  onDelete,
  isDeleting = false,
}: WorldCardProps) {
  const thumbnail = world.thumbnail?.trim() ?? '';
  const [showImage, setShowImage] = useState(thumbnail.length > 0);

  useEffect(() => {
    setShowImage(thumbnail.length > 0);
  }, [thumbnail]);

  const altText = useMemo(() => `${world.name} thumbnail`, [world.name]);
  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen();
    }
  };

  const handleEditClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onEdit();
  };

  const handleDeleteClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onDelete();
  };

  return (
    <article
      role='button'
      tabIndex={0}
      aria-label={`Open ${world.name}`}
      className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2'
      onClick={onOpen}
      onKeyDown={handleCardKeyDown}
    >
      <div className='h-40 bg-slate-100'>
        {showImage
          ? (
            <img
              src={thumbnail}
              alt={altText}
              className='h-full w-full object-cover'
              onError={() => setShowImage(false)}
            />
          )
          : (
            <div className='flex h-full items-center justify-center text-sm font-medium text-slate-500'>
              No thumbnail
            </div>
          )}
      </div>

      <div className='space-y-3 p-4'>
        <h2 className='line-clamp-2 text-lg font-semibold text-slate-900'>
          {world.name}
        </h2>

        <p className='min-h-12 text-sm text-slate-600'>
          {world.short_description?.trim() || 'No description yet.'}
        </p>

        <dl className='space-y-1 text-xs text-slate-500'>
          <div className='flex justify-between gap-3'>
            <dt>Last viewed</dt>
            <dd className='text-right text-slate-700'>
              {formatTimestamp(world.last_viewed_at, 'Never')}
            </dd>
          </div>
          <div className='flex justify-between gap-3'>
            <dt>Last modified</dt>
            <dd className='text-right text-slate-700'>
              {formatTimestamp(world.updated_at, 'Unknown')}
            </dd>
          </div>
        </dl>

        <div className='flex gap-2 pt-1'>
          <button
            type='button'
            className='rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
            onClick={handleEditClick}
            disabled={isDeleting}
          >
            Edit
          </button>
          <button
            type='button'
            className='rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60'
            onClick={handleDeleteClick}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </article>
  );
}
