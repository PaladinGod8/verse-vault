import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type {
  CharacterSections,
  CharacterWikiSummary,
} from '../../shared/contracts/characterTypes';
import CharacterForm from '../components/characters/CharacterForm';
import CharacterWikiSummaryDetail from '../components/characters/CharacterWikiSummaryDetail';
import ModalShell from '../components/ui/ModalShell';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';
import { useAppSettings } from '../hooks/useAppSettings';
import { useCharacterCrud } from '../hooks/useCharacterCrud';
import { useCharacterFactionMemberships } from '../hooks/useCharacterFactionMemberships';
import { buildDetailImageStyle, resolveCardDisplayDimensions } from '../lib/cardDisplaySettings';
import { parsePositiveIntParam } from '../lib/routeParams';
import { normalizeTokenImageSrc } from '../lib/tokenImageSrc';

const SECTION_LABELS: Array<{ key: keyof CharacterSections; label: string; }> = [
  { key: 'background', label: 'Background' },
  { key: 'personality', label: 'Personality' },
  { key: 'relationships', label: 'Relationships' },
  { key: 'notes', label: 'Notes' },
];

function parseJson<T>(jsonText: string): T {
  try {
    return JSON.parse(jsonText) as T;
  } catch {
    return {} as T;
  }
}

export default function CharacterDetailPage() {
  const toast = useToast();
  const { config } = useAppSettings();
  const { id, characterId } = useParams();
  const worldId = useMemo(() => parsePositiveIntParam(id), [id]);
  const parsedCharacterId = useMemo(() => parsePositiveIntParam(characterId), [characterId]);
  const imageDimensions = useMemo(
    () => resolveCardDisplayDimensions(config, 'characterDetail'),
    [config],
  );

  const [character, setCharacter] = useState<Character | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const loadCharacter = useCallback(async () => {
    if (parsedCharacterId === null) {
      setError('Invalid character id.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.db.characters.getById(parsedCharacterId);
      if (!result) {
        setError('Character not found.');
        setCharacter(null);
        return;
      }
      setCharacter(result);
    } catch {
      setError('Unable to load this character right now.');
      setCharacter(null);
    } finally {
      setIsLoading(false);
    }
  }, [parsedCharacterId]);

  useEffect(() => {
    void loadCharacter();
  }, [loadCharacter]);

  const { memberships, setPrimary } = useCharacterFactionMemberships(parsedCharacterId);

  const { isSaving, handleUpdate } = useCharacterCrud({
    worldId,
    editingCharacter: character,
    pendingDeleteCharacter: null,
    reloadCharacters: loadCharacter,
    toast,
    onCreateSaved: () => undefined,
    onUpdateSaved: () => setIsEditOpen(false),
    onDeleteSettled: () => undefined,
  });

  const sections = character ? parseJson<CharacterSections>(character.sections) : {};
  const wikiSummary = character ? parseJson<CharacterWikiSummary>(character.wiki_summary) : {};
  const imageSrc = normalizeTokenImageSrc(character?.image_src);

  return (
    <div className='flex min-h-screen'>
      <WorldSidebar worldId={worldId} />
      <main className='flex-1 space-y-6 p-6'>
        <header className='space-y-2'>
          <Link
            to={`/world/${worldId}/characters`}
            className='inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900'
          >
            Back to characters
          </Link>
        </header>

        {isLoading
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
              Loading character...
            </section>
          )
          : error
          ? (
            <section className='rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm'>
              {error}
            </section>
          )
          : character
          ? (
            <section className='space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-start gap-4'>
                  {imageSrc
                    ? (
                      <img
                        src={imageSrc}
                        alt={character.name}
                        className='rounded object-cover'
                        style={buildDetailImageStyle(imageDimensions)}
                      />
                    )
                    : null}
                  <div>
                    <h1 className='text-2xl font-semibold tracking-tight text-slate-900'>
                      {character.name}
                    </h1>
                    {character.profile
                      ? <p className='mt-1 text-sm text-slate-600'>{character.profile}</p>
                      : null}
                    {character.author
                      ? <p className='mt-1 text-sm text-slate-500'>{`Author: ${character.author}`}</p>
                      : null}
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

              <div className='space-y-3'>
                {SECTION_LABELS.map(({ key, label }) =>
                  sections[key]
                    ? (
                      <div key={key}>
                        <h2 className='text-sm font-semibold text-slate-900'>{label}</h2>
                        <p className='mt-1 text-sm text-slate-600 whitespace-pre-wrap'>
                          {sections[key]}
                        </p>
                      </div>
                    )
                    : null
                )}
              </div>
              <CharacterWikiSummaryDetail wikiSummary={wikiSummary} />

              <div>
                <h2 className='text-sm font-semibold text-slate-900'>Factions</h2>
                {memberships.length === 0
                  ? <p className='mt-1 text-sm text-slate-500'>Not a member of any faction.</p>
                  : (
                    <ul className='mt-2 space-y-1'>
                      {memberships.map((membership) => (
                        <li
                          key={membership.id}
                          className='flex items-center justify-between gap-2 text-sm text-slate-700'
                        >
                          <span>
                            <Link
                              to={`/world/${worldId}/factions/${membership.faction_id}`}
                              className='font-medium text-slate-900 hover:underline'
                            >
                              {membership.faction_name}
                            </Link>{' '}
                            <span className='text-slate-500'>({membership.role})</span>
                            {membership.is_primary
                              ? <span className='ml-2 text-xs text-amber-600'>Primary</span>
                              : null}
                          </span>
                          {!membership.is_primary
                            ? (
                              <button
                                type='button'
                                className='text-xs font-medium text-slate-600 hover:text-slate-900'
                                onClick={() => void setPrimary(membership.faction_id)}
                              >
                                {`Make primary (${membership.faction_name})`}
                              </button>
                            )
                            : null}
                        </li>
                      ))}
                    </ul>
                  )}
              </div>
            </section>
          )
          : null}
      </main>

      {isEditOpen && character
        ? (
          <ModalShell
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            labelledBy='edit-character-detail-title'
            boxClassName='max-w-2xl'
          >
            <h2
              id='edit-character-detail-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Edit Character
            </h2>
            <CharacterForm
              initialValues={{
                name: character.name,
                profile: character.profile,
                author: character.author,
                image_src: imageSrc,
                sections: parseJson<CharacterSections>(character.sections),
                wiki_summary: parseJson<CharacterWikiSummary>(character.wiki_summary),
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
