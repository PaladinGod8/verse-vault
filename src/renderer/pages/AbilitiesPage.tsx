import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AbilityChildrenManager from '../components/abilities/AbilityChildrenManager';
import AbilityForm from '../components/abilities/AbilityForm';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ModalShell from '../components/ui/ModalShell';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';

type AddAbilityInput = Parameters<DbApi['abilities']['add']>[0];

function isAbilityChildManagerSupported(ability: Ability): boolean {
  const subtype = ability.passive_subtype;
  return (
    ability.type === 'passive'
    && (subtype === 'linchpin'
      || subtype === 'keystone'
      || subtype === 'rostering')
  );
}

export default function AbilitiesPage() {
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
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAbility, setEditingAbility] = useState<Ability | null>(null);
  const [managingChildrenAbilityId, setManagingChildrenAbilityId] = useState<
    number | null
  >(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDeleteAbility, setPendingDeleteAbility] = useState<Ability | null>(null);
  const managingChildrenAbility = useMemo(
    () =>
      managingChildrenAbilityId === null
        ? null
        : (abilities.find(
          (ability) => ability.id === managingChildrenAbilityId,
        ) ?? null),
    [abilities, managingChildrenAbilityId],
  );

  useEffect(() => {
    if (
      managingChildrenAbilityId !== null
      && managingChildrenAbility === null
    ) {
      setManagingChildrenAbilityId(null);
    }
  }, [managingChildrenAbility, managingChildrenAbilityId]);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null) {
      setWorld(null);
      setAbilities([]);
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
            setAbilities([]);
            setError('World not found.');
          }
          return;
        }

        const abilityList = await window.db.abilities.getAllByWorld(worldId);
        if (isMounted) {
          setWorld(existingWorld);
          setAbilities(abilityList);
        }
      } catch {
        if (isMounted) {
          setWorld(null);
          setAbilities([]);
          setError('Unable to load abilities right now.');
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

  const handleCreateAbility = async (data: AddAbilityInput) => {
    try {
      const newAbility = await window.db.abilities.add(data);
      setAbilities((prev) => [
        newAbility,
        ...prev.filter((a) => a.id !== newAbility.id),
      ]);
      setIsCreateOpen(false);
      toast.success('Ability created.', `"${newAbility.name}" was added.`);
    } catch (createError) {
      toast.error(
        'Failed to create ability.',
        createError instanceof Error
          ? createError.message
          : 'Please try again.',
      );
      throw createError;
    }
  };

  const handleUpdateAbility = async (data: AddAbilityInput) => {
    if (!editingAbility) {
      return;
    }

    try {
      const updatedAbility = await window.db.abilities.update(
        editingAbility.id,
        {
          name: data.name,
          description: data.description ?? null,
          type: data.type,
          passive_subtype: data.passive_subtype ?? null,
          level_id: data.level_id ?? null,
          effects: data.effects ?? '[]',
          conditions: data.conditions ?? '[]',
          cast_cost: data.cast_cost ?? '{}',
          trigger: data.trigger ?? null,
          pick_count: data.pick_count ?? null,
          pick_timing: data.pick_timing ?? null,
          pick_is_permanent: data.pick_is_permanent ?? 0,
        },
      );
      setAbilities((prev) => prev.map((a) => (a.id === updatedAbility.id ? updatedAbility : a)));
      setEditingAbility(null);
      toast.success('Ability updated.', `"${updatedAbility.name}" was saved.`);
    } catch (updateError) {
      toast.error(
        'Failed to update ability.',
        updateError instanceof Error
          ? updateError.message
          : 'Please try again.',
      );
      throw updateError;
    }
  };

  const handleRequestDeleteAbility = (ability: Ability) => {
    setPendingDeleteAbility(ability);
  };

  const handleDeleteAbility = async () => {
    if (!pendingDeleteAbility) {
      return;
    }
    const ability = pendingDeleteAbility;

    setDeletingId(ability.id);

    try {
      await window.db.abilities.delete(ability.id);
      setAbilities((prev) => prev.filter((a) => a.id !== ability.id));
      setManagingChildrenAbilityId((current) => current === ability.id ? null : current);
      toast.success('Ability deleted.', `"${ability.name}" was removed.`);
    } catch (deleteError) {
      toast.error(
        'Failed to delete ability.',
        deleteError instanceof Error
          ? deleteError.message
          : 'Please try again.',
      );
    } finally {
      setDeletingId((current) => (current === ability.id ? null : current));
      setPendingDeleteAbility((current) => current?.id === ability.id ? null : current);
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
              {world?.name ?? 'Abilities'}
            </h1>
          </div>

          {worldId !== null
            ? (
              <button
                type='button'
                className='shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800'
                onClick={() => setIsCreateOpen(true)}
              >
                New Ability
              </button>
            )
            : null}
        </header>

        {isLoading
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
              Loading abilities...
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

        {!isLoading && !error && abilities.length === 0
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
              <p className='text-sm text-slate-600'>No abilities yet.</p>
            </section>
          )
          : null}

        {!isLoading && !error && abilities.length > 0
          ? (
            <section className='rounded-xl border border-slate-200 bg-white shadow-sm'>
              <table className='w-full text-sm text-slate-700'>
                <thead>
                  <tr className='border-b border-slate-200'>
                    <th className='px-4 py-3 text-left font-medium text-slate-500'>
                      Name
                    </th>
                    <th className='px-4 py-3 text-left font-medium text-slate-500'>
                      Type
                    </th>
                    <th className='px-4 py-3 text-left font-medium text-slate-500'>
                      Subtype
                    </th>
                    <th className='px-4 py-3 text-left font-medium text-slate-500'>
                      Trigger
                    </th>
                    <th className='px-4 py-3 text-left font-medium text-slate-500'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {abilities.map((ability) => (
                    <tr
                      key={ability.id}
                      className='border-b border-slate-100 last:border-0'
                    >
                      <td className='px-4 py-3 font-medium'>{ability.name}</td>
                      <td className='px-4 py-3'>{ability.type}</td>
                      <td className='px-4 py-3 text-slate-500'>
                        {ability.passive_subtype || 'N/A'}
                      </td>
                      <td className='px-4 py-3 text-slate-500'>
                        {ability.trigger || 'N/A'}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex gap-3'>
                          <button
                            type='button'
                            onClick={() => {
                              setIsCreateOpen(false);
                              setEditingAbility(ability);
                              setManagingChildrenAbilityId(null);
                            }}
                            className='text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
                            disabled={deletingId === ability.id}
                          >
                            Edit
                          </button>
                          <button
                            type='button'
                            onClick={() => {
                              handleRequestDeleteAbility(ability);
                            }}
                            className='text-sm font-medium text-rose-600 transition hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60'
                            disabled={deletingId === ability.id}
                          >
                            {deletingId === ability.id ? 'Deleting...' : 'Delete'}
                          </button>
                          {isAbilityChildManagerSupported(ability)
                            ? (
                              <button
                                type='button'
                                onClick={() => {
                                  setIsCreateOpen(false);
                                  setEditingAbility(null);
                                  setManagingChildrenAbilityId(ability.id);
                                }}
                                className='text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
                                disabled={deletingId === ability.id}
                              >
                                Manage children
                              </button>
                            )
                            : null}
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
            labelledBy='create-ability-title'
            boxClassName='max-h-[calc(100vh-2rem)] max-w-xl overflow-y-auto'
          >
            <h2
              id='create-ability-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              New Ability
            </h2>
            <AbilityForm
              mode='create'
              worldId={worldId}
              onSubmit={handleCreateAbility}
              onCancel={() => setIsCreateOpen(false)}
            />
          </ModalShell>
        )
        : null}

      {managingChildrenAbility !== null
        ? (
          <ModalShell
            isOpen={managingChildrenAbility !== null}
            onClose={() => setManagingChildrenAbilityId(null)}
            labelledBy='manage-ability-children-title'
            boxClassName='max-w-4xl'
          >
            <h2
              id='manage-ability-children-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Manage children - {managingChildrenAbility.name}
            </h2>
            <AbilityChildrenManager
              parentAbility={managingChildrenAbility}
              abilities={abilities}
            />
            <div className='mt-6 flex justify-end'>
              <button
                type='button'
                onClick={() => setManagingChildrenAbilityId(null)}
                className='rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50'
              >
                Close
              </button>
            </div>
          </ModalShell>
        )
        : null}

      {editingAbility !== null
        ? (
          <ModalShell
            isOpen={editingAbility !== null}
            onClose={() => setEditingAbility(null)}
            labelledBy='edit-ability-title'
            boxClassName='max-h-[calc(100vh-2rem)] max-w-xl overflow-y-auto'
          >
            <h2
              id='edit-ability-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Edit Ability
            </h2>
            <AbilityForm
              mode='edit'
              worldId={editingAbility.world_id}
              initialValues={editingAbility}
              onSubmit={handleUpdateAbility}
              onCancel={() => setEditingAbility(null)}
            />
          </ModalShell>
        )
        : null}

      <ConfirmDialog
        isOpen={pendingDeleteAbility !== null}
        title={`Delete "${pendingDeleteAbility?.name ?? ''}"?`}
        message='This cannot be undone.'
        onConfirm={() => {
          void handleDeleteAbility();
        }}
        onCancel={() => setPendingDeleteAbility(null)}
        confirmLabel='Delete'
        isConfirming={deletingId !== null}
      />
    </div>
  );
}
