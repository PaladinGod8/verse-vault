import { type KeyboardEvent, type MouseEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type FactionCardProps = {
  faction: Faction;
  factionTypesById: Map<number, FactionType>;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
};

export default function FactionCard({
  faction,
  factionTypesById,
  onEdit,
  onDelete,
  isDeleting = false,
}: FactionCardProps) {
  const navigate = useNavigate();
  const imageSrc = faction.image_src?.trim() ?? '';
  const [showImage, setShowImage] = useState(imageSrc.length > 0);

  useEffect(() => {
    setShowImage(imageSrc.length > 0);
  }, [imageSrc]);

  const typeName = (faction.type_id !== null && factionTypesById.get(faction.type_id)?.name)
    || 'Uncategorized';

  const handleOpen = () => {
    navigate(`/world/${faction.world_id}/factions/${faction.id}`);
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
      aria-label={`Open ${faction.name}`}
      className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2'
      onClick={handleOpen}
      onKeyDown={handleCardKeyDown}
    >
      <div className='h-40 bg-slate-100'>
        {showImage
          ? (
            <img
              src={imageSrc}
              alt={faction.name}
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
          {faction.name}
        </h2>
        <p className='text-xs text-slate-500'>{typeName}</p>

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
