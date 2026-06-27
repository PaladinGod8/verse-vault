import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { FactionSections, FactionWikiSummary } from '../../shared/contracts/factionTypes';
import FactionDetailContent from '../components/factions/FactionDetailContent';
import FactionForm, { type FactionFormValues } from '../components/factions/FactionForm';
import ModalShell from '../components/ui/ModalShell';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';
import { useAppSettings } from '../hooks/useAppSettings';
import { useFactionCrud } from '../hooks/useFactionCrud';
import { parsePositiveIntParam } from '../lib/routeParams';
import { resolveCardDisplayDimensions } from '../lib/cardDisplaySettings';
import { normalizeTokenImageSrc } from '../lib/tokenImageSrc';

type FactionMemberWithCharacterName = FactionMember & { character_name: string; };

function parseJson<T>(jsonText: string): T {
  try {
    return JSON.parse(jsonText) as T;
  } catch {
    return {} as T;
  }
}

function deriveTypeName(faction: Faction | null, factionTypes: FactionType[]): string {
  if (!faction?.type_id) {
    return 'Uncategorized';
  }
  return factionTypes.find((t) => t.id === faction.type_id)?.name ?? 'Uncategorized';
}

function deriveParentFaction(faction: Faction | null, allFactions: Faction[]): Faction | null {
  if (!faction?.parent_faction_id) {
    return null;
  }
  return allFactions.find((f) => f.id === faction.parent_faction_id) ?? null;
}

function deriveMemberGroups(members: FactionMemberWithCharacterName[]): {
  founders: FactionMemberWithCharacterName[];
  leadership: FactionMemberWithCharacterName[];
  plainMembers: FactionMemberWithCharacterName[];
} {
  return {
    founders: members.filter((m) => m.role === 'founder'),
    leadership: members.filter((m) => m.role !== 'founder' && m.role !== 'member'),
    plainMembers: members.filter((m) => m.role === 'member'),
  };
}

export default function FactionDetailPage() {
  const toast = useToast();
  const { config } = useAppSettings();
  const { id, factionId } = useParams();
  const worldId = useMemo(() => parsePositiveIntParam(id), [id]);
  const parsedFactionId = useMemo(() => parsePositiveIntParam(factionId), [factionId]);
  const imageDimensions = useMemo(
    () => resolveCardDisplayDimensions(config, 'factionDetail'),
    [config],
  );

  const [faction, setFaction] = useState<Faction | null>(null);
  const [allFactions, setAllFactions] = useState<Faction[]>([]);
  const [factionTypes, setFactionTypes] = useState<FactionType[]>([]);
  const [charactersInWorld, setCharactersInWorld] = useState<Character[]>([]);
  const [members, setMembers] = useState<FactionMemberWithCharacterName[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const loadFaction = useCallback(async () => {
    if (parsedFactionId === null || worldId === null) {
      setError('Invalid faction id.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [result, factionsList, typesList, membersList, charactersList] = await Promise.all([
        window.db.factions.getById(parsedFactionId),
        window.db.factions.getAllByWorld(worldId),
        window.db.factionTypes.getAllByWorld(worldId),
        window.db.factionMembers.getAllByFaction(parsedFactionId),
        window.db.characters.getAllByWorld(worldId),
      ]);
      if (!result) {
        setError('Faction not found.');
        setFaction(null);
        return;
      }
      setFaction(result);
      setAllFactions(factionsList);
      setFactionTypes(typesList);
      setMembers(membersList);
      setCharactersInWorld(charactersList);
    } catch {
      setError('Unable to load this faction right now.');
      setFaction(null);
    } finally {
      setIsLoading(false);
    }
  }, [parsedFactionId, worldId]);

  useEffect(() => {
    void loadFaction();
  }, [loadFaction]);

  const { isSaving, handleUpdate } = useFactionCrud({
    worldId,
    editingFaction: faction,
    pendingDeleteFaction: null,
    reloadFactions: loadFaction,
    toast,
    onCreateSaved: () => undefined,
    onUpdateSaved: () => setIsEditOpen(false),
    onDeleteSettled: () => undefined,
  });

  const sections = faction ? parseJson<FactionSections>(faction.sections) : {};
  const wikiSummary = faction ? parseJson<FactionWikiSummary>(faction.wiki_summary) : {};
  const imageSrc = normalizeTokenImageSrc(faction?.image_src);
  const typeName = deriveTypeName(faction, factionTypes);
  const parentFaction = deriveParentFaction(faction, allFactions);
  const childFactions = faction
    ? allFactions.filter((f) => f.parent_faction_id === faction.id)
    : [];
  const { founders, leadership, plainMembers } = deriveMemberGroups(members);

  return (
    <div className='flex min-h-screen'>
      <WorldSidebar worldId={worldId} />
      <main className='flex-1 space-y-6 p-6'>
        <header className='space-y-2'>
          <Link
            to={`/world/${worldId}/factions`}
            className='inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900'
          >
            Back to factions
          </Link>
        </header>

        {isLoading ? <LoadingNotice /> : null}
        {!isLoading && error ? <ErrorNotice message={error} /> : null}
        {!isLoading && !error && faction
          ? (
            <FactionDetailContent
              faction={faction}
              sections={sections}
              wikiSummary={wikiSummary}
              imageSrc={imageSrc}
              typeName={typeName}
              parentFaction={parentFaction}
              childFactions={childFactions}
              founders={founders}
              leadership={leadership}
              plainMembers={plainMembers}
              worldId={worldId}
              onEdit={() => setIsEditOpen(true)}
              imageDimensions={imageDimensions}
            />
          )
          : null}
      </main>

      {isEditOpen && faction
        ? (
          <ModalShell
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            labelledBy='edit-faction-detail-title'
            boxClassName='max-w-2xl'
          >
            <h2
              id='edit-faction-detail-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Edit Faction
            </h2>
            <FactionForm
              initialValues={{
                name: faction.name,
                profile: faction.profile,
                image_src: imageSrc,
                sections: parseJson<FactionSections>(faction.sections),
                wiki_summary: parseJson<FactionWikiSummary>(faction.wiki_summary),
                type_id: faction.type_id,
                parent_faction_id: faction.parent_faction_id,
                members: members.map((m) => ({ character_id: m.character_id, role: m.role })),
              }}
              factionId={faction.id}
              allFactionsInWorld={allFactions}
              factionTypes={factionTypes}
              charactersInWorld={charactersInWorld}
              onManageTypes={() => undefined}
              onSave={(data: FactionFormValues) => void handleUpdate(data)}
              onClose={() => setIsEditOpen(false)}
              isSaving={isSaving}
            />
          </ModalShell>
        )
        : null}
    </div>
  );
}

function LoadingNotice() {
  return (
    <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
      Loading faction...
    </section>
  );
}

function ErrorNotice({ message }: { message: string; }) {
  return (
    <section className='rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm'>
      {message}
    </section>
  );
}
