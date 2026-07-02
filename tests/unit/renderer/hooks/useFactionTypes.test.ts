import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFactionTypes } from '../../../../src/renderer/hooks/useFactionTypes';
import { resetWindowDb, setupWindowDb } from '../../../helpers/ipcMock';

describe('useFactionTypes', () => {
  beforeEach(() => {
    setupWindowDb();
    resetWindowDb();
  });

  it('no-ops add when worldId is null', async () => {
    const reload = vi.fn();
    const { result } = renderHook(() => useFactionTypes({ worldId: null, reload }));

    await act(async () => {
      await result.current.add('Cult');
    });

    expect(window.db.factionTypes.add).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('adds a faction type and reloads when worldId is set', async () => {
    const reload = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFactionTypes({ worldId: 7, reload }));

    await act(async () => {
      await result.current.add('Cult');
    });

    expect(window.db.factionTypes.add).toHaveBeenCalledWith({ world_id: 7, name: 'Cult' });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('renames a faction type and reloads', async () => {
    const reload = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFactionTypes({ worldId: 7, reload }));

    await act(async () => {
      await result.current.rename(3, 'Guild');
    });

    expect(window.db.factionTypes.rename).toHaveBeenCalledWith(3, 'Guild');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('removes a faction type and reloads', async () => {
    const reload = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFactionTypes({ worldId: 7, reload }));

    await act(async () => {
      await result.current.remove(3);
    });

    expect(window.db.factionTypes.delete).toHaveBeenCalledWith(3);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
