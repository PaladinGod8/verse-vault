import type { CharacterWikiSummary } from '../../../shared/contracts/characterTypes';
import {
  BIOGRAPHIC_FIELDS,
  PERSONAL_DESCRIPTION_FIELDS,
  STATUS_DEMOGRAPHICS_FIELDS,
  TRIVIA_FIELDS,
} from '../../lib/characterWikiSummaryFieldConfig';
import {
  WikiDetailDataTableSection,
  WikiDetailListSection,
  WikiDetailSummaryListSection,
  WikiDetailTableSection,
  WikiDetailVicesVirtuesSection,
} from '../wiki/WikiDetailSections';
import CharacterQuotesSection from './CharacterQuotesSection';

const TRAIT_GROUPS: Array<{
  key: 'personality' | 'physical' | 'social' | 'bonds' | 'tenetsAndMorals';
  title: string;
}> = [
  { key: 'personality', title: 'Personality' },
  { key: 'physical', title: 'Physical' },
  { key: 'social', title: 'Social' },
  { key: 'bonds', title: 'Bonds' },
  { key: 'tenetsAndMorals', title: 'Tenets & Morals' },
];

function renderNoteItem(item: { text: string; note?: string | null; }) {
  if (!item.note) {
    return item.text;
  }
  return `${item.text} (${item.note})`;
}

function buildRows<T extends Record<string, string | null | undefined>>(
  fields: Array<{ key: string; label: string; }>,
  values: T | undefined,
) {
  return fields.map(({ key, label }) => ({
    label,
    value: values?.[key] ?? '',
  }));
}

export default function CharacterWikiSummaryDetail({
  wikiSummary,
}: {
  wikiSummary: CharacterWikiSummary;
}) {
  return (
    <div className='space-y-4'>
      <WikiDetailTableSection
        title='Biographic Information'
        rows={buildRows(BIOGRAPHIC_FIELDS, wikiSummary.biographic)}
      />
      <WikiDetailListSection
        title='Aliases'
        items={(wikiSummary.aliases ?? []).map(renderNoteItem)}
      />
      <WikiDetailListSection
        title='Titles'
        items={(wikiSummary.titles ?? []).map(renderNoteItem)}
      />
      <WikiDetailTableSection
        title='Personal Description'
        rows={buildRows(PERSONAL_DESCRIPTION_FIELDS, wikiSummary.personalDescription)}
      />
      <WikiDetailDataTableSection
        title='Ages & Timeline'
        columns={[
          { key: 'age', label: 'Age', render: (item) => item.age },
          { key: 'reference', label: 'Reference', render: (item) => item.reference },
        ]}
        rows={wikiSummary.agesTimeline ?? []}
      />
      <WikiDetailListSection
        title='Conditions'
        items={(wikiSummary.conditions ?? []).map((item) => item)}
      />
      <WikiDetailTableSection
        title='Status & Demographics'
        rows={buildRows(STATUS_DEMOGRAPHICS_FIELDS, wikiSummary.statusDemographics)}
      />
      <WikiDetailListSection
        title='Educational History'
        items={(wikiSummary.educationalHistory ?? []).map((item) => item)}
      />
      <WikiDetailListSection
        title='Occupational History'
        items={(wikiSummary.occupationalHistory ?? []).map((item) => item)}
      />
      <WikiDetailTableSection title='Trivia' rows={buildRows(TRIVIA_FIELDS, wikiSummary.trivia)} />
      {TRAIT_GROUPS.map(({ key, title }) => (
        <WikiDetailSummaryListSection
          key={key}
          title={title}
          summary={wikiSummary.characterTraits?.[key]?.summary}
          items={wikiSummary.characterTraits?.[key]?.traits ?? []}
        />
      ))}
      <WikiDetailVicesVirtuesSection
        summary={wikiSummary.characterTraits?.vicesAndVirtues?.summary}
        vices={wikiSummary.characterTraits?.vicesAndVirtues?.vices ?? []}
        virtues={wikiSummary.characterTraits?.vicesAndVirtues?.virtues ?? []}
      />
      <CharacterQuotesSection quotes={wikiSummary.quotes ?? []} />
    </div>
  );
}
