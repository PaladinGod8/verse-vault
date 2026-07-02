import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LoreNoteCard from '../components/loreNotes/LoreNoteCard';
import LoreNoteForm from '../components/loreNotes/LoreNoteForm';
import CardSortToggle from '../components/ui/CardSortToggle';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EntityCountBadge from '../components/ui/EntityCountBadge';
import ModalShell from '../components/ui/ModalShell';
import PageSizeSelect from '../components/ui/PageSizeSelect';
import PaginationBar from '../components/ui/PaginationBar';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';
import { useAppSettings } from '../hooks/useAppSettings';
import { useCardSortPreference } from '../hooks/useCardSortPreference';
import { useLoreNoteCrud } from '../hooks/useLoreNoteCrud';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { useWorldLoreNotesData } from '../hooks/useWorldLoreNotesData';
import { resolveCardDisplayDimensions } from '../lib/cardDisplaySettings';
import { loreNoteMatchesQuery } from '../lib/loreNoteSearch';
import { parsePositiveIntParam } from '../lib/routeParams';
import { sortCardRecords } from '../lib/sortCardRecords';
import { normalizeTokenImageSrc } from '../lib/tokenImageSrc';

export default function LoreNotesPage() {
  const toast = useToast();
  const { config } = useAppSettings();
  const { id } = useParams();
  const worldId = useMemo(() => parsePositiveIntParam(id), [id]);
  const cardDisplayDimensions = useMemo(
    () => resolveCardDisplayDimensions(config, 'loreNoteCard'),
    [config],
  );
  const { method: sortMethod, setMethod: setSortMethod } = useCardSortPreference('loreNotes');
  const { world, loreNotes, tagVocabulary, isLoading, error, reload: reloadLoreNotes } =
    useWorldLoreNotesData(worldId);

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLoreNote, setEditingLoreNote] = useState<LoreNote | null>(null);
  const [pendingDeleteLoreNote, setPendingDeleteLoreNote] = useState<LoreNote | null>(null);

  const { isSaving, deletingLoreNoteId, handleCreate, handleUpdate, handleDelete } =
    useLoreNoteCrud({
      worldId,
      editingLoreNote,
      pendingDeleteLoreNote,
      reloadLoreNotes,
      toast,
      onCreateSaved: () => setIsCreateOpen(false),
      onUpdateSaved: () => setEditingLoreNote(null),
      onDeleteSettled: () => setPendingDeleteLoreNote(null),
    });

  const visibleLoreNotes = useMemo(
    () =>
      sortCardRecords(
        loreNotes.filter((loreNote) => loreNoteMatchesQuery(loreNote, searchQuery)),
        sortMethod,
      ),
    [loreNotes, searchQuery, sortMethod],
  );

  const {
    page,
    pageSize,
    totalPages,
    pageItems: pagedLoreNotes,
    setPage,
    setPageSize,
  } = usePaginatedList(visibleLoreNotes);

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
              {world?.name ?? 'Lore Notes'}
            </h1>
          </div>

          <div className='flex items-start gap-3'>
            <EntityCountBadge count={loreNotes.length} singularLabel='lore note' />
            <CardSortToggle value={sortMethod} onChange={setSortMethod} />
            {worldId !== null
              ? (
                <button
                  type='button'
                  className='shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800'
                  onClick={() => {
                    setEditingLoreNote(null);
                    setIsCreateOpen(true);
                  }}
                >
                  New Lore Note
                </button>
              )
              : null}
          </div>
        </header>

        <input
          type='search'
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder='Search lore notes by name, content, or #tag...'
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
        />

        {isLoading
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
              Loading lore notes...
            </section>
          )
          : error
          ? (
            <section className='rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm'>
              {error}
            </section>
          )
          : visibleLoreNotes.length === 0
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
              <p className='text-sm text-slate-600'>
                {loreNotes.length === 0
                  ? 'No lore notes yet.'
                  : 'No lore notes match your search.'}
              </p>
            </section>
          )
          : (
            <>
              <div className='flex justify-end'>
                <PageSizeSelect value={pageSize} onChange={setPageSize} />
              </div>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                {pagedLoreNotes.map((loreNote) => (
                  <LoreNoteCard
                    key={loreNote.id}
                    loreNote={loreNote}
                    onEdit={() => setEditingLoreNote(loreNote)}
                    onDelete={() => setPendingDeleteLoreNote(loreNote)}
                    isDeleting={deletingLoreNoteId === loreNote.id}
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
            labelledBy='create-lore-note-title'
            boxClassName='max-w-2xl'
          >
            <h2
              id='create-lore-note-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              New Lore Note
            </h2>
            <LoreNoteForm
              onSave={(data) => void handleCreate(data)}
              onClose={() => setIsCreateOpen(false)}
              isSaving={isSaving}
              tagVocabulary={tagVocabulary}
            />
          </ModalShell>
        )
        : null}

      {editingLoreNote !== null
        ? (
          <ModalShell
            isOpen={editingLoreNote !== null}
            onClose={() => setEditingLoreNote(null)}
            labelledBy='edit-lore-note-title'
            boxClassName='max-w-2xl'
          >
            <h2
              id='edit-lore-note-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Edit Lore Note
            </h2>
            <LoreNoteForm
              initialValues={{
                name: editingLoreNote.name,
                content: editingLoreNote.content,
                image_src: normalizeTokenImageSrc(editingLoreNote.image_src),
                tags: editingLoreNote.tags,
              }}
              onSave={(data) => void handleUpdate(data)}
              onClose={() => setEditingLoreNote(null)}
              isSaving={isSaving}
              tagVocabulary={tagVocabulary}
            />
          </ModalShell>
        )
        : null}

      <ConfirmDialog
        isOpen={pendingDeleteLoreNote !== null}
        title={`Delete "${pendingDeleteLoreNote?.name ?? ''}"?`}
        message='This cannot be undone.'
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingDeleteLoreNote(null)}
        confirmLabel='Delete'
        isConfirming={deletingLoreNoteId !== null}
      />
    </div>
  );
}
