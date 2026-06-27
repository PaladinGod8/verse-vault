import TokenRow from './TokenRow';

type TokensListSectionProps = {
  isLoading: boolean;
  error: string | null;
  tokens: Token[];
  campaigns: Campaign[];
  deletingTokenId: number | null;
  isMoveDialogPending: boolean;
  isSaving: boolean;
  onEdit: (token: Token) => void;
  onMoveToWorld: (token: Token) => void;
  onMoveToCampaign: (token: Token) => void;
  onCopyToCampaign: (token: Token) => void;
  onDeleteRequest: (token: Token) => void;
};

export default function TokensListSection({
  isLoading,
  error,
  tokens,
  campaigns,
  deletingTokenId,
  isMoveDialogPending,
  isSaving,
  onEdit,
  onMoveToWorld,
  onMoveToCampaign,
  onCopyToCampaign,
  onDeleteRequest,
}: TokensListSectionProps) {
  if (isLoading) {
    return (
      <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
        Loading tokens...
      </section>
    );
  }

  if (error) {
    return (
      <section className='rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm'>
        {error}
      </section>
    );
  }

  if (tokens.length === 0) {
    return (
      <section className='rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
        <p className='text-sm text-slate-600'>No tokens yet.</p>
      </section>
    );
  }

  return (
    <section className='rounded-xl border border-slate-200 bg-white shadow-sm'>
      <table className='w-full text-sm text-slate-700'>
        <thead>
          <tr className='border-b border-slate-200'>
            <th className='px-4 py-3 text-left font-medium text-slate-500'>Image</th>
            <th className='px-4 py-3 text-left font-medium text-slate-500'>Name</th>
            <th className='px-4 py-3 text-left font-medium text-slate-500'>Grid</th>
            <th className='px-4 py-3 text-left font-medium text-slate-500'>Scope</th>
            <th className='px-4 py-3 text-left font-medium text-slate-500'>Updated</th>
            <th className='px-4 py-3 text-left font-medium text-slate-500'>Created</th>
            <th className='px-4 py-3 text-left font-medium text-slate-500'>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => (
            <TokenRow
              key={token.id}
              token={token}
              campaigns={campaigns}
              isDeleting={deletingTokenId === token.id}
              isMoveDialogPending={isMoveDialogPending}
              isSaving={isSaving}
              onEdit={onEdit}
              onMoveToWorld={onMoveToWorld}
              onMoveToCampaign={onMoveToCampaign}
              onCopyToCampaign={onCopyToCampaign}
              onDeleteRequest={onDeleteRequest}
            />
          ))}
        </tbody>
      </table>
    </section>
  );
}
