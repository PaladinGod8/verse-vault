import { useCallback, useEffect, useState } from 'react';

type WorldFactionsData = {
  world: World | null;
  factions: Faction[];
  factionTypes: FactionType[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

/**
 * Loads a world plus its factions and faction types for FactionsPage, and exposes a reload
 * function for use after create/update/delete mutations.
 */
export function useWorldFactionsData(worldId: number | null): WorldFactionsData {
  const [world, setWorld] = useState<World | null>(null);
  const [factions, setFactions] = useState<Faction[]>([]);
  const [factionTypes, setFactionTypes] = useState<FactionType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null) {
      setWorld(null);
      setFactions([]);
      setFactionTypes([]);
      setError('Invalid world id.');
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const existingWorld = await window.db.worlds.getById(worldId);
        if (!existingWorld) {
          if (isMounted) {
            setWorld(null);
            setError('World not found.');
          }
          return;
        }

        const [factionsList, factionTypesList] = await Promise.all([
          window.db.factions.getAllByWorld(worldId),
          window.db.factionTypes.getAllByWorld(worldId),
        ]);

        if (isMounted) {
          setWorld(existingWorld);
          setFactions(factionsList);
          setFactionTypes(factionTypesList);
        }
      } catch {
        if (isMounted) {
          setWorld(null);
          setFactions([]);
          setFactionTypes([]);
          setError('Unable to load factions right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [worldId]);

  const reload = useCallback(async () => {
    if (worldId === null) return;
    const [factionsList, factionTypesList] = await Promise.all([
      window.db.factions.getAllByWorld(worldId),
      window.db.factionTypes.getAllByWorld(worldId),
    ]);
    setFactions(factionsList);
    setFactionTypes(factionTypesList);
  }, [worldId]);

  return { world, factions, factionTypes, isLoading, error, reload };
}
