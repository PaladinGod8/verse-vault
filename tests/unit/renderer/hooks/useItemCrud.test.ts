import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useItemCrud } from '../../../../src/renderer/hooks/useItemCrud';
import type { ImageEditDraft } from '../../../../src/renderer/lib/imageCrop';
import { buildItem, resetFactoryIds } from '../../../helpers/factories';
import { resetWindowDb, setupWindowDb } from '../../../helpers/ipcMock';

function createToastMock() {
  return {
    success: vi.fn(),
    error: vi.fn(),
  };
}

function createImageEditDraft(
  overrides: Partial<ImageEditDraft> = {},
): ImageEditDraft {
  return {
    cropped_upload: {
      fileName: 'sunblade.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([1, 2, 3]),
    },
    crop_json:
      '{"version":1,"aspect_ratio":2,"selection":{"x":0,"y":0,"width":320,"height":160},"transform":{"matrix":[1,0,0,1,0,0]},"source":{"natural_width":640,"natural_height":320},"output":{"mime_type":"image/png"}}',
    preview_url: 'blob:preview',
    source_image_src: 'blob:source',
    ...overrides,
  };
}

describe('useItemCrud', () => {
  beforeEach(() => {
    resetFactoryIds();
    setupWindowDb();
    resetWindowDb();
  });

  it('no-ops create when worldId is null', async () => {
    const reloadItems = vi.fn();
    const toast = createToastMock();
    const { result } = renderHook(() =>
      useItemCrud({
        worldId: null,
        editingItem: null,
        pendingDeleteItem: null,
        reloadItems,
        toast,
        onCreateSaved: vi.fn(),
        onUpdateSaved: vi.fn(),
        onDeleteSettled: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleCreate({ name: 'Sunblade' });
    });

    expect(window.db.items.add).not.toHaveBeenCalled();
    expect(reloadItems).not.toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);
  });

  it('creates with imported image and success toast', async () => {
    const reloadItems = vi.fn().mockResolvedValue(undefined);
    const onCreateSaved = vi.fn();
    const toast = createToastMock();
    (window.db.items.importImage as ReturnType<typeof vi.fn>).mockResolvedValue({
      image_src: 'vv-media://item-images/new.png',
    });

    const { result } = renderHook(() =>
      useItemCrud({
        worldId: 9,
        editingItem: null,
        pendingDeleteItem: null,
        reloadItems,
        toast,
        onCreateSaved,
        onUpdateSaved: vi.fn(),
        onDeleteSettled: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleCreate({
        name: 'Sunblade',
        description: 'Ancient radiant sword',
        image_edit_draft: createImageEditDraft({
          original_upload: {
            fileName: 'sunblade-original.png',
            mimeType: 'image/png',
            bytes: new Uint8Array([4, 5, 6]),
          },
        }),
      });
    });

    expect(window.db.items.importImage).toHaveBeenNthCalledWith(1, {
      fileName: 'sunblade.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([1, 2, 3]),
    });
    expect(window.db.items.importImage).toHaveBeenNthCalledWith(2, {
      fileName: 'sunblade-original.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([4, 5, 6]),
    });
    expect(window.db.items.add).toHaveBeenCalledWith({
      world_id: 9,
      name: 'Sunblade',
      description: 'Ancient radiant sword',
      image_src: 'vv-media://item-images/new.png',
      original_image_src: 'vv-media://item-images/new.png',
      image_crop:
        '{"version":1,"aspect_ratio":2,"selection":{"x":0,"y":0,"width":320,"height":160},"transform":{"matrix":[1,0,0,1,0,0]},"source":{"natural_width":640,"natural_height":320},"output":{"mime_type":"image/png"}}',
    });
    expect(reloadItems).toHaveBeenCalledTimes(1);
    expect(onCreateSaved).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Item created.', '"Sunblade" was added.');
  });

  it('updates with imported image and reports update errors', async () => {
    const editingItem = buildItem({ id: 12, world_id: 9, name: 'Old Relic' });
    const reloadItems = vi.fn().mockResolvedValue(undefined);
    const onUpdateSaved = vi.fn();
    const toast = createToastMock();
    (window.db.items.importImage as ReturnType<typeof vi.fn>).mockResolvedValue({
      image_src: 'vv-media://item-images/replaced.png',
    });

    const { result, rerender } = renderHook(
      ({ currentEditingItem }) =>
        useItemCrud({
          worldId: 9,
          editingItem: currentEditingItem,
          pendingDeleteItem: null,
          reloadItems,
          toast,
          onCreateSaved: vi.fn(),
          onUpdateSaved,
          onDeleteSettled: vi.fn(),
        }),
      { initialProps: { currentEditingItem: editingItem } },
    );

    await act(async () => {
      await result.current.handleUpdate({
        name: 'Old Relic',
        description: 'Restored',
        image_edit_draft: createImageEditDraft({
          cropped_upload: {
            fileName: 'replaced.png',
            mimeType: 'image/png',
            bytes: new Uint8Array([3, 2, 1]),
          },
          source_image_src: 'vv-media://item-images/original.png',
        }),
      });
    });

    expect(window.db.items.importImage).toHaveBeenCalledWith({
      fileName: 'replaced.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([3, 2, 1]),
    });
    expect(window.db.items.update).toHaveBeenCalledWith(12, {
      name: 'Old Relic',
      description: 'Restored',
      image_src: 'vv-media://item-images/replaced.png',
      original_image_src: 'vv-media://item-images/original.png',
      image_crop:
        '{"version":1,"aspect_ratio":2,"selection":{"x":0,"y":0,"width":320,"height":160},"transform":{"matrix":[1,0,0,1,0,0]},"source":{"natural_width":640,"natural_height":320},"output":{"mime_type":"image/png"}}',
    });
    expect(onUpdateSaved).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Item updated.', '"Old Relic" was saved.');

    rerender({ currentEditingItem: null });
    await act(async () => {
      await result.current.handleUpdate({ name: 'Ignored' });
    });
    expect(window.db.items.update).toHaveBeenCalledTimes(1);

    (window.db.items.update as ReturnType<typeof vi.fn>).mockRejectedValueOnce('boom');
    rerender({ currentEditingItem: editingItem });
    await act(async () => {
      await result.current.handleUpdate({
        name: 'Old Relic',
        description: null,
        clear_image: true,
      });
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to update item.', 'Please try again.');
  });

  it('deletes pending item and settles delete state on success and failure', async () => {
    const pendingDeleteItem = buildItem({ id: 3, name: 'Fog Charm' });
    const reloadItems = vi.fn().mockResolvedValue(undefined);
    const onDeleteSettled = vi.fn();
    const toast = createToastMock();

    const { result, rerender } = renderHook(
      ({ currentPendingDelete }) =>
        useItemCrud({
          worldId: 5,
          editingItem: null,
          pendingDeleteItem: currentPendingDelete,
          reloadItems,
          toast,
          onCreateSaved: vi.fn(),
          onUpdateSaved: vi.fn(),
          onDeleteSettled,
        }),
      { initialProps: { currentPendingDelete: pendingDeleteItem as Item | null } },
    );

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(window.db.items.delete).toHaveBeenCalledWith(3);
    expect(reloadItems).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Item deleted.', '"Fog Charm" was removed.');
    expect(result.current.deletingItemId).toBeNull();
    expect(onDeleteSettled).toHaveBeenCalledTimes(1);

    rerender({ currentPendingDelete: null });
    await act(async () => {
      await result.current.handleDelete();
    });
    expect(window.db.items.delete).toHaveBeenCalledTimes(1);

    (window.db.items.delete as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('cannot delete'),
    );
    rerender({ currentPendingDelete: pendingDeleteItem });
    await act(async () => {
      await result.current.handleDelete();
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to delete item.', 'cannot delete');
    expect(result.current.deletingItemId).toBeNull();
  });
});
