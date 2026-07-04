import { useState } from 'react';
import type { BackgroundFormValues } from '../components/backgrounds/BackgroundForm';
import { persistImageEditDraft } from '../lib/imageCrop';

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

function buildBackgroundUpdatePayload(data: BackgroundFormValues): {
  name: string;
  description: string | null;
  image_src?: string | null;
  original_image_src?: string | null;
  image_crop?: string | null;
} {
  const updatePayload: {
    name: string;
    description: string | null;
    image_src?: string | null;
    original_image_src?: string | null;
    image_crop?: string | null;
  } = {
    name: data.name,
    description: data.description ?? null,
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
      const persistedImage = data.image_edit_draft
        ? await persistImageEditDraft({
          draft: data.image_edit_draft,
          importImage: window.db.backgrounds.importImage,
        })
        : null;
      await window.db.backgrounds.add({
        world_id: params.worldId,
        name: data.name,
        description: data.description ?? null,
        image_src: persistedImage?.imageSrc ?? data.image_src,
        original_image_src: persistedImage?.originalImageSrc,
        image_crop: persistedImage?.imageCrop,
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
      if (data.image_edit_draft) {
        const persistedImage = await persistImageEditDraft({
          draft: data.image_edit_draft,
          currentOriginalImageSrc: params.editingBackground.original_image_src ?? null,
          importImage: window.db.backgrounds.importImage,
        });
        updatePayload.image_src = persistedImage.imageSrc;
        updatePayload.original_image_src = persistedImage.originalImageSrc;
        updatePayload.image_crop = persistedImage.imageCrop;
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
