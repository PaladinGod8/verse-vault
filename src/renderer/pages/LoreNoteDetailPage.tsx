import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LoreNoteForm from '../components/loreNotes/LoreNoteForm';
import ModalShell from '../components/ui/ModalShell';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';
import { useAppSettings } from '../hooks/useAppSettings';
import { useLoreNoteCrud } from '../hooks/useLoreNoteCrud';
import { buildDetailImageStyle, resolveCardDisplayDimensions } from '../lib/cardDisplaySettings';
import { resolveCanvasPreferredImage } from '../lib/noteCanvasPreview';
import { parsePositiveIntParam } from '../lib/routeParams';
import { normalizeTokenImageSrc } from '../lib/tokenImageSrc';

export default function LoreNoteDetailPage() {
  const toast = useToast();
  const { config } = useAppSettings();
  const { id, loreNoteId } = useParams();
  const worldId = useMemo(() => parsePositiveIntParam(id), [id]);
  const parsedLoreNoteId = useMemo(() => parsePositiveIntParam(loreNoteId), [loreNoteId]);
  const imageDimensions = useMemo(
    () => resolveCardDisplayDimensions(config, 'loreNoteDetail'),
    [config],
  );

  const [loreNote, setLoreNote] = useState<LoreNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [tagVocabulary, setTagVocabulary] = useState<string[]>([]);

  const loadLoreNote = useCallback(async () => {
    if (parsedLoreNoteId === null) {
      setError('Invalid lore note id.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.db.loreNotes.getById(parsedLoreNoteId);
      if (!result) {
        setError('Lore note not found.');
        setLoreNote(null);
        return;
      }
      const viewedLoreNote = await window.db.loreNotes.markViewed(parsedLoreNoteId);
      setLoreNote(viewedLoreNote);
      if (worldId !== null) {
        setTagVocabulary(await window.db.loreNotes.getAllTagsByWorld(worldId));
      }
    } catch {
      setError('Unable to load this lore note right now.');
      setLoreNote(null);
    } finally {
      setIsLoading(false);
    }
  }, [parsedLoreNoteId, worldId]);

  useEffect(() => {
    void loadLoreNote();
  }, [loadLoreNote]);

  const { isSaving, handleUpdate } = useLoreNoteCrud({
    worldId,
    editingLoreNote: loreNote,
    pendingDeleteLoreNote: null,
    reloadLoreNotes: loadLoreNote,
    toast,
    onCreateSaved: () => undefined,
    onUpdateSaved: () => setIsEditOpen(false),
    onDeleteSettled: () => undefined,
  });

  const imageSrc = resolveCanvasPreferredImage({
    imageSrc: normalizeTokenImageSrc(loreNote?.image_src),
    canvasEnabled: loreNote?.canvas_enabled ?? false,
    canvasPreviewImage: loreNote?.canvas_preview_image,
  });

  return (
    <div className='flex min-h-screen'>
      <WorldSidebar worldId={worldId} />
      <main className='flex-1 space-y-6 p-6'>
        <header className='space-y-2'>
          <Link
            to={`/world/${worldId}/lore-notes`}
            className='inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900'
          >
            Back to lore notes
          </Link>
        </header>

        {isLoading
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
              Loading lore note...
            </section>
          )
          : error
          ? (
            <section className='rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm'>
              {error}
            </section>
          )
          : loreNote
          ? (
            <section className='space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-start gap-4'>
                  {imageSrc
                    ? (
                      <img
                        src={imageSrc}
                        alt={loreNote.name}
                        className='rounded object-cover'
                        style={buildDetailImageStyle(imageDimensions)}
                      />
                    )
                    : null}
                  <div>
                    <h1 className='text-2xl font-semibold tracking-tight text-slate-900'>
                      {loreNote.name}
                    </h1>
                    {loreNote.content
                      ? (
                        <p className='mt-1 text-sm text-slate-600 whitespace-pre-wrap'>
                          {loreNote.content}
                        </p>
                      )
                      : null}
                    {loreNote.tags.length > 0
                      ? (
                        <div className='mt-2 flex flex-wrap gap-1'>
                          {loreNote.tags.map((tag) => (
                            <span
                              key={tag}
                              className='rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600'
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )
                      : null}
                  </div>
                </div>
                <button
                  type='button'
                  className='shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50'
                  onClick={() => setIsEditOpen(true)}
                >
                  Edit
                </button>
              </div>

              <section className='space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4'>
                <div className='flex items-start justify-between gap-4'>
                  <div>
                    <h2 className='text-lg font-semibold text-slate-900'>Canvas</h2>
                    <p className='text-sm text-slate-600'>
                      {loreNote.canvas_enabled
                        ? 'Canvas enabled for freeform ideation.'
                        : 'Canvas disabled for this lore note.'}
                    </p>
                  </div>
                  {loreNote.canvas_enabled
                    ? (
                      <Link
                        to={`/world/${worldId}/lore-notes/${loreNote.id}/canvas`}
                        className='rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100'
                      >
                        Open Canvas
                      </Link>
                    )
                    : null}
                </div>

                {loreNote.canvas_enabled && loreNote.canvas_preview_image
                  ? (
                    <img
                      src={loreNote.canvas_preview_image}
                      alt={`${loreNote.name} canvas preview`}
                      className='max-h-72 w-full rounded-lg border border-slate-200 object-contain bg-white'
                    />
                  )
                  : null}
              </section>
            </section>
          )
          : null}
      </main>

      {isEditOpen && loreNote
        ? (
          <ModalShell
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            labelledBy='edit-lore-note-detail-title'
            boxClassName='max-w-2xl'
          >
            <h2
              id='edit-lore-note-detail-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Edit Lore Note
            </h2>
            <LoreNoteForm
              initialValues={{
                name: loreNote.name,
                content: loreNote.content,
                image_src: normalizeTokenImageSrc(loreNote.image_src),
                canvas_enabled: loreNote.canvas_enabled,
                tags: loreNote.tags,
              }}
              onSave={(data) => void handleUpdate(data)}
              onClose={() => setIsEditOpen(false)}
              isSaving={isSaving}
              tagVocabulary={tagVocabulary}
            />
          </ModalShell>
        )
        : null}
    </div>
  );
}
