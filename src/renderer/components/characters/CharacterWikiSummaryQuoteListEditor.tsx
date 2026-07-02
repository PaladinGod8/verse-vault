type QuoteItem = { context?: string | null; text: string; speaker?: string | null; };

type CharacterWikiSummaryQuoteListEditorProps = {
  items: QuoteItem[];
  onChange: (items: QuoteItem[]) => void;
  disabled?: boolean;
};

export default function CharacterWikiSummaryQuoteListEditor({
  items,
  onChange,
  disabled = false,
}: CharacterWikiSummaryQuoteListEditorProps) {
  const updateItem = (index: number, patch: Partial<QuoteItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  return (
    <fieldset className='space-y-2'>
      <legend className='text-sm font-semibold text-slate-800'>Quotes</legend>
      <div className='space-y-2'>
        {items.map((item, index) => (
          <div key={index} className='flex items-center gap-2'>
            <input
              type='text'
              value={item.context ?? ''}
              placeholder='Context (optional)'
              onChange={(event) => updateItem(index, { context: event.target.value })}
              className='w-40 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
              disabled={disabled}
            />
            <input
              type='text'
              value={item.text}
              placeholder='Quote text'
              onChange={(event) => updateItem(index, { text: event.target.value })}
              className='flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
              disabled={disabled}
            />
            <input
              type='text'
              value={item.speaker ?? ''}
              placeholder='Speaker'
              onChange={(event) => updateItem(index, { speaker: event.target.value })}
              className='w-40 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
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
        onClick={() => onChange([...items, { context: '', text: '', speaker: '' }])}
        disabled={disabled}
      >
        Add Quote
      </button>
    </fieldset>
  );
}
