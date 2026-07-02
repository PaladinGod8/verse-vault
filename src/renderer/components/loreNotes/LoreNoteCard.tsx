import { type KeyboardEvent, type MouseEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildCardFrameStyle, buildCardMediaStyle } from '../../lib/cardDisplaySettings';
import { resolveCanvasPreferredImage } from '../../lib/noteCanvasPreview';

type LoreNoteCardProps = {
  loreNote: LoreNote;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  displayDimensions?: {
    width: number;
    height: number;
  };
};

export default function LoreNoteCard({
  loreNote,
  onEdit,
  onDelete,
  isDeleting = false,
  displayDimensions = { width: 320, height: 160 },
}: LoreNoteCardProps) {
  const navigate = useNavigate();
  const imageSrc = resolveCanvasPreferredImage({
    imageSrc: loreNote.image_src,
    canvasEnabled: loreNote.canvas_enabled,
    canvasPreviewImage: loreNote.canvas_preview_image,
  }) ?? '';
  const [showImage, setShowImage] = useState(imageSrc.length > 0);

  useEffect(() => {
    setShowImage(imageSrc.length > 0);
  }, [imageSrc]);

  const handleOpen = () => {
    navigate(`/world/${loreNote.world_id}/lore-notes/${loreNote.id}`);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpen();
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
      aria-label={`Open ${loreNote.name}`}
      className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2'
      style={buildCardFrameStyle(displayDimensions)}
      onClick={handleOpen}
      onKeyDown={handleCardKeyDown}
    >
      <div
        className='bg-slate-100'
        style={buildCardMediaStyle(displayDimensions)}
        data-testid='lore-note-card-media-frame'
      >
        {showImage
          ? (
            <img
              src={imageSrc}
              alt={loreNote.name}
              className='h-full w-full object-cover'
              onError={() => setShowImage(false)}
            />
          )
          : (
            <div className='flex h-full items-center justify-center text-sm font-medium text-slate-500'>
              No image
            </div>
          )}
      </div>

      <div className='space-y-1 p-4'>
        <h2 className='line-clamp-2 text-lg font-semibold text-slate-900'>
          {loreNote.name}
        </h2>
        {loreNote.canvas_enabled
          ? (
            <p className='text-[10px] font-semibold tracking-wide text-slate-500 uppercase'>
              Canvas
            </p>
          )
          : null}
        {loreNote.content
          ? <p className='line-clamp-2 text-xs text-slate-500'>{loreNote.content}</p>
          : null}

        {loreNote.tags.length > 0
          ? (
            <div className='flex flex-wrap gap-1 pt-1'>
              {loreNote.tags.map((tag) => (
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

        <div className='flex gap-2 pt-3'>
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
