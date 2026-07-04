import { useId } from 'react';
import RichTextEditor from '../ui/RichTextEditor';
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
        <RichTextEditor
          id={summaryId}
          value={summary ?? ''}
          onChange={onSummaryChange}
          variant='compact'
          editable={!disabled}
          aria-label='Summary'
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
