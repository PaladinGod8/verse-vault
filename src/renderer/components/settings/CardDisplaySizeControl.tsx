import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { AppCardDisplaySurface } from '../../../shared/contracts/settingsTypes';
import {
  applyAspectRatio,
  buildDetailImageStyle,
  clampCardDisplayDimension,
  DEFAULT_CARD_DISPLAY_SETTINGS,
} from '../../lib/cardDisplaySettings';

type CardDisplaySizeControlProps = {
  surface: AppCardDisplaySurface;
  title: string;
  description: string;
  width: number;
  height: number;
  lockAspectRatio: boolean;
  onCommit: (next: { width: number; height: number; lockAspectRatio: boolean; }) => void;
};

type DraftDimensions = {
  width: number;
  height: number;
  lockAspectRatio: boolean;
};

export default function CardDisplaySizeControl({
  surface,
  title,
  description,
  width,
  height,
  lockAspectRatio,
  onCommit,
}: CardDisplaySizeControlProps) {
  const [draft, setDraft] = useState<DraftDimensions>({ width, height, lockAspectRatio });
  const latestDraftRef = useRef(draft);
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  useEffect(() => {
    latestDraftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (dragStateRef.current) {
      return;
    }

    setDraft({ width, height, lockAspectRatio });
  }, [height, lockAspectRatio, width]);

  const titleSlug = `${surface}-size`;

  const commitDimensions = (next: DraftDimensions) => {
    setDraft(next);
    onCommit(next);
  };

  const handleDimensionChange =
    (changed: 'width' | 'height') => (event: ChangeEvent<HTMLInputElement>) => {
      const raw = Number(event.target.value);

      if (!Number.isFinite(raw)) {
        return;
      }

      const clamped = clampCardDisplayDimension(raw);
      const next = { ...draft, [changed]: clamped };

      if (draft.lockAspectRatio) {
        const aspectLocked = applyAspectRatio(surface, next, changed);
        commitDimensions({
          width: aspectLocked.width,
          height: aspectLocked.height,
          lockAspectRatio: true,
        });
        return;
      }

      commitDimensions(next);
    };

  const handleLockChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextLock = event.target.checked;

    if (!nextLock) {
      commitDimensions({ ...draft, lockAspectRatio: false });
      return;
    }

    const fallback = DEFAULT_CARD_DISPLAY_SETTINGS[surface];
    const aspectLocked = applyAspectRatio(
      surface,
      {
        width: draft.width || fallback.width,
        height: draft.height || fallback.height,
      },
      'width',
    );

    commitDimensions({
      width: aspectLocked.width,
      height: aspectLocked.height,
      lockAspectRatio: true,
    });
  };

  const handleResizePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();

    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startWidth: draft.width,
      startHeight: draft.height,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      const deltaX = moveEvent.clientX - dragState.startX;
      const deltaY = moveEvent.clientY - dragState.startY;
      const widthCandidate = clampCardDisplayDimension(dragState.startWidth + deltaX);
      const heightCandidate = clampCardDisplayDimension(dragState.startHeight + deltaY);

      if (draft.lockAspectRatio) {
        const widthDominant = Math.abs(deltaX / dragState.startWidth)
          >= Math.abs(deltaY / dragState.startHeight);
        const aspectLocked = applyAspectRatio(
          surface,
          widthDominant
            ? { width: widthCandidate, height: dragState.startHeight }
            : { width: dragState.startWidth, height: heightCandidate },
          widthDominant ? 'width' : 'height',
        );

        setDraft({
          width: aspectLocked.width,
          height: aspectLocked.height,
          lockAspectRatio: true,
        });
        return;
      }

      setDraft({
        width: widthCandidate,
        height: heightCandidate,
        lockAspectRatio: false,
      });
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      dragStateRef.current = null;
      onCommit(latestDraftRef.current);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  return (
    <article className='space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4'>
      <div className='space-y-1'>
        <h4 className='text-sm font-semibold text-slate-900'>{title}</h4>
        <p className='text-sm text-slate-600'>{description}</p>
      </div>

      <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr),220px]'>
        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='space-y-1'>
            <label htmlFor={`${titleSlug}-width`} className='block text-sm font-medium text-slate-700'>
              {`${title} width`}
            </label>
            <input
              id={`${titleSlug}-width`}
              type='number'
              min={48}
              max={640}
              step={1}
              className='input input-bordered w-full'
              value={draft.width}
              onChange={handleDimensionChange('width')}
            />
          </div>

          <div className='space-y-1'>
            <label htmlFor={`${titleSlug}-height`} className='block text-sm font-medium text-slate-700'>
              {`${title} height`}
            </label>
            <input
              id={`${titleSlug}-height`}
              type='number'
              min={48}
              max={640}
              step={1}
              className='input input-bordered w-full'
              value={draft.height}
              onChange={handleDimensionChange('height')}
            />
          </div>

          <label className='flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2'>
            <input
              type='checkbox'
              className='checkbox checkbox-sm'
              checked={draft.lockAspectRatio}
              onChange={handleLockChange}
            />
            Lock aspect ratio
          </label>
        </div>

        <div className='flex justify-center rounded-xl border border-dashed border-slate-300 bg-white p-4'>
          <div className='relative flex min-h-[168px] w-full items-center justify-center overflow-hidden rounded-lg bg-slate-100'>
            <div
              className='relative rounded-lg border border-slate-400 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 shadow-sm'
              style={buildDetailImageStyle(draft)}
            >
              <div className='absolute inset-0 rounded-lg border border-white/60' />
              <div className='absolute inset-x-3 top-3 h-5 rounded bg-slate-500/20' />
              <div className='absolute inset-x-3 bottom-3 h-3 rounded bg-slate-500/15' />
              <button
                type='button'
                aria-label={`Resize ${title}`}
                className='absolute -bottom-2 -right-2 h-5 w-5 rounded-full border border-slate-500 bg-white shadow-sm'
                onPointerDown={handleResizePointerDown}
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
