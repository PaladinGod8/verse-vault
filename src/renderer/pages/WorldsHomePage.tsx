import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CardSortToggle from '../components/ui/CardSortToggle';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ModalShell from '../components/ui/ModalShell';
import { useToast } from '../components/ui/ToastProvider';
import WorldCard from '../components/worlds/WorldCard';
import WorldForm, { type WorldFormValues } from '../components/worlds/WorldForm';
import { useCardSortPreference } from '../hooks/useCardSortPreference';
import { persistImageEditDraft } from '../lib/imageCrop';
import { sortCardRecords } from '../lib/sortCardRecords';

export default function WorldsHomePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { method: sortMethod, setMethod: setSortMethod } = useCardSortPreference('worlds');

  const [worlds, setWorlds] = useState<World[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportingWorldId, setExportingWorldId] = useState<number | null>(null);
  const [editingWorld, setEditingWorld] = useState<World | null>(null);
  const [deletingWorldId, setDeletingWorldId] = useState<number | null>(null);
  const [pendingDeleteWorld, setPendingDeleteWorld] = useState<World | null>(
    null,
  );
  const sortedWorlds = useMemo(() => sortCardRecords(worlds, sortMethod), [worlds, sortMethod]);

  useEffect(() => {
    let isMounted = true;

    const loadWorlds = async () => {
      try {
        const data = await window.db.worlds.getAll();
        if (isMounted) {
          setWorlds(data);
        }
      } catch {
        if (isMounted) {
          setLoadError('Unable to load worlds right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadWorlds();

    return () => {
      isMounted = false;
    };
  }, []);

  const upsertWorld = (nextWorld: World) => {
    setWorlds((previousWorlds) => [
      nextWorld,
      ...previousWorlds.filter((world) => world.id !== nextWorld.id),
    ]);
  };

  const handleCreateWorld = async (data: WorldFormValues) => {
    try {
      const persistedImage = data.image_edit_draft
        ? await persistImageEditDraft({
          draft: data.image_edit_draft,
          importImage: window.db.worlds.importImage,
        })
        : null;
      const createdWorld = await window.db.worlds.add({
        name: data.name,
        thumbnail: persistedImage?.imageSrc ?? data.thumbnail ?? null,
        original_thumbnail_src: persistedImage?.originalImageSrc ?? data.original_thumbnail_src
          ?? null,
        thumbnail_crop: persistedImage?.imageCrop ?? data.thumbnail_crop ?? null,
        short_description: data.short_description ?? null,
      });
      upsertWorld(createdWorld);
      setLoadError(null);
      setIsCreateOpen(false);
      toast.success('World created.', `"${createdWorld.name}" is ready.`);
    } catch (createError) {
      toast.error(
        'Failed to create world.',
        createError instanceof Error
          ? createError.message
          : 'Please try again.',
      );
      throw createError;
    }
  };

  const handleUpdateWorld = async (data: WorldFormValues) => {
    if (!editingWorld) {
      return;
    }

    try {
      const persistedImage = data.image_edit_draft
        ? await persistImageEditDraft({
          draft: data.image_edit_draft,
          currentOriginalImageSrc: editingWorld.original_thumbnail_src ?? null,
          importImage: window.db.worlds.importImage,
        })
        : null;
      const updatedWorld = await window.db.worlds.update(editingWorld.id, {
        name: data.name,
        thumbnail: data.clear_thumbnail
          ? null
          : persistedImage?.imageSrc
            ?? data.thumbnail
            ?? editingWorld.thumbnail,
        original_thumbnail_src: data.clear_thumbnail
          ? null
          : persistedImage?.originalImageSrc
            ?? data.original_thumbnail_src
            ?? editingWorld.original_thumbnail_src,
        thumbnail_crop: data.clear_thumbnail
          ? null
          : persistedImage?.imageCrop
            ?? data.thumbnail_crop
            ?? editingWorld.thumbnail_crop,
        short_description: data.short_description ?? null,
      });
      upsertWorld(updatedWorld);
      setLoadError(null);
      setEditingWorld(null);
      toast.success('World updated.', `"${updatedWorld.name}" was saved.`);
    } catch (updateError) {
      toast.error(
        'Failed to update world.',
        updateError instanceof Error
          ? updateError.message
          : 'Please try again.',
      );
      throw updateError;
    }
  };

  const handleImportWorld = async () => {
    setIsImporting(true);
    try {
      const result = await window.db.worlds.import();
      if (result.canceled) {
        return;
      }
      const data = await window.db.worlds.getAll();
      setWorlds(data);
      setLoadError(null);
      toast.success('World imported.', `"${result.worldName}" was added to your worlds.`);
    } catch (importError) {
      toast.error(
        'Failed to import world.',
        importError instanceof Error ? importError.message : 'Please try again.',
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportWorld = async (world: World) => {
    setExportingWorldId(world.id);
    try {
      const result = await window.db.worlds.export(world.id);
      if (result.canceled) {
        return;
      }
      toast.success('World exported.', `"${world.name}" was saved to ${result.filePath}.`);
    } catch (exportError) {
      toast.error(
        'Failed to export world.',
        exportError instanceof Error ? exportError.message : 'Please try again.',
      );
    } finally {
      setExportingWorldId((current) => (current === world.id ? null : current));
    }
  };

  const handleRequestDeleteWorld = (world: World) => {
    setPendingDeleteWorld(world);
  };

  const handleDeleteWorld = async () => {
    if (!pendingDeleteWorld) {
      return;
    }
    const world = pendingDeleteWorld;

    setDeletingWorldId(world.id);

    try {
      await window.db.worlds.delete(world.id);
      setWorlds((previousWorlds) => previousWorlds.filter((item) => item.id !== world.id));
      setLoadError(null);
      setEditingWorld((current) => (current?.id === world.id ? null : current));
      toast.success('World deleted.', `"${world.name}" was removed.`);
    } catch (deleteError) {
      toast.error(
        'Failed to delete world.',
        deleteError instanceof Error
          ? deleteError.message
          : 'Please try again.',
      );
    } finally {
      setDeletingWorldId((current) => (current === world.id ? null : current));
      setPendingDeleteWorld((current) => current?.id === world.id ? null : current);
    }
  };

  return (
    <>
      <main className='space-y-6'>
        <header className='flex items-start justify-between gap-4'>
          <div className='space-y-1'>
            <h1 className='text-2xl font-semibold tracking-tight text-slate-900'>
              Worlds
            </h1>
            <p className='text-sm text-slate-600'>
              Create, edit, and delete your worlds from one place.
            </p>
          </div>

          <div className='flex shrink-0 items-center gap-2'>
            <CardSortToggle value={sortMethod} onChange={setSortMethod} />
            <Link
              to='/settings'
              className='rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50'
            >
              Settings
            </Link>
            <button
              type='button'
              disabled={isImporting}
              className='rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
              onClick={handleImportWorld}
            >
              {isImporting ? 'Importing…' : 'Import World Data'}
            </button>
            <button
              type='button'
              className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800'
              onClick={() => setIsCreateOpen(true)}
            >
              Create world
            </button>
          </div>
        </header>

        {isLoading
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
              Loading worlds...
            </section>
          )
          : null}

        {!isLoading && loadError
          ? (
            <section className='rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 shadow-sm'>
              {loadError}
            </section>
          )
          : null}

        {!isLoading && !loadError && sortedWorlds.length === 0
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
              <h2 className='text-lg font-semibold text-slate-900'>
                No worlds yet
              </h2>
              <p className='mt-2 text-sm text-slate-600'>
                Create your first world to get started.
              </p>
            </section>
          )
          : null}

        {!isLoading && !loadError && sortedWorlds.length > 0
          ? (
            <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
              {sortedWorlds.map((world) => (
                <WorldCard
                  key={world.id}
                  world={world}
                  onOpen={() => navigate(`/world/${world.id}`)}
                  onEdit={() => {
                    setIsCreateOpen(false);
                    setEditingWorld(world);
                  }}
                  onExport={() => {
                    handleExportWorld(world);
                  }}
                  onDelete={() => {
                    handleRequestDeleteWorld(world);
                  }}
                  isDeleting={deletingWorldId === world.id}
                  isExporting={exportingWorldId === world.id}
                />
              ))}
            </section>
          )
          : null}
      </main>

      {isCreateOpen
        ? (
          <ModalShell
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            labelledBy='create-world-title'
            boxClassName='max-w-xl'
          >
            <h2
              id='create-world-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Create world
            </h2>
            <WorldForm
              mode='create'
              onSubmit={handleCreateWorld}
              onCancel={() => setIsCreateOpen(false)}
            />
          </ModalShell>
        )
        : null}

      {editingWorld
        ? (
          <ModalShell
            isOpen={editingWorld !== null}
            onClose={() => setEditingWorld(null)}
            labelledBy='edit-world-title'
            boxClassName='max-w-xl'
          >
            <h2
              id='edit-world-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Edit world
            </h2>
            <WorldForm
              mode='edit'
              initialValues={editingWorld}
              onSubmit={handleUpdateWorld}
              onCancel={() => setEditingWorld(null)}
            />
          </ModalShell>
        )
        : null}

      <ConfirmDialog
        isOpen={pendingDeleteWorld !== null}
        title={`Delete "${pendingDeleteWorld?.name ?? ''}"?`}
        message='This cannot be undone.'
        onConfirm={() => {
          void handleDeleteWorld();
        }}
        onCancel={() => setPendingDeleteWorld(null)}
        confirmLabel='Delete'
        isConfirming={deletingWorldId !== null}
      />
    </>
  );
}
