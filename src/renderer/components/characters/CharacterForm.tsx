import { useState } from 'react';
import type {
  CharacterSections,
  CharacterWikiSummary,
} from '../../../shared/contracts/characterTypes';
import { useImageCropDraft } from '../../hooks/useImageCropDraft';
import { normalizeTokenImageSrc } from '../../lib/tokenImageSrc';
import EditorActionBar from '../ui/EditorActionBar';
import RichTextEditor from '../ui/RichTextEditor';
import CharacterImageField from './CharacterImageField';
import CharacterWikiSummaryEditor from './CharacterWikiSummaryEditor';

export type CharacterFormValues = {
  name: string;
  profile?: string | null;
  is_player_character: number;
  owner?: string | null;
  author?: string | null;
  image_src?: string | null;
  original_image_src?: string | null;
  image_crop?: string | null;
  image_edit_draft?: ReturnType<typeof useImageCropDraft>['imageEditDraft'];
  clear_image?: boolean;
  sections: CharacterSections;
  wiki_summary: CharacterWikiSummary;
};

type CharacterFormProps = {
  initialValues?: CharacterFormValues;
  onSave: (data: CharacterFormValues) => Promise<void> | void;
  onClose: () => void;
  isSaving: boolean;
};

const SECTION_FIELDS: Array<{ key: keyof CharacterSections; label: string; }> = [
  { key: 'background', label: 'Background' },
  { key: 'personality', label: 'Personality' },
  { key: 'relationships', label: 'Relationships' },
  { key: 'notes', label: 'Notes' },
];

type CharacterOwnerFieldProps = {
  owner: string;
  ownerError: string | null;
  isSaving: boolean;
  onChange: (value: string) => void;
};

function CharacterOwnerField({
  owner,
  ownerError,
  isSaving,
  onChange,
}: CharacterOwnerFieldProps) {
  return (
    <div>
      <label
        htmlFor='character-owner'
        className='mb-1 block text-sm font-medium text-slate-700'
      >
        Owner <span className='text-rose-500'>*</span>
      </label>
      <input
        id='character-owner'
        type='text'
        value={owner}
        onChange={(e) => onChange(e.target.value)}
        className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
        placeholder='Who owns this player character?'
        disabled={isSaving}
      />
      {ownerError ? <p className='mt-1 text-xs text-rose-600'>{ownerError}</p> : null}
    </div>
  );
}

export default function CharacterForm({
  initialValues,
  onSave,
  onClose,
  isSaving,
}: CharacterFormProps) {
  const initialImageSrc = normalizeTokenImageSrc(initialValues?.image_src);
  const initialOriginalImageSrc = normalizeTokenImageSrc(
    initialValues?.original_image_src,
  ) ?? initialImageSrc;
  const [name, setName] = useState(initialValues?.name ?? '');
  const [profile, setProfile] = useState(initialValues?.profile ?? '');
  const [isPlayerCharacter, setIsPlayerCharacter] = useState(
    initialValues?.is_player_character ?? 0,
  );
  const [owner, setOwner] = useState(initialValues?.owner ?? '');
  const [author, setAuthor] = useState(initialValues?.author ?? '');
  const [sections, setSections] = useState<CharacterSections>(initialValues?.sections ?? {});
  const [wikiSummary, setWikiSummary] = useState<CharacterWikiSummary>(
    initialValues?.wiki_summary ?? {},
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [clearImage, setClearImage] = useState(false);
  const cropDraft = useImageCropDraft({
    initialImageSrc,
    initialOriginalImageSrc,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Name is required.');
      return;
    }
    const trimmedOwner = owner.trim();
    if (isPlayerCharacter === 1 && !trimmedOwner) {
      setOwnerError('Owner is required for player characters.');
      return;
    }

    setNameError(null);
    setOwnerError(null);
    setImageUploadError(null);

    await onSave({
      name: trimmedName,
      profile: profile.trim() ? profile : null,
      is_player_character: isPlayerCharacter,
      owner: isPlayerCharacter === 1 ? trimmedOwner : null,
      author: author.trim() ? author.trim() : null,
      image_src: clearImage ? null : undefined,
      original_image_src: clearImage ? null : undefined,
      image_crop: clearImage ? null : undefined,
      image_edit_draft: cropDraft.imageEditDraft ?? undefined,
      clear_image: clearImage,
      sections,
      wiki_summary: wikiSummary,
    });
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <EditorActionBar>
        <button
          type='button'
          className='btn btn-ghost'
          onClick={onClose}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button type='submit' className='btn btn-primary' disabled={isSaving}>
          {isSaving ? <span className='loading loading-spinner loading-xs' /> : null}
          <span>{initialValues ? 'Save' : 'Create'}</span>
        </button>
      </EditorActionBar>

      <div>
        <label
          htmlFor='character-name'
          className='mb-1 block text-sm font-medium text-slate-700'
        >
          Name <span className='text-rose-500'>*</span>
        </label>
        <input
          id='character-name'
          type='text'
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(null);
          }}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
          placeholder='Character name'
          disabled={isSaving}
        />
        {nameError ? <p className='mt-1 text-xs text-rose-600'>{nameError}</p> : null}
      </div>

      <div>
        <label
          htmlFor='character-profile'
          className='mb-1 block text-sm font-medium text-slate-700'
        >
          Profile
        </label>
        <RichTextEditor
          id='character-profile'
          value={profile ?? ''}
          onChange={setProfile}
          variant='full'
          placeholder='A short description of this character'
          editable={!isSaving}
          aria-label='Profile'
        />
      </div>

      <div>
        <label className='flex items-center gap-2 text-sm font-medium text-slate-700'>
          <input
            type='checkbox'
            checked={isPlayerCharacter === 1}
            onChange={(e) => {
              const nextValue = e.target.checked ? 1 : 0;
              setIsPlayerCharacter(nextValue);
              if (nextValue === 0) {
                setOwner('');
                setOwnerError(null);
              }
            }}
            disabled={isSaving}
          />
          <span>Player Character</span>
        </label>
      </div>

      {isPlayerCharacter === 1
        ? (
          <CharacterOwnerField
            owner={owner}
            ownerError={ownerError}
            isSaving={isSaving}
            onChange={(value) => {
              setOwner(value);
              if (ownerError) setOwnerError(null);
            }}
          />
        )
        : null}

      <div>
        <label
          htmlFor='character-author'
          className='mb-1 block text-sm font-medium text-slate-700'
        >
          Author
        </label>
        <input
          id='character-author'
          type='text'
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
          placeholder='Who wrote this character?'
          disabled={isSaving}
        />
      </div>

      <CharacterImageField
        cropDraft={cropDraft}
        initialCropJson={initialValues?.image_crop}
        clearImage={clearImage}
        isSaving={isSaving}
        imageUploadError={imageUploadError}
        onClearImageChange={setClearImage}
        onImageUploadErrorChange={setImageUploadError}
      />

      <fieldset className='space-y-3'>
        <legend className='text-sm font-semibold text-slate-800'>Sections</legend>
        {SECTION_FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label
              htmlFor={`character-section-${key}`}
              className='mb-1 block text-xs font-medium text-slate-600'
            >
              {label}
            </label>
            <RichTextEditor
              id={`character-section-${key}`}
              value={sections[key] ?? ''}
              onChange={(md) => setSections({ ...sections, [key]: md })}
              variant='full'
              editable={!isSaving}
              aria-label={label}
            />
          </div>
        ))}
      </fieldset>

      <div className='space-y-6 border-t border-slate-200 pt-4'>
        <h3 className='text-sm font-semibold text-slate-900'>Wiki Summary</h3>
        <CharacterWikiSummaryEditor
          wikiSummary={wikiSummary}
          onChange={setWikiSummary}
          disabled={isSaving}
        />
      </div>
    </form>
  );
}
