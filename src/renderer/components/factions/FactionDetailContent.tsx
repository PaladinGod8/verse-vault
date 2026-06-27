import { Link } from 'react-router-dom';
import type { FactionSections, FactionWikiSummary } from '../../../shared/contracts/factionTypes';
import { FACTION_BASIC_INFO_FIELDS } from '../../lib/factionWikiSummaryFieldConfig';

type FactionMemberWithCharacterName = FactionMember & { character_name: string; };

const SECTION_LABELS: Array<{ key: keyof FactionSections; label: string; }> = [
  { key: 'history', label: 'History' },
  { key: 'goalsMotives', label: 'Goals/Motives' },
  { key: 'relationships', label: 'Relationships' },
  { key: 'notes', label: 'Notes' },
];

type FactionDetailContentProps = {
  faction: Faction;
  sections: FactionSections;
  wikiSummary: FactionWikiSummary;
  imageSrc: string;
  typeName: string;
  parentFaction: Faction | null;
  childFactions: Faction[];
  founders: FactionMemberWithCharacterName[];
  leadership: FactionMemberWithCharacterName[];
  plainMembers: FactionMemberWithCharacterName[];
  worldId: number | null;
  onEdit: () => void;
};

export default function FactionDetailContent({
  faction,
  sections,
  wikiSummary,
  imageSrc,
  typeName,
  parentFaction,
  childFactions,
  founders,
  leadership,
  plainMembers,
  worldId,
  onEdit,
}: FactionDetailContentProps) {
  const wikiSummaryRecord = wikiSummary as Record<string, string | null | undefined>;

  return (
    <section className='space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
      <div className='flex items-start justify-between gap-4'>
        <div className='flex items-start gap-4'>
          {imageSrc
            ? <img src={imageSrc} alt={faction.name} className='h-24 w-24 rounded object-cover' />
            : null}
          <div>
            <h1 className='text-2xl font-semibold tracking-tight text-slate-900'>
              {faction.name}
            </h1>
            {faction.profile
              ? <p className='mt-1 text-sm text-slate-600'>{faction.profile}</p>
              : null}
          </div>
        </div>
        <button
          type='button'
          className='shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50'
          onClick={onEdit}
        >
          Edit
        </button>
      </div>

      <div>
        <h2 className='text-sm font-semibold text-slate-900'>Basic Information</h2>
        <dl className='mt-2 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2'>
          <div>
            <dt className='font-medium text-slate-700'>Type</dt>
            <dd>{typeName}</dd>
          </div>
          <div>
            <dt className='font-medium text-slate-700'>Parent Organization</dt>
            <dd>
              {parentFaction
                ? (
                  <Link
                    to={`/world/${worldId}/factions/${parentFaction.id}`}
                    className='font-medium text-slate-900 hover:underline'
                  >
                    {parentFaction.name}
                  </Link>
                )
                : 'None (top-level)'}
            </dd>
          </div>
          {FACTION_BASIC_INFO_FIELDS.filter(({ key }) => wikiSummaryRecord[key]).map(
            ({ key, label }) => (
              <div key={key}>
                <dt className='font-medium text-slate-700'>{label}</dt>
                <dd>{wikiSummaryRecord[key]}</dd>
              </div>
            ),
          )}
        </dl>
      </div>

      <StringListSection title='Aliases' items={wikiSummary.aliases} />
      <StringListSection title='Locations' items={wikiSummary.locations} />

      <div className='space-y-3'>
        {SECTION_LABELS.filter(({ key }) => sections[key]).map(({ key, label }) => (
          <div key={key}>
            <h2 className='text-sm font-semibold text-slate-900'>{label}</h2>
            <p className='mt-1 text-sm text-slate-600 whitespace-pre-wrap'>{sections[key]}</p>
          </div>
        ))}
      </div>

      <MemberGroupSection title='Founders' members={founders} worldId={worldId} />
      <MemberGroupSection title='Leadership' members={leadership} worldId={worldId} />
      <MemberGroupSection title='Members' members={plainMembers} worldId={worldId} />

      {childFactions.length > 0
        ? (
          <div>
            <h2 className='text-sm font-semibold text-slate-900'>Children</h2>
            <ul className='mt-1 space-y-1'>
              {childFactions.map((child) => (
                <li key={child.id}>
                  <Link
                    to={`/world/${worldId}/factions/${child.id}`}
                    className='text-sm font-medium text-slate-900 hover:underline'
                  >
                    {child.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )
        : null}
    </section>
  );
}

function StringListSection({ title, items }: { title: string; items?: string[]; }) {
  if (!items || items.length === 0) {
    return null;
  }
  return (
    <div>
      <h2 className='text-sm font-semibold text-slate-900'>{title}</h2>
      <ul className='mt-1 list-inside list-disc text-sm text-slate-600'>
        {items.map((item, index) => <li key={index}>{item}</li>)}
      </ul>
    </div>
  );
}

function MemberGroupSection({
  title,
  members,
  worldId,
}: {
  title: string;
  members: FactionMemberWithCharacterName[];
  worldId: number | null;
}) {
  if (members.length === 0) {
    return null;
  }
  return (
    <div>
      <h2 className='text-sm font-semibold text-slate-900'>{title}</h2>
      <MemberList members={members} worldId={worldId} />
    </div>
  );
}

function MemberList({
  members,
  worldId,
}: {
  members: FactionMemberWithCharacterName[];
  worldId: number | null;
}) {
  return (
    <ul className='mt-1 space-y-1'>
      {members.map((member) => (
        <li key={member.id} className='text-sm text-slate-600'>
          <Link
            to={`/world/${worldId}/characters/${member.character_id}`}
            className='font-medium text-slate-900 hover:underline'
          >
            {member.character_name}
          </Link>
          {member.role !== 'founder' && member.role !== 'member'
            ? <span className='ml-1 text-slate-500'>({member.role})</span>
            : null}
        </li>
      ))}
    </ul>
  );
}
