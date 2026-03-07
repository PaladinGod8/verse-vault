import { useState } from 'react';
import ModalShell from '../ui/ModalShell';

type CopyTokenToCampaignDialogProps = {
  token: Token;
  campaigns: Campaign[];
  onConfirm: (campaignId: number) => void;
  onClose: () => void;
  isSaving: boolean;
};

export default function CopyTokenToCampaignDialog({
  token,
  campaigns,
  onConfirm,
  onClose,
  isSaving,
}: CopyTokenToCampaignDialogProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<number>(
    campaigns[0]?.id ?? 0,
  );

  const titleId = `copy-token-title-${token.id}`;

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      labelledBy={titleId}
      boxClassName='max-w-lg'
    >
      <h2 id={titleId} className='text-base-content text-lg font-semibold'>
        Copy &quot;{token.name}&quot; to Campaign
      </h2>

      {campaigns.length === 0
        ? (
          <p className='text-base-content/80 mt-4 text-sm'>
            No campaigns in this world.
          </p>
        )
        : (
          <div className='mt-4 space-y-4'>
            <div>
              <label
                htmlFor='copy-campaign-select'
                className='mb-1 block text-sm font-medium text-slate-700'
              >
                Campaign
              </label>
              <select
                id='copy-campaign-select'
                className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(Number(e.target.value))}
                disabled={isSaving}
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className='flex justify-end gap-2'>
              <button
                type='button'
                className='btn btn-ghost'
                onClick={onClose}
                disabled={isSaving}
                autoFocus
              >
                Cancel
              </button>
              <button
                type='button'
                className='btn btn-primary'
                onClick={() => onConfirm(selectedCampaignId)}
                disabled={isSaving || selectedCampaignId === 0}
              >
                {isSaving ? <span className='loading loading-spinner loading-xs' /> : null}
                <span>Copy</span>
              </button>
            </div>
          </div>
        )}

      {campaigns.length === 0
        ? (
          <div className='mt-4 flex justify-end'>
            <button
              type='button'
              className='btn btn-ghost'
              onClick={onClose}
              autoFocus
            >
              Close
            </button>
          </div>
        )
        : null}
    </ModalShell>
  );
}
