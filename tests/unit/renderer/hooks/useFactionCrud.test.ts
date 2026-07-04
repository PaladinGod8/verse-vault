import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFactionCrud } from '../../../../src/renderer/hooks/useFactionCrud';
import type { ImageEditDraft } from '../../../../src/renderer/lib/imageCrop';
import { buildFaction, resetFactoryIds } from '../../../helpers/factories';
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
      fileName: 'tribunal.png',
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

describe('useFactionCrud', () => {
  beforeEach(() => {
    resetFactoryIds();
    setupWindowDb();
    resetWindowDb();
  });

  it('no-ops create when worldId is null', async () => {
    const reloadFactions = vi.fn();
    const toast = createToastMock();
    const { result } = renderHook(() =>
      useFactionCrud({
        worldId: null,
        editingFaction: null,
        pendingDeleteFaction: null,
        reloadFactions,
        toast,
        onCreateSaved: vi.fn(),
        onUpdateSaved: vi.fn(),
        onDeleteSettled: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleCreate({
        name: 'Tribunal',
        sections: {},
        wiki_summary: {},
        type_id: null,
        parent_faction_id: null,
        members: [],
      });
    });

    expect(window.db.factions.add).not.toHaveBeenCalled();
    expect(window.db.factionMembers.setForFaction).not.toHaveBeenCalled();
    expect(reloadFactions).not.toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);
  });

  it('creates with imported image, members, and success toast', async () => {
    const reloadFactions = vi.fn().mockResolvedValue(undefined);
    const onCreateSaved = vi.fn();
    const toast = createToastMock();
    (window.db.factions.importImage as ReturnType<typeof vi.fn>).mockResolvedValue({
      image_src: 'vv-media://faction-images/new.png',
    });
    (window.db.factions.add as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 42,
    } as Faction);

    const { result } = renderHook(() =>
      useFactionCrud({
        worldId: 9,
        editingFaction: null,
        pendingDeleteFaction: null,
        reloadFactions,
        toast,
        onCreateSaved,
        onUpdateSaved: vi.fn(),
        onDeleteSettled: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleCreate({
        name: 'Tribunal',
        profile: 'Ruling council',
        image_edit_draft: createImageEditDraft({
          original_upload: {
            fileName: 'tribunal-original.png',
            mimeType: 'image/png',
            bytes: new Uint8Array([4, 5, 6]),
          },
        }),
        sections: { notes: 'Watchful' },
        wiki_summary: { aliases: ['Inner Circle'] },
        type_id: 7,
        parent_faction_id: 3,
        members: [{ character_id: 11, role: 'Speaker' }],
      });
    });

    expect(window.db.factions.importImage).toHaveBeenNthCalledWith(1, {
      fileName: 'tribunal.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([1, 2, 3]),
    });
    expect(window.db.factions.importImage).toHaveBeenNthCalledWith(2, {
      fileName: 'tribunal-original.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([4, 5, 6]),
    });
    expect(window.db.factions.add).toHaveBeenCalledWith({
      world_id: 9,
      name: 'Tribunal',
      profile: 'Ruling council',
      image_src: 'vv-media://faction-images/new.png',
      original_image_src: 'vv-media://faction-images/new.png',
      image_crop:
        '{"version":1,"aspect_ratio":2,"selection":{"x":0,"y":0,"width":320,"height":160},"transform":{"matrix":[1,0,0,1,0,0]},"source":{"natural_width":640,"natural_height":320},"output":{"mime_type":"image/png"}}',
      sections: '{"notes":"Watchful"}',
      wiki_summary: '{"aliases":["Inner Circle"]}',
      type_id: 7,
      parent_faction_id: 3,
    });
    expect(window.db.factionMembers.setForFaction).toHaveBeenCalledWith(42, [
      { character_id: 11, role: 'Speaker' },
    ]);
    expect(reloadFactions).toHaveBeenCalledTimes(1);
    expect(onCreateSaved).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Faction created.', '"Tribunal" was added.');
  });

  it('updates with imported image and reports update errors', async () => {
    const editingFaction = buildFaction({ id: 12, world_id: 9, name: 'Tribunal' });
    const reloadFactions = vi.fn().mockResolvedValue(undefined);
    const onUpdateSaved = vi.fn();
    const toast = createToastMock();
    (window.db.factions.importImage as ReturnType<typeof vi.fn>).mockResolvedValue({
      image_src: 'vv-media://faction-images/replaced.png',
    });

    const { result, rerender } = renderHook(
      ({ currentEditingFaction }) =>
        useFactionCrud({
          worldId: 9,
          editingFaction: currentEditingFaction,
          pendingDeleteFaction: null,
          reloadFactions,
          toast,
          onCreateSaved: vi.fn(),
          onUpdateSaved,
          onDeleteSettled: vi.fn(),
        }),
      { initialProps: { currentEditingFaction: editingFaction } },
    );

    await act(async () => {
      await result.current.handleUpdate({
        name: 'Tribunal',
        profile: 'Reformed',
        image_edit_draft: createImageEditDraft({
          cropped_upload: {
            fileName: 'replaced.png',
            mimeType: 'image/png',
            bytes: new Uint8Array([3, 2, 1]),
          },
          source_image_src: 'vv-media://faction-images/original.png',
        }),
        sections: { notes: 'Rebuilt' },
        wiki_summary: { aliases: ['New Circle'] },
        type_id: 5,
        parent_faction_id: 2,
        members: [{ character_id: 8, role: 'Steward' }],
      });
    });

    expect(window.db.factions.importImage).toHaveBeenCalledWith({
      fileName: 'replaced.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([3, 2, 1]),
    });
    expect(window.db.factions.update).toHaveBeenCalledWith(12, {
      name: 'Tribunal',
      profile: 'Reformed',
      image_src: 'vv-media://faction-images/replaced.png',
      original_image_src: 'vv-media://faction-images/original.png',
      image_crop:
        '{"version":1,"aspect_ratio":2,"selection":{"x":0,"y":0,"width":320,"height":160},"transform":{"matrix":[1,0,0,1,0,0]},"source":{"natural_width":640,"natural_height":320},"output":{"mime_type":"image/png"}}',
      sections: '{"notes":"Rebuilt"}',
      wiki_summary: '{"aliases":["New Circle"]}',
      type_id: 5,
      parent_faction_id: 2,
    });
    expect(window.db.factionMembers.setForFaction).toHaveBeenCalledWith(12, [
      { character_id: 8, role: 'Steward' },
    ]);
    expect(onUpdateSaved).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Faction updated.', '"Tribunal" was saved.');

    rerender({ currentEditingFaction: null });
    await act(async () => {
      await result.current.handleUpdate({
        name: 'Ignored',
        sections: {},
        wiki_summary: {},
        type_id: null,
        parent_faction_id: null,
        members: [],
      });
    });
    expect(window.db.factions.update).toHaveBeenCalledTimes(1);

    (window.db.factions.update as ReturnType<typeof vi.fn>).mockRejectedValueOnce('boom');
    rerender({ currentEditingFaction: editingFaction });
    await act(async () => {
      await result.current.handleUpdate({
        name: 'Tribunal',
        profile: null,
        clear_image: true,
        sections: {},
        wiki_summary: {},
        type_id: null,
        parent_faction_id: null,
        members: [],
      });
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to update faction.', 'Please try again.');
  });

  it('deletes pending faction and settles delete state on success and failure', async () => {
    const pendingDeleteFaction = buildFaction({ id: 3, name: 'Tribunal' });
    const reloadFactions = vi.fn().mockResolvedValue(undefined);
    const onDeleteSettled = vi.fn();
    const toast = createToastMock();

    const { result, rerender } = renderHook(
      ({ currentPendingDelete }) =>
        useFactionCrud({
          worldId: 5,
          editingFaction: null,
          pendingDeleteFaction: currentPendingDelete,
          reloadFactions,
          toast,
          onCreateSaved: vi.fn(),
          onUpdateSaved: vi.fn(),
          onDeleteSettled,
        }),
      { initialProps: { currentPendingDelete: pendingDeleteFaction as Faction | null } },
    );

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(window.db.factions.delete).toHaveBeenCalledWith(3);
    expect(reloadFactions).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Faction deleted.', '"Tribunal" was removed.');
    expect(result.current.deletingFactionId).toBeNull();
    expect(onDeleteSettled).toHaveBeenCalledTimes(1);

    rerender({ currentPendingDelete: null });
    await act(async () => {
      await result.current.handleDelete();
    });
    expect(window.db.factions.delete).toHaveBeenCalledTimes(1);

    (window.db.factions.delete as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('cannot delete'),
    );
    rerender({ currentPendingDelete: pendingDeleteFaction });
    await act(async () => {
      await result.current.handleDelete();
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to delete faction.', 'cannot delete');
    expect(result.current.deletingFactionId).toBeNull();
  });
});
