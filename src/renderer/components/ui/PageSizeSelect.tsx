import { PAGE_SIZE_OPTIONS, type PageSize } from '../../hooks/usePaginatedList';

interface PageSizeSelectProps {
  value: PageSize;
  onChange: (pageSize: PageSize) => void;
}

export default function PageSizeSelect({ value, onChange }: PageSizeSelectProps) {
  return (
    <div className='flex shrink-0 items-center gap-2'>
      <label htmlFor='page-size-select' className='text-sm text-slate-600'>
        Results per page
      </label>
      <select
        id='page-size-select'
        aria-label='Results per page'
        value={value}
        onChange={(event) => onChange(Number(event.target.value) as PageSize)}
        className='rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
      >
        {PAGE_SIZE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
