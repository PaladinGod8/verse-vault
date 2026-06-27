import type { CharacterWikiSummary } from '../../../shared/contracts/characterTypes';
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

type CharacterWikiSummaryEditorProps = {
  wikiSummary: CharacterWikiSummary;
  onChange: (next: CharacterWikiSummary) => void;
  disabled?: boolean;
};

type ObjectGroupKey = 'biographic' | 'personalDescription' | 'statusDemographics' | 'trivia';
type ListGroupKey = 'conditions' | 'educationalHistory' | 'occupationalHistory';
type NoteListGroupKey = 'aliases' | 'titles';

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
    </div>
  );
}
