import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CharacterCard from '../components/characters/CharacterCard';
import CharacterForm from '../components/characters/CharacterForm';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ModalShell from '../components/ui/ModalShell';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';
import { useAppSettings } from '../hooks/useAppSettings';
import { useCharacterCrud } from '../hooks/useCharacterCrud';
import { useWorldCharactersData } from '../hooks/useWorldCharactersData';
import { resolveCardDisplayDimensions } from '../lib/cardDisplaySettings';
import { characterMatchesQuery } from '../lib/characterSearch';
import { parsePositiveIntParam } from '../lib/routeParams';
import { sortNamedRecords } from '../lib/sortNamedRecords';
import { normalizeTokenImageSrc } from '../lib/tokenImageSrc';

function parseCharacterJson<T>(jsonText: string): T {
  try {
    return JSON.parse(jsonText) as T;
  } catch {
    return {} as T;
  }
}

export default function CharactersPage() {
  const toast = useToast();
  const { config } = useAppSettings();
  const { id } = useParams();
  const worldId = useMemo(() => parsePositiveIntParam(id), [id]);
  const cardDisplayDimensions = useMemo(
    () => resolveCardDisplayDimensions(config, 'characterCard'),
    [config],
  );

  const { world, characters, isLoading, error, reload: reloadCharacters } = useWorldCharactersData(
    worldId,
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [pendingDeleteCharacter, setPendingDeleteCharacter] = useState<Character | null>(null);
  const [allFactions, setAllFactions] = useState<Faction[]>([]);
  const [primaryFactionByCharacterId, setPrimaryFactionByCharacterId] = useState<
    Map<number, number>
  >(new Map());

  useEffect(() => {
    if (worldId === null) {
      return;
    }
    let isMounted = true;
    void Promise.all([
      window.db.factions.getAllByWorld(worldId),
      window.db.factionMembers.getAllPrimaryByWorld(worldId),
    ]).then(([factionsList, primaryRows]) => {
      if (!isMounted) return;
      setAllFactions(factionsList);
      setPrimaryFactionByCharacterId(
        new Map(primaryRows.map((row) => [row.character_id, row.faction_id])),
      );
    });
    return () => {
      isMounted = false;
    };
  }, [worldId]);

  const { isSaving, deletingCharacterId, handleCreate, handleUpdate, handleDelete } =
    useCharacterCrud({
      worldId,
      editingCharacter,
      pendingDeleteCharacter,
      reloadCharacters,
      toast,
      onCreateSaved: () => setIsCreateOpen(false),
      onUpdateSaved: () => setEditingCharacter(null),
      onDeleteSettled: () => setPendingDeleteCharacter(null),
    });

  const visibleCharacters = useMemo(
    () =>
      sortNamedRecords(
        characters.filter((character) =>
          characterMatchesQuery(character, searchQuery, primaryFactionByCharacterId, allFactions)
        ),
      ),
    [characters, searchQuery, primaryFactionByCharacterId, allFactions],
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
              {world?.name ?? 'Characters'}
            </h1>
          </div>

          {worldId !== null
            ? (
              <button
                type='button'
                className='shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800'
                onClick={() => {
                  setEditingCharacter(null);
                  setIsCreateOpen(true);
                }}
              >
                New Character
              </button>
            )
            : null}
        </header>

        <input
          type='search'
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder='Search characters by any field (e.g. weight, faction)...'
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
        />

        {isLoading
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
              Loading characters...
            </section>
          )
          : error
          ? (
            <section className='rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm'>
              {error}
            </section>
          )
          : visibleCharacters.length === 0
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
              <p className='text-sm text-slate-600'>
                {characters.length === 0
                  ? 'No characters yet.'
                  : 'No characters match your search.'}
              </p>
            </section>
          )
          : (
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {visibleCharacters.map((character) => {
                const primaryFactionId = primaryFactionByCharacterId.get(character.id);
                const primaryFactionName = primaryFactionId === undefined
                  ? null
                  : allFactions.find((faction) => faction.id === primaryFactionId)?.name ?? null;

                return (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    onEdit={() => setEditingCharacter(character)}
                    onDelete={() => setPendingDeleteCharacter(character)}
                    isDeleting={deletingCharacterId === character.id}
                    primaryFactionName={primaryFactionName}
                    displayDimensions={cardDisplayDimensions}
                  />
                );
              })}
            </div>
          )}
      </main>

      {isCreateOpen && worldId !== null
        ? (
          <ModalShell
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            labelledBy='create-character-title'
            boxClassName='max-w-2xl'
          >
            <h2
              id='create-character-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              New Character
            </h2>
            <CharacterForm
              onSave={(data) => void handleCreate(data)}
              onClose={() => setIsCreateOpen(false)}
              isSaving={isSaving}
            />
          </ModalShell>
        )
        : null}

      {editingCharacter !== null
        ? (
          <ModalShell
            isOpen={editingCharacter !== null}
            onClose={() => setEditingCharacter(null)}
            labelledBy='edit-character-title'
            boxClassName='max-w-2xl'
          >
            <h2
              id='edit-character-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Edit Character
            </h2>
            <CharacterForm
              initialValues={{
                name: editingCharacter.name,
                profile: editingCharacter.profile,
                is_player_character: editingCharacter.is_player_character,
                owner: editingCharacter.owner,
                author: editingCharacter.author,
                image_src: normalizeTokenImageSrc(editingCharacter.image_src),
                sections: parseCharacterJson(editingCharacter.sections),
                wiki_summary: parseCharacterJson(editingCharacter.wiki_summary),
              }}
              onSave={(data) => void handleUpdate(data)}
              onClose={() => setEditingCharacter(null)}
              isSaving={isSaving}
            />
          </ModalShell>
        )
        : null}

      <ConfirmDialog
        isOpen={pendingDeleteCharacter !== null}
        title={`Delete "${pendingDeleteCharacter?.name ?? ''}"?`}
        message='This cannot be undone.'
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingDeleteCharacter(null)}
        confirmLabel='Delete'
        isConfirming={deletingCharacterId !== null}
      />
    </div>
  );
}
