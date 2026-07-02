import { useState } from 'react';
import type { BackgroundFormValues } from '../components/backgrounds/BackgroundForm';
import { normalizeTokenImageSrc } from '../lib/tokenImageSrc';

type BackgroundMutationToast = {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

type UseBackgroundCrudParams = {
  worldId: number | null;
  editingBackground: Background | null;
  pendingDeleteBackground: Background | null;
  reloadBackgrounds: () => Promise<void>;
  toast: BackgroundMutationToast;
  onCreateSaved: () => void;
  onUpdateSaved: () => void;
  onDeleteSettled: () => void;
};

type SavingSetter = React.Dispatch<React.SetStateAction<boolean>>;
type DeletingIdSetter = React.Dispatch<React.SetStateAction<number | null>>;

function toBackgroundErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Please try again.';
}

async function resolveBackgroundImageSrc(
  data: BackgroundFormValues,
): Promise<string | null | undefined> {
  if (!data.image_upload) {
    return data.image_src;
  }

  const importResult = await window.db.backgrounds.importImage(data.image_upload);
  return normalizeTokenImageSrc(importResult.image_src);
}

function buildBackgroundUpdatePayload(data: BackgroundFormValues): {
  name: string;
  description: string | null;
  image_src?: string | null;
} {
  const updatePayload: {
    name: string;
    description: string | null;
    image_src?: string | null;
  } = {
    name: data.name,
    description: data.description ?? null,
  };

  if (data.clear_image) {
    updatePayload.image_src = null;
  }

  return updatePayload;
}

function createHandleCreate(params: {
  worldId: number | null;
  reloadBackgrounds: () => Promise<void>;
  toast: BackgroundMutationToast;
  onCreateSaved: () => void;
  setIsSaving: SavingSetter;
}) {
  return async (data: BackgroundFormValues) => {
    if (params.worldId === null) {
      return;
    }

    params.setIsSaving(true);
    try {
      const imageSrc = await resolveBackgroundImageSrc(data);
      await window.db.backgrounds.add({
        world_id: params.worldId,
        name: data.name,
        description: data.description ?? null,
        image_src: imageSrc,
      });
      await params.reloadBackgrounds();
      params.onCreateSaved();
      params.toast.success('Background created.', `"${data.name}" was added.`);
    } catch (error) {
      params.toast.error('Failed to create background.', toBackgroundErrorMessage(error));
    } finally {
      params.setIsSaving(false);
    }
  };
}

function createHandleUpdate(params: {
  editingBackground: Background | null;
  reloadBackgrounds: () => Promise<void>;
  toast: BackgroundMutationToast;
  onUpdateSaved: () => void;
  setIsSaving: SavingSetter;
}) {
  return async (data: BackgroundFormValues) => {
    if (!params.editingBackground) {
      return;
    }

    params.setIsSaving(true);
    try {
      const updatePayload = buildBackgroundUpdatePayload(data);
      if (data.image_upload) {
        updatePayload.image_src = await resolveBackgroundImageSrc(data);
      }

      await window.db.backgrounds.update(params.editingBackground.id, updatePayload);
      await params.reloadBackgrounds();
      params.onUpdateSaved();
      params.toast.success('Background updated.', `"${data.name}" was saved.`);
    } catch (error) {
      params.toast.error('Failed to update background.', toBackgroundErrorMessage(error));
    } finally {
      params.setIsSaving(false);
    }
  };
}

function createHandleDelete(params: {
  pendingDeleteBackground: Background | null;
  reloadBackgrounds: () => Promise<void>;
  toast: BackgroundMutationToast;
  onDeleteSettled: () => void;
  setDeletingBackgroundId: DeletingIdSetter;
}) {
  return async () => {
    if (!params.pendingDeleteBackground) {
      return;
    }

    const background = params.pendingDeleteBackground;
    params.setDeletingBackgroundId(background.id);
    try {
      await window.db.backgrounds.delete(background.id);
      await params.reloadBackgrounds();
      params.toast.success('Background deleted.', `"${background.name}" was removed.`);
    } catch (error) {
      params.toast.error('Failed to delete background.', toBackgroundErrorMessage(error));
    } finally {
      params.setDeletingBackgroundId((current) => current === background.id ? null : current);
      params.onDeleteSettled();
    }
  };
}

export function useBackgroundCrud({
  worldId,
  editingBackground,
  pendingDeleteBackground,
  reloadBackgrounds,
  toast,
  onCreateSaved,
  onUpdateSaved,
  onDeleteSettled,
}: UseBackgroundCrudParams) {
  const [isSaving, setIsSaving] = useState(false);
  const [deletingBackgroundId, setDeletingBackgroundId] = useState<number | null>(null);
  const handleCreate = createHandleCreate({
    worldId,
    reloadBackgrounds,
    toast,
    onCreateSaved,
    setIsSaving,
  });
  const handleUpdate = createHandleUpdate({
    editingBackground,
    reloadBackgrounds,
    toast,
    onUpdateSaved,
    setIsSaving,
  });
  const handleDelete = createHandleDelete({
    pendingDeleteBackground,
    reloadBackgrounds,
    toast,
    onDeleteSettled,
    setDeletingBackgroundId,
  });

  return {
    isSaving,
    deletingBackgroundId,
    handleCreate,
    handleUpdate,
    handleDelete,
  };
}
