import { useEffect, useState } from 'react';

export const sortActsByOrder = (acts: Act[]) =>
  [...acts].sort(
    (left, right) => left.sort_order - right.sort_order || left.id - right.id,
  );

type ArcActsData = {
  arc: Arc | null;
  acts: Act[];
  isLoading: boolean;
  error: string | null;
  setActs: React.Dispatch<React.SetStateAction<Act[]>>;
};

/**
 * Loads an arc plus its acts for ActsPage. Requires worldId/campaignId/arcId to all be valid
 * (matching the page's existing route-param validation) before fetching.
 */
export function useArcActsData(
  worldId: number | null,
  campaignId: number | null,
  arcId: number | null,
): ArcActsData {
  const [arc, setArc] = useState<Arc | null>(null);
  const [acts, setActs] = useState<Act[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null || campaignId === null || arcId === null) {
      setArc(null);
      setActs([]);
      setError('Invalid world, campaign, or arc id.');
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const existingArc = await window.db.arcs.getById(arcId);
        if (!existingArc) {
          if (isMounted) {
            setArc(null);
            setError('Arc not found.');
          }
          return;
        }

        const actsList = await window.db.acts.getAllByArc(arcId);
        if (isMounted) {
          setArc(existingArc);
          setActs(sortActsByOrder(actsList));
        }
      } catch {
        if (isMounted) {
          setArc(null);
          setActs([]);
          setError('Unable to load acts right now.');
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
  }, [worldId, campaignId, arcId]);

  return { arc, acts, isLoading, error, setActs };
}
