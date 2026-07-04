import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCharacterCrud } from '../../../../src/renderer/hooks/useCharacterCrud';
import type { ImageEditDraft } from '../../../../src/renderer/lib/imageCrop';
import { buildCharacter, resetFactoryIds } from '../../../helpers/factories';
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
      fileName: 'ledros.png',
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

describe('useCharacterCrud', () => {
  beforeEach(() => {
    resetFactoryIds();
    setupWindowDb();
    resetWindowDb();
  });

  it('no-ops create when worldId is null', async () => {
    const reloadCharacters = vi.fn();
    const toast = createToastMock();
    const { result } = renderHook(() =>
      useCharacterCrud({
        worldId: null,
        editingCharacter: null,
        pendingDeleteCharacter: null,
        reloadCharacters,
        toast,
        onCreateSaved: vi.fn(),
        onUpdateSaved: vi.fn(),
        onDeleteSettled: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleCreate({
        name: 'Ledros',
        is_player_character: 0,
        sections: {},
        wiki_summary: {},
      });
    });

    expect(window.db.characters.add).not.toHaveBeenCalled();
    expect(reloadCharacters).not.toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);
  });

  it('creates with imported image and success toast', async () => {
    const reloadCharacters = vi.fn().mockResolvedValue(undefined);
    const onCreateSaved = vi.fn();
    const toast = createToastMock();
    (window.db.characters.importImage as ReturnType<typeof vi.fn>).mockResolvedValue({
      image_src: 'vv-media://character-images/new.png',
    });

    const { result } = renderHook(() =>
      useCharacterCrud({
        worldId: 9,
        editingCharacter: null,
        pendingDeleteCharacter: null,
        reloadCharacters,
        toast,
        onCreateSaved,
        onUpdateSaved: vi.fn(),
        onDeleteSettled: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleCreate({
        name: 'Ledros',
        profile: 'Dragonborn exile',
        is_player_character: 1,
        owner: 'Gator',
        author: 'GM',
        image_edit_draft: createImageEditDraft({
          original_upload: {
            fileName: 'ledros-original.png',
            mimeType: 'image/png',
            bytes: new Uint8Array([4, 5, 6]),
          },
        }),
        sections: { background: 'Outcast' },
        wiki_summary: { statusDemographics: { status: 'Active' } },
      });
    });

    expect(window.db.characters.importImage).toHaveBeenNthCalledWith(1, {
      fileName: 'ledros.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([1, 2, 3]),
    });
    expect(window.db.characters.importImage).toHaveBeenNthCalledWith(2, {
      fileName: 'ledros-original.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([4, 5, 6]),
    });
    expect(window.db.characters.add).toHaveBeenCalledWith({
      world_id: 9,
      name: 'Ledros',
      profile: 'Dragonborn exile',
      is_player_character: 1,
      owner: 'Gator',
      author: 'GM',
      image_src: 'vv-media://character-images/new.png',
      original_image_src: 'vv-media://character-images/new.png',
      image_crop:
        '{"version":1,"aspect_ratio":2,"selection":{"x":0,"y":0,"width":320,"height":160},"transform":{"matrix":[1,0,0,1,0,0]},"source":{"natural_width":640,"natural_height":320},"output":{"mime_type":"image/png"}}',
      sections: '{"background":"Outcast"}',
      wiki_summary: '{"statusDemographics":{"status":"Active"}}',
    });
    expect(reloadCharacters).toHaveBeenCalledTimes(1);
    expect(onCreateSaved).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Character created.', '"Ledros" was added.');
  });

  it('updates with imported image and reports update errors', async () => {
    const editingCharacter = buildCharacter({ id: 12, world_id: 9, name: 'Ledros' });
    const reloadCharacters = vi.fn().mockResolvedValue(undefined);
    const onUpdateSaved = vi.fn();
    const toast = createToastMock();
    (window.db.characters.importImage as ReturnType<typeof vi.fn>).mockResolvedValue({
      image_src: 'vv-media://character-images/replaced.png',
    });

    const { result, rerender } = renderHook(
      ({ currentEditingCharacter }) =>
        useCharacterCrud({
          worldId: 9,
          editingCharacter: currentEditingCharacter,
          pendingDeleteCharacter: null,
          reloadCharacters,
          toast,
          onCreateSaved: vi.fn(),
          onUpdateSaved,
          onDeleteSettled: vi.fn(),
        }),
      { initialProps: { currentEditingCharacter: editingCharacter } },
    );

    await act(async () => {
      await result.current.handleUpdate({
        name: 'Ledros',
        profile: 'Restored',
        is_player_character: 0,
        owner: null,
        author: 'GM',
        image_edit_draft: createImageEditDraft({
          cropped_upload: {
            fileName: 'replaced.png',
            mimeType: 'image/png',
            bytes: new Uint8Array([3, 2, 1]),
          },
          source_image_src: 'vv-media://character-images/original.png',
        }),
        sections: { notes: 'Recovered' },
        wiki_summary: { biographic: { mainEpithet: 'Brandslayer' } },
      });
    });

    expect(window.db.characters.importImage).toHaveBeenCalledWith({
      fileName: 'replaced.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([3, 2, 1]),
    });
    expect(window.db.characters.update).toHaveBeenCalledWith(12, {
      name: 'Ledros',
      profile: 'Restored',
      is_player_character: 0,
      owner: null,
      author: 'GM',
      image_src: 'vv-media://character-images/replaced.png',
      original_image_src: 'vv-media://character-images/original.png',
      image_crop:
        '{"version":1,"aspect_ratio":2,"selection":{"x":0,"y":0,"width":320,"height":160},"transform":{"matrix":[1,0,0,1,0,0]},"source":{"natural_width":640,"natural_height":320},"output":{"mime_type":"image/png"}}',
      sections: '{"notes":"Recovered"}',
      wiki_summary: '{"biographic":{"mainEpithet":"Brandslayer"}}',
    });
    expect(onUpdateSaved).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Character updated.', '"Ledros" was saved.');

    rerender({ currentEditingCharacter: null });
    await act(async () => {
      await result.current.handleUpdate({
        name: 'Ignored',
        is_player_character: 0,
        sections: {},
        wiki_summary: {},
      });
    });
    expect(window.db.characters.update).toHaveBeenCalledTimes(1);

    (window.db.characters.update as ReturnType<typeof vi.fn>).mockRejectedValueOnce('boom');
    rerender({ currentEditingCharacter: editingCharacter });
    await act(async () => {
      await result.current.handleUpdate({
        name: 'Ledros',
        profile: null,
        is_player_character: 0,
        owner: null,
        author: null,
        clear_image: true,
        sections: {},
        wiki_summary: {},
      });
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to update character.',
      'Please try again.',
    );
  });

  it('deletes pending character and settles delete state on success and failure', async () => {
    const pendingDeleteCharacter = buildCharacter({ id: 3, name: 'Ledros' });
    const reloadCharacters = vi.fn().mockResolvedValue(undefined);
    const onDeleteSettled = vi.fn();
    const toast = createToastMock();

    const { result, rerender } = renderHook(
      ({ currentPendingDelete }) =>
        useCharacterCrud({
          worldId: 5,
          editingCharacter: null,
          pendingDeleteCharacter: currentPendingDelete,
          reloadCharacters,
          toast,
          onCreateSaved: vi.fn(),
          onUpdateSaved: vi.fn(),
          onDeleteSettled,
        }),
      { initialProps: { currentPendingDelete: pendingDeleteCharacter as Character | null } },
    );

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(window.db.characters.delete).toHaveBeenCalledWith(3);
    expect(reloadCharacters).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Character deleted.', '"Ledros" was removed.');
    expect(result.current.deletingCharacterId).toBeNull();
    expect(onDeleteSettled).toHaveBeenCalledTimes(1);

    rerender({ currentPendingDelete: null });
    await act(async () => {
      await result.current.handleDelete();
    });
    expect(window.db.characters.delete).toHaveBeenCalledTimes(1);

    (window.db.characters.delete as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('cannot delete'),
    );
    rerender({ currentPendingDelete: pendingDeleteCharacter });
    await act(async () => {
      await result.current.handleDelete();
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to delete character.',
      'cannot delete',
    );
    expect(result.current.deletingCharacterId).toBeNull();
  });
});
