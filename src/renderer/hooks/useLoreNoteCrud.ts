import { useState } from 'react';
import type { LoreNoteFormValues } from '../components/loreNotes/LoreNoteForm';
import { persistImageEditDraft } from '../lib/imageCrop';

type LoreNoteMutationToast = {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

type UseLoreNoteCrudParams = {
  worldId: number | null;
  editingLoreNote: LoreNote | null;
  pendingDeleteLoreNote: LoreNote | null;
  reloadLoreNotes: () => Promise<void>;
  toast: LoreNoteMutationToast;
  onCreateSaved: () => void;
  onUpdateSaved: () => void;
  onDeleteSettled: () => void;
};

type SavingSetter = React.Dispatch<React.SetStateAction<boolean>>;
type DeletingIdSetter = React.Dispatch<React.SetStateAction<number | null>>;

function toLoreNoteErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Please try again.';
}

function buildLoreNoteUpdatePayload(data: LoreNoteFormValues): {
  name: string;
  content: string | null;
  canvas_enabled: boolean;
  tags: string[];
  image_src?: string | null;
  original_image_src?: string | null;
  image_crop?: string | null;
} {
  const updatePayload: {
    name: string;
    content: string | null;
    canvas_enabled: boolean;
    tags: string[];
    image_src?: string | null;
    original_image_src?: string | null;
    image_crop?: string | null;
  } = {
    name: data.name,
    content: data.content ?? null,
    canvas_enabled: data.canvas_enabled,
    tags: data.tags,
  };

  if (data.clear_image) {
    updatePayload.image_src = null;
    updatePayload.original_image_src = null;
    updatePayload.image_crop = null;
  }

  return updatePayload;
}

function createHandleCreate(params: {
  worldId: number | null;
  reloadLoreNotes: () => Promise<void>;
  toast: LoreNoteMutationToast;
  onCreateSaved: () => void;
  setIsSaving: SavingSetter;
}) {
  return async (data: LoreNoteFormValues) => {
    if (params.worldId === null) {
      return;
    }

    params.setIsSaving(true);
    try {
      const persistedImage = data.image_edit_draft
        ? await persistImageEditDraft({
          draft: data.image_edit_draft,
          importImage: window.db.loreNotes.importImage,
        })
        : null;
      await window.db.loreNotes.add({
        world_id: params.worldId,
        name: data.name,
        content: data.content ?? null,
        canvas_enabled: data.canvas_enabled,
        canvas_scene: null,
        canvas_preview_image: null,
        tags: data.tags,
        image_src: persistedImage?.imageSrc ?? data.image_src,
        original_image_src: persistedImage?.originalImageSrc,
        image_crop: persistedImage?.imageCrop,
      });
      await params.reloadLoreNotes();
      params.onCreateSaved();
      params.toast.success('Lore note created.', `"${data.name}" was added.`);
    } catch (error) {
      params.toast.error('Failed to create lore note.', toLoreNoteErrorMessage(error));
    } finally {
      params.setIsSaving(false);
    }
  };
}

function createHandleUpdate(params: {
  editingLoreNote: LoreNote | null;
  reloadLoreNotes: () => Promise<void>;
  toast: LoreNoteMutationToast;
  onUpdateSaved: () => void;
  setIsSaving: SavingSetter;
}) {
  return async (data: LoreNoteFormValues) => {
    if (!params.editingLoreNote) {
      return;
    }

    params.setIsSaving(true);
    try {
      const updatePayload = buildLoreNoteUpdatePayload(data);
      if (data.image_edit_draft) {
        const persistedImage = await persistImageEditDraft({
          draft: data.image_edit_draft,
          currentOriginalImageSrc: params.editingLoreNote.original_image_src ?? null,
          importImage: window.db.loreNotes.importImage,
        });
        updatePayload.image_src = persistedImage.imageSrc;
        updatePayload.original_image_src = persistedImage.originalImageSrc;
        updatePayload.image_crop = persistedImage.imageCrop;
      }

      await window.db.loreNotes.update(params.editingLoreNote.id, updatePayload);
      await params.reloadLoreNotes();
      params.onUpdateSaved();
      params.toast.success('Lore note updated.', `"${data.name}" was saved.`);
    } catch (error) {
      params.toast.error('Failed to update lore note.', toLoreNoteErrorMessage(error));
    } finally {
      params.setIsSaving(false);
    }
  };
}

function createHandleDelete(params: {
  pendingDeleteLoreNote: LoreNote | null;
  reloadLoreNotes: () => Promise<void>;
  toast: LoreNoteMutationToast;
  onDeleteSettled: () => void;
  setDeletingLoreNoteId: DeletingIdSetter;
}) {
  return async () => {
    if (!params.pendingDeleteLoreNote) {
      return;
    }

    const loreNote = params.pendingDeleteLoreNote;
    params.setDeletingLoreNoteId(loreNote.id);
    try {
      await window.db.loreNotes.delete(loreNote.id);
      await params.reloadLoreNotes();
      params.toast.success('Lore note deleted.', `"${loreNote.name}" was removed.`);
    } catch (error) {
      params.toast.error('Failed to delete lore note.', toLoreNoteErrorMessage(error));
    } finally {
      params.setDeletingLoreNoteId((current) => current === loreNote.id ? null : current);
      params.onDeleteSettled();
    }
  };
}

export function useLoreNoteCrud({
  worldId,
  editingLoreNote,
  pendingDeleteLoreNote,
  reloadLoreNotes,
  toast,
  onCreateSaved,
  onUpdateSaved,
  onDeleteSettled,
}: UseLoreNoteCrudParams) {
  const [isSaving, setIsSaving] = useState(false);
  const [deletingLoreNoteId, setDeletingLoreNoteId] = useState<number | null>(null);
  const handleCreate = createHandleCreate({
    worldId,
    reloadLoreNotes,
    toast,
    onCreateSaved,
    setIsSaving,
  });
  const handleUpdate = createHandleUpdate({
    editingLoreNote,
    reloadLoreNotes,
    toast,
    onUpdateSaved,
    setIsSaving,
  });
  const handleDelete = createHandleDelete({
    pendingDeleteLoreNote,
    reloadLoreNotes,
    toast,
    onDeleteSettled,
    setDeletingLoreNoteId,
  });

  return {
    isSaving,
    deletingLoreNoteId,
    handleCreate,
    handleUpdate,
    handleDelete,
  };
}
