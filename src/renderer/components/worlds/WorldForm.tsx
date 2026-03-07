import { FormEvent, useState } from 'react';
import WorldImageDropzone from './WorldImageDropzone';

type AddWorldInput = Parameters<DbApi['worlds']['add']>[0];

type WorldFormInitialValues = {
  name: string;
  thumbnail: string | null;
  short_description: string | null;
};

type WorldFormProps = {
  mode?: 'create' | 'edit';
  initialValues?: Partial<WorldFormInitialValues>;
  onSubmit: (data: AddWorldInput) => Promise<void>;
  onCancel: () => void;
};

export default function WorldForm({
  mode = 'create',
  initialValues,
  onSubmit,
  onCancel,
}: WorldFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(
    initialValues?.thumbnail ?? null,
  );
  const [thumbnailUploadError, setThumbnailUploadError] = useState<
    string | null
  >(null);
  const [isImportingImage, setIsImportingImage] = useState(false);
  const [shortDescription, setShortDescription] = useState(
    initialValues?.short_description ?? '',
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = mode === 'edit';

  const handleThumbnailFileSelect = async (file: File) => {
    setThumbnailUploadError(null);
    setIsImportingImage(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await window.db.worlds.importImage({
        fileName: file.name,
        mimeType: file.type,
        bytes,
      });
      setThumbnailFile(file);
      setThumbnailSrc(result.image_src);
    } catch (err) {
      setThumbnailUploadError(
        err instanceof Error ? err.message : 'Failed to upload thumbnail.',
      );
      setThumbnailFile(null);
    } finally {
      setIsImportingImage(false);
    }
  };

  const handleThumbnailClear = () => {
    setThumbnailFile(null);
    setThumbnailSrc(null);
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
        thumbnail: thumbnailSrc,
        short_description: shortDescription.trim() || null,
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

      {thumbnailSrc && !thumbnailFile
        ? (
          <div className='space-y-1'>
            <p className='text-sm font-medium text-slate-800'>
              Current thumbnail
            </p>
            <img
              src={thumbnailSrc}
              alt='Current world thumbnail'
              className='h-24 w-auto rounded-lg border border-slate-200 object-cover'
            />
            <button
              type='button'
              className='text-xs font-medium text-rose-600 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
              onClick={handleThumbnailClear}
              disabled={isSubmitting || isImportingImage}
            >
              Remove thumbnail
            </button>
          </div>
        )
        : null}

      <WorldImageDropzone
        selectedFile={thumbnailFile}
        onFileSelect={handleThumbnailFileSelect}
        onClearFile={handleThumbnailClear}
        error={thumbnailUploadError}
        disabled={isSubmitting || isImportingImage}
      />

      <div className='space-y-1'>
        <label
          htmlFor='world-short-description'
          className='block text-sm font-medium text-slate-800'
        >
          Short description (optional)
        </label>
        <textarea
          id='world-short-description'
          value={shortDescription}
          onChange={(event) => setShortDescription(event.target.value)}
          className='min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
          placeholder='A quick summary of this world.'
          disabled={isSubmitting}
        />
      </div>

      {submitError
        ? (
          <p className='rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
            {submitError}
          </p>
        )
        : null}

      <div className='flex justify-end gap-2'>
        <button
          type='button'
          onClick={onCancel}
          className='rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
          disabled={isSubmitting || isImportingImage}
        >
          Cancel
        </button>
        <button
          type='submit'
          className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
          disabled={isSubmitting || isImportingImage}
        >
          {isSubmitting
            ? isEditMode
              ? 'Saving...'
              : 'Creating...'
            : isEditMode
            ? 'Save changes'
            : 'Create world'}
        </button>
      </div>
    </form>
  );
}
