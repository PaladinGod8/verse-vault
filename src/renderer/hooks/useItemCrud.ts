import { useState } from 'react';
import type { ItemFormValues } from '../components/items/ItemForm';
import { normalizeTokenImageSrc } from '../lib/tokenImageSrc';

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

async function resolveItemImageSrc(
  data: ItemFormValues,
): Promise<string | null | undefined> {
  if (!data.image_upload) {
    return data.image_src;
  }

  const importResult = await window.db.items.importImage(data.image_upload);
  return normalizeTokenImageSrc(importResult.image_src);
}

function buildItemUpdatePayload(data: ItemFormValues): {
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
      const imageSrc = await resolveItemImageSrc(data);
      await window.db.items.add({
        world_id: params.worldId,
        name: data.name,
        description: data.description ?? null,
        image_src: imageSrc,
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
      if (data.image_upload) {
        updatePayload.image_src = await resolveItemImageSrc(data);
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
