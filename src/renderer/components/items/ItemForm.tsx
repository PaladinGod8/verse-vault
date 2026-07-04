import { useEffect, useMemo, useState } from 'react';
import { normalizeTokenImageSrc } from '../../lib/tokenImageSrc';
import EditorActionBar from '../ui/EditorActionBar';
import RichTextEditor from '../ui/RichTextEditor';
import ItemImageDropzone from './ItemImageDropzone';

const ITEM_IMAGE_ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);
const ITEM_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export type ItemImageUploadPayload = {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type ItemFormValues = {
  name: string;
  description?: string | null;
  image_src?: string | null;
  image_upload?: ItemImageUploadPayload;
  clear_image?: boolean;
};

type ItemFormProps = {
  initialValues?: ItemFormValues;
  onSave: (data: ItemFormValues) => Promise<void> | void;
  onClose: () => void;
  isSaving: boolean;
};

function validateItemImageFile(file: File): string | null {
  const mimeType = file.type.toLowerCase();
  if (!ITEM_IMAGE_ALLOWED_MIME_TYPES.has(mimeType)) {
    return 'Unsupported image type. Use PNG, JPEG, WEBP, or GIF.';
  }
  if (file.size === 0) {
    return 'Selected file is empty.';
  }
  if (file.size > ITEM_IMAGE_MAX_SIZE_BYTES) {
    return 'Image exceeds 5 MB limit.';
  }
  return null;
}

async function readItemImageUpload(
  selectedImageFile: File | null,
): Promise<{
  imageUpload?: ItemImageUploadPayload;
  error?: string;
}> {
  if (!selectedImageFile) {
    return {};
  }

  const validationError = validateItemImageFile(selectedImageFile);
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

type ItemCurrentImageSectionProps = {
  initialImageSrc: string;
  previewUrl?: string;
  clearImage: boolean;
  isSaving: boolean;
  onClear: () => void;
};

function ItemCurrentImageSection({
  initialImageSrc,
  previewUrl,
  clearImage,
  isSaving,
  onClear,
}: ItemCurrentImageSectionProps) {
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
              alt='Current item'
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

export default function ItemForm({
  initialValues,
  onSave,
  onClose,
  isSaving,
}: ItemFormProps) {
  const isCreateMode = !initialValues;
  const initialImageSrc = normalizeTokenImageSrc(initialValues?.image_src);
  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
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

    const { imageUpload, error } = await readItemImageUpload(selectedImageFile);
    if (error) {
      setImageUploadError(error);
      return;
    }

    setNameError(null);
    setImageUploadError(null);

    await onSave({
      name: trimmedName,
      description: description.trim() ? description : null,
      image_src: clearImage ? null : undefined,
      image_upload: imageUpload,
      clear_image: clearImage,
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
          htmlFor='item-name'
          className='mb-1 block text-sm font-medium text-slate-700'
        >
          Name <span className='text-rose-500'>*</span>
        </label>
        <input
          id='item-name'
          type='text'
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (nameError) setNameError(null);
          }}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
          placeholder='Item name'
          disabled={isSaving}
        />
        {nameError ? <p className='mt-1 text-xs text-rose-600'>{nameError}</p> : null}
      </div>

      <div>
        <label
          htmlFor='item-description'
          className='mb-1 block text-sm font-medium text-slate-700'
        >
          Description
        </label>
        <RichTextEditor
          id='item-description'
          value={description}
          onChange={setDescription}
          variant='full'
          placeholder='Describe this item'
          editable={!isSaving}
          aria-label='Description'
        />
      </div>

      {!isCreateMode && initialImageSrc
        ? (
          <ItemCurrentImageSection
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

      <ItemImageDropzone
        selectedFile={selectedImageFile}
        onFileSelect={(file) => {
          const validationError = validateItemImageFile(file);
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
