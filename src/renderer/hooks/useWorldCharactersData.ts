import { useCallback, useEffect, useState } from 'react';

type WorldCharactersData = {
  world: World | null;
  characters: Character[];
  isLoading: boolean;
  error: string | null;
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  reload: () => Promise<void>;
};

/**
 * Loads a world plus its characters for CharactersPage, and exposes a reload function for
 * use after create/update/delete mutations.
 */
export function useWorldCharactersData(worldId: number | null): WorldCharactersData {
  const [world, setWorld] = useState<World | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null) {
      setWorld(null);
      setCharacters([]);
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

        const charactersList = await window.db.characters.getAllByWorld(worldId);

        if (isMounted) {
          setWorld(existingWorld);
          setCharacters(charactersList);
        }
      } catch {
        if (isMounted) {
          setWorld(null);
          setCharacters([]);
          setError('Unable to load characters right now.');
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
    const charactersList = await window.db.characters.getAllByWorld(worldId);
    setCharacters(charactersList);
  }, [worldId]);

  return { world, characters, isLoading, error, setCharacters, reload };
}
