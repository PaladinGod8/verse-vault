import { useState } from 'react';
import type { ResourceStatisticDefinition } from '../../shared/statisticsTypes';

type Props = {
  mode: 'create' | 'edit';
  initialValues?: ResourceStatisticDefinition;
  existingIds: string[];
  onSubmit: (data: ResourceStatisticDefinition) => void | Promise<void>;
  onCancel: () => void;
};

export default function ResourceDefinitionForm({
  mode,
  initialValues,
  existingIds,
  onSubmit,
  onCancel,
}: Props) {
  const [id, setId] = useState(initialValues?.id ?? '');
  const [name, setName] = useState(initialValues?.name ?? '');
  const [abbreviation, setAbbreviation] = useState(
    initialValues?.abbreviation ?? '',
  );
  const [description, setDescription] = useState(
    initialValues?.description ?? '',
  );
  const [isDefault, setIsDefault] = useState(initialValues?.isDefault ?? true);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedId = id.trim().toLowerCase();
    const trimmedName = name.trim();
    const trimmedAbbreviation = abbreviation.trim();

    if (!trimmedId) {
      setError('ID is required.');
      return;
    }

    if (!trimmedName) {
      setError('Name is required.');
      return;
    }

    if (!trimmedAbbreviation) {
      setError('Abbreviation is required.');
      return;
    }

    // Check for duplicate ID (only in create mode or if ID changed in edit mode)
    if (
      mode === 'create' ||
      (mode === 'edit' && trimmedId !== initialValues?.id)
    ) {
      if (existingIds.includes(trimmedId)) {
        setError('A resource with this ID already exists.');
        return;
      }
    }

    setIsPending(true);

    try {
      await onSubmit({
        id: trimmedId,
        name: trimmedName,
        abbreviation: trimmedAbbreviation,
        description: description.trim() || undefined,
        isDefault,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save resource.');
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="resource-id"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="resource-id"
          value={id}
          onChange={(e) => setId(e.target.value)}
          disabled={mode === 'edit' || isPending}
          placeholder="e.g., hp, mp, ac"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
          required
        />
        <p className="mt-1 text-xs text-slate-500">
          Lowercase letters and underscores only. Cannot be changed after
          creation.
        </p>
      </div>

      <div>
        <label
          htmlFor="resource-name"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="resource-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          placeholder="e.g., Hit Points"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50"
          required
        />
      </div>

      <div>
        <label
          htmlFor="resource-abbreviation"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Abbreviation <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="resource-abbreviation"
          value={abbreviation}
          onChange={(e) => setAbbreviation(e.target.value)}
          disabled={isPending}
          placeholder="e.g., HP"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50"
          required
        />
      </div>

      <div>
        <label
          htmlFor="resource-description"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Description
        </label>
        <textarea
          id="resource-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
          placeholder="Optional description..."
          rows={2}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="resource-is-default"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          disabled={isPending}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <label
          htmlFor="resource-is-default"
          className="ml-2 text-sm text-slate-700"
        >
          Include in new statblocks by default
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
        </button>
      </div>
    </form>
  );
}
