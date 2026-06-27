import { useCallback, useEffect, useState } from 'react';

export type CharacterFactionMembership = FactionMember & { faction_name: string; };

type UseCharacterFactionMembershipsResult = {
  memberships: CharacterFactionMembership[];
  isLoading: boolean;
  reload: () => Promise<void>;
  setPrimary: (factionId: number) => Promise<void>;
};

/**
 * Loads a character's faction memberships (read-only, derived from the faction_members
 * junction table) for CharacterDetailPage, and exposes the one character-side mutation
 * allowed: toggling which faction is marked primary.
 */
export function useCharacterFactionMemberships(
  characterId: number | null,
): UseCharacterFactionMembershipsResult {
  const [memberships, setMemberships] = useState<CharacterFactionMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (characterId === null) {
      setMemberships([]);
      return;
    }
    const result = await window.db.factionMembers.getAllByCharacter(characterId);
    setMemberships(result);
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

  const setPrimary = useCallback(async (factionId: number) => {
    if (characterId === null) return;
    await window.db.factionMembers.setPrimary(characterId, factionId);
    await reload();
  }, [characterId, reload]);

  return { memberships, isLoading, reload, setPrimary };
}
