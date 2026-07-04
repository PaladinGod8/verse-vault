import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BackgroundForm from '../components/backgrounds/BackgroundForm';
import MarkdownView from '../components/ui/MarkdownView';
import ModalShell from '../components/ui/ModalShell';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';
import { useAppSettings } from '../hooks/useAppSettings';
import { useBackgroundCrud } from '../hooks/useBackgroundCrud';
import { buildDetailImageStyle, resolveCardDisplayDimensions } from '../lib/cardDisplaySettings';
import { parsePositiveIntParam } from '../lib/routeParams';
import { normalizeTokenImageSrc } from '../lib/tokenImageSrc';

export default function BackgroundDetailPage() {
  const toast = useToast();
  const { config } = useAppSettings();
  const { id, backgroundId } = useParams();
  const worldId = useMemo(() => parsePositiveIntParam(id), [id]);
  const parsedBackgroundId = useMemo(() => parsePositiveIntParam(backgroundId), [backgroundId]);
  const imageDimensions = useMemo(
    () => resolveCardDisplayDimensions(config, 'backgroundDetail'),
    [config],
  );

  const [background, setBackground] = useState<Background | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const loadBackground = useCallback(async () => {
    if (parsedBackgroundId === null) {
      setError('Invalid background id.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.db.backgrounds.getById(parsedBackgroundId);
      if (!result) {
        setError('Background not found.');
        setBackground(null);
        return;
      }
      const viewedBackground = await window.db.backgrounds.markViewed(parsedBackgroundId);
      setBackground(viewedBackground);
    } catch {
      setError('Unable to load this background right now.');
      setBackground(null);
    } finally {
      setIsLoading(false);
    }
  }, [parsedBackgroundId]);

  useEffect(() => {
    void loadBackground();
  }, [loadBackground]);

  const { isSaving, handleUpdate } = useBackgroundCrud({
    worldId,
    editingBackground: background,
    pendingDeleteBackground: null,
    reloadBackgrounds: loadBackground,
    toast,
    onCreateSaved: () => undefined,
    onUpdateSaved: () => setIsEditOpen(false),
    onDeleteSettled: () => undefined,
  });

  const imageSrc = normalizeTokenImageSrc(background?.image_src);

  return (
    <div className='flex min-h-screen'>
      <WorldSidebar worldId={worldId} />
      <main className='flex-1 space-y-6 p-6'>
        <header className='space-y-2'>
          <Link
            to={`/world/${worldId}/backgrounds`}
            className='inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900'
          >
            Back to backgrounds
          </Link>
        </header>

        {isLoading
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
              Loading background...
            </section>
          )
          : error
          ? (
            <section className='rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm'>
              {error}
            </section>
          )
          : background
          ? (
            <section className='space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-start gap-4'>
                  {imageSrc
                    ? (
                      <img
                        src={imageSrc}
                        alt={background.name}
                        className='rounded object-cover'
                        style={buildDetailImageStyle(imageDimensions)}
                      />
                    )
                    : null}
                  <div>
                    <h1 className='text-2xl font-semibold tracking-tight text-slate-900'>
                      {background.name}
                    </h1>
                    <MarkdownView
                      markdown={background.description}
                      className='mt-1 text-sm text-slate-600'
                    />
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
            </section>
          )
          : null}
      </main>

      {isEditOpen && background
        ? (
          <ModalShell
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            labelledBy='edit-background-detail-title'
            boxClassName='max-w-2xl'
          >
            <h2
              id='edit-background-detail-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Edit Background
            </h2>
            <BackgroundForm
              initialValues={{
                name: background.name,
                description: background.description,
                image_src: imageSrc,
              }}
              onSave={(data) => void handleUpdate(data)}
              onClose={() => setIsEditOpen(false)}
              isSaving={isSaving}
            />
          </ModalShell>
        )
        : null}
    </div>
  );
}
