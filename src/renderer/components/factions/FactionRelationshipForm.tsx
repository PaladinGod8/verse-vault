import { useState } from 'react';
import EditorActionBar from '../ui/EditorActionBar';

export type FactionRelationshipFormValues = {
  related_faction_id: number;
  faction_label: string;
  related_label: string;
};

type FactionRelationshipFormProps = {
  factionId: number;
  allFactionsInWorld: Faction[];
  initialValues?: FactionRelationshipFormValues;
  onSave: (data: FactionRelationshipFormValues) => Promise<void> | void;
  onClose: () => void;
  isSaving: boolean;
};

export default function FactionRelationshipForm({
  factionId,
  allFactionsInWorld,
  initialValues,
  onSave,
  onClose,
  isSaving,
}: FactionRelationshipFormProps) {
  const [relatedFactionId, setRelatedFactionId] = useState(
    initialValues?.related_faction_id ?? 0,
  );
  const [factionLabel, setFactionLabel] = useState(initialValues?.faction_label ?? '');
  const [relatedLabel, setRelatedLabel] = useState(initialValues?.related_label ?? '');
  const [error, setError] = useState<string | null>(null);

  const availableCounterparts = allFactionsInWorld.filter((faction) => faction.id !== factionId);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (relatedFactionId === 0) {
      setError('Select a faction.');
      return;
    }
    if (!factionLabel.trim() || !relatedLabel.trim()) {
      setError('Both relationship labels are required.');
      return;
    }

    setError(null);
    void onSave({
      related_faction_id: relatedFactionId,
      faction_label: factionLabel.trim(),
      related_label: relatedLabel.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <EditorActionBar>
        <button type='button' className='btn btn-ghost' onClick={onClose} disabled={isSaving}>
          Cancel
        </button>
        <button type='submit' className='btn btn-primary' disabled={isSaving}>
          {isSaving ? <span className='loading loading-spinner loading-xs' /> : null}
          <span>{initialValues ? 'Save' : 'Create'}</span>
        </button>
      </EditorActionBar>

      <div>
        <label
          htmlFor='faction-relationship-counterpart'
          className='mb-1 block text-sm font-semibold text-slate-900'
        >
          Counterpart
        </label>
        <select
          id='faction-relationship-counterpart'
          value={relatedFactionId || ''}
          onChange={(e) => setRelatedFactionId(e.target.value ? Number(e.target.value) : 0)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
          disabled={isSaving || Boolean(initialValues)}
        >
          <option value=''>Select a faction...</option>
          {availableCounterparts.map((faction) => (
            <option key={faction.id} value={faction.id}>{faction.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor='faction-relationship-faction-label'
          className='text-sm font-semibold text-slate-900'
        >
          This faction calls them
        </label>
        <input
          id='faction-relationship-faction-label'
          type='text'
          value={factionLabel}
          onChange={(e) => setFactionLabel(e.target.value)}
          placeholder='e.g. Rival'
          className='mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
          disabled={isSaving}
        />
      </div>

      <div>
        <label
          htmlFor='faction-relationship-related-label'
          className='text-sm font-semibold text-slate-900'
        >
          They call this faction
        </label>
        <input
          id='faction-relationship-related-label'
          type='text'
          value={relatedLabel}
          onChange={(e) => setRelatedLabel(e.target.value)}
          placeholder='e.g. Rival'
          className='mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
          disabled={isSaving}
        />
      </div>

      {error ? <p className='text-sm text-rose-600'>{error}</p> : null}
    </form>
  );
}
