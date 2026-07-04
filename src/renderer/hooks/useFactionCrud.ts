import { useState } from 'react';
import type { FactionFormValues } from '../components/factions/FactionForm';
import { persistImageEditDraft } from '../lib/imageCrop';

type FactionMutationToast = {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

type UseFactionCrudParams = {
  worldId: number | null;
  editingFaction: Faction | null;
  pendingDeleteFaction: Faction | null;
  reloadFactions: () => Promise<void>;
  toast: FactionMutationToast;
  onCreateSaved: () => void;
  onUpdateSaved: () => void;
  onDeleteSettled: () => void;
};

type SavingSetter = React.Dispatch<React.SetStateAction<boolean>>;
type DeletingIdSetter = React.Dispatch<React.SetStateAction<number | null>>;

function toFactionErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Please try again.';
}

function buildFactionUpdatePayload(data: FactionFormValues): {
  name: string;
  profile: string | null;
  image_src?: string | null;
  original_image_src?: string | null;
  image_crop?: string | null;
  sections: string;
  wiki_summary: string;
  type_id: number | null;
  parent_faction_id: number | null;
} {
  const updatePayload: {
    name: string;
    profile: string | null;
    image_src?: string | null;
    original_image_src?: string | null;
    image_crop?: string | null;
    sections: string;
    wiki_summary: string;
    type_id: number | null;
    parent_faction_id: number | null;
  } = {
    name: data.name,
    profile: data.profile ?? null,
    sections: JSON.stringify(data.sections),
    wiki_summary: JSON.stringify(data.wiki_summary),
    type_id: data.type_id,
    parent_faction_id: data.parent_faction_id,
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
  reloadFactions: () => Promise<void>;
  toast: FactionMutationToast;
  onCreateSaved: () => void;
  setIsSaving: SavingSetter;
}) {
  return async (data: FactionFormValues) => {
    if (params.worldId === null) {
      return;
    }

    params.setIsSaving(true);
    try {
      const persistedImage = data.image_edit_draft
        ? await persistImageEditDraft({
          draft: data.image_edit_draft,
          importImage: window.db.factions.importImage,
        })
        : null;
      const faction = await window.db.factions.add({
        world_id: params.worldId,
        name: data.name,
        profile: data.profile ?? null,
        image_src: persistedImage?.imageSrc ?? data.image_src,
        original_image_src: persistedImage?.originalImageSrc,
        image_crop: persistedImage?.imageCrop,
        sections: JSON.stringify(data.sections),
        wiki_summary: JSON.stringify(data.wiki_summary),
        type_id: data.type_id,
        parent_faction_id: data.parent_faction_id,
      });
      await window.db.factionMembers.setForFaction(faction.id, data.members);
      await params.reloadFactions();
      params.onCreateSaved();
      params.toast.success('Faction created.', `"${data.name}" was added.`);
    } catch (error) {
      params.toast.error('Failed to create faction.', toFactionErrorMessage(error));
    } finally {
      params.setIsSaving(false);
    }
  };
}

function createHandleUpdate(params: {
  editingFaction: Faction | null;
  reloadFactions: () => Promise<void>;
  toast: FactionMutationToast;
  onUpdateSaved: () => void;
  setIsSaving: SavingSetter;
}) {
  return async (data: FactionFormValues) => {
    if (!params.editingFaction) {
      return;
    }

    params.setIsSaving(true);
    try {
      const updatePayload = buildFactionUpdatePayload(data);
      if (data.image_edit_draft) {
        const persistedImage = await persistImageEditDraft({
          draft: data.image_edit_draft,
          currentOriginalImageSrc: params.editingFaction.original_image_src ?? null,
          importImage: window.db.factions.importImage,
        });
        updatePayload.image_src = persistedImage.imageSrc;
        updatePayload.original_image_src = persistedImage.originalImageSrc;
        updatePayload.image_crop = persistedImage.imageCrop;
      }

      await window.db.factions.update(params.editingFaction.id, updatePayload);
      await window.db.factionMembers.setForFaction(params.editingFaction.id, data.members);
      await params.reloadFactions();
      params.onUpdateSaved();
      params.toast.success('Faction updated.', `"${data.name}" was saved.`);
    } catch (error) {
      params.toast.error('Failed to update faction.', toFactionErrorMessage(error));
    } finally {
      params.setIsSaving(false);
    }
  };
}

function createHandleDelete(params: {
  pendingDeleteFaction: Faction | null;
  reloadFactions: () => Promise<void>;
  toast: FactionMutationToast;
  onDeleteSettled: () => void;
  setDeletingFactionId: DeletingIdSetter;
}) {
  return async () => {
    if (!params.pendingDeleteFaction) {
      return;
    }

    const faction = params.pendingDeleteFaction;
    params.setDeletingFactionId(faction.id);
    try {
      await window.db.factions.delete(faction.id);
      await params.reloadFactions();
      params.toast.success('Faction deleted.', `"${faction.name}" was removed.`);
    } catch (error) {
      params.toast.error('Failed to delete faction.', toFactionErrorMessage(error));
    } finally {
      params.setDeletingFactionId((current) => current === faction.id ? null : current);
      params.onDeleteSettled();
    }
  };
}

export function useFactionCrud({
  worldId,
  editingFaction,
  pendingDeleteFaction,
  reloadFactions,
  toast,
  onCreateSaved,
  onUpdateSaved,
  onDeleteSettled,
}: UseFactionCrudParams) {
  const [isSaving, setIsSaving] = useState(false);
  const [deletingFactionId, setDeletingFactionId] = useState<number | null>(null);
  const handleCreate = createHandleCreate({
    worldId,
    reloadFactions,
    toast,
    onCreateSaved,
    setIsSaving,
  });
  const handleUpdate = createHandleUpdate({
    editingFaction,
    reloadFactions,
    toast,
    onUpdateSaved,
    setIsSaving,
  });
  const handleDelete = createHandleDelete({
    pendingDeleteFaction,
    reloadFactions,
    toast,
    onDeleteSettled,
    setDeletingFactionId,
  });

  return {
    isSaving,
    deletingFactionId,
    handleCreate,
    handleUpdate,
    handleDelete,
  };
}
