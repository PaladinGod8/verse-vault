import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ExcalidrawCanvasEditorHandle } from '../components/excalidraw/ExcalidrawCanvasEditor';
import TagInput from '../components/loreNotes/TagInput';
import EditorActionBar from '../components/ui/EditorActionBar';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';
import { parsePositiveIntParam } from '../lib/routeParams';

const ExcalidrawCanvasEditor = lazy(() =>
  import('../components/excalidraw/ExcalidrawCanvasEditor')
);

export default function CampaignNoteDetailPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { id, campaignId, campaignNoteId } = useParams();
  const worldId = useMemo(() => parsePositiveIntParam(id), [id]);
  const parsedCampaignId = useMemo(() => parsePositiveIntParam(campaignId), [campaignId]);
  const parsedCampaignNoteId = useMemo(
    () => parsePositiveIntParam(campaignNoteId),
    [campaignNoteId],
  );

  const editorRef = useRef<ExcalidrawCanvasEditorHandle | null>(null);

  const [world, setWorld] = useState<World | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [note, setNote] = useState<CampaignNote | null>(null);
  const [name, setName] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagVocabulary, setTagVocabulary] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null || parsedCampaignId === null || parsedCampaignNoteId === null) {
      setError('Invalid campaign note route.');
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [existingWorld, existingCampaign, existingNote, campaignTags] = await Promise.all([
          window.db.worlds.getById(worldId),
          window.db.campaigns.getById(parsedCampaignId),
          window.db.campaignNotes.getById(parsedCampaignNoteId),
          window.db.campaignNotes.getAllTagsByCampaign(parsedCampaignId),
        ]);

        if (!existingWorld || !existingCampaign || !existingNote) {
          if (isMounted) {
            setError('Campaign note not found.');
            setWorld(null);
            setCampaign(null);
            setNote(null);
          }
          return;
        }

        if (isMounted) {
          setWorld(existingWorld);
          setCampaign(existingCampaign);
          setNote(existingNote);
          setName(existingNote.name);
          setTags(existingNote.tags);
          setTagVocabulary(campaignTags);
        }
      } catch {
        if (isMounted) {
          setError('Unable to load this campaign note right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [parsedCampaignId, parsedCampaignNoteId, worldId]);

  const handleSave = async () => {
    if (!note || !editorRef.current) {
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Campaign note name required.', 'Enter a name before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const snapshot = await editorRef.current.captureSnapshot();
      const updatedNote = await window.db.campaignNotes.update(note.id, {
        name: trimmedName,
        tags,
        canvas_scene: snapshot.scene,
        canvas_preview_image: snapshot.previewImage,
      });
      setNote(updatedNote);
      setName(updatedNote.name);
      setTags(updatedNote.tags);
      setTagVocabulary(await window.db.campaignNotes.getAllTagsByCampaign(updatedNote.campaign_id));
      toast.success('Campaign note saved.', `"${updatedNote.name}" was updated.`);
    } catch (error) {
      toast.error(
        'Failed to save campaign note.',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const backPath = `/world/${worldId}/campaign/${parsedCampaignId}/notes`;

  return (
    <div className='flex min-h-screen'>
      <WorldSidebar worldId={worldId} />
      <main className='flex-1 space-y-6 p-6'>
        <header className='space-y-2'>
          <Link
            to={backPath}
            className='inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900'
          >
            Back to notes
          </Link>
          <div>
            <p className='text-sm text-slate-500'>{world?.name ?? 'Campaign Note'}</p>
            <h1 className='text-2xl font-semibold tracking-tight text-slate-900'>
              {campaign?.name ?? 'Campaign Note'}
            </h1>
          </div>
        </header>

        {isLoading
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
              Loading campaign note...
            </section>
          )
          : error
          ? (
            <section className='rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm'>
              {error}
            </section>
          )
          : note
          ? (
            <section className='space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
              <EditorActionBar className='justify-between'>
                <button
                  type='button'
                  className='btn btn-ghost'
                  onClick={() => navigate(backPath)}
                  disabled={isSaving}
                >
                  Back
                </button>
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                >
                  {isSaving ? <span className='loading loading-spinner loading-xs' /> : null}
                  <span>Save</span>
                </button>
              </EditorActionBar>

              <div data-testid='campaign-note-layout' className='space-y-4'>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div>
                    <label
                      htmlFor='campaign-note-detail-name'
                      className='mb-1 block text-sm font-medium text-slate-700'
                    >
                      Name <span className='text-rose-500'>*</span>
                    </label>
                    <input
                      id='campaign-note-detail-name'
                      type='text'
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
                    />
                  </div>
                  <TagInput
                    tags={tags}
                    onChange={setTags}
                    suggestions={tagVocabulary}
                    disabled={isSaving}
                  />
                </div>

                <div data-testid='campaign-note-canvas-region' className='h-[80vh] w-full'>
                  <Suspense
                    fallback={
                      <div className='h-full w-full rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600'>
                        Loading canvas...
                      </div>
                    }
                  >
                    <ExcalidrawCanvasEditor
                      ref={editorRef}
                      initialScene={note.canvas_scene}
                      className='h-full w-full rounded-xl border border-slate-200 bg-white'
                    />
                  </Suspense>
                </div>
              </div>
            </section>
          )
          : null}
      </main>
    </div>
  );
}
