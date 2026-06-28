import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCharacterSearch } from '../../../../src/renderer/hooks/useCharacterSearch';
import { resetWindowDb, setupWindowDb } from '../../../helpers/ipcMock';

function buildCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 1,
    world_id: 1,
    name: 'Ledros Igni',
    profile: null,
    is_player_character: 0,
    owner: null,
    author: null,
    image_src: null,
    sections: '{}',
    wiki_summary: '{}',
    last_viewed_at: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('useCharacterSearch', () => {
  beforeEach(() => {
    setupWindowDb();
    resetWindowDb();
  });

  it('fetches the first page for the world on mount with an empty query', async () => {
    const character = buildCharacter();
    (window.db.characters.searchByWorld as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [character],
      hasMore: false,
    });

    const { result } = renderHook(() =>
      useCharacterSearch({ worldId: 1, excludeCharacterIds: [] })
    );

    await waitFor(() => expect(result.current.items).toEqual([character]));

    expect(window.db.characters.searchByWorld).toHaveBeenCalledWith({
      worldId: 1,
      query: '',
      offset: 0,
      limit: 50,
      excludeCharacterIds: [],
    });
    expect(result.current.hasMore).toBe(false);
  });

  it('debounces rapid query changes into a single fetch', async () => {
    vi.useFakeTimers();
    (window.db.characters.searchByWorld as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [],
      hasMore: false,
    });

    const { result } = renderHook(() =>
      useCharacterSearch({ worldId: 1, excludeCharacterIds: [] })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    (window.db.characters.searchByWorld as ReturnType<typeof vi.fn>).mockClear();

    act(() => result.current.setQuery('l'));
    act(() => result.current.setQuery('le'));
    act(() => result.current.setQuery('led'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(window.db.characters.searchByWorld).toHaveBeenCalledTimes(1);
    expect(window.db.characters.searchByWorld).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'led' }),
    );

    vi.useRealTimers();
  });

  it('fetchMore appends results at the next offset, and is a no-op when hasMore is false', async () => {
    const firstPage = [buildCharacter({ id: 1, name: 'Alaric' })];
    const secondPage = [buildCharacter({ id: 2, name: 'Borin' })];
    const searchMock = window.db.characters.searchByWorld as ReturnType<typeof vi.fn>;
    searchMock.mockResolvedValueOnce({ items: firstPage, hasMore: true });

    const { result } = renderHook(() =>
      useCharacterSearch({ worldId: 1, excludeCharacterIds: [] })
    );

    await waitFor(() => expect(result.current.items).toEqual(firstPage));

    searchMock.mockResolvedValueOnce({ items: secondPage, hasMore: false });
    act(() => result.current.fetchMore());

    await waitFor(() => expect(result.current.items).toEqual([...firstPage, ...secondPage]));
    expect(searchMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: firstPage.length }),
    );

    searchMock.mockClear();
    act(() => result.current.fetchMore());
    expect(searchMock).not.toHaveBeenCalled();
  });

  it('replaces items and resets offset when the query changes', async () => {
    vi.useFakeTimers();
    const searchMock = window.db.characters.searchByWorld as ReturnType<typeof vi.fn>;
    const firstPage = [buildCharacter({ id: 1, name: 'Alaric' })];
    searchMock.mockResolvedValueOnce({ items: firstPage, hasMore: true });

    const { result } = renderHook(() =>
      useCharacterSearch({ worldId: 1, excludeCharacterIds: [] })
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.items).toEqual(firstPage);

    const ledrosPage = [buildCharacter({ id: 2, name: 'Ledros' })];
    searchMock.mockResolvedValueOnce({ items: ledrosPage, hasMore: false });
    act(() => result.current.setQuery('led'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(result.current.items).toEqual(ledrosPage);
    expect(searchMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 0, query: 'led' }),
    );

    vi.useRealTimers();
  });

  it('discards a stale response that resolves after a newer query supersedes it', async () => {
    const searchMock = window.db.characters.searchByWorld as ReturnType<typeof vi.fn>;
    let resolveFirst!: (value: { items: Character[]; hasMore: boolean; }) => void;
    searchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );

    const { result, rerender } = renderHook(
      ({ worldId }) => useCharacterSearch({ worldId, excludeCharacterIds: [] }),
      { initialProps: { worldId: 1 } },
    );

    const newerPage = [buildCharacter({ id: 9, name: 'Newer' })];
    searchMock.mockResolvedValueOnce({ items: newerPage, hasMore: false });
    rerender({ worldId: 2 });
    await waitFor(() => expect(result.current.items).toEqual(newerPage));

    resolveFirst({ items: [buildCharacter({ id: 1, name: 'Stale' })], hasMore: false });
    await Promise.resolve();

    expect(result.current.items).toEqual(newerPage);
  });

  it('sets error and clears loading when the IPC call rejects', async () => {
    (window.db.characters.searchByWorld as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('boom'),
    );

    const { result } = renderHook(() =>
      useCharacterSearch({ worldId: 1, excludeCharacterIds: [] })
    );

    await waitFor(() =>
      expect(result.current.error).toBe('Unable to search characters right now.')
    );
    expect(result.current.isLoading).toBe(false);
  });
});
