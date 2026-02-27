import { FormEvent, useState } from 'react';

type AddAbilityInput = Parameters<DbApi['abilities']['add']>[0];

type AbilityFormInitialValues = {
  name: string;
  description: string | null;
  type: string;
  passive_subtype: string | null;
  trigger: string | null;
};

type AbilityFormProps = {
  mode?: 'create' | 'edit';
  worldId: number;
  initialValues?: Partial<AbilityFormInitialValues>;
  onSubmit: (data: AddAbilityInput) => Promise<void>;
  onCancel: () => void;
};

const ABILITY_TYPE_OPTIONS = ['active', 'passive'] as const;
const PASSIVE_SUBTYPE_OPTIONS = ['linchpin', 'keystone', 'rostering'] as const;

export default function AbilityForm({
  mode = 'create',
  worldId,
  initialValues,
  onSubmit,
  onCancel,
}: AbilityFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(
    initialValues?.description ?? '',
  );
  const [type, setType] = useState(initialValues?.type ?? '');
  const [passiveSubtype, setPassiveSubtype] = useState(
    initialValues?.passive_subtype ?? '',
  );
  const [trigger, setTrigger] = useState(initialValues?.trigger ?? '');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = mode === 'edit';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSubmitError('Ability name is required.');
      return;
    }

    const trimmedType = type.trim();
    if (!trimmedType) {
      setSubmitError('Ability type is required.');
      return;
    }

    if (!ABILITY_TYPE_OPTIONS.includes(trimmedType as 'active' | 'passive')) {
      setSubmitError('Ability type must be active or passive.');
      return;
    }

    const trimmedPassiveSubtype = passiveSubtype.trim();
    if (
      trimmedPassiveSubtype &&
      !PASSIVE_SUBTYPE_OPTIONS.includes(
        trimmedPassiveSubtype as 'linchpin' | 'keystone' | 'rostering',
      )
    ) {
      setSubmitError(
        'Passive subtype must be linchpin, keystone, or rostering.',
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        world_id: worldId,
        name: trimmedName,
        description: description.trim() || null,
        type: trimmedType,
        passive_subtype: trimmedPassiveSubtype || null,
        trigger: trigger.trim() || null,
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : isEditMode
            ? 'Failed to save ability changes.'
            : 'Failed to create ability.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <label
          htmlFor="ability-name"
          className="block text-sm font-medium text-slate-800"
        >
          Name
        </label>
        <input
          id="ability-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder="Enter ability name"
          autoFocus
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="ability-type"
          className="block text-sm font-medium text-slate-800"
        >
          Type
        </label>
        <select
          id="ability-type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          disabled={isSubmitting}
          required
        >
          <option value="">Select type</option>
          <option value="active">active</option>
          <option value="passive">passive</option>
        </select>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="ability-passive-subtype"
          className="block text-sm font-medium text-slate-800"
        >
          Passive subtype (optional)
        </label>
        <select
          id="ability-passive-subtype"
          value={passiveSubtype}
          onChange={(event) => setPassiveSubtype(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          disabled={isSubmitting}
        >
          <option value="">None</option>
          <option value="linchpin">linchpin</option>
          <option value="keystone">keystone</option>
          <option value="rostering">rostering</option>
        </select>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="ability-trigger"
          className="block text-sm font-medium text-slate-800"
        >
          Trigger (optional)
        </label>
        <input
          id="ability-trigger"
          type="text"
          value={trigger}
          onChange={(event) => setTrigger(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder="e.g. On hit, On dodge"
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="ability-description"
          className="block text-sm font-medium text-slate-800"
        >
          Description (optional)
        </label>
        <textarea
          id="ability-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder="A quick summary of this ability."
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
              : 'Create ability'}
        </button>
      </div>
    </form>
  );
}
