import { useId } from 'react';
import CharacterWikiSummaryListEditor from './CharacterWikiSummaryListEditor';

type CharacterWikiSummaryTraitGroupEditorProps = {
  legend: string;
  summary?: string | null;
  traits: string[];
  onSummaryChange: (value: string) => void;
  onTraitsChange: (items: string[]) => void;
  traitsLegend?: string;
  disabled?: boolean;
};

export default function CharacterWikiSummaryTraitGroupEditor({
  legend,
  summary,
  traits,
  onSummaryChange,
  onTraitsChange,
  traitsLegend = 'Traits',
  disabled = false,
}: CharacterWikiSummaryTraitGroupEditorProps) {
  const summaryId = useId();

  return (
    <fieldset className='space-y-3'>
      <legend className='text-sm font-semibold text-slate-800'>{legend}</legend>
      <div>
        <label htmlFor={summaryId} className='mb-1 block text-xs font-medium text-slate-600'>
          Summary
        </label>
        <textarea
          id={summaryId}
          value={summary ?? ''}
          onChange={(event) => onSummaryChange(event.target.value)}
          className='w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
          rows={3}
          disabled={disabled}
        />
      </div>
      <CharacterWikiSummaryListEditor
        legend={traitsLegend}
        items={traits}
        onChange={onTraitsChange}
        disabled={disabled}
      />
    </fieldset>
  );
}
