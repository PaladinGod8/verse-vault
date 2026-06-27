import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import type { RuntimeSceneToken } from '../lib/runtime/runtimeCanvasTypes';
import { normalizeTokenImageSrc } from '../lib/tokenImageSrc';

function syncRuntimeTokensFromSource(
  setRuntimeTokens: Dispatch<SetStateAction<RuntimeSceneToken[]>>,
  sourceTokens: Token[],
  shouldSyncRuntimeToken: (runtimeToken: RuntimeSceneToken) => boolean,
): void {
  setRuntimeTokens((currentTokens) => {
    const tokenById = new Map(sourceTokens.map((token) => [token.id, token]));

    return currentTokens.map((runtimeToken) => {
      if (
        !shouldSyncRuntimeToken(runtimeToken)
        || runtimeToken.sourceTokenId === null
      ) {
        return runtimeToken;
      }

      const sourceToken = tokenById.get(runtimeToken.sourceTokenId);
      if (!sourceToken) {
        return {
          ...runtimeToken,
          sourceMissing: true,
        };
      }

      return {
        ...runtimeToken,
        name: sourceToken.name,
        imageSrc: normalizeTokenImageSrc(sourceToken.image_src),
        isVisible: sourceToken.is_visible === 1,
        sourceMissing: false,
      };
    });
  });
}

/**
 * Loads the runtime token source data (campaigns, world tokens, campaign
 * tokens) and keeps placed runtime tokens synced to upstream source metadata.
 */
export default function useBattleMapRuntimeCampaignData({
  worldId,
  selectedCampaignId,
  setSelectedCampaignId,
  setRuntimeTokens,
}: {
  worldId: number | null;
  selectedCampaignId: number | null;
  setSelectedCampaignId: Dispatch<SetStateAction<number | null>>;
  setRuntimeTokens: Dispatch<SetStateAction<RuntimeSceneToken[]>>;
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [campaignLoadError, setCampaignLoadError] = useState<string | null>(
    null,
  );
  const [worldTokens, setWorldTokens] = useState<Token[]>([]);
  const [isLoadingWorldTokens, setIsLoadingWorldTokens] = useState(true);
  const [worldTokenLoadError, setWorldTokenLoadError] = useState<string | null>(
    null,
  );
  const [campaignTokens, setCampaignTokens] = useState<Token[]>([]);
  const [isLoadingCampaignTokens, setIsLoadingCampaignTokens] = useState(false);
  const [campaignTokenLoadError, setCampaignTokenLoadError] = useState<
    string | null
  >(null);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null) {
      setCampaigns([]);
      setSelectedCampaignId(null);
      setCampaignLoadError(null);
      setIsLoadingCampaigns(false);
      return () => {
        isMounted = false;
      };
    }

    const loadCampaigns = async () => {
      setIsLoadingCampaigns(true);
      setCampaignLoadError(null);

      try {
        const worldCampaigns = await window.db.campaigns.getAllByWorld(worldId);
        if (!isMounted) {
          return;
        }

        setCampaigns(worldCampaigns);
      } catch {
        if (!isMounted) {
          return;
        }

        setCampaigns([]);
        setCampaignLoadError('Unable to load campaigns for runtime tokens.');
      } finally {
        if (isMounted) {
          setIsLoadingCampaigns(false);
        }
      }
    };

    void loadCampaigns();

    return () => {
      isMounted = false;
    };
  }, [setSelectedCampaignId, worldId]);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null) {
      setWorldTokens([]);
      setWorldTokenLoadError(null);
      setIsLoadingWorldTokens(false);
      return () => {
        isMounted = false;
      };
    }

    const loadWorldTokens = async () => {
      setIsLoadingWorldTokens(true);
      setWorldTokenLoadError(null);

      try {
        const tokens = await window.db.tokens.getAllByWorld(worldId);
        if (!isMounted) {
          return;
        }

        const scopedWorldTokens = tokens
          .filter((token) => token.campaign_id === null)
          .map((token) => ({
            ...token,
            image_src: normalizeTokenImageSrc(token.image_src),
          }));

        setWorldTokens(scopedWorldTokens);
        syncRuntimeTokensFromSource(
          setRuntimeTokens,
          scopedWorldTokens,
          (runtimeToken) => runtimeToken.campaignId === null,
        );
      } catch {
        if (!isMounted) {
          return;
        }

        setWorldTokens([]);
        setWorldTokenLoadError('Unable to load world tokens.');
      } finally {
        if (isMounted) {
          setIsLoadingWorldTokens(false);
        }
      }
    };

    void loadWorldTokens();

    return () => {
      isMounted = false;
    };
  }, [setRuntimeTokens, worldId]);

  useEffect(() => {
    if (campaigns.length === 0) {
      setSelectedCampaignId(null);
      return;
    }

    const hasSelectedCampaign = selectedCampaignId !== null
      && campaigns.some((campaign) => campaign.id === selectedCampaignId);
    if (!hasSelectedCampaign) {
      setSelectedCampaignId(campaigns[0].id);
    }
  }, [campaigns, selectedCampaignId, setSelectedCampaignId]);

  useEffect(() => {
    let isMounted = true;

    if (selectedCampaignId === null) {
      setCampaignTokens([]);
      setCampaignTokenLoadError(null);
      setIsLoadingCampaignTokens(false);
      return () => {
        isMounted = false;
      };
    }

    const loadCampaignTokens = async () => {
      setIsLoadingCampaignTokens(true);
      setCampaignTokenLoadError(null);

      try {
        const tokens = await window.db.tokens.getAllByCampaign(selectedCampaignId);
        if (!isMounted) {
          return;
        }

        const normalizedTokens = tokens.map((token) => ({
          ...token,
          image_src: normalizeTokenImageSrc(token.image_src),
        }));

        setCampaignTokens(normalizedTokens);
        syncRuntimeTokensFromSource(
          setRuntimeTokens,
          normalizedTokens,
          (runtimeToken) => runtimeToken.campaignId === selectedCampaignId,
        );
      } catch {
        if (!isMounted) {
          return;
        }

        setCampaignTokens([]);
        setCampaignTokenLoadError('Unable to load tokens for this campaign.');
      } finally {
        if (isMounted) {
          setIsLoadingCampaignTokens(false);
        }
      }
    };

    void loadCampaignTokens();

    return () => {
      isMounted = false;
    };
  }, [selectedCampaignId, setRuntimeTokens]);

  return {
    campaigns,
    isLoadingCampaigns,
    campaignLoadError,
    worldTokens,
    isLoadingWorldTokens,
    worldTokenLoadError,
    campaignTokens,
    isLoadingCampaignTokens,
    campaignTokenLoadError,
  };
}
