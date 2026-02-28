import { FormEvent, useState } from 'react';

type AddSessionInput = Parameters<DbApi['sessions']['add']>[0];

type SessionFormInitialValues = {
  name: string;
  notes: string | null;
};

type SessionFormProps = {
  mode?: 'create' | 'edit';
  campaignId: number;
  initialValues?: Partial<SessionFormInitialValues>;
  onSubmit: (data: AddSessionInput) => Promise<void>;
  onCancel: () => void;
};

export default function SessionForm({
  mode = 'create',
  campaignId,
  initialValues,
  onSubmit,
  onCancel,
}: SessionFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
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
        campaign_id: campaignId,
        name: trimmedName,
        notes: notes.trim() || null,
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
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <label
          htmlFor="session-name"
          className="block text-sm font-medium text-slate-800"
        >
          Name
        </label>
        <input
          id="session-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder="Enter session name"
          autoFocus
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="session-notes"
          className="block text-sm font-medium text-slate-800"
        >
          Notes (optional)
        </label>
        <textarea
          id="session-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder="Notes for this session."
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
              : 'Create session'}
        </button>
      </div>
    </form>
  );
}
