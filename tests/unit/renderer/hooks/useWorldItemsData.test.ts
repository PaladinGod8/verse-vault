import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorldItemsData } from '../../../../src/renderer/hooks/useWorldItemsData';
import { buildItem, buildWorld, resetFactoryIds } from '../../../helpers/factories';
import { resetWindowDb, setupWindowDb } from '../../../helpers/ipcMock';

describe('useWorldItemsData', () => {
  beforeEach(() => {
    resetFactoryIds();
    setupWindowDb();
    resetWindowDb();
  });

  it('returns invalid-world state without hitting IPC when world id is null', async () => {
    const { result } = renderHook(() => useWorldItemsData(null));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Invalid world id.');
    expect(window.db.worlds.getById).not.toHaveBeenCalled();
    expect(window.db.items.getAllByWorld).not.toHaveBeenCalled();
  });

  it('loads world and items and reload refreshes only items', async () => {
    const world = buildWorld({ id: 7, name: 'Avalon' });
    const firstList = [buildItem({ id: 1, world_id: 7, name: 'Hall Key' })];
    const secondList = [buildItem({ id: 2, world_id: 7, name: 'Garden Sigil' })];
    (window.db.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (window.db.items.getAllByWorld as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(firstList)
      .mockResolvedValueOnce(secondList);

    const { result } = renderHook(() => useWorldItemsData(7));

    await waitFor(() => expect(result.current.items).toEqual(firstList));
    await act(async () => {
      await result.current.reload();
    });

    await waitFor(() => expect(result.current.items).toEqual(secondList));
    expect(result.current.world).toEqual(world);
    expect(window.db.worlds.getById).toHaveBeenCalledTimes(1);
  });

  it('surfaces World not found when world lookup returns null', async () => {
    (window.db.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { result } = renderHook(() => useWorldItemsData(4));

    await waitFor(() => expect(result.current.error).toBe('World not found.'));

    expect(result.current.world).toBeNull();
    expect(window.db.items.getAllByWorld).not.toHaveBeenCalled();
  });

  it('surfaces item load errors and keeps reload a no-op for null ids', async () => {
    (window.db.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildWorld({ id: 5 }),
    );
    (window.db.items.getAllByWorld as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('boom'),
    );

    const { result } = renderHook(() => useWorldItemsData(5));

    await waitFor(() => expect(result.current.error).toBe('Unable to load items right now.'));
    expect(result.current.items).toEqual([]);

    const nullIdHook = renderHook(() => useWorldItemsData(null));
    await expect(nullIdHook.result.current.reload()).resolves.toBeUndefined();
  });
});
