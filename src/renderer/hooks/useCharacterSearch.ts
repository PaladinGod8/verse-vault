import { useCallback, useEffect, useRef, useState } from 'react';

type UseCharacterSearchOptions = {
  worldId: number | null;
  excludeCharacterIds: number[];
  pageSize?: number;
  debounceMs?: number;
};

type UseCharacterSearchResult = {
  query: string;
  setQuery: (value: string) => void;
  items: Character[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  fetchMore: () => void;
};

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_DEBOUNCE_MS = 200;

export function useCharacterSearch(
  { worldId, excludeCharacterIds, pageSize = DEFAULT_PAGE_SIZE, debounceMs = DEFAULT_DEBOUNCE_MS }:
    UseCharacterSearchOptions,
): UseCharacterSearchResult {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [items, setItems] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const excludeKey = excludeCharacterIds.join(',');

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(timeoutId);
  }, [query, debounceMs]);

  useEffect(() => {
    if (worldId === null) {
      setItems([]);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    window.db.characters.searchByWorld({
      worldId,
      query: debouncedQuery,
      offset: 0,
      limit: pageSize,
      excludeCharacterIds,
    })
      .then((result) => {
        if (requestIdRef.current !== requestId) return;
        setItems(result.items);
        setHasMore(result.hasMore);
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) return;
        setError('Unable to search characters right now.');
      })
      .finally(() => {
        if (requestIdRef.current !== requestId) return;
        setIsLoading(false);
      });
    // excludeKey (a stable, content-based key) is the dependency, not excludeCharacterIds
    // itself, since callers commonly pass a new array literal each render.
  }, [worldId, debouncedQuery, pageSize, excludeKey]);

  const fetchMore = useCallback(() => {
    if (isLoadingMore || !hasMore || worldId === null) return;

    const requestId = ++requestIdRef.current;
    setIsLoadingMore(true);

    window.db.characters.searchByWorld({
      worldId,
      query: debouncedQuery,
      offset: items.length,
      limit: pageSize,
      excludeCharacterIds,
    })
      .then((result) => {
        if (requestIdRef.current !== requestId) return;
        setItems((current) => [...current, ...result.items]);
        setHasMore(result.hasMore);
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) return;
        setError('Unable to search characters right now.');
      })
      .finally(() => {
        if (requestIdRef.current !== requestId) return;
        setIsLoadingMore(false);
      });
  }, [isLoadingMore, hasMore, worldId, debouncedQuery, items.length, pageSize, excludeKey]);

  return { query, setQuery, items, isLoading, isLoadingMore, hasMore, error, fetchMore };
}
