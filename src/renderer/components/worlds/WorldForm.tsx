import { FormEvent, useState } from 'react';

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
  const [thumbnail, setThumbnail] = useState(initialValues?.thumbnail ?? '');
  const [shortDescription, setShortDescription] = useState(
    initialValues?.short_description ?? '',
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = mode === 'edit';

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
        thumbnail: thumbnail.trim() || null,
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
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <label
          htmlFor="world-name"
          className="block text-sm font-medium text-slate-800"
        >
          Name
        </label>
        <input
          id="world-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder="Enter world name"
          autoFocus
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="world-thumbnail"
          className="block text-sm font-medium text-slate-800"
        >
          Thumbnail URL (optional)
        </label>
        <input
          id="world-thumbnail"
          type="url"
          value={thumbnail}
          onChange={(event) => setThumbnail(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder="https://example.com/image.jpg"
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="world-short-description"
          className="block text-sm font-medium text-slate-800"
        >
          Short description (optional)
        </label>
        <textarea
          id="world-short-description"
          value={shortDescription}
          onChange={(event) => setShortDescription(event.target.value)}
          className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder="A quick summary of this world."
          disabled={isSubmitting}
        />
      </div>

      {submitError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {submitError}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
      </div>
    </form>
  );
}
