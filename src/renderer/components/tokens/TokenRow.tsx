import { normalizeTokenImageSrc } from '../../lib/tokenImageSrc';

function scopeLabel(token: Token, campaigns: Campaign[]): string {
  if (token.campaign_id === null) return 'World';
  const campaign = campaigns.find((c) => c.id === token.campaign_id);
  return campaign ? `Campaign: ${campaign.name}` : 'Campaign';
}

function gridTypeLabel(gridType: TokenGridType): string {
  return gridType === 'hex' ? 'Hex' : 'Square';
}

type TokenRowProps = {
  token: Token;
  campaigns: Campaign[];
  isDeleting: boolean;
  isMoveDialogPending: boolean;
  isSaving: boolean;
  onEdit: (token: Token) => void;
  onMoveToWorld: (token: Token) => void;
  onMoveToCampaign: (token: Token) => void;
  onCopyToCampaign: (token: Token) => void;
  onDeleteRequest: (token: Token) => void;
};

export default function TokenRow({
  token,
  campaigns,
  isDeleting,
  isMoveDialogPending,
  isSaving,
  onEdit,
  onMoveToWorld,
  onMoveToCampaign,
  onCopyToCampaign,
  onDeleteRequest,
}: TokenRowProps) {
  const tokenImageSrc = normalizeTokenImageSrc(token.image_src);

  return (
    <tr className='border-b border-slate-100 last:border-0'>
      <td className='px-4 py-3'>
        {tokenImageSrc
          ? (
            <img
              src={tokenImageSrc}
              alt={token.name}
              className='h-10 w-10 rounded object-cover'
            />
          )
          : <div className='h-10 w-10 rounded bg-slate-200' />}
      </td>
      <td className='px-4 py-3 font-medium'>{token.name}</td>
      <td className='px-4 py-3'>
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
            token.grid_type === 'hex'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {gridTypeLabel(token.grid_type)}
        </span>
      </td>
      <td className='px-4 py-3 text-slate-500'>
        {scopeLabel(token, campaigns)}
      </td>
      <td className='px-4 py-3 text-slate-500'>
        {new Date(token.updated_at).toLocaleDateString()}
      </td>
      <td className='px-4 py-3 text-slate-500'>
        {new Date(token.created_at).toLocaleDateString()}
      </td>
      <td className='px-4 py-3'>
        <div className='flex gap-3'>
          <button
            type='button'
            onClick={() => onEdit(token)}
            className='text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
            disabled={isDeleting || isMoveDialogPending}
          >
            Edit
          </button>

          {token.campaign_id === null
            ? (
              <>
                <button
                  type='button'
                  onClick={() => onMoveToCampaign(token)}
                  className='text-sm font-medium text-indigo-600 transition hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-60'
                  disabled={isDeleting || isMoveDialogPending}
                >
                  Move to Campaign
                </button>
                <button
                  type='button'
                  onClick={() => onCopyToCampaign(token)}
                  className='text-sm font-medium text-indigo-600 transition hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-60'
                  disabled={isDeleting || isSaving}
                >
                  Copy to Campaign
                </button>
              </>
            )
            : (
              <>
                <button
                  type='button'
                  onClick={() => onMoveToWorld(token)}
                  className='text-sm font-medium text-indigo-600 transition hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-60'
                  disabled={isDeleting || isMoveDialogPending}
                >
                  Move to World
                </button>
                <button
                  type='button'
                  onClick={() => onMoveToCampaign(token)}
                  className='text-sm font-medium text-indigo-600 transition hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-60'
                  disabled={isDeleting || isMoveDialogPending}
                >
                  Move to Campaign
                </button>
              </>
            )}

          <button
            type='button'
            onClick={() => onDeleteRequest(token)}
            className='text-sm font-medium text-rose-600 transition hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60'
            disabled={isDeleting || isMoveDialogPending}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </td>
    </tr>
  );
}
