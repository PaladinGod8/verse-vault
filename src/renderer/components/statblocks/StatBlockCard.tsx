interface StatBlockCardProps {
  statBlock: StatBlock;
  onEdit: (sb: StatBlock) => void;
  onDelete: (id: number) => void;
}

export default function StatBlockCard({
  statBlock,
  onEdit,
  onDelete,
}: StatBlockCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-900">
            {statBlock.name}
          </h2>
          {statBlock.description ? (
            <p className="text-sm text-slate-500">{statBlock.description}</p>
          ) : null}
          {statBlock.default_token_id !== null ? (
            <p className="text-xs text-slate-400">
              Token ID: {statBlock.default_token_id}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => onEdit(statBlock)}
            className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(statBlock.id)}
            className="text-sm font-medium text-rose-600 transition hover:text-rose-800"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
