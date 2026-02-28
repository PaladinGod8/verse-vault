import { FormEvent, useState } from 'react';

type AddSceneInput = Parameters<DbApi['scenes']['add']>[0];

type SceneFormInitialValues = {
  name: string;
  notes: string | null;
  payload: string;
};

type SceneFormProps = {
  mode?: 'create' | 'edit';
  sessionId: number;
  initialValues?: Partial<SceneFormInitialValues>;
  onSubmit: (data: AddSceneInput) => Promise<void>;
  onCancel: () => void;
};

export default function SceneForm({
  mode = 'create',
  sessionId,
  initialValues,
  onSubmit,
  onCancel,
}: SceneFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [payload, setPayload] = useState(initialValues?.payload ?? '');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = mode === 'edit';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSubmitError('Scene name is required.');
      return;
    }

    const trimmedPayload = payload.trim();
    if (trimmedPayload) {
      try {
        JSON.parse(trimmedPayload);
      } catch {
        setSubmitError('Payload must be valid JSON.');
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        session_id: sessionId,
        name: trimmedName,
        notes: notes.trim() || null,
        payload: trimmedPayload || '{}',
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : isEditMode
            ? 'Failed to save scene changes.'
            : 'Failed to create scene.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <label
          htmlFor="scene-name"
          className="block text-sm font-medium text-slate-800"
        >
          Name
        </label>
        <input
          id="scene-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder="Enter scene name"
          autoFocus
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="scene-notes"
          className="block text-sm font-medium text-slate-800"
        >
          Notes (optional)
        </label>
        <textarea
          id="scene-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder="Notes for this scene."
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="scene-payload"
          className="block text-sm font-medium text-slate-800"
        >
          Payload JSON (optional)
        </label>
        <textarea
          id="scene-payload"
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          className="min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder="{}"
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
              : 'Create scene'}
        </button>
      </div>
    </form>
  );
}
