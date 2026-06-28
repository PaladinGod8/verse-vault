import type { CardSortMethod } from '../../../shared/contracts/settingsTypes';

interface CardSortToggleProps {
  value: CardSortMethod;
  onChange: (method: CardSortMethod) => void;
}

const OPTIONS: Array<{ method: CardSortMethod; label: string; }> = [
  { method: 'alphabetical', label: 'A–Z' },
  { method: 'recentlyViewed', label: 'Recently Viewed' },
];

export default function CardSortToggle({ value, onChange }: CardSortToggleProps) {
  return (
    <div
      role='group'
      aria-label='Sort by'
      className='inline-flex shrink-0 rounded-lg border border-slate-300 p-1'
    >
      {OPTIONS.map(({ method, label }) => {
        const isActive = value === method;
        return (
          <button
            key={method}
            type='button'
            aria-pressed={isActive}
            onClick={() => onChange(method)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition ${
              isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
