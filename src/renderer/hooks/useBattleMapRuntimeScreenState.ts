import { useCallback, useState } from 'react';

/**
 * Screen-level runtime state that is independent from Pixi setup and token
 * placement persistence: palette filters, selected campaign, casting UI, and
 * the statblock popup.
 */
export default function useBattleMapRuntimeScreenState() {
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(
    null,
  );
  const [showInvisibleTokens, setShowInvisibleTokens] = useState(true);
  const [castingAbility, setCastingAbility] = useState<Ability | null>(null);
  const [castingAngleRad, setCastingAngleRad] = useState(0);
  const [statBlockPopupTokenInstanceId, setStatBlockPopupTokenInstanceId] = useState<
    string | null
  >(null);

  const resetRuntimeScreenState = useCallback(() => {
    setSelectedCampaignId(null);
    setShowInvisibleTokens(true);
    setCastingAbility(null);
    setCastingAngleRad(0);
    setStatBlockPopupTokenInstanceId(null);
  }, []);

  return {
    selectedCampaignId,
    setSelectedCampaignId,
    showInvisibleTokens,
    setShowInvisibleTokens,
    castingAbility,
    setCastingAbility,
    castingAngleRad,
    setCastingAngleRad,
    statBlockPopupTokenInstanceId,
    setStatBlockPopupTokenInstanceId,
    resetRuntimeScreenState,
  };
}
