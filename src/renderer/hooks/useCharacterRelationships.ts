import { useCallback, useEffect, useState } from 'react';
import type {
  CharacterRelationshipInput,
  CharacterRelationshipUpdateInput,
  CharacterRelationshipView,
} from '../../shared/contracts/dbApiPayloads';

type RelationshipMutationToast = {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

type UseCharacterRelationshipsParams = {
  characterId: number | null;
  toast: RelationshipMutationToast;
};

type UseCharacterRelationshipsResult = {
  relationships: CharacterRelationshipView[];
  isLoading: boolean;
  isSaving: boolean;
  reload: () => Promise<void>;
  addRelationship: (data: CharacterRelationshipInput) => Promise<boolean>;
  updateRelationship: (id: number, data: CharacterRelationshipUpdateInput) => Promise<boolean>;
  deleteRelationship: (id: number) => Promise<void>;
};

function toRelationshipErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Please try again.';
}

/**
 * Loads a character's named relationships to other characters and exposes
 * one-at-a-time add/update/delete mutations, each reloading the list on success.
 */
export function useCharacterRelationships(
  { characterId, toast }: UseCharacterRelationshipsParams,
): UseCharacterRelationshipsResult {
  const [relationships, setRelationships] = useState<CharacterRelationshipView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const reload = useCallback(async () => {
    if (characterId === null) {
      setRelationships([]);
      return;
    }
    const result = await window.db.characterRelationships.getAllByCharacter(characterId);
    setRelationships(result);
  }, [characterId]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    void reload().finally(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [reload]);

  const addRelationship = useCallback(async (data: CharacterRelationshipInput) => {
    setIsSaving(true);
    try {
      await window.db.characterRelationships.add(data);
      await reload();
      toast.success('Relationship added.');
      return true;
    } catch (error) {
      toast.error('Failed to add relationship.', toRelationshipErrorMessage(error));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [reload, toast]);

  const updateRelationship = useCallback(
    async (id: number, data: CharacterRelationshipUpdateInput) => {
      setIsSaving(true);
      try {
        await window.db.characterRelationships.update(id, data);
        await reload();
        toast.success('Relationship updated.');
        return true;
      } catch (error) {
        toast.error('Failed to update relationship.', toRelationshipErrorMessage(error));
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [reload, toast],
  );

  const deleteRelationship = useCallback(async (id: number) => {
    try {
      await window.db.characterRelationships.delete(id);
      await reload();
      toast.success('Relationship removed.');
    } catch (error) {
      toast.error('Failed to remove relationship.', toRelationshipErrorMessage(error));
    }
  }, [reload, toast]);

  return {
    relationships,
    isLoading,
    isSaving,
    reload,
    addRelationship,
    updateRelationship,
    deleteRelationship,
  };
}
