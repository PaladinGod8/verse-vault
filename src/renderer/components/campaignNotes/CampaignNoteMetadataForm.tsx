import { useState } from 'react';
import TagInput from '../loreNotes/TagInput';
import EditorActionBar from '../ui/EditorActionBar';

export type CampaignNoteMetadataFormValues = {
  name: string;
  tags: string[];
};

type CampaignNoteMetadataFormProps = {
  initialValues?: CampaignNoteMetadataFormValues;
  onSave: (data: CampaignNoteMetadataFormValues) => Promise<void> | void;
  onClose: () => void;
  isSaving: boolean;
  tagVocabulary: string[];
  submitLabel: string;
};

export default function CampaignNoteMetadataForm({
  initialValues,
  onSave,
  onClose,
  isSaving,
  tagVocabulary,
  submitLabel,
}: CampaignNoteMetadataFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [tags, setTags] = useState<string[]>(initialValues?.tags ?? []);
  const [nameError, setNameError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Name is required.');
      return;
    }

    setNameError(null);
    await onSave({ name: trimmedName, tags });
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <EditorActionBar>
        <button type='button' className='btn btn-ghost' onClick={onClose} disabled={isSaving}>
          Cancel
        </button>
        <button type='submit' className='btn btn-primary' disabled={isSaving}>
          {isSaving ? <span className='loading loading-spinner loading-xs' /> : null}
          <span>{submitLabel}</span>
        </button>
      </EditorActionBar>

      <div>
        <label
          htmlFor='campaign-note-name'
          className='mb-1 block text-sm font-medium text-slate-700'
        >
          Name <span className='text-rose-500'>*</span>
        </label>
        <input
          id='campaign-note-name'
          type='text'
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (nameError) setNameError(null);
          }}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
          placeholder='Campaign note name'
          disabled={isSaving}
        />
        {nameError ? <p className='mt-1 text-xs text-rose-600'>{nameError}</p> : null}
      </div>

      <TagInput
        tags={tags}
        onChange={setTags}
        suggestions={tagVocabulary}
        disabled={isSaving}
      />
    </form>
  );
}
