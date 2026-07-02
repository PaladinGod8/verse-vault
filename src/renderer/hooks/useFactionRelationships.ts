import { useCallback, useEffect, useState } from 'react';
import type {
  FactionRelationshipInput,
  FactionRelationshipUpdateInput,
  FactionRelationshipView,
} from '../../shared/contracts/dbApiPayloads';

type RelationshipMutationToast = {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

type UseFactionRelationshipsParams = {
  factionId: number | null;
  toast: RelationshipMutationToast;
};

type UseFactionRelationshipsResult = {
  relationships: FactionRelationshipView[];
  isLoading: boolean;
  isSaving: boolean;
  reload: () => Promise<void>;
  addRelationship: (data: FactionRelationshipInput) => Promise<boolean>;
  updateRelationship: (id: number, data: FactionRelationshipUpdateInput) => Promise<boolean>;
  deleteRelationship: (id: number) => Promise<void>;
};

function toRelationshipErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Please try again.';
}

/**
 * Loads a faction's named relationships to other factions and exposes
 * one-at-a-time add/update/delete mutations, each reloading the list on success.
 */
export function useFactionRelationships(
  { factionId, toast }: UseFactionRelationshipsParams,
): UseFactionRelationshipsResult {
  const [relationships, setRelationships] = useState<FactionRelationshipView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const reload = useCallback(async () => {
    if (factionId === null) {
      setRelationships([]);
      return;
    }
    const result = await window.db.factionRelationships.getAllByFaction(factionId);
    setRelationships(result);
  }, [factionId]);

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

  const addRelationship = useCallback(async (data: FactionRelationshipInput) => {
    setIsSaving(true);
    try {
      await window.db.factionRelationships.add(data);
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
    async (id: number, data: FactionRelationshipUpdateInput) => {
      setIsSaving(true);
      try {
        await window.db.factionRelationships.update(id, data);
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
      await window.db.factionRelationships.delete(id);
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
