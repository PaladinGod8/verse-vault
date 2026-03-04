import { useEffect, useMemo, useState } from 'react';
import ModalShell from '../ui/ModalShell';

type MoveTokenDialogProps = {
  token: Token;
  mode: 'toWorld' | 'toCampaign';
  campaigns: Campaign[];
  isOpen: boolean;
  isPending: boolean;
  onConfirm: (token: Token) => Promise<void>;
  onCancel: () => void;
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Failed to move token.';
};

export default function MoveTokenDialog({
  token,
  mode,
  campaigns,
  isOpen,
  isPending,
  onConfirm,
  onCancel,
}: MoveTokenDialogProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setError(null);

    if (mode === 'toCampaign') {
      setSelectedCampaignId(campaigns[0]?.id ?? null);
    } else {
      setSelectedCampaignId(null);
    }
  }, [campaigns, isOpen, mode]);

  const targetCampaign = useMemo(
    () =>
      selectedCampaignId === null
        ? null
        : campaigns.find((campaign) => campaign.id === selectedCampaignId) ??
          null,
    [campaigns, selectedCampaignId],
  );

  const titleId = `move-token-title-${token.id}`;

  const handleConfirm = async () => {
    setError(null);

    const nextToken: Token =
      mode === 'toWorld'
        ? { ...token, campaign_id: null }
        : { ...token, campaign_id: selectedCampaignId };

    try {
      await onConfirm(nextToken);
    } catch (caughtError) {
      setError(toErrorMessage(caughtError));
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      labelledBy={titleId}
      boxClassName="max-w-lg"
    >
      <h2 id={titleId} className="text-base-content text-lg font-semibold">
        {mode === 'toWorld' ? 'Move Token to World' : 'Move Token to Campaign'}
      </h2>

      <p className="text-base-content/90 mt-3 text-sm">
        {mode === 'toWorld'
          ? `Move "${token.name}" to World? It will no longer be campaign-scoped.`
          : `Move "${token.name}" to "${targetCampaign?.name ?? '...'}"?`}
      </p>

      {mode === 'toCampaign' ? (
        <div className="mt-4">
          <label htmlFor="move-token-campaign" className="label px-0 pb-1">
            <span className="label-text">Target Campaign</span>
          </label>
          <select
            id="move-token-campaign"
            className="select select-bordered w-full"
            value={selectedCampaignId ?? ''}
            onChange={(event) => {
              const value = Number(event.target.value);
              setSelectedCampaignId(Number.isNaN(value) ? null : value);
            }}
            disabled={isPending || campaigns.length === 0}
          >
            <option value="" disabled>
              Select a campaign...
            </option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
          {campaigns.length === 0 ? (
            <p className="text-base-content/70 mt-2 text-sm">
              No campaigns available in this world.
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-error mt-3 text-sm">{error}</p> : null}

      <div className="modal-action mt-5">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-ghost"
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            void handleConfirm();
          }}
          className="btn btn-primary"
          disabled={
            isPending ||
            (mode === 'toCampaign' &&
              (selectedCampaignId === null || campaigns.length === 0))
          }
        >
          {isPending ? (
            <span className="loading loading-spinner loading-xs" />
          ) : null}
          <span>{isPending ? 'Moving...' : 'Move'}</span>
        </button>
      </div>
    </ModalShell>
  );
}
