import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLoreNoteCrud } from '../../../../src/renderer/hooks/useLoreNoteCrud';
import type { ImageEditDraft } from '../../../../src/renderer/lib/imageCrop';
import { buildLoreNote, resetFactoryIds } from '../../../helpers/factories';
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
      fileName: 'myth.png',
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

describe('useLoreNoteCrud', () => {
  beforeEach(() => {
    resetFactoryIds();
    setupWindowDb();
    resetWindowDb();
  });

  it('no-ops create when worldId is null', async () => {
    const reloadLoreNotes = vi.fn();
    const toast = createToastMock();
    const { result } = renderHook(() =>
      useLoreNoteCrud({
        worldId: null,
        editingLoreNote: null,
        pendingDeleteLoreNote: null,
        reloadLoreNotes,
        toast,
        onCreateSaved: vi.fn(),
        onUpdateSaved: vi.fn(),
        onDeleteSettled: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleCreate({ name: 'Founding Myth', canvas_enabled: false, tags: [] });
    });

    expect(window.db.loreNotes.add).not.toHaveBeenCalled();
    expect(reloadLoreNotes).not.toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);
  });

  it('creates with imported image, tags, and success toast', async () => {
    const reloadLoreNotes = vi.fn().mockResolvedValue(undefined);
    const onCreateSaved = vi.fn();
    const toast = createToastMock();
    (window.db.loreNotes.importImage as ReturnType<typeof vi.fn>).mockResolvedValue({
      image_src: 'vv-media://lore-note-images/new.png',
    });

    const { result } = renderHook(() =>
      useLoreNoteCrud({
        worldId: 9,
        editingLoreNote: null,
        pendingDeleteLoreNote: null,
        reloadLoreNotes,
        toast,
        onCreateSaved,
        onUpdateSaved: vi.fn(),
        onDeleteSettled: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleCreate({
        name: 'Founding Myth',
        content: 'Long ago...',
        canvas_enabled: false,
        tags: ['Economics'],
        image_edit_draft: createImageEditDraft({
          original_upload: {
            fileName: 'myth-original.png',
            mimeType: 'image/png',
            bytes: new Uint8Array([4, 5, 6]),
          },
        }),
      });
    });

    expect(window.db.loreNotes.importImage).toHaveBeenNthCalledWith(1, {
      fileName: 'myth.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([1, 2, 3]),
    });
    expect(window.db.loreNotes.importImage).toHaveBeenNthCalledWith(2, {
      fileName: 'myth-original.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([4, 5, 6]),
    });
    expect(window.db.loreNotes.add).toHaveBeenCalledWith({
      world_id: 9,
      name: 'Founding Myth',
      content: 'Long ago...',
      canvas_enabled: false,
      canvas_scene: null,
      canvas_preview_image: null,
      tags: ['Economics'],
      image_src: 'vv-media://lore-note-images/new.png',
      original_image_src: 'vv-media://lore-note-images/new.png',
      image_crop:
        '{"version":1,"aspect_ratio":2,"selection":{"x":0,"y":0,"width":320,"height":160},"transform":{"matrix":[1,0,0,1,0,0]},"source":{"natural_width":640,"natural_height":320},"output":{"mime_type":"image/png"}}',
    });
    expect(reloadLoreNotes).toHaveBeenCalledTimes(1);
    expect(onCreateSaved).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith(
      'Lore note created.',
      '"Founding Myth" was added.',
    );
  });

  it('updates with imported image, tags, and reports update errors', async () => {
    const editingLoreNote = buildLoreNote({ id: 12, world_id: 9, name: 'Old Myth' });
    const reloadLoreNotes = vi.fn().mockResolvedValue(undefined);
    const onUpdateSaved = vi.fn();
    const toast = createToastMock();
    (window.db.loreNotes.importImage as ReturnType<typeof vi.fn>).mockResolvedValue({
      image_src: 'vv-media://lore-note-images/replaced.png',
    });

    const { result, rerender } = renderHook(
      ({ currentEditingLoreNote }) =>
        useLoreNoteCrud({
          worldId: 9,
          editingLoreNote: currentEditingLoreNote,
          pendingDeleteLoreNote: null,
          reloadLoreNotes,
          toast,
          onCreateSaved: vi.fn(),
          onUpdateSaved,
          onDeleteSettled: vi.fn(),
        }),
      { initialProps: { currentEditingLoreNote: editingLoreNote } },
    );

    await act(async () => {
      await result.current.handleUpdate({
        name: 'Old Myth',
        content: 'Restored',
        canvas_enabled: false,
        tags: ['Magic'],
        image_edit_draft: createImageEditDraft({
          cropped_upload: {
            fileName: 'replaced.png',
            mimeType: 'image/png',
            bytes: new Uint8Array([3, 2, 1]),
          },
          source_image_src: 'vv-media://lore-note-images/original.png',
        }),
      });
    });

    expect(window.db.loreNotes.importImage).toHaveBeenCalledWith({
      fileName: 'replaced.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([3, 2, 1]),
    });
    expect(window.db.loreNotes.update).toHaveBeenCalledWith(12, {
      name: 'Old Myth',
      content: 'Restored',
      canvas_enabled: false,
      tags: ['Magic'],
      image_src: 'vv-media://lore-note-images/replaced.png',
      original_image_src: 'vv-media://lore-note-images/original.png',
      image_crop:
        '{"version":1,"aspect_ratio":2,"selection":{"x":0,"y":0,"width":320,"height":160},"transform":{"matrix":[1,0,0,1,0,0]},"source":{"natural_width":640,"natural_height":320},"output":{"mime_type":"image/png"}}',
    });
    expect(onUpdateSaved).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Lore note updated.', '"Old Myth" was saved.');

    rerender({ currentEditingLoreNote: null });
    await act(async () => {
      await result.current.handleUpdate({ name: 'Ignored', canvas_enabled: false, tags: [] });
    });
    expect(window.db.loreNotes.update).toHaveBeenCalledTimes(1);

    (window.db.loreNotes.update as ReturnType<typeof vi.fn>).mockRejectedValueOnce('boom');
    rerender({ currentEditingLoreNote: editingLoreNote });
    await act(async () => {
      await result.current.handleUpdate({
        name: 'Old Myth',
        content: null,
        canvas_enabled: false,
        tags: [],
        clear_image: true,
      });
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to update lore note.', 'Please try again.');
  });

  it('deletes pending lore note and settles delete state on success and failure', async () => {
    const pendingDeleteLoreNote = buildLoreNote({ id: 3, name: 'Fog Legend' });
    const reloadLoreNotes = vi.fn().mockResolvedValue(undefined);
    const onDeleteSettled = vi.fn();
    const toast = createToastMock();

    const { result, rerender } = renderHook(
      ({ currentPendingDelete }) =>
        useLoreNoteCrud({
          worldId: 5,
          editingLoreNote: null,
          pendingDeleteLoreNote: currentPendingDelete,
          reloadLoreNotes,
          toast,
          onCreateSaved: vi.fn(),
          onUpdateSaved: vi.fn(),
          onDeleteSettled,
        }),
      { initialProps: { currentPendingDelete: pendingDeleteLoreNote as LoreNote | null } },
    );

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(window.db.loreNotes.delete).toHaveBeenCalledWith(3);
    expect(reloadLoreNotes).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Lore note deleted.', '"Fog Legend" was removed.');
    expect(result.current.deletingLoreNoteId).toBeNull();
    expect(onDeleteSettled).toHaveBeenCalledTimes(1);

    rerender({ currentPendingDelete: null });
    await act(async () => {
      await result.current.handleDelete();
    });
    expect(window.db.loreNotes.delete).toHaveBeenCalledTimes(1);

    (window.db.loreNotes.delete as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('cannot delete'),
    );
    rerender({ currentPendingDelete: pendingDeleteLoreNote });
    await act(async () => {
      await result.current.handleDelete();
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to delete lore note.', 'cannot delete');
    expect(result.current.deletingLoreNoteId).toBeNull();
  });
});
