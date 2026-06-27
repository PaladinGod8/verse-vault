import { useEffect, useState } from 'react';

export const sortScenesByOrder = (scenes: Scene[]) =>
  [...scenes].sort(
    (left, right) => left.sort_order - right.sort_order || left.id - right.id,
  );

type SessionScenesData = {
  session: Session | null;
  scenes: Scene[];
  isLoading: boolean;
  error: string | null;
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
};

/**
 * Loads a session plus its scenes for ScenesPage. Requires worldId/campaignId/sessionId to all
 * be valid (matching the page's existing route-param validation) before fetching.
 */
export function useSessionScenesData(
  worldId: number | null,
  campaignId: number | null,
  sessionId: number | null,
): SessionScenesData {
  const [session, setSession] = useState<Session | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null || campaignId === null || sessionId === null) {
      setSession(null);
      setScenes([]);
      setError('Invalid world, campaign, or session id.');
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const existingSession = await window.db.sessions.getById(sessionId);
        if (!existingSession) {
          if (isMounted) {
            setSession(null);
            setError('Session not found.');
          }
          return;
        }

        const scenesList = await window.db.scenes.getAllBySession(sessionId);
        if (isMounted) {
          setSession(existingSession);
          setScenes(sortScenesByOrder(scenesList));
        }
      } catch {
        if (isMounted) {
          setSession(null);
          setScenes([]);
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
  }, [worldId, campaignId, sessionId]);

  return { session, scenes, isLoading, error, setScenes };
}
