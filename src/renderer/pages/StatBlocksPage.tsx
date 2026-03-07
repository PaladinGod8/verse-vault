import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { WorldStatisticsConfig } from '../../shared/statisticsTypes';
import StatBlockCard from '../components/statblocks/StatBlockCard';
import StatBlockForm from '../components/statblocks/StatBlockForm';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ModalShell from '../components/ui/ModalShell';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';

type StatBlockAddData = Parameters<DbApi['statblocks']['add']>[0];

export default function StatBlocksPage() {
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
  const [statblocks, setStatblocks] = useState<StatBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStatBlock, setEditingStatBlock] = useState<StatBlock | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StatBlock | null>(null);

  const worldStatistics = useMemo(() => {
    if (!world?.config) {
      return {
        resources: [],
        passiveScores: [],
      };
    }

    try {
      const parsed: WorldStatisticsConfig = JSON.parse(world.config);
      return {
        resources: parsed.statistics?.resources ?? [],
        passiveScores: parsed.statistics?.passiveScores ?? [],
      };
    } catch {
      return {
        resources: [],
        passiveScores: [],
      };
    }
  }, [world?.config]);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null) {
      setWorld(null);
      setStatblocks([]);
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
            setStatblocks([]);
            setError('World not found.');
          }
          return;
        }

        const list = await window.db.statblocks.getAllByWorld(worldId);
        if (isMounted) {
          setWorld(existingWorld);
          setStatblocks(list);
        }
      } catch {
        if (isMounted) {
          setWorld(null);
          setStatblocks([]);
          setError('Unable to load statblocks right now.');
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

  const handleCreate = async (data: StatBlockAddData) => {
    try {
      const newStatBlock = await window.db.statblocks.add(data);
      setStatblocks((prev) => [
        newStatBlock,
        ...prev.filter((sb) => sb.id !== newStatBlock.id),
      ]);
      setIsCreateOpen(false);
      toast.success('StatBlock created.', `"${newStatBlock.name}" was added.`);
    } catch (createError) {
      toast.error(
        'Failed to create statblock.',
        createError instanceof Error
          ? createError.message
          : 'Please try again.',
      );
      throw createError;
    }
  };

  const handleUpdate = async (data: StatBlockAddData) => {
    if (!editingStatBlock) {
      return;
    }

    try {
      const updatedStatBlock = await window.db.statblocks.update(
        editingStatBlock.id,
        {
          name: data.name,
          description: data.description,
          config: data.config,
        },
      );
      setStatblocks((prev) =>
        prev.map((sb) => sb.id === updatedStatBlock.id ? updatedStatBlock : sb)
      );
      setEditingStatBlock(null);
      toast.success(
        'StatBlock updated.',
        `"${updatedStatBlock.name}" was saved.`,
      );
    } catch (updateError) {
      toast.error(
        'Failed to update statblock.',
        updateError instanceof Error
          ? updateError.message
          : 'Please try again.',
      );
      throw updateError;
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }
    const sb = pendingDelete;

    setDeletingId(sb.id);

    try {
      await window.db.statblocks.delete(sb.id);
      setStatblocks((prev) => prev.filter((s) => s.id !== sb.id));
      toast.success('StatBlock deleted.', `"${sb.name}" was removed.`);
    } catch (deleteError) {
      toast.error(
        'Failed to delete statblock.',
        deleteError instanceof Error
          ? deleteError.message
          : 'Please try again.',
      );
    } finally {
      setDeletingId((current) => (current === sb.id ? null : current));
      setPendingDelete((current) => (current?.id === sb.id ? null : current));
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
              {world?.name ?? 'StatBlocks'}
            </h1>
          </div>

          {worldId !== null
            ? (
              <button
                type='button'
                className='shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800'
                onClick={() => setIsCreateOpen(true)}
              >
                New StatBlock
              </button>
            )
            : null}
        </header>

        {isLoading
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
              Loading statblocks...
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

        {!isLoading && !error && statblocks.length === 0
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
              <p className='text-sm text-slate-600'>No statblocks yet.</p>
            </section>
          )
          : null}

        {!isLoading && !error && statblocks.length > 0
          ? (
            <section className='grid grid-cols-1 gap-4'>
              {statblocks.map((sb) => (
                <StatBlockCard
                  key={sb.id}
                  statBlock={sb}
                  resourceDefinitions={worldStatistics.resources}
                  passiveScoreDefinitions={worldStatistics.passiveScores}
                  onEdit={(target) => {
                    setIsCreateOpen(false);
                    setEditingStatBlock(target);
                  }}
                  onDelete={(targetId) => {
                    const found = statblocks.find((s) => s.id === targetId);
                    if (found) setPendingDelete(found);
                  }}
                />
              ))}
            </section>
          )
          : null}
      </main>

      {isCreateOpen && worldId !== null
        ? (
          <ModalShell
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            labelledBy='create-statblock-title'
            boxClassName='max-h-[calc(100vh-2rem)] max-w-xl overflow-y-auto'
          >
            <h2
              id='create-statblock-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              New StatBlock
            </h2>
            <StatBlockForm
              mode='create'
              worldId={worldId}
              onSubmit={handleCreate}
              onCancel={() => setIsCreateOpen(false)}
            />
          </ModalShell>
        )
        : null}

      {editingStatBlock !== null
        ? (
          <ModalShell
            isOpen={editingStatBlock !== null}
            onClose={() => setEditingStatBlock(null)}
            labelledBy='edit-statblock-title'
            boxClassName='max-h-[calc(100vh-2rem)] max-w-xl overflow-y-auto'
          >
            <h2
              id='edit-statblock-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Edit StatBlock
            </h2>
            <StatBlockForm
              mode='edit'
              worldId={editingStatBlock.world_id}
              initialData={editingStatBlock}
              onSubmit={handleUpdate}
              onCancel={() => setEditingStatBlock(null)}
            />
          </ModalShell>
        )
        : null}

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title={`Delete "${pendingDelete?.name ?? ''}"?`}
        message='This cannot be undone.'
        onConfirm={() => {
          void handleDelete();
        }}
        onCancel={() => setPendingDelete(null)}
        confirmLabel='Delete'
        isConfirming={deletingId !== null}
      />
    </div>
  );
}
