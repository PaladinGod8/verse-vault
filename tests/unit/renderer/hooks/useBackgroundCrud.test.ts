import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBackgroundCrud } from '../../../../src/renderer/hooks/useBackgroundCrud';
import { buildBackground, resetFactoryIds } from '../../../helpers/factories';
import { resetWindowDb, setupWindowDb } from '../../../helpers/ipcMock';

function createToastMock() {
  return {
    success: vi.fn(),
    error: vi.fn(),
  };
}

describe('useBackgroundCrud', () => {
  beforeEach(() => {
    resetFactoryIds();
    setupWindowDb();
    resetWindowDb();
  });

  it('no-ops create when worldId is null', async () => {
    const reloadBackgrounds = vi.fn();
    const toast = createToastMock();
    const { result } = renderHook(() =>
      useBackgroundCrud({
        worldId: null,
        editingBackground: null,
        pendingDeleteBackground: null,
        reloadBackgrounds,
        toast,
        onCreateSaved: vi.fn(),
        onUpdateSaved: vi.fn(),
        onDeleteSettled: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleCreate({ name: 'Skyline' });
    });

    expect(window.db.backgrounds.add).not.toHaveBeenCalled();
    expect(reloadBackgrounds).not.toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);
  });

  it('creates with imported image and success toast', async () => {
    const reloadBackgrounds = vi.fn().mockResolvedValue(undefined);
    const onCreateSaved = vi.fn();
    const toast = createToastMock();
    (window.db.backgrounds.importImage as ReturnType<typeof vi.fn>).mockResolvedValue({
      image_src: 'vv-media://background-images/new.png',
    });

    const { result } = renderHook(() =>
      useBackgroundCrud({
        worldId: 9,
        editingBackground: null,
        pendingDeleteBackground: null,
        reloadBackgrounds,
        toast,
        onCreateSaved,
        onUpdateSaved: vi.fn(),
        onDeleteSettled: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleCreate({
        name: 'Skyline',
        description: 'Tall towers',
        image_upload: {
          fileName: 'skyline.png',
          mimeType: 'image/png',
          bytes: new Uint8Array([1, 2, 3]),
        },
      });
    });

    expect(window.db.backgrounds.importImage).toHaveBeenCalled();
    expect(window.db.backgrounds.add).toHaveBeenCalledWith({
      world_id: 9,
      name: 'Skyline',
      description: 'Tall towers',
      image_src: 'vv-media://background-images/new.png',
    });
    expect(reloadBackgrounds).toHaveBeenCalledTimes(1);
    expect(onCreateSaved).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Background created.', '"Skyline" was added.');
  });

  it('updates with imported image and reports update errors', async () => {
    const editingBackground = buildBackground({ id: 12, world_id: 9, name: 'Old Hall' });
    const reloadBackgrounds = vi.fn().mockResolvedValue(undefined);
    const onUpdateSaved = vi.fn();
    const toast = createToastMock();
    (window.db.backgrounds.importImage as ReturnType<typeof vi.fn>).mockResolvedValue({
      image_src: 'vv-media://background-images/replaced.png',
    });

    const { result, rerender } = renderHook(
      ({ currentEditingBackground }) =>
        useBackgroundCrud({
          worldId: 9,
          editingBackground: currentEditingBackground,
          pendingDeleteBackground: null,
          reloadBackgrounds,
          toast,
          onCreateSaved: vi.fn(),
          onUpdateSaved,
          onDeleteSettled: vi.fn(),
        }),
      { initialProps: { currentEditingBackground: editingBackground } },
    );

    await act(async () => {
      await result.current.handleUpdate({
        name: 'Old Hall',
        description: 'Restored',
        image_upload: {
          fileName: 'replaced.png',
          mimeType: 'image/png',
          bytes: new Uint8Array([3, 2, 1]),
        },
      });
    });

    expect(window.db.backgrounds.update).toHaveBeenCalledWith(12, {
      name: 'Old Hall',
      description: 'Restored',
      image_src: 'vv-media://background-images/replaced.png',
    });
    expect(onUpdateSaved).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Background updated.', '"Old Hall" was saved.');

    rerender({ currentEditingBackground: null });
    await act(async () => {
      await result.current.handleUpdate({ name: 'Ignored' });
    });
    expect(window.db.backgrounds.update).toHaveBeenCalledTimes(1);

    (window.db.backgrounds.update as ReturnType<typeof vi.fn>).mockRejectedValueOnce('boom');
    rerender({ currentEditingBackground: editingBackground });
    await act(async () => {
      await result.current.handleUpdate({
        name: 'Old Hall',
        description: null,
        clear_image: true,
      });
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to update background.', 'Please try again.');
  });

  it('deletes pending background and settles delete state on success and failure', async () => {
    const pendingDeleteBackground = buildBackground({ id: 3, name: 'Fog Bank' });
    const reloadBackgrounds = vi.fn().mockResolvedValue(undefined);
    const onDeleteSettled = vi.fn();
    const toast = createToastMock();

    const { result, rerender } = renderHook(
      ({ currentPendingDelete }) =>
        useBackgroundCrud({
          worldId: 5,
          editingBackground: null,
          pendingDeleteBackground: currentPendingDelete,
          reloadBackgrounds,
          toast,
          onCreateSaved: vi.fn(),
          onUpdateSaved: vi.fn(),
          onDeleteSettled,
        }),
      { initialProps: { currentPendingDelete: pendingDeleteBackground as Background | null } },
    );

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(window.db.backgrounds.delete).toHaveBeenCalledWith(3);
    expect(reloadBackgrounds).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Background deleted.', '"Fog Bank" was removed.');
    expect(result.current.deletingBackgroundId).toBeNull();
    expect(onDeleteSettled).toHaveBeenCalledTimes(1);

    rerender({ currentPendingDelete: null });
    await act(async () => {
      await result.current.handleDelete();
    });
    expect(window.db.backgrounds.delete).toHaveBeenCalledTimes(1);

    (window.db.backgrounds.delete as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('cannot delete'),
    );
    rerender({ currentPendingDelete: pendingDeleteBackground });
    await act(async () => {
      await result.current.handleDelete();
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to delete background.',
      'cannot delete',
    );
    expect(result.current.deletingBackgroundId).toBeNull();
  });
});
