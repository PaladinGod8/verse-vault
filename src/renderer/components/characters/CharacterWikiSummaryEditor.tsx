import type {
  CharacterTraitGroup,
  CharacterWikiSummary,
} from '../../../shared/contracts/characterTypes';
import {
  BIOGRAPHIC_FIELDS,
  PERSONAL_DESCRIPTION_FIELDS,
  STATUS_DEMOGRAPHICS_FIELDS,
  TRIVIA_FIELDS,
} from '../../lib/characterWikiSummaryFieldConfig';
import CharacterWikiSummaryAgesTimelineEditor from './CharacterWikiSummaryAgesTimelineEditor';
import CharacterWikiSummaryGroupFields from './CharacterWikiSummaryGroupFields';
import CharacterWikiSummaryListEditor from './CharacterWikiSummaryListEditor';
import CharacterWikiSummaryNoteListEditor from './CharacterWikiSummaryNoteListEditor';
import CharacterWikiSummaryQuoteListEditor from './CharacterWikiSummaryQuoteListEditor';
import CharacterWikiSummaryTraitGroupEditor from './CharacterWikiSummaryTraitGroupEditor';
import CharacterWikiSummaryVicesVirtuesEditor from './CharacterWikiSummaryVicesVirtuesEditor';

type CharacterWikiSummaryEditorProps = {
  wikiSummary: CharacterWikiSummary;
  onChange: (next: CharacterWikiSummary) => void;
  disabled?: boolean;
};

type ObjectGroupKey = 'biographic' | 'personalDescription' | 'statusDemographics' | 'trivia';
type ListGroupKey = 'conditions' | 'educationalHistory' | 'occupationalHistory';
type NoteListGroupKey = 'aliases' | 'titles';
type TraitGroupKey = 'personality' | 'physical' | 'social' | 'bonds' | 'tenetsAndMorals';

const TRAIT_GROUPS: Array<{ key: TraitGroupKey; legend: string; }> = [
  { key: 'personality', legend: 'Personality' },
  { key: 'physical', legend: 'Physical' },
  { key: 'social', legend: 'Social' },
  { key: 'bonds', legend: 'Bonds' },
  { key: 'tenetsAndMorals', legend: 'Tenets & Morals' },
];

export default function CharacterWikiSummaryEditor({
  wikiSummary,
  onChange,
  disabled = false,
}: CharacterWikiSummaryEditorProps) {
  const patchGroup = (groupKey: ObjectGroupKey, fieldKey: string, value: string) => {
    onChange({
      ...wikiSummary,
      [groupKey]: { ...wikiSummary[groupKey], [fieldKey]: value },
    });
  };

  const patchList = (groupKey: ListGroupKey, items: string[]) => {
    onChange({ ...wikiSummary, [groupKey]: items });
  };

  const patchNoteList = (
    groupKey: NoteListGroupKey,
    items: Array<{ text: string; note?: string | null; }>,
  ) => {
    onChange({ ...wikiSummary, [groupKey]: items });
  };

  const patchTraitGroup = (groupKey: TraitGroupKey, patch: Partial<CharacterTraitGroup>) => {
    onChange({
      ...wikiSummary,
      characterTraits: {
        ...wikiSummary.characterTraits,
        [groupKey]: { ...wikiSummary.characterTraits?.[groupKey], ...patch },
      },
    });
  };

  const patchVicesVirtues = (
    patch: Partial<{ summary: string; vices: string[]; virtues: string[]; }>,
  ) => {
    onChange({
      ...wikiSummary,
      characterTraits: {
        ...wikiSummary.characterTraits,
        vicesAndVirtues: { ...wikiSummary.characterTraits?.vicesAndVirtues, ...patch },
      },
    });
  };

  return (
    <div className='space-y-6'>
      <CharacterWikiSummaryGroupFields
        legend='Biographic Information'
        fields={BIOGRAPHIC_FIELDS}
        values={wikiSummary.biographic ?? {}}
        onChange={(key, value) => patchGroup('biographic', key, value)}
        disabled={disabled}
      />
      <CharacterWikiSummaryNoteListEditor
        legend='Aliases'
        items={wikiSummary.aliases ?? []}
        onChange={(items) => patchNoteList('aliases', items)}
        disabled={disabled}
      />
      <CharacterWikiSummaryNoteListEditor
        legend='Titles'
        items={wikiSummary.titles ?? []}
        onChange={(items) => patchNoteList('titles', items)}
        disabled={disabled}
      />
      <CharacterWikiSummaryGroupFields
        legend='Personal Description'
        fields={PERSONAL_DESCRIPTION_FIELDS}
        values={wikiSummary.personalDescription ?? {}}
        onChange={(key, value) => patchGroup('personalDescription', key, value)}
        disabled={disabled}
      />
      <CharacterWikiSummaryAgesTimelineEditor
        items={wikiSummary.agesTimeline ?? []}
        onChange={(items) => onChange({ ...wikiSummary, agesTimeline: items })}
        disabled={disabled}
      />
      <CharacterWikiSummaryListEditor
        legend='Conditions'
        items={wikiSummary.conditions ?? []}
        onChange={(items) => patchList('conditions', items)}
        disabled={disabled}
      />
      <CharacterWikiSummaryGroupFields
        legend='Status & Demographics'
        fields={STATUS_DEMOGRAPHICS_FIELDS}
        values={wikiSummary.statusDemographics ?? {}}
        onChange={(key, value) => patchGroup('statusDemographics', key, value)}
        disabled={disabled}
      />
      <CharacterWikiSummaryListEditor
        legend='Educational History'
        items={wikiSummary.educationalHistory ?? []}
        onChange={(items) => patchList('educationalHistory', items)}
        disabled={disabled}
      />
      <CharacterWikiSummaryListEditor
        legend='Occupational History'
        items={wikiSummary.occupationalHistory ?? []}
        onChange={(items) => patchList('occupationalHistory', items)}
        disabled={disabled}
      />
      <CharacterWikiSummaryGroupFields
        legend='Trivia'
        fields={TRIVIA_FIELDS}
        values={wikiSummary.trivia ?? {}}
        onChange={(key, value) => patchGroup('trivia', key, value)}
        disabled={disabled}
      />
      <div className='space-y-6 border-t border-slate-200 pt-4'>
        <h3 className='text-sm font-semibold text-slate-900'>Character Traits</h3>
        {TRAIT_GROUPS.map(({ key, legend }) => (
          <CharacterWikiSummaryTraitGroupEditor
            key={key}
            legend={legend}
            summary={wikiSummary.characterTraits?.[key]?.summary}
            traits={wikiSummary.characterTraits?.[key]?.traits ?? []}
            onSummaryChange={(value) => patchTraitGroup(key, { summary: value })}
            onTraitsChange={(items) => patchTraitGroup(key, { traits: items })}
            disabled={disabled}
          />
        ))}
        <CharacterWikiSummaryVicesVirtuesEditor
          summary={wikiSummary.characterTraits?.vicesAndVirtues?.summary}
          vices={wikiSummary.characterTraits?.vicesAndVirtues?.vices ?? []}
          virtues={wikiSummary.characterTraits?.vicesAndVirtues?.virtues ?? []}
          onSummaryChange={(value) => patchVicesVirtues({ summary: value })}
          onVicesChange={(items) => patchVicesVirtues({ vices: items })}
          onVirtuesChange={(items) => patchVicesVirtues({ virtues: items })}
          disabled={disabled}
        />
      </div>
      <div className='space-y-6 border-t border-slate-200 pt-4'>
        <h3 className='text-sm font-semibold text-slate-900'>Quotes</h3>
        <CharacterWikiSummaryQuoteListEditor
          items={wikiSummary.quotes ?? []}
          onChange={(items) => onChange({ ...wikiSummary, quotes: items })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
