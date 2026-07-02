import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorldBackgroundsData } from '../../../../src/renderer/hooks/useWorldBackgroundsData';
import { buildBackground, buildWorld, resetFactoryIds } from '../../../helpers/factories';
import { resetWindowDb, setupWindowDb } from '../../../helpers/ipcMock';

describe('useWorldBackgroundsData', () => {
  beforeEach(() => {
    resetFactoryIds();
    setupWindowDb();
    resetWindowDb();
  });

  it('returns invalid-world state without hitting IPC when world id is null', async () => {
    const { result } = renderHook(() => useWorldBackgroundsData(null));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Invalid world id.');
    expect(window.db.worlds.getById).not.toHaveBeenCalled();
    expect(window.db.backgrounds.getAllByWorld).not.toHaveBeenCalled();
  });

  it('loads world and backgrounds and reload refreshes only backgrounds', async () => {
    const world = buildWorld({ id: 7, name: 'Avalon' });
    const firstList = [buildBackground({ id: 1, world_id: 7, name: 'Hall' })];
    const secondList = [buildBackground({ id: 2, world_id: 7, name: 'Garden' })];
    (window.db.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (window.db.backgrounds.getAllByWorld as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(firstList)
      .mockResolvedValueOnce(secondList);

    const { result } = renderHook(() => useWorldBackgroundsData(7));

    await waitFor(() => expect(result.current.backgrounds).toEqual(firstList));
    await act(async () => {
      await result.current.reload();
    });

    await waitFor(() => expect(result.current.backgrounds).toEqual(secondList));
    expect(result.current.world).toEqual(world);
    expect(window.db.worlds.getById).toHaveBeenCalledTimes(1);
  });

  it('surfaces World not found when the world lookup returns null', async () => {
    (window.db.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { result } = renderHook(() => useWorldBackgroundsData(4));

    await waitFor(() => expect(result.current.error).toBe('World not found.'));

    expect(result.current.world).toBeNull();
    expect(window.db.backgrounds.getAllByWorld).not.toHaveBeenCalled();
  });

  it('surfaces background load errors and keeps reload a no-op for null ids', async () => {
    (window.db.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildWorld({ id: 5 }),
    );
    (window.db.backgrounds.getAllByWorld as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('boom'),
    );

    const { result } = renderHook(() => useWorldBackgroundsData(5));

    await waitFor(() => expect(result.current.error).toBe('Unable to load backgrounds right now.'));
    expect(result.current.backgrounds).toEqual([]);

    const nullIdHook = renderHook(() => useWorldBackgroundsData(null));
    await expect(nullIdHook.result.current.reload()).resolves.toBeUndefined();
  });
});
