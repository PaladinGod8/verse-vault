import { useCallback, useEffect, useState } from 'react';

type WorldTokensData = {
  world: World | null;
  tokens: Token[];
  campaigns: Campaign[];
  isLoading: boolean;
  error: string | null;
  setTokens: React.Dispatch<React.SetStateAction<Token[]>>;
  reload: () => Promise<void>;
};

/**
 * Loads a world plus its tokens and campaigns for TokensPage, and exposes a reload function
 * for use after create/update/delete/copy mutations. `setTokens` is exposed directly for the
 * optimistic move-token update, which patches a single row without a full reload.
 */
export function useWorldTokensData(worldId: number | null): WorldTokensData {
  const [world, setWorld] = useState<World | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null) {
      setWorld(null);
      setTokens([]);
      setCampaigns([]);
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

        const [tokensList, campaignsList] = await Promise.all([
          window.db.tokens.getAllByWorld(worldId),
          window.db.campaigns.getAllByWorld(worldId),
        ]);

        if (isMounted) {
          setWorld(existingWorld);
          setTokens(tokensList);
          setCampaigns(campaignsList);
        }
      } catch {
        if (isMounted) {
          setWorld(null);
          setTokens([]);
          setCampaigns([]);
          setError('Unable to load tokens right now.');
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
    const [tokensList, campaignsList] = await Promise.all([
      window.db.tokens.getAllByWorld(worldId),
      window.db.campaigns.getAllByWorld(worldId),
    ]);
    setTokens(tokensList);
    setCampaigns(campaignsList);
  }, [worldId]);

  return { world, tokens, campaigns, isLoading, error, setTokens, reload };
}
