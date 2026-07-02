import { useId, useState } from 'react';

type TagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  disabled?: boolean;
};

function dedupeCaseInsensitive(tags: string[], candidate: string): boolean {
  const lowerCaseCandidate = candidate.toLowerCase();
  return tags.some((tag) => tag.toLowerCase() === lowerCaseCandidate);
}

export default function TagInput({
  tags,
  onChange,
  suggestions,
  disabled = false,
}: TagInputProps) {
  const inputId = useId();
  const [draft, setDraft] = useState('');

  const commitTag = (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed || dedupeCaseInsensitive(tags, trimmed)) {
      return;
    }
    onChange([...tags, trimmed]);
    setDraft('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const filteredSuggestions = draft.trim()
    ? suggestions.filter(
      (suggestion) =>
        !dedupeCaseInsensitive(tags, suggestion)
        && suggestion.toLowerCase().includes(draft.trim().toLowerCase()),
    )
    : [];

  return (
    <div className='space-y-2'>
      <label htmlFor={inputId} className='block text-sm font-medium text-slate-700'>
        Tags
      </label>

      <div className='flex flex-wrap items-center gap-2 rounded-lg border border-slate-300 p-2'>
        {tags.map((tag) => (
          <span
            key={tag}
            className='inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700'
          >
            {tag}
            <button
              type='button'
              aria-label={`Remove ${tag}`}
              className='text-slate-500 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60'
              onClick={() => removeTag(tag)}
              disabled={disabled}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={inputId}
          type='text'
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              commitTag(draft);
              return;
            }
            if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
              removeTag(tags[tags.length - 1]);
            }
          }}
          className='min-w-[8rem] flex-1 border-none text-sm text-slate-900 focus:outline-none'
          placeholder={tags.length === 0 ? 'Add a tag...' : ''}
          disabled={disabled}
        />
      </div>

      {filteredSuggestions.length > 0
        ? (
          <ul className='rounded-lg border border-slate-200 bg-white shadow-sm'>
            {filteredSuggestions.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type='button'
                  className='w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50'
                  onClick={() => commitTag(suggestion)}
                  disabled={disabled}
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        )
        : null}
    </div>
  );
}
