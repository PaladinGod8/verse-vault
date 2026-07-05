import { useEffect, useState } from 'react';

export const sortScenesByOrder = (scenes: Scene[]) =>
  [...scenes].sort(
    (left, right) => left.sort_order - right.sort_order || left.id - right.id,
  );

type ActScenesData = {
  act: Act | null;
  scenes: Scene[];
  sessions: Session[];
  isLoading: boolean;
  error: string | null;
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
};

/**
 * Loads an act plus all scenes anchored to it (grouped-in-session and stray) for
 * ActScenesPage. Also loads the act's sessions so the page can label each scene's group.
 */
export function useActScenesData(
  worldId: number | null,
  campaignId: number | null,
  arcId: number | null,
  actId: number | null,
): ActScenesData {
  const [act, setAct] = useState<Act | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (
      worldId === null
      || campaignId === null
      || arcId === null
      || actId === null
    ) {
      setAct(null);
      setScenes([]);
      setSessions([]);
      setError('Invalid world, campaign, arc, or act id.');
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const existingAct = await window.db.acts.getById(actId);
        if (!existingAct) {
          if (isMounted) {
            setAct(null);
            setError('Act not found.');
          }
          return;
        }

        const [scenesList, sessionsList] = await Promise.all([
          window.db.scenes.getAllByAct(actId),
          window.db.sessions.getAllByAct(actId),
        ]);
        if (isMounted) {
          setAct(existingAct);
          setScenes(sortScenesByOrder(scenesList));
          setSessions(sessionsList);
        }
      } catch {
        if (isMounted) {
          setAct(null);
          setScenes([]);
          setSessions([]);
          setError('Unable to load scenes right now.');
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
  }, [worldId, campaignId, arcId, actId]);

  return { act, scenes, sessions, isLoading, error, setScenes };
}
