import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFactionRelationships } from '../../../../src/renderer/hooks/useFactionRelationships';
import { resetWindowDb, setupWindowDb } from '../../../helpers/ipcMock';

function createToastMock() {
  return {
    success: vi.fn(),
    error: vi.fn(),
  };
}

describe('useFactionRelationships', () => {
  beforeEach(() => {
    setupWindowDb();
    resetWindowDb();
  });

  it('clears relationships without calling the API when factionId is null', async () => {
    const toast = createToastMock();
    const { result } = renderHook(() => useFactionRelationships({ factionId: null, toast }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(window.db.factionRelationships.getAllByFaction).not.toHaveBeenCalled();
    expect(result.current.relationships).toEqual([]);
  });

  it('loads relationships for a faction on mount', async () => {
    const toast = createToastMock();
    (window.db.factionRelationships.getAllByFaction as ReturnType<typeof vi.fn>)
      .mockResolvedValue([{
        id: 1,
        faction_id: 4,
        related_faction_id: 5,
        faction_label: 'Ally of',
        related_label: 'Ally of',
      }]);

    const { result } = renderHook(() => useFactionRelationships({ factionId: 4, toast }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(window.db.factionRelationships.getAllByFaction).toHaveBeenCalledWith(4);
    expect(result.current.relationships).toHaveLength(1);
  });

  it('adds a relationship, reloads, and toasts success', async () => {
    const toast = createToastMock();
    const { result } = renderHook(() => useFactionRelationships({ factionId: 4, toast }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let addResult: boolean | undefined;
    await act(async () => {
      addResult = await result.current.addRelationship({
        faction_id: 4,
        related_faction_id: 5,
        faction_label: 'Ally of',
        related_label: 'Ally of',
      });
    });

    expect(addResult).toBe(true);
    expect(window.db.factionRelationships.add).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Relationship added.');
    expect(result.current.isSaving).toBe(false);
  });

  it('reports add failures and does not throw', async () => {
    const toast = createToastMock();
    (window.db.factionRelationships.add as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('duplicate relationship'),
    );
    const { result } = renderHook(() => useFactionRelationships({ factionId: 4, toast }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let addResult: boolean | undefined;
    await act(async () => {
      addResult = await result.current.addRelationship({
        faction_id: 4,
        related_faction_id: 5,
        faction_label: 'Ally of',
        related_label: 'Ally of',
      });
    });

    expect(addResult).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(
      'Failed to add relationship.',
      'duplicate relationship',
    );
  });

  it('updates a relationship and toasts success, or a generic message on non-Error rejection', async () => {
    const toast = createToastMock();
    const { result } = renderHook(() => useFactionRelationships({ factionId: 4, toast }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let updateResult: boolean | undefined;
    await act(async () => {
      updateResult = await result.current.updateRelationship(1, { faction_label: 'Rivals' });
    });

    expect(updateResult).toBe(true);
    expect(toast.success).toHaveBeenCalledWith('Relationship updated.');

    (window.db.factionRelationships.update as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      'boom',
    );
    await act(async () => {
      updateResult = await result.current.updateRelationship(1, { faction_label: 'Rivals' });
    });

    expect(updateResult).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Failed to update relationship.', 'Please try again.');
  });

  it('deletes a relationship and toasts success, or an error on failure', async () => {
    const toast = createToastMock();
    const { result } = renderHook(() => useFactionRelationships({ factionId: 4, toast }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteRelationship(1);
    });

    expect(window.db.factionRelationships.delete).toHaveBeenCalledWith(1);
    expect(toast.success).toHaveBeenCalledWith('Relationship removed.');

    (window.db.factionRelationships.delete as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('cannot delete'),
    );
    await act(async () => {
      await result.current.deleteRelationship(1);
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to remove relationship.', 'cannot delete');
  });
});
