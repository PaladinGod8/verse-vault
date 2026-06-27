import { useState } from 'react';
import type { TokenFormValues } from '../components/tokens/TokenForm';
import { normalizeTokenImageSrc } from '../lib/tokenImageSrc';

type TokenMutationToast = {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

type UseTokenCrudParams = {
  worldId: number | null;
  editingToken: Token | null;
  pendingDeleteToken: Token | null;
  reloadTokens: () => Promise<void>;
  toast: TokenMutationToast;
  onCreateSaved: () => void;
  onUpdateSaved: () => void;
  onDeleteSettled: () => void;
};

type SavingSetter = React.Dispatch<React.SetStateAction<boolean>>;
type DeletingIdSetter = React.Dispatch<React.SetStateAction<number | null>>;

function toTokenErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Please try again.';
}

async function resolveTokenImageSrc(
  data: TokenFormValues,
): Promise<string | null | undefined> {
  if (!data.image_upload) {
    return data.image_src;
  }

  const importResult = await window.db.tokens.importImage(data.image_upload);
  return normalizeTokenImageSrc(importResult.image_src);
}

function buildTokenUpdatePayload(data: TokenFormValues): {
  name: string;
  grid_type: TokenGridType;
  image_src?: string | null;
  is_visible: number;
  config?: string;
} {
  const updatePayload: {
    name: string;
    grid_type: TokenGridType;
    image_src?: string | null;
    is_visible: number;
    config?: string;
  } = {
    name: data.name,
    grid_type: data.grid_type,
    is_visible: data.is_visible,
  };

  if (data.clear_image) {
    updatePayload.image_src = null;
  } else if (Object.prototype.hasOwnProperty.call(data, 'image_src')) {
    updatePayload.image_src = data.image_src ?? null;
  }

  if (data.config !== undefined) {
    updatePayload.config = data.config;
  }

  return updatePayload;
}

async function deletePendingToken(params: {
  pendingDeleteToken: Token;
  reloadTokens: () => Promise<void>;
  toast: TokenMutationToast;
}) {
  await window.db.tokens.delete(params.pendingDeleteToken.id);
  await params.reloadTokens();
  params.toast.success(
    'Token deleted.',
    `"${params.pendingDeleteToken.name}" was removed.`,
  );
}

function createHandleCreate(params: {
  worldId: number | null;
  reloadTokens: () => Promise<void>;
  toast: TokenMutationToast;
  onCreateSaved: () => void;
  setIsSaving: SavingSetter;
}) {
  return async (data: TokenFormValues) => {
    if (params.worldId === null) {
      return;
    }

    params.setIsSaving(true);
    try {
      const imageSrc = await resolveTokenImageSrc(data);
      await window.db.tokens.add({
        world_id: params.worldId,
        name: data.name,
        grid_type: data.grid_type,
        image_src: imageSrc,
        is_visible: data.is_visible,
        config: data.config,
      });
      await params.reloadTokens();
      params.onCreateSaved();
      params.toast.success('Token created.', `"${data.name}" was added.`);
    } catch (error) {
      params.toast.error('Failed to create token.', toTokenErrorMessage(error));
    } finally {
      params.setIsSaving(false);
    }
  };
}

function createHandleUpdate(params: {
  editingToken: Token | null;
  reloadTokens: () => Promise<void>;
  toast: TokenMutationToast;
  onUpdateSaved: () => void;
  setIsSaving: SavingSetter;
}) {
  return async (data: TokenFormValues) => {
    if (!params.editingToken) {
      return;
    }

    params.setIsSaving(true);
    try {
      const updatePayload = buildTokenUpdatePayload(data);
      if (data.image_upload) {
        updatePayload.image_src = await resolveTokenImageSrc(data);
      }

      await window.db.tokens.update(params.editingToken.id, updatePayload);
      await params.reloadTokens();
      params.onUpdateSaved();
      params.toast.success('Token updated.', `"${data.name}" was saved.`);
    } catch (error) {
      params.toast.error('Failed to update token.', toTokenErrorMessage(error));
    } finally {
      params.setIsSaving(false);
    }
  };
}

function createHandleDelete(params: {
  pendingDeleteToken: Token | null;
  reloadTokens: () => Promise<void>;
  toast: TokenMutationToast;
  onDeleteSettled: () => void;
  setDeletingTokenId: DeletingIdSetter;
}) {
  return async () => {
    if (!params.pendingDeleteToken) {
      return;
    }

    const token = params.pendingDeleteToken;
    params.setDeletingTokenId(token.id);
    try {
      await deletePendingToken({
        pendingDeleteToken: token,
        reloadTokens: params.reloadTokens,
        toast: params.toast,
      });
    } catch (error) {
      params.toast.error('Failed to delete token.', toTokenErrorMessage(error));
    } finally {
      params.setDeletingTokenId((current) => current === token.id ? null : current);
      params.onDeleteSettled();
    }
  };
}

export function useTokenCrud({
  worldId,
  editingToken,
  pendingDeleteToken,
  reloadTokens,
  toast,
  onCreateSaved,
  onUpdateSaved,
  onDeleteSettled,
}: UseTokenCrudParams) {
  const [isSaving, setIsSaving] = useState(false);
  const [deletingTokenId, setDeletingTokenId] = useState<number | null>(null);
  const handleCreate = createHandleCreate({
    worldId,
    reloadTokens,
    toast,
    onCreateSaved,
    setIsSaving,
  });
  const handleUpdate = createHandleUpdate({
    editingToken,
    reloadTokens,
    toast,
    onUpdateSaved,
    setIsSaving,
  });
  const handleDelete = createHandleDelete({
    pendingDeleteToken,
    reloadTokens,
    toast,
    onDeleteSettled,
    setDeletingTokenId,
  });

  return {
    isSaving,
    deletingTokenId,
    handleCreate,
    handleUpdate,
    handleDelete,
  };
}
