import { useState } from 'react';
import type { CharacterFormValues } from '../components/characters/CharacterForm';
import { normalizeTokenImageSrc } from '../lib/tokenImageSrc';

type CharacterMutationToast = {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

type UseCharacterCrudParams = {
  worldId: number | null;
  editingCharacter: Character | null;
  pendingDeleteCharacter: Character | null;
  reloadCharacters: () => Promise<void>;
  toast: CharacterMutationToast;
  onCreateSaved: () => void;
  onUpdateSaved: () => void;
  onDeleteSettled: () => void;
};

type SavingSetter = React.Dispatch<React.SetStateAction<boolean>>;
type DeletingIdSetter = React.Dispatch<React.SetStateAction<number | null>>;

function toCharacterErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Please try again.';
}

async function resolveCharacterImageSrc(
  data: CharacterFormValues,
): Promise<string | null | undefined> {
  if (!data.image_upload) {
    return data.image_src;
  }

  const importResult = await window.db.characters.importImage(data.image_upload);
  return normalizeTokenImageSrc(importResult.image_src);
}

function buildCharacterUpdatePayload(data: CharacterFormValues): {
  name: string;
  profile: string | null;
  image_src?: string | null;
  sections: string;
  wiki_summary: string;
} {
  const updatePayload: {
    name: string;
    profile: string | null;
    image_src?: string | null;
    sections: string;
    wiki_summary: string;
  } = {
    name: data.name,
    profile: data.profile ?? null,
    sections: JSON.stringify(data.sections),
    wiki_summary: JSON.stringify(data.wiki_summary),
  };

  if (data.clear_image) {
    updatePayload.image_src = null;
  } else if (Object.prototype.hasOwnProperty.call(data, 'image_src')) {
    updatePayload.image_src = data.image_src ?? null;
  }

  return updatePayload;
}

function createHandleCreate(params: {
  worldId: number | null;
  reloadCharacters: () => Promise<void>;
  toast: CharacterMutationToast;
  onCreateSaved: () => void;
  setIsSaving: SavingSetter;
}) {
  return async (data: CharacterFormValues) => {
    if (params.worldId === null) {
      return;
    }

    params.setIsSaving(true);
    try {
      const imageSrc = await resolveCharacterImageSrc(data);
      await window.db.characters.add({
        world_id: params.worldId,
        name: data.name,
        profile: data.profile ?? null,
        image_src: imageSrc,
        sections: JSON.stringify(data.sections),
        wiki_summary: JSON.stringify(data.wiki_summary),
      });
      await params.reloadCharacters();
      params.onCreateSaved();
      params.toast.success('Character created.', `"${data.name}" was added.`);
    } catch (error) {
      params.toast.error('Failed to create character.', toCharacterErrorMessage(error));
    } finally {
      params.setIsSaving(false);
    }
  };
}

function createHandleUpdate(params: {
  editingCharacter: Character | null;
  reloadCharacters: () => Promise<void>;
  toast: CharacterMutationToast;
  onUpdateSaved: () => void;
  setIsSaving: SavingSetter;
}) {
  return async (data: CharacterFormValues) => {
    if (!params.editingCharacter) {
      return;
    }

    params.setIsSaving(true);
    try {
      const updatePayload = buildCharacterUpdatePayload(data);
      if (data.image_upload) {
        updatePayload.image_src = await resolveCharacterImageSrc(data);
      }

      await window.db.characters.update(params.editingCharacter.id, updatePayload);
      await params.reloadCharacters();
      params.onUpdateSaved();
      params.toast.success('Character updated.', `"${data.name}" was saved.`);
    } catch (error) {
      params.toast.error('Failed to update character.', toCharacterErrorMessage(error));
    } finally {
      params.setIsSaving(false);
    }
  };
}

function createHandleDelete(params: {
  pendingDeleteCharacter: Character | null;
  reloadCharacters: () => Promise<void>;
  toast: CharacterMutationToast;
  onDeleteSettled: () => void;
  setDeletingCharacterId: DeletingIdSetter;
}) {
  return async () => {
    if (!params.pendingDeleteCharacter) {
      return;
    }

    const character = params.pendingDeleteCharacter;
    params.setDeletingCharacterId(character.id);
    try {
      await window.db.characters.delete(character.id);
      await params.reloadCharacters();
      params.toast.success('Character deleted.', `"${character.name}" was removed.`);
    } catch (error) {
      params.toast.error('Failed to delete character.', toCharacterErrorMessage(error));
    } finally {
      params.setDeletingCharacterId((current) => current === character.id ? null : current);
      params.onDeleteSettled();
    }
  };
}

export function useCharacterCrud({
  worldId,
  editingCharacter,
  pendingDeleteCharacter,
  reloadCharacters,
  toast,
  onCreateSaved,
  onUpdateSaved,
  onDeleteSettled,
}: UseCharacterCrudParams) {
  const [isSaving, setIsSaving] = useState(false);
  const [deletingCharacterId, setDeletingCharacterId] = useState<number | null>(null);
  const handleCreate = createHandleCreate({
    worldId,
    reloadCharacters,
    toast,
    onCreateSaved,
    setIsSaving,
  });
  const handleUpdate = createHandleUpdate({
    editingCharacter,
    reloadCharacters,
    toast,
    onUpdateSaved,
    setIsSaving,
  });
  const handleDelete = createHandleDelete({
    pendingDeleteCharacter,
    reloadCharacters,
    toast,
    onDeleteSettled,
    setDeletingCharacterId,
  });

  return {
    isSaving,
    deletingCharacterId,
    handleCreate,
    handleUpdate,
    handleDelete,
  };
}
