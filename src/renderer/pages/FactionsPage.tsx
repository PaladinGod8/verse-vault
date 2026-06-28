import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { FactionSections, FactionWikiSummary } from '../../shared/contracts/factionTypes';
import FactionCard from '../components/factions/FactionCard';
import FactionForm, { type FactionFormValues } from '../components/factions/FactionForm';
import ManageFactionTypesModal from '../components/factions/ManageFactionTypesModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ModalShell from '../components/ui/ModalShell';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';
import { useAppSettings } from '../hooks/useAppSettings';
import { useFactionCrud } from '../hooks/useFactionCrud';
import { useFactionTypes } from '../hooks/useFactionTypes';
import { useWorldFactionsData } from '../hooks/useWorldFactionsData';
import { resolveCardDisplayDimensions } from '../lib/cardDisplaySettings';
import { factionMatchesQuery } from '../lib/factionSearch';
import { parsePositiveIntParam } from '../lib/routeParams';
import { sortNamedRecords } from '../lib/sortNamedRecords';
import { normalizeTokenImageSrc } from '../lib/tokenImageSrc';

function parseFactionJson<T>(jsonText: string): T {
  try {
    return JSON.parse(jsonText) as T;
  } catch {
    return {} as T;
  }
}

export default function FactionsPage() {
  const toast = useToast();
  const { config } = useAppSettings();
  const { id } = useParams();
  const worldId = useMemo(() => parsePositiveIntParam(id), [id]);
  const cardDisplayDimensions = useMemo(
    () => resolveCardDisplayDimensions(config, 'factionCard'),
    [config],
  );

  const { world, factions, factionTypes, isLoading, error, reload: reloadFactions } =
    useWorldFactionsData(worldId);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingFaction, setEditingFaction] = useState<Faction | null>(null);
  const [pendingDeleteFaction, setPendingDeleteFaction] = useState<Faction | null>(null);
  const [isManageTypesOpen, setIsManageTypesOpen] = useState(false);

  const { isSaving, deletingFactionId, handleCreate, handleUpdate, handleDelete } = useFactionCrud({
    worldId,
    editingFaction,
    pendingDeleteFaction,
    reloadFactions,
    toast,
    onCreateSaved: () => setIsCreateOpen(false),
    onUpdateSaved: () => setEditingFaction(null),
    onDeleteSettled: () => setPendingDeleteFaction(null),
  });

  const factionTypeActions = useFactionTypes({ worldId, reload: reloadFactions });

  const factionTypesById = useMemo(
    () => new Map(factionTypes.map((type) => [type.id, type])),
    [factionTypes],
  );

  const visibleFactions = useMemo(
    () =>
      sortNamedRecords(
        factions.filter((faction) => {
          if (typeFilter && String(faction.type_id ?? '') !== typeFilter) {
            return false;
          }
          return factionMatchesQuery(faction, searchQuery, factions);
        }),
      ),
    [factions, searchQuery, typeFilter],
  );

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
              {world?.name ?? 'Factions'}
            </h1>
          </div>

          {worldId !== null
            ? (
              <div className='flex shrink-0 gap-2'>
                <button
                  type='button'
                  className='rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50'
                  onClick={() => setIsManageTypesOpen(true)}
                >
                  Manage Types
                </button>
                <button
                  type='button'
                  className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800'
                  onClick={() => {
                    setEditingFaction(null);
                    setIsCreateOpen(true);
                  }}
                >
                  New Faction
                </button>
              </div>
            )
            : null}
        </header>

        <div className='flex gap-3'>
          <input
            type='search'
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder='Search factions by any field, or a parent faction name...'
            className='flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
          />
          <label htmlFor='faction-type-filter' className='sr-only'>Filter by type</label>
          <select
            id='faction-type-filter'
            aria-label='Filter by type'
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className='rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
          >
            <option value=''>All types</option>
            {factionTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
          </select>
        </div>

        {isLoading
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
              Loading factions...
            </section>
          )
          : error
          ? (
            <section className='rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm'>
              {error}
            </section>
          )
          : visibleFactions.length === 0
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
              <p className='text-sm text-slate-600'>
                {factions.length === 0
                  ? 'No factions yet.'
                  : 'No factions match your search.'}
              </p>
            </section>
          )
          : (
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {visibleFactions.map((faction) => (
                <FactionCard
                  key={faction.id}
                  faction={faction}
                  factionTypesById={factionTypesById}
                  onEdit={() => setEditingFaction(faction)}
                  onDelete={() => setPendingDeleteFaction(faction)}
                  isDeleting={deletingFactionId === faction.id}
                  displayDimensions={cardDisplayDimensions}
                />
              ))}
            </div>
          )}
      </main>

      {isCreateOpen && worldId !== null
        ? (
          <ModalShell
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            labelledBy='create-faction-title'
            boxClassName='max-w-2xl'
          >
            <h2 id='create-faction-title' className='mb-4 text-lg font-semibold text-slate-900'>
              New Faction
            </h2>
            <FactionForm
              allFactionsInWorld={factions}
              factionTypes={factionTypes}
              charactersInWorld={[]}
              onManageTypes={() => setIsManageTypesOpen(true)}
              onSave={(data: FactionFormValues) => void handleCreate(data)}
              onClose={() => setIsCreateOpen(false)}
              isSaving={isSaving}
            />
          </ModalShell>
        )
        : null}

      {editingFaction !== null
        ? (
          <ModalShell
            isOpen={editingFaction !== null}
            onClose={() => setEditingFaction(null)}
            labelledBy='edit-faction-title'
            boxClassName='max-w-2xl'
          >
            <h2 id='edit-faction-title' className='mb-4 text-lg font-semibold text-slate-900'>
              Edit Faction
            </h2>
            <FactionForm
              initialValues={{
                name: editingFaction.name,
                profile: editingFaction.profile,
                image_src: normalizeTokenImageSrc(editingFaction.image_src),
                sections: parseFactionJson<FactionSections>(editingFaction.sections),
                wiki_summary: parseFactionJson<FactionWikiSummary>(editingFaction.wiki_summary),
                type_id: editingFaction.type_id,
                parent_faction_id: editingFaction.parent_faction_id,
                members: [],
              }}
              factionId={editingFaction.id}
              allFactionsInWorld={factions}
              factionTypes={factionTypes}
              charactersInWorld={[]}
              onManageTypes={() => setIsManageTypesOpen(true)}
              onSave={(data: FactionFormValues) => void handleUpdate(data)}
              onClose={() => setEditingFaction(null)}
              isSaving={isSaving}
            />
          </ModalShell>
        )
        : null}

      <ManageFactionTypesModal
        isOpen={isManageTypesOpen}
        onClose={() => setIsManageTypesOpen(false)}
        factionTypes={factionTypes}
        onAdd={factionTypeActions.add}
        onRename={factionTypeActions.rename}
        onDelete={factionTypeActions.remove}
      />

      <ConfirmDialog
        isOpen={pendingDeleteFaction !== null}
        title={`Delete "${pendingDeleteFaction?.name ?? ''}"?`}
        message='This cannot be undone.'
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingDeleteFaction(null)}
        confirmLabel='Delete'
        isConfirming={deletingFactionId !== null}
      />
    </div>
  );
}
