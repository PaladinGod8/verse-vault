import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { usePaginatedList } from '../../../../src/renderer/hooks/usePaginatedList';

describe('usePaginatedList', () => {
  it('returns only the first page of items when there are more items than the page size', () => {
    const items = Array.from({ length: 25 }, (_, index) => index + 1);

    const { result } = renderHook(() => usePaginatedList(items, 10));

    expect(result.current.pageItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.totalItems).toBe(25);
  });

  it('moves the window when setPage is called', () => {
    const items = Array.from({ length: 25 }, (_, index) => index + 1);
    const { result } = renderHook(() => usePaginatedList(items, 10));

    act(() => result.current.setPage(2));

    expect(result.current.page).toBe(2);
    expect(result.current.pageItems).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it('clamps setPage to the last valid page', () => {
    const items = Array.from({ length: 25 }, (_, index) => index + 1);
    const { result } = renderHook(() => usePaginatedList(items, 10));

    act(() => result.current.setPage(99));

    expect(result.current.page).toBe(3);
    expect(result.current.pageItems).toEqual([21, 22, 23, 24, 25]);
  });

  it('clamps setPage below 1 to page 1', () => {
    const items = Array.from({ length: 25 }, (_, index) => index + 1);
    const { result } = renderHook(() => usePaginatedList(items, 10));

    act(() => result.current.setPage(-5));

    expect(result.current.page).toBe(1);
  });

  it('resets to page 1 and resizes the window when setPageSize is called', () => {
    const items = Array.from({ length: 25 }, (_, index) => index + 1);
    const { result } = renderHook(() => usePaginatedList(items, 10));

    act(() => result.current.setPage(3));
    act(() => result.current.setPageSize(50));

    expect(result.current.page).toBe(1);
    expect(result.current.pageItems).toEqual(items);
    expect(result.current.totalPages).toBe(1);
  });

  it('clamps the current page automatically when the item list shrinks', () => {
    const items = Array.from({ length: 25 }, (_, index) => index + 1);
    const { result, rerender } = renderHook(
      ({ items: currentItems }) => usePaginatedList(currentItems, 10),
      { initialProps: { items } },
    );

    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);

    rerender({ items: items.slice(0, 12) });

    expect(result.current.page).toBe(2);
    expect(result.current.pageItems).toEqual([11, 12]);
  });
});
