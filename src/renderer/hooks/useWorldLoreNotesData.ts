import { useCallback, useEffect, useState } from 'react';

type WorldLoreNotesData = {
  world: World | null;
  loreNotes: LoreNote[];
  tagVocabulary: string[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useWorldLoreNotesData(worldId: number | null): WorldLoreNotesData {
  const [world, setWorld] = useState<World | null>(null);
  const [loreNotes, setLoreNotes] = useState<LoreNote[]>([]);
  const [tagVocabulary, setTagVocabulary] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null) {
      setWorld(null);
      setLoreNotes([]);
      setTagVocabulary([]);
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

        const [loreNotesList, tags] = await Promise.all([
          window.db.loreNotes.getAllByWorld(worldId),
          window.db.loreNotes.getAllTagsByWorld(worldId),
        ]);

        if (isMounted) {
          setWorld(existingWorld);
          setLoreNotes(loreNotesList);
          setTagVocabulary(tags);
        }
      } catch {
        if (isMounted) {
          setWorld(null);
          setLoreNotes([]);
          setTagVocabulary([]);
          setError('Unable to load lore notes right now.');
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
    const [loreNotesList, tags] = await Promise.all([
      window.db.loreNotes.getAllByWorld(worldId),
      window.db.loreNotes.getAllTagsByWorld(worldId),
    ]);
    setLoreNotes(loreNotesList);
    setTagVocabulary(tags);
  }, [worldId]);

  return { world, loreNotes, tagVocabulary, isLoading, error, reload };
}
