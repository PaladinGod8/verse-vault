import { FormEvent, useState } from 'react';

type AddSessionInput = Parameters<DbApi['sessions']['add']>[0];

type SessionFormInitialValues = {
  name: string;
  notes: string | null;
  planned_at: string | null;
};

type SessionFormProps = {
  mode?: 'create' | 'edit';
  actId: number;
  initialValues?: Partial<SessionFormInitialValues>;
  onSubmit: (data: AddSessionInput) => Promise<void>;
  onCancel: () => void;
};

export default function SessionForm({
  mode = 'create',
  actId,
  initialValues,
  onSubmit,
  onCancel,
}: SessionFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [plannedAt, setPlannedAt] = useState(
    toDatetimeLocalInputValue(initialValues?.planned_at),
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = mode === 'edit';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSubmitError('Session name is required.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        act_id: actId,
        name: trimmedName,
        notes: notes.trim() || null,
        planned_at: plannedAt.trim() || null,
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : isEditMode
          ? 'Failed to save session changes.'
          : 'Failed to create session.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className='space-y-4' onSubmit={handleSubmit}>
      <div className='space-y-1'>
        <label
          htmlFor='session-name'
          className='block text-sm font-medium text-slate-800'
        >
          Name
        </label>
        <input
          id='session-name'
          type='text'
          value={name}
          onChange={(event) => setName(event.target.value)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
          placeholder='Enter session name'
          autoFocus
          disabled={isSubmitting}
          required
        />
      </div>

      <div className='space-y-1'>
        <label
          htmlFor='session-notes'
          className='block text-sm font-medium text-slate-800'
        >
          Notes (optional)
        </label>
        <textarea
          id='session-notes'
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className='min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
          placeholder='Notes for this session.'
          disabled={isSubmitting}
        />
      </div>

      <div className='space-y-1'>
        <label
          htmlFor='session-planned-at'
          className='block text-sm font-medium text-slate-800'
        >
          Planned date-time (optional)
        </label>
        <input
          id='session-planned-at'
          type='datetime-local'
          value={plannedAt}
          onChange={(event) => setPlannedAt(event.target.value)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
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
            : 'Create session'}
        </button>
      </div>
    </form>
  );
}

function toDatetimeLocalInputValue(value?: string | null): string {
  if (!value) {
    return '';
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return '';
  }

  const normalizedMatch = trimmedValue.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/,
  );
  if (normalizedMatch) {
    return `${normalizedMatch[1]}T${normalizedMatch[2]}`;
  }

  const parsed = new Date(
    trimmedValue.includes('T')
      ? trimmedValue
      : `${trimmedValue.replace(' ', 'T')}Z`,
  );
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = String(parsed.getFullYear());
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
