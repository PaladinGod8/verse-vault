import { useState } from 'react';
import type { ItemFormValues } from '../components/items/ItemForm';
import { persistImageEditDraft } from '../lib/imageCrop';

type ItemMutationToast = {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

type UseItemCrudParams = {
  worldId: number | null;
  editingItem: Item | null;
  pendingDeleteItem: Item | null;
  reloadItems: () => Promise<void>;
  toast: ItemMutationToast;
  onCreateSaved: () => void;
  onUpdateSaved: () => void;
  onDeleteSettled: () => void;
};

type SavingSetter = React.Dispatch<React.SetStateAction<boolean>>;
type DeletingIdSetter = React.Dispatch<React.SetStateAction<number | null>>;

function toItemErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Please try again.';
}

function buildItemUpdatePayload(data: ItemFormValues): {
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
  reloadItems: () => Promise<void>;
  toast: ItemMutationToast;
  onCreateSaved: () => void;
  setIsSaving: SavingSetter;
}) {
  return async (data: ItemFormValues) => {
    if (params.worldId === null) {
      return;
    }

    params.setIsSaving(true);
    try {
      const persistedImage = data.image_edit_draft
        ? await persistImageEditDraft({
          draft: data.image_edit_draft,
          importImage: window.db.items.importImage,
        })
        : null;
      await window.db.items.add({
        world_id: params.worldId,
        name: data.name,
        description: data.description ?? null,
        image_src: persistedImage?.imageSrc ?? data.image_src,
        original_image_src: persistedImage?.originalImageSrc,
        image_crop: persistedImage?.imageCrop,
      });
      await params.reloadItems();
      params.onCreateSaved();
      params.toast.success('Item created.', `"${data.name}" was added.`);
    } catch (error) {
      params.toast.error('Failed to create item.', toItemErrorMessage(error));
    } finally {
      params.setIsSaving(false);
    }
  };
}

function createHandleUpdate(params: {
  editingItem: Item | null;
  reloadItems: () => Promise<void>;
  toast: ItemMutationToast;
  onUpdateSaved: () => void;
  setIsSaving: SavingSetter;
}) {
  return async (data: ItemFormValues) => {
    if (!params.editingItem) {
      return;
    }

    params.setIsSaving(true);
    try {
      const updatePayload = buildItemUpdatePayload(data);
      if (data.image_edit_draft) {
        const persistedImage = await persistImageEditDraft({
          draft: data.image_edit_draft,
          currentOriginalImageSrc: params.editingItem.original_image_src ?? null,
          importImage: window.db.items.importImage,
        });
        updatePayload.image_src = persistedImage.imageSrc;
        updatePayload.original_image_src = persistedImage.originalImageSrc;
        updatePayload.image_crop = persistedImage.imageCrop;
      }

      await window.db.items.update(params.editingItem.id, updatePayload);
      await params.reloadItems();
      params.onUpdateSaved();
      params.toast.success('Item updated.', `"${data.name}" was saved.`);
    } catch (error) {
      params.toast.error('Failed to update item.', toItemErrorMessage(error));
    } finally {
      params.setIsSaving(false);
    }
  };
}

function createHandleDelete(params: {
  pendingDeleteItem: Item | null;
  reloadItems: () => Promise<void>;
  toast: ItemMutationToast;
  onDeleteSettled: () => void;
  setDeletingItemId: DeletingIdSetter;
}) {
  return async () => {
    if (!params.pendingDeleteItem) {
      return;
    }

    const item = params.pendingDeleteItem;
    params.setDeletingItemId(item.id);
    try {
      await window.db.items.delete(item.id);
      await params.reloadItems();
      params.toast.success('Item deleted.', `"${item.name}" was removed.`);
    } catch (error) {
      params.toast.error('Failed to delete item.', toItemErrorMessage(error));
    } finally {
      params.setDeletingItemId((current) => current === item.id ? null : current);
      params.onDeleteSettled();
    }
  };
}

export function useItemCrud({
  worldId,
  editingItem,
  pendingDeleteItem,
  reloadItems,
  toast,
  onCreateSaved,
  onUpdateSaved,
  onDeleteSettled,
}: UseItemCrudParams) {
  const [isSaving, setIsSaving] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const handleCreate = createHandleCreate({
    worldId,
    reloadItems,
    toast,
    onCreateSaved,
    setIsSaving,
  });
  const handleUpdate = createHandleUpdate({
    editingItem,
    reloadItems,
    toast,
    onUpdateSaved,
    setIsSaving,
  });
  const handleDelete = createHandleDelete({
    pendingDeleteItem,
    reloadItems,
    toast,
    onDeleteSettled,
    setDeletingItemId,
  });

  return {
    isSaving,
    deletingItemId,
    handleCreate,
    handleUpdate,
    handleDelete,
  };
}
