import { FormEvent, useState } from 'react';

type AddCampaignInput = Parameters<DbApi['campaigns']['add']>[0];

type CampaignFormInitialValues = {
  name: string;
  summary: string | null;
};

type CampaignFormProps = {
  mode?: 'create' | 'edit';
  worldId: number;
  initialValues?: Partial<CampaignFormInitialValues>;
  onSubmit: (data: AddCampaignInput) => Promise<void>;
  onCancel: () => void;
};

export default function CampaignForm({
  mode = 'create',
  worldId,
  initialValues,
  onSubmit,
  onCancel,
}: CampaignFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [summary, setSummary] = useState(initialValues?.summary ?? '');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = mode === 'edit';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSubmitError('Campaign name is required.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        world_id: worldId,
        name: trimmedName,
        summary: summary.trim() || null,
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : isEditMode
          ? 'Failed to save campaign changes.'
          : 'Failed to create campaign.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className='space-y-4' onSubmit={handleSubmit}>
      <div className='space-y-1'>
        <label
          htmlFor='campaign-name'
          className='block text-sm font-medium text-slate-800'
        >
          Name
        </label>
        <input
          id='campaign-name'
          type='text'
          value={name}
          onChange={(event) => setName(event.target.value)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
          placeholder='Enter campaign name'
          autoFocus
          disabled={isSubmitting}
          required
        />
      </div>

      <div className='space-y-1'>
        <label
          htmlFor='campaign-summary'
          className='block text-sm font-medium text-slate-800'
        >
          Summary (optional)
        </label>
        <textarea
          id='campaign-summary'
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          className='min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
          placeholder='A brief summary of this campaign.'
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
            : 'Create campaign'}
        </button>
      </div>
    </form>
  );
}
