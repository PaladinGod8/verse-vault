type FactionTypeAndParentFieldsProps = {
  typeId: number | null;
  onTypeIdChange: (typeId: number | null) => void;
  factionTypes: FactionType[];
  onManageTypes: () => void;
  parentFactionId: number | null;
  onParentFactionIdChange: (parentFactionId: number | null) => void;
  availableParentFactions: Faction[];
  parentError: string | null;
  disabled?: boolean;
};

export default function FactionTypeAndParentFields({
  typeId,
  onTypeIdChange,
  factionTypes,
  onManageTypes,
  parentFactionId,
  onParentFactionIdChange,
  availableParentFactions,
  parentError,
  disabled = false,
}: FactionTypeAndParentFieldsProps) {
  return (
    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
      <div>
        <label htmlFor='faction-type' className='mb-1 block text-sm font-medium text-slate-700'>
          Type
        </label>
        <select
          id='faction-type'
          value={typeId ?? ''}
          onChange={(e) => onTypeIdChange(e.target.value ? Number(e.target.value) : null)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
          disabled={disabled}
        >
          <option value=''>Uncategorized</option>
          {factionTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
        </select>
        <button
          type='button'
          className='mt-1 text-xs font-medium text-slate-700 hover:text-slate-900'
          onClick={onManageTypes}
        >
          Manage Types
        </button>
      </div>

      <div>
        <label htmlFor='faction-parent' className='mb-1 block text-sm font-medium text-slate-700'>
          Parent Organization
        </label>
        <select
          id='faction-parent'
          value={parentFactionId ?? ''}
          onChange={(e) => onParentFactionIdChange(e.target.value ? Number(e.target.value) : null)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
          disabled={disabled}
        >
          <option value=''>None (top-level)</option>
          {availableParentFactions.map((faction) => (
            <option key={faction.id} value={faction.id}>{faction.name}</option>
          ))}
        </select>
        {parentError ? <p className='mt-1 text-xs text-rose-600'>{parentError}</p> : null}
      </div>
    </div>
  );
}
