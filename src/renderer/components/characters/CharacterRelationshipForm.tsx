import { useState } from 'react';
import CharacterCombobox from '../factions/CharacterCombobox';
import EditorActionBar from '../ui/EditorActionBar';

export type CharacterRelationshipFormValues = {
  related_character_id: number;
  character_label: string;
  related_label: string;
};

type CharacterRelationshipFormProps = {
  worldId: number;
  characterId: number;
  initialValues?: CharacterRelationshipFormValues;
  onSave: (data: CharacterRelationshipFormValues) => Promise<void> | void;
  onClose: () => void;
  isSaving: boolean;
};

export default function CharacterRelationshipForm({
  worldId,
  characterId,
  initialValues,
  onSave,
  onClose,
  isSaving,
}: CharacterRelationshipFormProps) {
  const [relatedCharacterId, setRelatedCharacterId] = useState(
    initialValues?.related_character_id ?? 0,
  );
  const [characterLabel, setCharacterLabel] = useState(initialValues?.character_label ?? '');
  const [relatedLabel, setRelatedLabel] = useState(initialValues?.related_label ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (relatedCharacterId === 0) {
      setError('Select a character.');
      return;
    }
    if (!characterLabel.trim() || !relatedLabel.trim()) {
      setError('Both relationship labels are required.');
      return;
    }

    setError(null);
    void onSave({
      related_character_id: relatedCharacterId,
      character_label: characterLabel.trim(),
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
        <label className='text-sm font-semibold text-slate-900'>Counterpart</label>
        <CharacterCombobox
          worldId={worldId}
          value={relatedCharacterId}
          excludeCharacterIds={[characterId]}
          onChange={(id) => setRelatedCharacterId(id)}
          disabled={isSaving || Boolean(initialValues)}
        />
      </div>

      <div>
        <label
          htmlFor='character-relationship-character-label'
          className='text-sm font-semibold text-slate-900'
        >
          This character calls them
        </label>
        <input
          id='character-relationship-character-label'
          type='text'
          value={characterLabel}
          onChange={(e) => setCharacterLabel(e.target.value)}
          placeholder='e.g. Mentor'
          className='mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
          disabled={isSaving}
        />
      </div>

      <div>
        <label
          htmlFor='character-relationship-related-label'
          className='text-sm font-semibold text-slate-900'
        >
          They call this character
        </label>
        <input
          id='character-relationship-related-label'
          type='text'
          value={relatedLabel}
          onChange={(e) => setRelatedLabel(e.target.value)}
          placeholder='e.g. Student'
          className='mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
          disabled={isSaving}
        />
      </div>

      {error ? <p className='text-sm text-rose-600'>{error}</p> : null}
    </form>
  );
}
