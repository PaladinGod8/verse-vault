import { useState } from 'react';

type TokenFormValues = {
  name: string;
  image_src: string | null;
  is_visible: number;
};

type TokenFormProps = {
  initialValues?: TokenFormValues;
  onSave: (data: TokenFormValues) => void;
  onClose: () => void;
  isSaving: boolean;
};

export default function TokenForm({
  initialValues,
  onSave,
  onClose,
  isSaving,
}: TokenFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [imageSrc, setImageSrc] = useState(initialValues?.image_src ?? '');
  const [isVisible, setIsVisible] = useState(initialValues?.is_visible ?? 1);
  const [nameError, setNameError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Name is required.');
      return;
    }
    setNameError(null);
    onSave({
      name: trimmedName,
      image_src: imageSrc.trim() === '' ? null : imageSrc.trim(),
      is_visible: isVisible,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="token-name"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Name <span className="text-rose-500">*</span>
        </label>
        <input
          id="token-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(null);
          }}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
          placeholder="Token name"
          disabled={isSaving}
        />
        {nameError ? (
          <p className="mt-1 text-xs text-rose-600">{nameError}</p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="token-image-src"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Image URL
        </label>
        <input
          id="token-image-src"
          type="text"
          value={imageSrc}
          onChange={(e) => setImageSrc(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
          placeholder="https://... or /path/to/image.png"
          disabled={isSaving}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="token-is-visible"
          type="checkbox"
          checked={isVisible === 1}
          onChange={(e) => setIsVisible(e.target.checked ? 1 : 0)}
          className="h-4 w-4 rounded border-slate-300"
          disabled={isSaving}
        />
        <label
          htmlFor="token-is-visible"
          className="text-sm font-medium text-slate-700"
        >
          Visible
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onClose}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSaving}>
          {isSaving ? (
            <span className="loading loading-spinner loading-xs" />
          ) : null}
          <span>{initialValues ? 'Save' : 'Create'}</span>
        </button>
      </div>
    </form>
  );
}
