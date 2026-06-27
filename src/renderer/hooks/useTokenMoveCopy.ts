import { useState } from 'react';

type TokenMutationToast = {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

type UseTokenMoveCopyParams = {
  worldId: number | null;
  campaigns: Campaign[];
  copyingToken: Token | null;
  movingToken: Token | null;
  moveDialogMode: 'toWorld' | 'toCampaign' | null;
  reloadTokens: () => Promise<void>;
  setTokens: React.Dispatch<React.SetStateAction<Token[]>>;
  toast: TokenMutationToast;
  onCopySaved: () => void;
  onMoveSaved: () => void;
};

function toTokenErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Please try again.';
}

function patchToken(
  setTokens: React.Dispatch<React.SetStateAction<Token[]>>,
  updatedToken: Token,
) {
  setTokens((prev) =>
    prev.map((token) => (
      token.id === updatedToken.id ? updatedToken : token
    ))
  );
}

export function useTokenMoveCopy({
  worldId,
  campaigns,
  copyingToken,
  movingToken,
  moveDialogMode,
  reloadTokens,
  setTokens,
  toast,
  onCopySaved,
  onMoveSaved,
}: UseTokenMoveCopyParams) {
  const [isCopySaving, setIsCopySaving] = useState(false);
  const [isMoveDialogPending, setIsMoveDialogPending] = useState(false);

  const handleCopyToCampaign = async (campaignId: number) => {
    if (!copyingToken || worldId === null) {
      return;
    }

    const token = copyingToken;
    setIsCopySaving(true);
    try {
      await window.db.tokens.add({
        world_id: worldId,
        campaign_id: campaignId,
        name: token.name,
        image_src: token.image_src,
        config: token.config,
        is_visible: token.is_visible,
      });
      await reloadTokens();
      onCopySaved();
      toast.success('Token copied to campaign.', `"${token.name}" was copied.`);
    } catch (error) {
      toast.error('Failed to copy token.', toTokenErrorMessage(error));
    } finally {
      setIsCopySaving(false);
    }
  };

  const handleConfirmMove = async (
    _token: Token,
    targetCampaignId?: number,
  ) => {
    if (!movingToken) {
      return;
    }

    setIsMoveDialogPending(true);
    try {
      if (moveDialogMode === 'toWorld') {
        const updated = await window.db.tokens.moveToWorld(movingToken.id);
        patchToken(setTokens, updated);
        toast.success(`Moved "${movingToken.name}" to World.`);
      } else if (moveDialogMode === 'toCampaign' && targetCampaignId) {
        const updated = await window.db.tokens.moveToCampaign(
          movingToken.id,
          targetCampaignId,
        );
        patchToken(setTokens, updated);
        const campaignName = campaigns.find((campaign) => campaign.id === targetCampaignId)
          ?.name ?? 'Unknown';
        toast.success(`Moved "${movingToken.name}" to ${campaignName}.`);
      }
      onMoveSaved();
    } catch (error) {
      toast.error('Failed to move token.', toTokenErrorMessage(error));
    } finally {
      setIsMoveDialogPending(false);
    }
  };

  return {
    isCopySaving,
    isMoveDialogPending,
    handleCopyToCampaign,
    handleConfirmMove,
  };
}
