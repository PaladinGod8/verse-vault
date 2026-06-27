type AgesTimelineRow = { age: string; reference: string; };

type CharacterWikiSummaryAgesTimelineEditorProps = {
  items: AgesTimelineRow[];
  onChange: (items: AgesTimelineRow[]) => void;
  disabled?: boolean;
};

export default function CharacterWikiSummaryAgesTimelineEditor({
  items,
  onChange,
  disabled = false,
}: CharacterWikiSummaryAgesTimelineEditorProps) {
  const updateRow = (index: number, patch: Partial<AgesTimelineRow>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  return (
    <fieldset className='space-y-2'>
      <legend className='text-sm font-semibold text-slate-800'>Ages & Timeline</legend>
      <div className='space-y-2'>
        {items.map((row, index) => (
          <div key={index} className='flex items-center gap-2'>
            <input
              type='text'
              value={row.age}
              placeholder='Age'
              onChange={(event) => updateRow(index, { age: event.target.value })}
              className='w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
              disabled={disabled}
            />
            <input
              type='text'
              value={row.reference}
              placeholder='Reference'
              onChange={(event) => updateRow(index, { reference: event.target.value })}
              className='flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
              disabled={disabled}
            />
            <button
              type='button'
              className='text-xs font-medium text-rose-600 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
              onClick={() => onChange(items.filter((_, rowIndex) => rowIndex !== index))}
              disabled={disabled}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type='button'
        className='text-xs font-medium text-slate-700 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
        onClick={() => onChange([...items, { age: '', reference: '' }])}
        disabled={disabled}
      >
        Add Ages & Timeline
      </button>
    </fieldset>
  );
}
