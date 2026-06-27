type FactionNameFieldProps = {
  name: string;
  onChange: (name: string) => void;
  error: string | null;
  disabled?: boolean;
};

export default function FactionNameField({
  name,
  onChange,
  error,
  disabled = false,
}: FactionNameFieldProps) {
  return (
    <div>
      <label htmlFor='faction-name' className='mb-1 block text-sm font-medium text-slate-700'>
        Name <span className='text-rose-500'>*</span>
      </label>
      <input
        id='faction-name'
        type='text'
        value={name}
        onChange={(e) => onChange(e.target.value)}
        className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
        placeholder='Faction name'
        disabled={disabled}
      />
      {error ? <p className='mt-1 text-xs text-rose-600'>{error}</p> : null}
    </div>
  );
}
