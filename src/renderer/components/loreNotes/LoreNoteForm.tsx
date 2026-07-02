import { useEffect, useMemo, useState } from 'react';
import { normalizeTokenImageSrc } from '../../lib/tokenImageSrc';
import EditorActionBar from '../ui/EditorActionBar';
import LoreNoteImageDropzone from './LoreNoteImageDropzone';
import TagInput from './TagInput';

const LORE_NOTE_IMAGE_ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);
const LORE_NOTE_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export type LoreNoteImageUploadPayload = {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type LoreNoteFormValues = {
  name: string;
  content?: string | null;
  image_src?: string | null;
  image_upload?: LoreNoteImageUploadPayload;
  clear_image?: boolean;
  tags: string[];
};

type LoreNoteFormProps = {
  initialValues?: LoreNoteFormValues;
  onSave: (data: LoreNoteFormValues) => Promise<void> | void;
  onClose: () => void;
  isSaving: boolean;
  tagVocabulary: string[];
};

function validateLoreNoteImageFile(file: File): string | null {
  const mimeType = file.type.toLowerCase();
  if (!LORE_NOTE_IMAGE_ALLOWED_MIME_TYPES.has(mimeType)) {
    return 'Unsupported image type. Use PNG, JPEG, WEBP, or GIF.';
  }
  if (file.size === 0) {
    return 'Selected file is empty.';
  }
  if (file.size > LORE_NOTE_IMAGE_MAX_SIZE_BYTES) {
    return 'Image exceeds 5 MB limit.';
  }
  return null;
}

async function readLoreNoteImageUpload(
  selectedImageFile: File | null,
): Promise<{
  imageUpload?: LoreNoteImageUploadPayload;
  error?: string;
}> {
  if (!selectedImageFile) {
    return {};
  }

  const validationError = validateLoreNoteImageFile(selectedImageFile);
  if (validationError) {
    return { error: validationError };
  }

  try {
    const buffer = await selectedImageFile.arrayBuffer();
    return {
      imageUpload: {
        fileName: selectedImageFile.name,
        mimeType: selectedImageFile.type.toLowerCase(),
        bytes: new Uint8Array(buffer),
      },
    };
  } catch {
    return {
      error: 'Unable to read the selected image file. Try a different image.',
    };
  }
}

type LoreNoteCurrentImageSectionProps = {
  initialImageSrc: string;
  previewUrl?: string;
  clearImage: boolean;
  isSaving: boolean;
  onClear: () => void;
};

function LoreNoteCurrentImageSection({
  initialImageSrc,
  previewUrl,
  clearImage,
  isSaving,
  onClear,
}: LoreNoteCurrentImageSectionProps) {
  return (
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
              src={previewUrl ?? initialImageSrc}
              alt='Current lore note'
              className='h-20 w-20 rounded object-cover'
            />
          </div>
        )}
      <button
        type='button'
        className='text-xs font-medium text-rose-600 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
        onClick={onClear}
        disabled={isSaving}
      >
        Clear image on save
      </button>
    </div>
  );
}

export default function LoreNoteForm({
  initialValues,
  onSave,
  onClose,
  isSaving,
  tagVocabulary,
}: LoreNoteFormProps) {
  const isCreateMode = !initialValues;
  const initialImageSrc = normalizeTokenImageSrc(initialValues?.image_src);
  const [name, setName] = useState(initialValues?.name ?? '');
  const [content, setContent] = useState(initialValues?.content ?? '');
  const [tags, setTags] = useState<string[]>(initialValues?.tags ?? []);
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Name is required.');
      return;
    }

    const { imageUpload, error } = await readLoreNoteImageUpload(selectedImageFile);
    if (error) {
      setImageUploadError(error);
      return;
    }

    setNameError(null);
    setImageUploadError(null);

    await onSave({
      name: trimmedName,
      content: content.trim() ? content : null,
      image_src: clearImage ? null : undefined,
      image_upload: imageUpload,
      clear_image: clearImage,
      tags,
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
          htmlFor='lore-note-name'
          className='mb-1 block text-sm font-medium text-slate-700'
        >
          Name <span className='text-rose-500'>*</span>
        </label>
        <input
          id='lore-note-name'
          type='text'
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (nameError) setNameError(null);
          }}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
          placeholder='Lore note name'
          disabled={isSaving}
        />
        {nameError ? <p className='mt-1 text-xs text-rose-600'>{nameError}</p> : null}
      </div>

      <div>
        <label
          htmlFor='lore-note-content'
          className='mb-1 block text-sm font-medium text-slate-700'
        >
          Content
        </label>
        <textarea
          id='lore-note-content'
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
          rows={6}
          placeholder='Write this lore note...'
          disabled={isSaving}
        />
      </div>

      <TagInput
        tags={tags}
        onChange={setTags}
        suggestions={tagVocabulary}
        disabled={isSaving}
      />

      {!isCreateMode && initialImageSrc
        ? (
          <LoreNoteCurrentImageSection
            initialImageSrc={initialImageSrc}
            previewUrl={selectedImagePreviewUrl}
            clearImage={clearImage}
            isSaving={isSaving}
            onClear={() => {
              setClearImage(true);
              setSelectedImageFile(null);
              setImageUploadError(null);
            }}
          />
        )
        : null}

      <LoreNoteImageDropzone
        selectedFile={selectedImageFile}
        onFileSelect={(file) => {
          const validationError = validateLoreNoteImageFile(file);
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
    </form>
  );
}
