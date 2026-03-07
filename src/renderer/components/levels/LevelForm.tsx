import { FormEvent, useState } from 'react';

type AddLevelInput = Parameters<DbApi['levels']['add']>[0];

type LevelFormInitialValues = {
  name: string;
  category: string;
  description: string | null;
};

type LevelFormProps = {
  mode?: 'create' | 'edit';
  worldId: number;
  initialValues?: Partial<LevelFormInitialValues>;
  onSubmit: (data: AddLevelInput) => Promise<void>;
  onCancel: () => void;
};

export default function LevelForm({
  mode = 'create',
  worldId,
  initialValues,
  onSubmit,
  onCancel,
}: LevelFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [category, setCategory] = useState(initialValues?.category ?? '');
  const [description, setDescription] = useState(
    initialValues?.description ?? '',
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = mode === 'edit';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSubmitError('Level name is required.');
      return;
    }

    const trimmedCategory = category.trim();
    if (!trimmedCategory) {
      setSubmitError('Category is required.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        world_id: worldId,
        name: trimmedName,
        category: trimmedCategory,
        description: description.trim() || null,
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : isEditMode
          ? 'Failed to save level changes.'
          : 'Failed to create level.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className='space-y-4' onSubmit={handleSubmit}>
      <div className='space-y-1'>
        <label
          htmlFor='level-name'
          className='block text-sm font-medium text-slate-800'
        >
          Name
        </label>
        <input
          id='level-name'
          type='text'
          value={name}
          onChange={(event) => setName(event.target.value)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
          placeholder='Enter level name'
          autoFocus
          disabled={isSubmitting}
          required
        />
      </div>

      <div className='space-y-1'>
        <label
          htmlFor='level-category'
          className='block text-sm font-medium text-slate-800'
        >
          Category
        </label>
        <input
          id='level-category'
          type='text'
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
          placeholder='e.g. Class, Race, Background'
          disabled={isSubmitting}
          required
        />
      </div>

      <div className='space-y-1'>
        <label
          htmlFor='level-description'
          className='block text-sm font-medium text-slate-800'
        >
          Description (optional)
        </label>
        <textarea
          id='level-description'
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className='min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
          placeholder='A quick summary of this level.'
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
            : 'Create level'}
        </button>
      </div>
    </form>
  );
}
