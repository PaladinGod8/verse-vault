import { useCallback, useEffect, useState } from 'react';

type WorldBackgroundsData = {
  world: World | null;
  backgrounds: Background[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useWorldBackgroundsData(worldId: number | null): WorldBackgroundsData {
  const [world, setWorld] = useState<World | null>(null);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null) {
      setWorld(null);
      setBackgrounds([]);
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

        const backgroundsList = await window.db.backgrounds.getAllByWorld(worldId);

        if (isMounted) {
          setWorld(existingWorld);
          setBackgrounds(backgroundsList);
        }
      } catch {
        if (isMounted) {
          setWorld(null);
          setBackgrounds([]);
          setError('Unable to load backgrounds right now.');
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
    const backgroundsList = await window.db.backgrounds.getAllByWorld(worldId);
    setBackgrounds(backgroundsList);
  }, [worldId]);

  return { world, backgrounds, isLoading, error, reload };
}
