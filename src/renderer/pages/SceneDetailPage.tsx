import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EditorActionBar from '../components/ui/EditorActionBar';
import RichTextEditor from '../components/ui/RichTextEditor';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';
import { parsePositiveIntParam } from '../lib/routeParams';

export default function SceneDetailPage() {
  const toast = useToast();
  const { id, sceneId } = useParams();
  const worldId = useMemo(() => parsePositiveIntParam(id), [id]);
  const parsedSceneId = useMemo(() => parsePositiveIntParam(sceneId), [sceneId]);

  const [scene, setScene] = useState<Scene | null>(null);
  const [arcId, setArcId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (parsedSceneId === null) {
      setError('Invalid scene id.');
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const existingScene = await window.db.scenes.getById(parsedSceneId);
        if (!existingScene) {
          if (isMounted) {
            setError('Scene not found.');
            setScene(null);
          }
          return;
        }

        const act = await window.db.acts.getById(existingScene.act_id);

        if (isMounted) {
          setScene(existingScene);
          setArcId(act?.arc_id ?? null);
          setName(existingScene.name);
          setNotes(existingScene.notes ?? '');
        }
      } catch {
        if (isMounted) {
          setError('Unable to load this scene right now.');
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
  }, [parsedSceneId]);

  const handleSave = async () => {
    if (!scene) {
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Scene name required.', 'Enter a name before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedScene = await window.db.scenes.update(scene.id, {
        name: trimmedName,
        notes: notes.trim() || null,
      });
      setScene(updatedScene);
      setName(updatedScene.name);
      setNotes(updatedScene.notes ?? '');
      toast.success('Scene saved.', `"${updatedScene.name}" was updated.`);
    } catch (saveError) {
      toast.error(
        'Failed to save scene.',
        saveError instanceof Error ? saveError.message : 'Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const backPath = scene && arcId !== null
    ? scene.session_id !== null
      ? `/world/${worldId}/campaign/${scene.campaign_id}/arc/${arcId}/act/${scene.act_id}/session/${scene.session_id}/scenes`
      : `/world/${worldId}/campaign/${scene.campaign_id}/arc/${arcId}/act/${scene.act_id}/scenes`
    : null;

  return (
    <div className='flex min-h-screen'>
      <WorldSidebar worldId={worldId} />
      <main className='flex-1 space-y-6 p-6'>
        {isLoading
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
              Loading scene...
            </section>
          )
          : error
          ? (
            <section className='rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm'>
              {error}
            </section>
          )
          : scene
          ? (
            <section className='space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
              <EditorActionBar className='justify-between'>
                {backPath
                  ? (
                    <Link
                      to={backPath}
                      className='inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900'
                    >
                      Back
                    </Link>
                  )
                  : <span />}
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
              <input
                id='scene-detail-name'
                type='text'
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-label='Scene name'
                className='w-full rounded-lg border border-slate-300 px-3 py-2 text-2xl font-semibold tracking-tight text-slate-900 focus:border-slate-500 focus:outline-none'
              />
              <RichTextEditor
                id='scene-detail-notes'
                value={notes}
                onChange={setNotes}
                variant='full'
                placeholder='Notes for this scene.'
                aria-label='Scene notes'
              />
            </section>
          )
          : null}
      </main>
    </div>
  );
}
