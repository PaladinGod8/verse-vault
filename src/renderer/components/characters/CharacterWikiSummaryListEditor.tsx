type CharacterWikiSummaryListEditorProps = {
  legend: string;
  items: string[];
  onChange: (items: string[]) => void;
  disabled?: boolean;
};

export default function CharacterWikiSummaryListEditor({
  legend,
  items,
  onChange,
  disabled = false,
}: CharacterWikiSummaryListEditorProps) {
  return (
    <fieldset className='space-y-2'>
      <legend className='text-sm font-semibold text-slate-800'>{legend}</legend>
      <div className='space-y-2'>
        {items.map((item, index) => (
          <div key={index} className='flex items-center gap-2'>
            <input
              type='text'
              value={item}
              onChange={(event) => {
                const next = [...items];
                next[index] = event.target.value;
                onChange(next);
              }}
              className='flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
              disabled={disabled}
            />
            <button
              type='button'
              className='text-xs font-medium text-rose-600 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
              onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
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
        onClick={() => onChange([...items, ''])}
        disabled={disabled}
      >
        Add {legend}
      </button>
    </fieldset>
  );
}
