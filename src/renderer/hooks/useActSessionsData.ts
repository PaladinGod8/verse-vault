import { useEffect, useState } from 'react';

export const sortSessionsByOrder = (sessions: Session[]) =>
  [...sessions].sort(
    (left, right) => left.sort_order - right.sort_order || left.id - right.id,
  );

type ActSessionsData = {
  act: Act | null;
  sessions: Session[];
  isLoading: boolean;
  error: string | null;
  setSessions: React.Dispatch<React.SetStateAction<Session[]>>;
};

/**
 * Loads an act plus its sessions for SessionsPage. Requires worldId/campaignId/arcId/actId to
 * all be valid (matching the page's existing route-param validation) before fetching.
 */
export function useActSessionsData(
  worldId: number | null,
  campaignId: number | null,
  arcId: number | null,
  actId: number | null,
): ActSessionsData {
  const [act, setAct] = useState<Act | null>(null);
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

        const sessionsList = await window.db.sessions.getAllByAct(actId);
        if (isMounted) {
          setAct(existingAct);
          setSessions(sortSessionsByOrder(sessionsList));
        }
      } catch {
        if (isMounted) {
          setAct(null);
          setSessions([]);
          setError('Unable to load sessions right now.');
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

  return { act, sessions, isLoading, error, setSessions };
}
