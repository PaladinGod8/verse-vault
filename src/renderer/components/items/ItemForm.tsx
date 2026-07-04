import { useEffect, useRef, useState } from 'react';
import type { ImageEditDraft } from '../../lib/imageCrop';
import {
  buildImageEditDraft,
  guessFileNameFromImageSrc,
  validateImageFile,
} from '../../lib/imageCrop';
import { normalizeTokenImageSrc } from '../../lib/tokenImageSrc';
import ImageCropModal from '../media/ImageCropModal';
import EditorActionBar from '../ui/EditorActionBar';
import RichTextEditor from '../ui/RichTextEditor';
import ItemImageDropzone from './ItemImageDropzone';

export type ItemFormValues = {
  name: string;
  description?: string | null;
  image_src?: string | null;
  original_image_src?: string | null;
  image_crop?: string | null;
  image_edit_draft?: ImageEditDraft;
  clear_image?: boolean;
};

type ItemFormProps = {
  initialValues?: ItemFormValues;
  onSave: (data: ItemFormValues) => Promise<void> | void;
  onClose: () => void;
  isSaving: boolean;
};

type CropSourceState = {
  sourceImageSrc: string;
  sourceFileName: string;
  sourceMimeType: string;
  originalFile?: File | null;
  sourceImageRecordSrc?: string | null;
};

type ItemCurrentImageSectionProps = {
  imageSrc: string;
  label: string;
  clearImage: boolean;
  isSaving: boolean;
  onEditCrop: () => void;
  onReplaceImage: () => void;
  onClear: () => void;
};

function ItemCurrentImageSection({
  imageSrc,
  label,
  clearImage,
  isSaving,
  onEditCrop,
  onReplaceImage,
  onClear,
}: ItemCurrentImageSectionProps) {
  return (
    <div className='space-y-2'>
      <label className='block text-sm font-medium text-slate-700'>{label}</label>
      {clearImage
        ? (
          <div className='rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800'>
            Image will be cleared when you save.
          </div>
        )
        : (
          <div className='rounded-md border border-slate-200 bg-slate-50 p-3'>
            <img
              src={imageSrc}
              alt='Current item'
              className='h-20 w-20 rounded object-cover'
            />
          </div>
        )}
      <div className='flex flex-wrap gap-3 text-xs font-medium'>
        <button
          type='button'
          className='text-slate-700 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
          onClick={onEditCrop}
          disabled={isSaving}
        >
          Edit crop
        </button>
        <button
          type='button'
          className='text-slate-700 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
          onClick={onReplaceImage}
          disabled={isSaving}
        >
          Replace image
        </button>
        <button
          type='button'
          className='text-rose-600 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
          onClick={onClear}
          disabled={isSaving}
        >
          Clear image on save
        </button>
      </div>
    </div>
  );
}

export default function ItemForm({
  initialValues,
  onSave,
  onClose,
  isSaving,
}: ItemFormProps) {
  const initialImageSrc = normalizeTokenImageSrc(initialValues?.image_src);
  const initialOriginalImageSrc = normalizeTokenImageSrc(
    initialValues?.original_image_src,
  ) ?? initialImageSrc;
  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imageEditDraft, setImageEditDraft] = useState<ImageEditDraft | null>(null);
  const [cropSource, setCropSource] = useState<CropSourceState | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [clearImage, setClearImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (imageEditDraft?.preview_url) {
        URL.revokeObjectURL(imageEditDraft.preview_url);
      }
    };
  }, [imageEditDraft?.preview_url]);

  useEffect(() => {
    return () => {
      if (cropSource?.originalFile) {
        URL.revokeObjectURL(cropSource.sourceImageSrc);
      }
    };
  }, [cropSource?.originalFile, cropSource?.sourceImageSrc]);

  const activePreviewSrc = imageEditDraft?.preview_url ?? initialImageSrc;

  const closeCropSource = () => {
    if (cropSource?.originalFile) {
      URL.revokeObjectURL(cropSource.sourceImageSrc);
    }
    setCropSource(null);
  };

  const openCropperForFile = (file: File) => {
    setCropSource({
      sourceImageSrc: URL.createObjectURL(file),
      sourceFileName: file.name,
      sourceMimeType: file.type.toLowerCase(),
      originalFile: file,
    });
  };

  const openCropperForExistingImage = () => {
    const sourceImageSrc = imageEditDraft?.source_image_src
      ?? initialOriginalImageSrc
      ?? activePreviewSrc;
    if (!sourceImageSrc) {
      return;
    }

    setCropSource({
      sourceImageSrc,
      sourceFileName: guessFileNameFromImageSrc(sourceImageSrc),
      sourceMimeType: 'image/png',
      sourceImageRecordSrc: sourceImageSrc,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Name is required.');
      return;
    }

    setNameError(null);
    setImageUploadError(null);

    await onSave({
      name: trimmedName,
      description: description.trim() ? description : null,
      image_src: clearImage ? null : undefined,
      original_image_src: clearImage ? null : undefined,
      image_crop: clearImage ? null : undefined,
      image_edit_draft: imageEditDraft ?? undefined,
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
            if (nameError) {
              setNameError(null);
            }
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

      {activePreviewSrc
        ? (
          <ItemCurrentImageSection
            imageSrc={activePreviewSrc}
            label={imageEditDraft ? 'Cropped Preview' : 'Current Image'}
            clearImage={clearImage}
            isSaving={isSaving}
            onEditCrop={() => {
              if (selectedImageFile) {
                openCropperForFile(selectedImageFile);
                return;
              }
              openCropperForExistingImage();
            }}
            onReplaceImage={() => imageInputRef.current?.click()}
            onClear={() => {
              setClearImage(true);
              setSelectedImageFile(null);
              setImageEditDraft(null);
              setImageUploadError(null);
            }}
          />
        )
        : null}

      <ItemImageDropzone
        selectedFile={selectedImageFile}
        inputRef={imageInputRef}
        onFileSelect={(file) => {
          const validationError = validateImageFile(file);
          if (validationError) {
            setSelectedImageFile(null);
            setImageEditDraft(null);
            setImageUploadError(validationError);
            return;
          }

          setImageUploadError(null);
          openCropperForFile(file);
        }}
        onClearFile={() => {
          setSelectedImageFile(null);
          setImageEditDraft(null);
          setImageUploadError(null);
        }}
        error={imageUploadError}
        disabled={isSaving}
      />

      <ImageCropModal
        isOpen={cropSource !== null}
        title='Crop item image'
        sourceImageSrc={cropSource?.sourceImageSrc ?? ''}
        sourceFileName={cropSource?.sourceFileName ?? 'item-image.png'}
        sourceMimeType={cropSource?.sourceMimeType ?? 'image/png'}
        initialCropJson={imageEditDraft?.crop_json ?? initialValues?.image_crop ?? null}
        onCancel={closeCropSource}
        onApply={async (cropResult) => {
          if (!cropSource) {
            return;
          }

          try {
            const nextDraft = await buildImageEditDraft({
              cropResult,
              sourceFileName: cropSource.sourceFileName,
              originalFile: cropSource.originalFile,
              sourceImageSrc: cropSource.sourceImageRecordSrc ?? cropSource.sourceImageSrc,
            });
            setSelectedImageFile(cropSource.originalFile ?? null);
            setImageEditDraft(nextDraft);
            setClearImage(false);
            closeCropSource();
          } catch {
            setImageUploadError('Unable to read the selected image file. Try a different image.');
            closeCropSource();
          }
        }}
      />
    </form>
  );
}
