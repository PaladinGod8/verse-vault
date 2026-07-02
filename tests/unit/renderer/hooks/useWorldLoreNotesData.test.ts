import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorldLoreNotesData } from '../../../../src/renderer/hooks/useWorldLoreNotesData';
import { buildLoreNote, buildWorld, resetFactoryIds } from '../../../helpers/factories';
import { resetWindowDb, setupWindowDb } from '../../../helpers/ipcMock';

describe('useWorldLoreNotesData', () => {
  beforeEach(() => {
    resetFactoryIds();
    setupWindowDb();
    resetWindowDb();
  });

  it('returns invalid-world state without hitting IPC when world id is null', async () => {
    const { result } = renderHook(() => useWorldLoreNotesData(null));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Invalid world id.');
    expect(window.db.worlds.getById).not.toHaveBeenCalled();
    expect(window.db.loreNotes.getAllByWorld).not.toHaveBeenCalled();
  });

  it('loads world, lore notes, and tag vocabulary; reload refreshes both', async () => {
    const world = buildWorld({ id: 7, name: 'Avalon' });
    const firstList = [buildLoreNote({ id: 1, world_id: 7, name: 'Hall Myth' })];
    const secondList = [buildLoreNote({ id: 2, world_id: 7, name: 'Garden Myth' })];
    (window.db.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (window.db.loreNotes.getAllByWorld as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(firstList)
      .mockResolvedValueOnce(secondList);
    (window.db.loreNotes.getAllTagsByWorld as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(['Economics'])
      .mockResolvedValueOnce(['Economics', 'Magic']);

    const { result } = renderHook(() => useWorldLoreNotesData(7));

    await waitFor(() => expect(result.current.loreNotes).toEqual(firstList));
    expect(result.current.tagVocabulary).toEqual(['Economics']);

    await act(async () => {
      await result.current.reload();
    });

    await waitFor(() => expect(result.current.loreNotes).toEqual(secondList));
    expect(result.current.tagVocabulary).toEqual(['Economics', 'Magic']);
    expect(result.current.world).toEqual(world);
    expect(window.db.worlds.getById).toHaveBeenCalledTimes(1);
  });

  it('surfaces World not found when world lookup returns null', async () => {
    (window.db.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { result } = renderHook(() => useWorldLoreNotesData(4));

    await waitFor(() => expect(result.current.error).toBe('World not found.'));

    expect(result.current.world).toBeNull();
    expect(window.db.loreNotes.getAllByWorld).not.toHaveBeenCalled();
  });

  it('surfaces load errors and keeps reload a no-op for null ids', async () => {
    (window.db.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildWorld({ id: 5 }),
    );
    (window.db.loreNotes.getAllByWorld as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('boom'),
    );

    const { result } = renderHook(() => useWorldLoreNotesData(5));

    await waitFor(() => expect(result.current.error).toBe('Unable to load lore notes right now.'));
    expect(result.current.loreNotes).toEqual([]);

    const nullIdHook = renderHook(() => useWorldLoreNotesData(null));
    await expect(nullIdHook.result.current.reload()).resolves.toBeUndefined();
  });
});
