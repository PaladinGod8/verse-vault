import { useState } from 'react';
import type { LoreNoteFormValues } from '../components/loreNotes/LoreNoteForm';
import { normalizeTokenImageSrc } from '../lib/tokenImageSrc';

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

async function resolveLoreNoteImageSrc(
  data: LoreNoteFormValues,
): Promise<string | null | undefined> {
  if (!data.image_upload) {
    return data.image_src;
  }

  const importResult = await window.db.loreNotes.importImage(data.image_upload);
  return normalizeTokenImageSrc(importResult.image_src);
}

function buildLoreNoteUpdatePayload(data: LoreNoteFormValues): {
  name: string;
  content: string | null;
  tags: string[];
  image_src?: string | null;
} {
  const updatePayload: {
    name: string;
    content: string | null;
    tags: string[];
    image_src?: string | null;
  } = {
    name: data.name,
    content: data.content ?? null,
    tags: data.tags,
  };

  if (data.clear_image) {
    updatePayload.image_src = null;
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
      const imageSrc = await resolveLoreNoteImageSrc(data);
      await window.db.loreNotes.add({
        world_id: params.worldId,
        name: data.name,
        content: data.content ?? null,
        tags: data.tags,
        image_src: imageSrc,
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
      if (data.image_upload) {
        updatePayload.image_src = await resolveLoreNoteImageSrc(data);
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
