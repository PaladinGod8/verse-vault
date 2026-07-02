interface PaginationBarProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function PaginationBar({ page, totalPages, onPageChange }: PaginationBarProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      aria-label='Pagination'
      className='flex items-center justify-center gap-4 pt-2'
    >
      <button
        type='button'
        aria-label='Previous page'
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className='rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
      >
        Previous
      </button>
      <span className='text-sm text-slate-600'>
        Page {page} of {totalPages}
      </span>
      <button
        type='button'
        aria-label='Next page'
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className='rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
      >
        Next
      </button>
    </nav>
  );
}
