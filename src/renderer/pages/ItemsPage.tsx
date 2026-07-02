import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ItemCard from '../components/items/ItemCard';
import ItemForm from '../components/items/ItemForm';
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
import { useItemCrud } from '../hooks/useItemCrud';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { useWorldItemsData } from '../hooks/useWorldItemsData';
import { resolveCardDisplayDimensions } from '../lib/cardDisplaySettings';
import { itemMatchesQuery } from '../lib/itemSearch';
import { parsePositiveIntParam } from '../lib/routeParams';
import { sortCardRecords } from '../lib/sortCardRecords';
import { normalizeTokenImageSrc } from '../lib/tokenImageSrc';

export default function ItemsPage() {
  const toast = useToast();
  const { config } = useAppSettings();
  const { id } = useParams();
  const worldId = useMemo(() => parsePositiveIntParam(id), [id]);
  const cardDisplayDimensions = useMemo(
    () => resolveCardDisplayDimensions(config, 'itemCard'),
    [config],
  );
  const { method: sortMethod, setMethod: setSortMethod } = useCardSortPreference('items');
  const { world, items, isLoading, error, reload: reloadItems } = useWorldItemsData(worldId);

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<Item | null>(null);

  const { isSaving, deletingItemId, handleCreate, handleUpdate, handleDelete } = useItemCrud({
    worldId,
    editingItem,
    pendingDeleteItem,
    reloadItems,
    toast,
    onCreateSaved: () => setIsCreateOpen(false),
    onUpdateSaved: () => setEditingItem(null),
    onDeleteSettled: () => setPendingDeleteItem(null),
  });

  const visibleItems = useMemo(
    () =>
      sortCardRecords(
        items.filter((item) => itemMatchesQuery(item, searchQuery)),
        sortMethod,
      ),
    [items, searchQuery, sortMethod],
  );

  const {
    page,
    pageSize,
    totalPages,
    pageItems: pagedItems,
    setPage,
    setPageSize,
  } = usePaginatedList(visibleItems);

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
              {world?.name ?? 'Items'}
            </h1>
          </div>

          <div className='flex items-start gap-3'>
            <EntityCountBadge count={items.length} singularLabel='item' />
            <CardSortToggle value={sortMethod} onChange={setSortMethod} />
            {worldId !== null
              ? (
                <button
                  type='button'
                  className='shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800'
                  onClick={() => {
                    setEditingItem(null);
                    setIsCreateOpen(true);
                  }}
                >
                  New Item
                </button>
              )
              : null}
          </div>
        </header>

        <input
          type='search'
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder='Search items by name or description...'
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
        />

        {isLoading
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
              Loading items...
            </section>
          )
          : error
          ? (
            <section className='rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm'>
              {error}
            </section>
          )
          : visibleItems.length === 0
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
              <p className='text-sm text-slate-600'>
                {items.length === 0
                  ? 'No items yet.'
                  : 'No items match your search.'}
              </p>
            </section>
          )
          : (
            <>
              <div className='flex justify-end'>
                <PageSizeSelect value={pageSize} onChange={setPageSize} />
              </div>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                {pagedItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onEdit={() => setEditingItem(item)}
                    onDelete={() => setPendingDeleteItem(item)}
                    isDeleting={deletingItemId === item.id}
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
            labelledBy='create-item-title'
            boxClassName='max-w-2xl'
          >
            <h2
              id='create-item-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              New Item
            </h2>
            <ItemForm
              onSave={(data) => void handleCreate(data)}
              onClose={() => setIsCreateOpen(false)}
              isSaving={isSaving}
            />
          </ModalShell>
        )
        : null}

      {editingItem !== null
        ? (
          <ModalShell
            isOpen={editingItem !== null}
            onClose={() => setEditingItem(null)}
            labelledBy='edit-item-title'
            boxClassName='max-w-2xl'
          >
            <h2
              id='edit-item-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Edit Item
            </h2>
            <ItemForm
              initialValues={{
                name: editingItem.name,
                description: editingItem.description,
                image_src: normalizeTokenImageSrc(editingItem.image_src),
              }}
              onSave={(data) => void handleUpdate(data)}
              onClose={() => setEditingItem(null)}
              isSaving={isSaving}
            />
          </ModalShell>
        )
        : null}

      <ConfirmDialog
        isOpen={pendingDeleteItem !== null}
        title={`Delete "${pendingDeleteItem?.name ?? ''}"?`}
        message='This cannot be undone.'
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingDeleteItem(null)}
        confirmLabel='Delete'
        isConfirming={deletingItemId !== null}
      />
    </div>
  );
}
