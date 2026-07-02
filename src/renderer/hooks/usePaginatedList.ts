import { useCallback, useMemo, useState } from 'react';

export const PAGE_SIZE_OPTIONS = [10, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

interface UsePaginatedListResult<T> {
  page: number;
  pageSize: PageSize;
  totalPages: number;
  totalItems: number;
  pageItems: T[];
  setPage: (page: number) => void;
  setPageSize: (pageSize: PageSize) => void;
}

/**
 * Windows a client-side filtered/sorted list into pages, so large lists only
 * mount the current page's worth of cards instead of the full result set.
 */
export function usePaginatedList<T>(
  items: readonly T[],
  initialPageSize: PageSize = 50,
): UsePaginatedListResult<T> {
  const [page, setRawPage] = useState(1);
  const [pageSize, setRawPageSize] = useState<PageSize>(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const clampedPage = Math.min(Math.max(1, page), totalPages);

  const pageItems = useMemo(() => {
    const start = (clampedPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, clampedPage, pageSize]);

  const setPage = useCallback((nextPage: number) => {
    setRawPage(nextPage);
  }, []);

  const setPageSize = useCallback((nextPageSize: PageSize) => {
    setRawPageSize(nextPageSize);
    setRawPage(1);
  }, []);

  return { page: clampedPage, pageSize, totalPages, totalItems, pageItems, setPage, setPageSize };
}
