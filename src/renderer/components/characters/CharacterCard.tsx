import { type KeyboardEvent, type MouseEvent, useEffect, useMemo, useState } from 'react';
import type { CharacterWikiSummary } from '../../../shared/contracts/characterTypes';

type CharacterCardProps = {
  character: Character;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
};

function parseWikiSummary(wikiSummaryJson: string): CharacterWikiSummary {
  try {
    return JSON.parse(wikiSummaryJson) as CharacterWikiSummary;
  } catch {
    return {};
  }
}

export default function CharacterCard({
  character,
  onOpen,
  onEdit,
  onDelete,
  isDeleting = false,
}: CharacterCardProps) {
  const imageSrc = character.image_src?.trim() ?? '';
  const [showImage, setShowImage] = useState(imageSrc.length > 0);

  useEffect(() => {
    setShowImage(imageSrc.length > 0);
  }, [imageSrc]);

  const wikiSummary = useMemo(() => parseWikiSummary(character.wiki_summary), [
    character.wiki_summary,
  ]);
  const mainEpithet = wikiSummary.biographic?.mainEpithet?.trim() || null;
  const primaryFaction = wikiSummary.statusDemographics?.primaryFaction?.trim() || null;

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
      aria-label={`Open ${character.name}`}
      className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2'
      onClick={onOpen}
      onKeyDown={handleCardKeyDown}
    >
      <div className='h-40 bg-slate-100'>
        {showImage
          ? (
            <img
              src={imageSrc}
              alt={character.name}
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
          {character.name}
        </h2>

        {mainEpithet ? <p className='text-xs text-slate-500'>{mainEpithet}</p> : null}
        {primaryFaction ? <p className='text-xs text-slate-400'>{primaryFaction}</p> : null}

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
