import { useEffect, useMemo, useState } from 'react';
import type {
  CharacterSections,
  CharacterWikiSummary,
} from '../../../shared/contracts/characterTypes';
import { normalizeTokenImageSrc } from '../../lib/tokenImageSrc';
import EditorActionBar from '../ui/EditorActionBar';
import CharacterImageDropzone from './CharacterImageDropzone';
import CharacterWikiSummaryEditor from './CharacterWikiSummaryEditor';

const CHARACTER_IMAGE_ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);
const CHARACTER_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export type CharacterImageUploadPayload = {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type CharacterFormValues = {
  name: string;
  profile?: string | null;
  author?: string | null;
  image_src?: string | null;
  image_upload?: CharacterImageUploadPayload;
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

function validateCharacterImageFile(file: File): string | null {
  const mimeType = file.type.toLowerCase();
  if (!CHARACTER_IMAGE_ALLOWED_MIME_TYPES.has(mimeType)) {
    return 'Unsupported image type. Use PNG, JPEG, WEBP, or GIF.';
  }
  if (file.size === 0) {
    return 'Selected file is empty.';
  }
  if (file.size > CHARACTER_IMAGE_MAX_SIZE_BYTES) {
    return 'Image exceeds 5 MB limit.';
  }
  return null;
}

export default function CharacterForm({
  initialValues,
  onSave,
  onClose,
  isSaving,
}: CharacterFormProps) {
  const isCreateMode = !initialValues;
  const initialImageSrc = normalizeTokenImageSrc(initialValues?.image_src);
  const [name, setName] = useState(initialValues?.name ?? '');
  const [profile, setProfile] = useState(initialValues?.profile ?? '');
  const [author, setAuthor] = useState(initialValues?.author ?? '');
  const [sections, setSections] = useState<CharacterSections>(initialValues?.sections ?? {});
  const [wikiSummary, setWikiSummary] = useState<CharacterWikiSummary>(
    initialValues?.wiki_summary ?? {},
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [clearImage, setClearImage] = useState(false);

  const selectedImagePreviewUrl = useMemo(
    () => selectedImageFile ? URL.createObjectURL(selectedImageFile) : undefined,
    [selectedImageFile],
  );

  useEffect(() => {
    return () => {
      if (selectedImagePreviewUrl) {
        URL.revokeObjectURL(selectedImagePreviewUrl);
      }
    };
  }, [selectedImagePreviewUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Name is required.');
      return;
    }

    let imageUpload: CharacterImageUploadPayload | undefined;
    if (selectedImageFile) {
      const validationError = validateCharacterImageFile(selectedImageFile);
      if (validationError) {
        setImageUploadError(validationError);
        return;
      }

      try {
        const buffer = await selectedImageFile.arrayBuffer();
        imageUpload = {
          fileName: selectedImageFile.name,
          mimeType: selectedImageFile.type.toLowerCase(),
          bytes: new Uint8Array(buffer),
        };
      } catch {
        setImageUploadError(
          'Unable to read the selected image file. Try a different image.',
        );
        return;
      }
    }

    setNameError(null);
    setImageUploadError(null);

    await onSave({
      name: trimmedName,
      profile: profile.trim() ? profile : null,
      author: author.trim() ? author.trim() : null,
      image_src: clearImage ? null : undefined,
      image_upload: imageUpload,
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
        <textarea
          id='character-profile'
          value={profile ?? ''}
          onChange={(e) => setProfile(e.target.value)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
          rows={4}
          placeholder='A short description of this character'
          disabled={isSaving}
        />
      </div>

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

      {!isCreateMode && initialImageSrc
        ? (
          <div className='space-y-2'>
            <label className='block text-sm font-medium text-slate-700'>Current Image</label>
            {clearImage
              ? (
                <div className='rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800'>
                  Image will be cleared when you save.
                </div>
              )
              : (
                <div className='rounded-md border border-slate-200 bg-slate-50 p-3'>
                  <img
                    src={selectedImagePreviewUrl ?? initialImageSrc}
                    alt='Current character'
                    className='h-20 w-20 rounded object-cover'
                  />
                </div>
              )}
            <button
              type='button'
              className='text-xs font-medium text-rose-600 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
              onClick={() => {
                setClearImage(true);
                setSelectedImageFile(null);
                setImageUploadError(null);
              }}
              disabled={isSaving}
            >
              Clear image on save
            </button>
          </div>
        )
        : null}

      <CharacterImageDropzone
        selectedFile={selectedImageFile}
        onFileSelect={(file) => {
          const validationError = validateCharacterImageFile(file);
          if (validationError) {
            setSelectedImageFile(null);
            setImageUploadError(validationError);
            return;
          }
          setSelectedImageFile(file);
          setClearImage(false);
          setImageUploadError(null);
        }}
        onClearFile={() => {
          setSelectedImageFile(null);
          setImageUploadError(null);
        }}
        error={imageUploadError}
        disabled={isSaving}
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
            <textarea
              id={`character-section-${key}`}
              value={sections[key] ?? ''}
              onChange={(e) => setSections({ ...sections, [key]: e.target.value })}
              className='w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
              rows={3}
              disabled={isSaving}
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
