type CharacterCurrentImageSectionProps = {
  imageSrc: string;
  label: string;
  altText?: string;
  clearImage: boolean;
  isSaving: boolean;
  onEditCrop: () => void;
  onReplaceImage: () => void;
  onClear: () => void;
};

export default function CharacterCurrentImageSection({
  imageSrc,
  label,
  altText = 'Current character',
  clearImage,
  isSaving,
  onEditCrop,
  onReplaceImage,
  onClear,
}: CharacterCurrentImageSectionProps) {
  return (
    <div className='space-y-2'>
      <label className='block text-sm font-medium text-slate-700'>{label}</label>
      {clearImage
        ? (
          <div className='rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800'>
            Image will be cleared when you save.
          </div>
        )
        : (
          <div className='rounded-md border border-slate-200 bg-slate-50 p-3'>
            <img
              src={imageSrc}
              alt={altText}
              className='h-20 w-20 rounded object-cover'
            />
          </div>
        )}
      <div className='flex flex-wrap gap-3 text-xs font-medium'>
        <button
          type='button'
          className='text-slate-700 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
          onClick={onEditCrop}
          disabled={isSaving}
        >
          Edit crop
        </button>
        <button
          type='button'
          className='text-slate-700 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
          onClick={onReplaceImage}
          disabled={isSaving}
        >
          Replace image
        </button>
        <button
          type='button'
          className='text-rose-600 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
          onClick={onClear}
          disabled={isSaving}
        >
          Clear image on save
        </button>
      </div>
    </div>
  );
}
