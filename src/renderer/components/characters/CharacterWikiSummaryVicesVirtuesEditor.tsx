import { useId } from 'react';
import CharacterWikiSummaryListEditor from './CharacterWikiSummaryListEditor';

type CharacterWikiSummaryVicesVirtuesEditorProps = {
  summary?: string | null;
  vices: string[];
  virtues: string[];
  onSummaryChange: (value: string) => void;
  onVicesChange: (items: string[]) => void;
  onVirtuesChange: (items: string[]) => void;
  disabled?: boolean;
};

export default function CharacterWikiSummaryVicesVirtuesEditor({
  summary,
  vices,
  virtues,
  onSummaryChange,
  onVicesChange,
  onVirtuesChange,
  disabled = false,
}: CharacterWikiSummaryVicesVirtuesEditorProps) {
  const summaryId = useId();

  return (
    <fieldset className='space-y-3'>
      <legend className='text-sm font-semibold text-slate-800'>Vices & Virtues</legend>
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
        legend='Vices'
        items={vices}
        onChange={onVicesChange}
        disabled={disabled}
      />
      <CharacterWikiSummaryListEditor
        legend='Virtues'
        items={virtues}
        onChange={onVirtuesChange}
        disabled={disabled}
      />
    </fieldset>
  );
}
