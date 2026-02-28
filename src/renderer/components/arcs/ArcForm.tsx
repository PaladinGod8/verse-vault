import { useEffect, useState } from 'react';

type Props = {
  initialValues?: { name: string };
  onSubmit: (data: { name: string }) => void;
  onCancel: () => void;
  submitLabel: string;
};

export default function ArcForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
}: Props) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(initialValues?.name ?? '');
    setError(null);
  }, [initialValues]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Arc name is required');
      return;
    }
    setError(null);
    onSubmit({ name: trimmed });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="arc-name"
          className="text-sm font-medium text-slate-700"
        >
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="arc-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          placeholder="Arc name"
          autoFocus
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
