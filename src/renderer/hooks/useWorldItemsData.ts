import { useCallback, useEffect, useState } from 'react';

type WorldItemsData = {
  world: World | null;
  items: Item[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useWorldItemsData(worldId: number | null): WorldItemsData {
  const [world, setWorld] = useState<World | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null) {
      setWorld(null);
      setItems([]);
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

        const itemsList = await window.db.items.getAllByWorld(worldId);

        if (isMounted) {
          setWorld(existingWorld);
          setItems(itemsList);
        }
      } catch {
        if (isMounted) {
          setWorld(null);
          setItems([]);
          setError('Unable to load items right now.');
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
    const itemsList = await window.db.items.getAllByWorld(worldId);
    setItems(itemsList);
  }, [worldId]);

  return { world, items, isLoading, error, reload };
}
