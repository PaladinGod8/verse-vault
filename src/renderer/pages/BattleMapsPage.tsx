import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BattleMapForm from '../components/battlemaps/BattleMapForm';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ModalShell from '../components/ui/ModalShell';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';

type AddBattleMapInput = Parameters<DbApi['battlemaps']['add']>[0];

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) {
    return '-';
  }

  const normalized = timestamp.includes('T')
    ? timestamp
    : `${timestamp.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export default function BattleMapsPage() {
  const toast = useToast();
  const { id } = useParams();
  const worldId = useMemo(() => {
    if (!id) {
      return null;
    }

    const parsed = Number(id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  }, [id]);

  const [world, setWorld] = useState<World | null>(null);
  const [battleMaps, setBattleMaps] = useState<BattleMap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBattleMap, setEditingBattleMap] = useState<BattleMap | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDeleteBattleMap, setPendingDeleteBattleMap] = useState<BattleMap | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null) {
      setWorld(null);
      setBattleMaps([]);
      setError('Invalid world id.');
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const existingWorld = await window.db.worlds.getById(worldId);
        if (!existingWorld) {
          if (isMounted) {
            setWorld(null);
            setBattleMaps([]);
            setError('World not found.');
          }
          return;
        }

        const battleMapList = await window.db.battlemaps.getAllByWorld(worldId);
        if (isMounted) {
          setWorld(existingWorld);
          setBattleMaps(battleMapList);
        }
      } catch {
        if (isMounted) {
          setWorld(null);
          setBattleMaps([]);
          setError('Unable to load BattleMaps right now.');
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
  }, [worldId]);

  const handleCreateBattleMap = async (data: AddBattleMapInput) => {
    try {
      const newBattleMap = await window.db.battlemaps.add(data);
      setBattleMaps((prev) => [
        newBattleMap,
        ...prev.filter((battleMap) => battleMap.id !== newBattleMap.id),
      ]);
      setIsCreateOpen(false);
      toast.success('BattleMap created.', `"${newBattleMap.name}" was added.`);
    } catch (createError) {
      toast.error(
        'Failed to create BattleMap.',
        createError instanceof Error
          ? createError.message
          : 'Please try again.',
      );
      throw createError;
    }
  };

  const handleUpdateBattleMap = async (data: AddBattleMapInput) => {
    if (!editingBattleMap) {
      return;
    }

    const { name, config } = data;

    try {
      const updatedBattleMap = await window.db.battlemaps.update(
        editingBattleMap.id,
        {
          name,
          config,
        },
      );
      setBattleMaps((prev) =>
        prev.map((battleMap) => battleMap.id === updatedBattleMap.id ? updatedBattleMap : battleMap)
      );
      setEditingBattleMap(null);
      toast.success(
        'BattleMap updated.',
        `"${updatedBattleMap.name}" was saved.`,
      );
    } catch (updateError) {
      toast.error(
        'Failed to update BattleMap.',
        updateError instanceof Error
          ? updateError.message
          : 'Please try again.',
      );
      throw updateError;
    }
  };

  const handleRequestDeleteBattleMap = (battleMap: BattleMap) => {
    setPendingDeleteBattleMap(battleMap);
  };

  const handleDeleteBattleMap = async () => {
    if (!pendingDeleteBattleMap) {
      return;
    }
    const battleMap = pendingDeleteBattleMap;

    setDeletingId(battleMap.id);

    try {
      await window.db.battlemaps.delete(battleMap.id);
      setBattleMaps((prev) =>
        prev.filter(
          (existingBattleMap) => existingBattleMap.id !== battleMap.id,
        )
      );
      toast.success('BattleMap deleted.', `"${battleMap.name}" was removed.`);
    } catch (deleteError) {
      toast.error(
        'Failed to delete BattleMap.',
        deleteError instanceof Error
          ? deleteError.message
          : 'Please try again.',
      );
    } finally {
      setDeletingId((current) => (current === battleMap.id ? null : current));
      setPendingDeleteBattleMap((current) => current?.id === battleMap.id ? null : current);
    }
  };

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
              {world?.name ?? 'BattleMaps'}
            </h1>
          </div>

          {worldId !== null
            ? (
              <button
                type='button'
                className='shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800'
                onClick={() => {
                  setEditingBattleMap(null);
                  setIsCreateOpen(true);
                }}
              >
                New BattleMap
              </button>
            )
            : null}
        </header>

        {isLoading
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
              Loading BattleMaps...
            </section>
          )
          : null}

        {!isLoading && error
          ? (
            <section className='rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm'>
              {error}
            </section>
          )
          : null}

        {!isLoading && !error && battleMaps.length === 0
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
              <p className='text-sm text-slate-600'>No BattleMaps yet.</p>
            </section>
          )
          : null}

        {!isLoading && !error && battleMaps.length > 0
          ? (
            <section className='rounded-xl border border-slate-200 bg-white shadow-sm'>
              <table className='w-full text-sm text-slate-700'>
                <thead>
                  <tr className='border-b border-slate-200'>
                    <th className='px-4 py-3 text-left font-medium text-slate-500'>
                      Name
                    </th>
                    <th className='px-4 py-3 text-left font-medium text-slate-500'>
                      Created
                    </th>
                    <th className='px-4 py-3 text-left font-medium text-slate-500'>
                      Last Updated
                    </th>
                    <th className='px-4 py-3 text-left font-medium text-slate-500'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {battleMaps.map((battleMap) => (
                    <tr
                      key={battleMap.id}
                      className='border-b border-slate-100 last:border-0'
                    >
                      <td className='px-4 py-3 font-medium'>{battleMap.name}</td>
                      <td className='px-4 py-3 text-slate-500'>
                        {formatTimestamp(battleMap.created_at)}
                      </td>
                      <td className='px-4 py-3 text-slate-500'>
                        {formatTimestamp(battleMap.updated_at)}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex gap-3'>
                          <Link
                            to={`/world/${worldId}/battlemaps/${battleMap.id}/runtime`}
                            className='text-sm font-medium text-slate-600 transition hover:text-slate-900'
                          >
                            Play
                          </Link>
                          <button
                            type='button'
                            onClick={() => {
                              setIsCreateOpen(false);
                              setEditingBattleMap(battleMap);
                            }}
                            className='text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
                            disabled={deletingId === battleMap.id}
                          >
                            Edit
                          </button>
                          <button
                            type='button'
                            onClick={() => {
                              handleRequestDeleteBattleMap(battleMap);
                            }}
                            className='text-sm font-medium text-rose-600 transition hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60'
                            disabled={deletingId === battleMap.id}
                          >
                            {deletingId === battleMap.id
                              ? 'Deleting...'
                              : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )
          : null}
      </main>

      {isCreateOpen && worldId !== null
        ? (
          <ModalShell
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            labelledBy='create-battlemap-title'
            boxClassName='max-w-xl'
          >
            <h2
              id='create-battlemap-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              New BattleMap
            </h2>
            <BattleMapForm
              mode='create'
              worldId={worldId}
              onSubmit={handleCreateBattleMap}
              onCancel={() => setIsCreateOpen(false)}
            />
          </ModalShell>
        )
        : null}

      {editingBattleMap !== null
        ? (
          <ModalShell
            isOpen={editingBattleMap !== null}
            onClose={() => setEditingBattleMap(null)}
            labelledBy='edit-battlemap-title'
            boxClassName='max-w-xl'
          >
            <h2
              id='edit-battlemap-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Edit BattleMap
            </h2>
            <BattleMapForm
              mode='edit'
              worldId={editingBattleMap.world_id}
              initialValues={editingBattleMap}
              onSubmit={handleUpdateBattleMap}
              onCancel={() => setEditingBattleMap(null)}
            />
          </ModalShell>
        )
        : null}

      <ConfirmDialog
        isOpen={pendingDeleteBattleMap !== null}
        title={`Delete "${pendingDeleteBattleMap?.name ?? ''}"?`}
        message='This cannot be undone.'
        onConfirm={() => {
          void handleDeleteBattleMap();
        }}
        onCancel={() => setPendingDeleteBattleMap(null)}
        confirmLabel='Delete'
        isConfirming={deletingId !== null}
      />
    </div>
  );
}
