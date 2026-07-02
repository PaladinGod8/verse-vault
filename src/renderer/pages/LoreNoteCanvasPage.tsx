import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ExcalidrawCanvasEditorHandle } from '../components/excalidraw/ExcalidrawCanvasEditor';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';
import { parsePositiveIntParam } from '../lib/routeParams';

const ExcalidrawCanvasEditor = lazy(() =>
  import('../components/excalidraw/ExcalidrawCanvasEditor')
);

export default function LoreNoteCanvasPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { id, loreNoteId } = useParams();
  const worldId = useMemo(() => parsePositiveIntParam(id), [id]);
  const parsedLoreNoteId = useMemo(() => parsePositiveIntParam(loreNoteId), [loreNoteId]);
  const editorRef = useRef<ExcalidrawCanvasEditorHandle | null>(null);

  const [loreNote, setLoreNote] = useState<LoreNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (parsedLoreNoteId === null) {
      setError('Invalid lore note id.');
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadLoreNote = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await window.db.loreNotes.getById(parsedLoreNoteId);
        if (!result) {
          if (isMounted) {
            setError('Lore note not found.');
            setLoreNote(null);
          }
          return;
        }

        if (isMounted) {
          setLoreNote(result);
          setHasUnsavedChanges(false);
        }
      } catch {
        if (isMounted) {
          setError('Unable to load this lore note right now.');
          setLoreNote(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadLoreNote();

    return () => {
      isMounted = false;
    };
  }, [parsedLoreNoteId]);

  const detailPath = `/world/${worldId}/lore-notes/${parsedLoreNoteId}`;

  const handleExit = useCallback(() => {
    navigate(detailPath);
  }, [detailPath, navigate]);

  const handleSave = useCallback(async () => {
    if (!loreNote || !editorRef.current) {
      return;
    }

    setIsSaving(true);
    try {
      const snapshot = await editorRef.current.captureSnapshot();
      const updatedLoreNote = await window.db.loreNotes.update(loreNote.id, {
        canvas_enabled: true,
        canvas_scene: snapshot.scene,
        canvas_preview_image: snapshot.previewImage,
      });
      setLoreNote(updatedLoreNote);
      setHasUnsavedChanges(false);
      toast.success('Lore note canvas saved.', `"${updatedLoreNote.name}" was updated.`);
    } catch (error) {
      toast.error(
        'Failed to save lore note canvas.',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }, [loreNote, toast]);

  useEffect(() => {
    if (isLoading || error || !loreNote) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleExit();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [error, handleExit, handleSave, isLoading, loreNote]);

  const statusLabel = hasUnsavedChanges ? 'Unsaved changes' : 'Saved';
  const statusClasses = hasUnsavedChanges
    ? 'border-amber-300 bg-amber-50 text-amber-700'
    : 'border-emerald-300 bg-emerald-50 text-emerald-700';

  return (
    <div className='flex h-screen overflow-hidden'>
      <WorldSidebar worldId={worldId} />
      <main className='flex min-h-0 flex-1 flex-col gap-4 p-6'>
        <header className='space-y-2'>
          <Link
            to={detailPath}
            className='inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900'
          >
            Back to lore note
          </Link>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='min-w-0'>
              <p className='text-xs uppercase tracking-[0.24em] text-slate-400'>Lore note canvas</p>
              <h1 className='truncate text-2xl font-semibold tracking-tight text-slate-900'>
                {loreNote?.name ?? 'Lore Note Canvas'}
              </h1>
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClasses}`}
              >
                {statusLabel}
              </span>
              <span className='hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500 md:inline-flex'>
                Esc to exit
              </span>
              <span className='hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500 md:inline-flex'>
                Ctrl/Cmd+S to save
              </span>
              {loreNote
                ? (
                  <button
                    type='button'
                    className='btn btn-primary'
                    onClick={() => void handleSave()}
                    disabled={isSaving}
                  >
                    {isSaving ? <span className='loading loading-spinner loading-xs' /> : null}
                    <span>Save</span>
                  </button>
                )
                : null}
            </div>
          </div>
        </header>

        <div className='flex min-h-0 flex-1 flex-col'>
          {isLoading
            ? (
              <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
                Loading lore note canvas...
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
              <Suspense
                fallback={
                  <div className='flex h-full min-h-0 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-600 shadow-sm'>
                    Loading canvas...
                  </div>
                }
              >
                <ExcalidrawCanvasEditor
                  ref={editorRef}
                  initialScene={loreNote.canvas_scene}
                  onSceneChange={() => setHasUnsavedChanges(true)}
                  className='h-full min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'
                />
              </Suspense>
            )
            : null}
        </div>
      </main>
    </div>
  );
}
