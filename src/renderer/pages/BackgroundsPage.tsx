import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BackgroundCard from '../components/backgrounds/BackgroundCard';
import BackgroundForm from '../components/backgrounds/BackgroundForm';
import CardSortToggle from '../components/ui/CardSortToggle';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EntityCountBadge from '../components/ui/EntityCountBadge';
import ModalShell from '../components/ui/ModalShell';
import PageSizeSelect from '../components/ui/PageSizeSelect';
import PaginationBar from '../components/ui/PaginationBar';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';
import { useAppSettings } from '../hooks/useAppSettings';
import { useBackgroundCrud } from '../hooks/useBackgroundCrud';
import { useCardSortPreference } from '../hooks/useCardSortPreference';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { useWorldBackgroundsData } from '../hooks/useWorldBackgroundsData';
import { backgroundMatchesQuery } from '../lib/backgroundSearch';
import { resolveCardDisplayDimensions } from '../lib/cardDisplaySettings';
import { parsePositiveIntParam } from '../lib/routeParams';
import { sortCardRecords } from '../lib/sortCardRecords';
import { normalizeTokenImageSrc } from '../lib/tokenImageSrc';

export default function BackgroundsPage() {
  const toast = useToast();
  const { config } = useAppSettings();
  const { id } = useParams();
  const worldId = useMemo(() => parsePositiveIntParam(id), [id]);
  const cardDisplayDimensions = useMemo(
    () => resolveCardDisplayDimensions(config, 'backgroundCard'),
    [config],
  );
  const { method: sortMethod, setMethod: setSortMethod } = useCardSortPreference('backgrounds');
  const { world, backgrounds, isLoading, error, reload: reloadBackgrounds } =
    useWorldBackgroundsData(worldId);

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBackground, setEditingBackground] = useState<Background | null>(null);
  const [pendingDeleteBackground, setPendingDeleteBackground] = useState<Background | null>(null);

  const { isSaving, deletingBackgroundId, handleCreate, handleUpdate, handleDelete } =
    useBackgroundCrud({
      worldId,
      editingBackground,
      pendingDeleteBackground,
      reloadBackgrounds,
      toast,
      onCreateSaved: () => setIsCreateOpen(false),
      onUpdateSaved: () => setEditingBackground(null),
      onDeleteSettled: () => setPendingDeleteBackground(null),
    });

  const visibleBackgrounds = useMemo(
    () =>
      sortCardRecords(
        backgrounds.filter((background) => backgroundMatchesQuery(background, searchQuery)),
        sortMethod,
      ),
    [backgrounds, searchQuery, sortMethod],
  );

  const {
    page,
    pageSize,
    totalPages,
    pageItems: pagedBackgrounds,
    setPage,
    setPageSize,
  } = usePaginatedList(visibleBackgrounds);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, sortMethod, setPage]);

  return (
    <div className='flex min-h-screen'>
      <WorldSidebar worldId={worldId} />
      <main className='flex-1 space-y-6 p-6'>
        <header className='flex items-start justify-between gap-4'>
          <div className='space-y-2'>
            <Link
              to={`/world/${worldId}`}
              className='inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900'
            >
              Back to world
            </Link>
            <h1 className='text-2xl font-semibold tracking-tight text-slate-900'>
              {world?.name ?? 'Backgrounds'}
            </h1>
          </div>

          <div className='flex items-start gap-3'>
            <EntityCountBadge count={backgrounds.length} singularLabel='background' />
            <CardSortToggle value={sortMethod} onChange={setSortMethod} />
            {worldId !== null
              ? (
                <button
                  type='button'
                  className='shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800'
                  onClick={() => {
                    setEditingBackground(null);
                    setIsCreateOpen(true);
                  }}
                >
                  New Background
                </button>
              )
              : null}
          </div>
        </header>

        <input
          type='search'
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder='Search backgrounds by name or description...'
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
        />

        {isLoading
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
              Loading backgrounds...
            </section>
          )
          : error
          ? (
            <section className='rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm'>
              {error}
            </section>
          )
          : visibleBackgrounds.length === 0
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
              <p className='text-sm text-slate-600'>
                {backgrounds.length === 0
                  ? 'No backgrounds yet.'
                  : 'No backgrounds match your search.'}
              </p>
            </section>
          )
          : (
            <>
              <div className='flex justify-end'>
                <PageSizeSelect value={pageSize} onChange={setPageSize} />
              </div>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                {pagedBackgrounds.map((background) => (
                  <BackgroundCard
                    key={background.id}
                    background={background}
                    onEdit={() => setEditingBackground(background)}
                    onDelete={() => setPendingDeleteBackground(background)}
                    isDeleting={deletingBackgroundId === background.id}
                    displayDimensions={cardDisplayDimensions}
                  />
                ))}
              </div>
              <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
      </main>

      {isCreateOpen && worldId !== null
        ? (
          <ModalShell
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            labelledBy='create-background-title'
            boxClassName='max-w-2xl'
          >
            <h2
              id='create-background-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              New Background
            </h2>
            <BackgroundForm
              onSave={(data) => void handleCreate(data)}
              onClose={() => setIsCreateOpen(false)}
              isSaving={isSaving}
            />
          </ModalShell>
        )
        : null}

      {editingBackground !== null
        ? (
          <ModalShell
            isOpen={editingBackground !== null}
            onClose={() => setEditingBackground(null)}
            labelledBy='edit-background-title'
            boxClassName='max-w-2xl'
          >
            <h2
              id='edit-background-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Edit Background
            </h2>
            <BackgroundForm
              initialValues={{
                name: editingBackground.name,
                description: editingBackground.description,
                image_src: normalizeTokenImageSrc(editingBackground.image_src),
              }}
              onSave={(data) => void handleUpdate(data)}
              onClose={() => setEditingBackground(null)}
              isSaving={isSaving}
            />
          </ModalShell>
        )
        : null}

      <ConfirmDialog
        isOpen={pendingDeleteBackground !== null}
        title={`Delete "${pendingDeleteBackground?.name ?? ''}"?`}
        message='This cannot be undone.'
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingDeleteBackground(null)}
        confirmLabel='Delete'
        isConfirming={deletingBackgroundId !== null}
      />
    </div>
  );
}
