type FactionCurrentImagePreviewProps = {
  imageSrc: string;
  previewUrl?: string;
  isCleared: boolean;
  onClear: () => void;
  disabled?: boolean;
};

export default function FactionCurrentImagePreview({
  imageSrc,
  previewUrl,
  isCleared,
  onClear,
  disabled = false,
}: FactionCurrentImagePreviewProps) {
  return (
    <div className='space-y-2'>
      <label className='block text-sm font-medium text-slate-700'>Current Image</label>
      {isCleared
        ? (
          <div className='rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800'>
            Image will be cleared when you save.
          </div>
        )
        : (
          <div className='rounded-md border border-slate-200 bg-slate-50 p-3'>
            <img
              src={previewUrl ?? imageSrc}
              alt='Current faction'
              className='h-20 w-20 rounded object-cover'
            />
          </div>
        )}
      <button
        type='button'
        className='text-xs font-medium text-rose-600 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
        onClick={onClear}
        disabled={disabled}
      >
        Clear image on save
      </button>
    </div>
  );
}
