import { FormEvent, useEffect, useRef, useState } from 'react';
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
import WorldImageDropzone from './WorldImageDropzone';

export type WorldFormValues = {
  name: string;
  thumbnail?: string | null;
  original_thumbnail_src?: string | null;
  thumbnail_crop?: string | null;
  short_description?: string | null;
  image_edit_draft?: ImageEditDraft;
  clear_thumbnail?: boolean;
};

type WorldFormInitialValues = {
  name: string;
  thumbnail: string | null;
  original_thumbnail_src: string | null;
  thumbnail_crop: string | null;
  short_description: string | null;
};

type WorldFormProps = {
  mode?: 'create' | 'edit';
  initialValues?: Partial<WorldFormInitialValues>;
  onSubmit: (data: WorldFormValues) => Promise<void>;
  onCancel: () => void;
};

type CropSourceState = {
  sourceImageSrc: string;
  sourceFileName: string;
  sourceMimeType: string;
  originalFile?: File | null;
  sourceImageRecordSrc?: string | null;
};

type WorldCurrentThumbnailSectionProps = {
  imageSrc: string;
  label: string;
  clearThumbnail: boolean;
  disabled: boolean;
  onEditCrop: () => void;
  onReplaceImage: () => void;
  onClear: () => void;
};

function WorldCurrentThumbnailSection({
  imageSrc,
  label,
  clearThumbnail,
  disabled,
  onEditCrop,
  onReplaceImage,
  onClear,
}: WorldCurrentThumbnailSectionProps) {
  return (
    <div className='space-y-2'>
      <p className='text-sm font-medium text-slate-800'>{label}</p>
      {clearThumbnail
        ? (
          <div className='rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800'>
            Thumbnail will be cleared when you save.
          </div>
        )
        : (
          <img
            src={imageSrc}
            alt='Current world thumbnail'
            className='h-24 w-auto rounded-lg border border-slate-200 object-cover'
          />
        )}
      <div className='flex flex-wrap gap-3 text-xs font-medium'>
        <button
          type='button'
          className='text-slate-700 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
          onClick={onEditCrop}
          disabled={disabled}
        >
          Edit crop
        </button>
        <button
          type='button'
          className='text-slate-700 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
          onClick={onReplaceImage}
          disabled={disabled}
        >
          Replace image
        </button>
        <button
          type='button'
          className='text-rose-600 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
          onClick={onClear}
          disabled={disabled}
        >
          Clear image on save
        </button>
      </div>
    </div>
  );
}

export default function WorldForm({
  mode = 'create',
  initialValues,
  onSubmit,
  onCancel,
}: WorldFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const initialThumbnailSrc = normalizeTokenImageSrc(initialValues?.thumbnail);
  const initialOriginalThumbnailSrc = normalizeTokenImageSrc(
    initialValues?.original_thumbnail_src,
  ) ?? initialThumbnailSrc;
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [imageEditDraft, setImageEditDraft] = useState<ImageEditDraft | null>(null);
  const [cropSource, setCropSource] = useState<CropSourceState | null>(null);
  const [thumbnailUploadError, setThumbnailUploadError] = useState<string | null>(null);
  const [clearThumbnail, setClearThumbnail] = useState(false);
  const [shortDescription, setShortDescription] = useState(
    initialValues?.short_description ?? '',
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const isEditMode = mode === 'edit';

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

  const activeThumbnailSrc = imageEditDraft?.preview_url ?? initialThumbnailSrc;

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
      ?? initialOriginalThumbnailSrc
      ?? activeThumbnailSrc;
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

  const handleThumbnailClear = () => {
    setThumbnailFile(null);
    setImageEditDraft(null);
    setClearThumbnail(true);
    setThumbnailUploadError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSubmitError('World name is required.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        name: trimmedName,
        thumbnail: clearThumbnail ? null : undefined,
        original_thumbnail_src: clearThumbnail ? null : undefined,
        thumbnail_crop: clearThumbnail ? null : undefined,
        short_description: shortDescription.trim() || null,
        image_edit_draft: imageEditDraft ?? undefined,
        clear_thumbnail: clearThumbnail,
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : isEditMode
          ? 'Failed to save world changes.'
          : 'Failed to create world.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className='space-y-4' onSubmit={handleSubmit}>
      <EditorActionBar>
        <button
          type='button'
          onClick={onCancel}
          className='rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type='submit'
          className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
          disabled={isSubmitting}
        >
          {isSubmitting
            ? isEditMode
              ? 'Saving...'
              : 'Creating...'
            : isEditMode
            ? 'Save changes'
            : 'Create world'}
        </button>
      </EditorActionBar>

      <div className='space-y-1'>
        <label
          htmlFor='world-name'
          className='block text-sm font-medium text-slate-800'
        >
          Name
        </label>
        <input
          id='world-name'
          type='text'
          value={name}
          onChange={(event) => setName(event.target.value)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
          placeholder='Enter world name'
          autoFocus
          disabled={isSubmitting}
          required
        />
      </div>

      {activeThumbnailSrc
        ? (
          <WorldCurrentThumbnailSection
            imageSrc={activeThumbnailSrc}
            label={imageEditDraft ? 'Cropped Preview' : 'Current thumbnail'}
            clearThumbnail={clearThumbnail}
            disabled={isSubmitting}
            onEditCrop={() => {
              if (thumbnailFile) {
                openCropperForFile(thumbnailFile);
                return;
              }
              openCropperForExistingImage();
            }}
            onReplaceImage={() => imageInputRef.current?.click()}
            onClear={handleThumbnailClear}
          />
        )
        : null}

      <WorldImageDropzone
        selectedFile={thumbnailFile}
        inputRef={imageInputRef}
        onFileSelect={(file) => {
          const validationError = validateImageFile(file);
          if (validationError) {
            setThumbnailFile(null);
            setImageEditDraft(null);
            setThumbnailUploadError(validationError);
            return;
          }
          setThumbnailUploadError(null);
          openCropperForFile(file);
        }}
        onClearFile={() => {
          setThumbnailFile(null);
          setImageEditDraft(null);
          setThumbnailUploadError(null);
        }}
        error={thumbnailUploadError}
        disabled={isSubmitting}
      />

      <div className='space-y-1'>
        <label
          htmlFor='world-short-description'
          className='block text-sm font-medium text-slate-800'
        >
          Short description (optional)
        </label>
        <RichTextEditor
          id='world-short-description'
          value={shortDescription}
          onChange={setShortDescription}
          variant='compact'
          placeholder='A quick summary of this world.'
          editable={!isSubmitting}
          aria-label='Short description (optional)'
        />
      </div>

      {submitError
        ? (
          <p className='rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
            {submitError}
          </p>
        )
        : null}

      <ImageCropModal
        isOpen={cropSource !== null}
        title='Crop world thumbnail'
        sourceImageSrc={cropSource?.sourceImageSrc ?? ''}
        sourceFileName={cropSource?.sourceFileName ?? 'world-thumbnail.png'}
        sourceMimeType={cropSource?.sourceMimeType ?? 'image/png'}
        initialCropJson={imageEditDraft?.crop_json ?? initialValues?.thumbnail_crop ?? null}
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
            setThumbnailFile(cropSource.originalFile ?? null);
            setImageEditDraft(nextDraft);
            setClearThumbnail(false);
            closeCropSource();
          } catch {
            setThumbnailUploadError(
              'Unable to read the selected image file. Try a different image.',
            );
            closeCropSource();
          }
        }}
      />
    </form>
  );
}
