import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ItemForm from '../components/items/ItemForm';
import MarkdownView from '../components/ui/MarkdownView';
import ModalShell from '../components/ui/ModalShell';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';
import { useAppSettings } from '../hooks/useAppSettings';
import { useItemCrud } from '../hooks/useItemCrud';
import { buildDetailImageStyle, resolveCardDisplayDimensions } from '../lib/cardDisplaySettings';
import { parsePositiveIntParam } from '../lib/routeParams';
import { normalizeTokenImageSrc } from '../lib/tokenImageSrc';

export default function ItemDetailPage() {
  const toast = useToast();
  const { config } = useAppSettings();
  const { id, itemId } = useParams();
  const worldId = useMemo(() => parsePositiveIntParam(id), [id]);
  const parsedItemId = useMemo(() => parsePositiveIntParam(itemId), [itemId]);
  const imageDimensions = useMemo(
    () => resolveCardDisplayDimensions(config, 'itemDetail'),
    [config],
  );

  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const loadItem = useCallback(async () => {
    if (parsedItemId === null) {
      setError('Invalid item id.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.db.items.getById(parsedItemId);
      if (!result) {
        setError('Item not found.');
        setItem(null);
        return;
      }
      const viewedItem = await window.db.items.markViewed(parsedItemId);
      setItem(viewedItem);
    } catch {
      setError('Unable to load this item right now.');
      setItem(null);
    } finally {
      setIsLoading(false);
    }
  }, [parsedItemId]);

  useEffect(() => {
    void loadItem();
  }, [loadItem]);

  const { isSaving, handleUpdate } = useItemCrud({
    worldId,
    editingItem: item,
    pendingDeleteItem: null,
    reloadItems: loadItem,
    toast,
    onCreateSaved: () => undefined,
    onUpdateSaved: () => setIsEditOpen(false),
    onDeleteSettled: () => undefined,
  });

  const imageSrc = normalizeTokenImageSrc(item?.image_src);

  return (
    <div className='flex min-h-screen'>
      <WorldSidebar worldId={worldId} />
      <main className='flex-1 space-y-6 p-6'>
        <header className='space-y-2'>
          <Link
            to={`/world/${worldId}/items`}
            className='inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900'
          >
            Back to items
          </Link>
        </header>

        {isLoading
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
              Loading item...
            </section>
          )
          : error
          ? (
            <section className='rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm'>
              {error}
            </section>
          )
          : item
          ? (
            <section className='space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-start gap-4'>
                  {imageSrc
                    ? (
                      <img
                        src={imageSrc}
                        alt={item.name}
                        className='rounded object-cover'
                        style={buildDetailImageStyle(imageDimensions)}
                      />
                    )
                    : null}
                  <div>
                    <h1 className='text-2xl font-semibold tracking-tight text-slate-900'>
                      {item.name}
                    </h1>
                    <MarkdownView
                      markdown={item.description}
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

      {isEditOpen && item
        ? (
          <ModalShell
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            labelledBy='edit-item-detail-title'
            boxClassName='max-w-2xl'
          >
            <h2
              id='edit-item-detail-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Edit Item
            </h2>
            <ItemForm
              initialValues={{
                name: item.name,
                description: item.description,
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
