import { useState } from 'react';
import { useImageCropDraft } from '../../hooks/useImageCropDraft';
import { normalizeTokenImageSrc } from '../../lib/tokenImageSrc';
import EditorActionBar from '../ui/EditorActionBar';
import RichTextEditor from '../ui/RichTextEditor';
import LoreNoteImageField from './LoreNoteImageField';
import TagInput from './TagInput';

export type LoreNoteFormValues = {
  name: string;
  content?: string | null;
  image_src?: string | null;
  original_image_src?: string | null;
  image_crop?: string | null;
  image_edit_draft?: ReturnType<typeof useImageCropDraft>['imageEditDraft'];
  clear_image?: boolean;
  canvas_enabled: boolean;
  tags: string[];
};

type LoreNoteFormProps = {
  initialValues?: LoreNoteFormValues;
  onSave: (data: LoreNoteFormValues) => Promise<void> | void;
  onClose: () => void;
  isSaving: boolean;
  tagVocabulary: string[];
};

export default function LoreNoteForm({
  initialValues,
  onSave,
  onClose,
  isSaving,
  tagVocabulary,
}: LoreNoteFormProps) {
  const initialImageSrc = normalizeTokenImageSrc(initialValues?.image_src);
  const initialOriginalImageSrc = normalizeTokenImageSrc(
    initialValues?.original_image_src,
  ) ?? initialImageSrc;
  const [name, setName] = useState(initialValues?.name ?? '');
  const [content, setContent] = useState(initialValues?.content ?? '');
  const [tags, setTags] = useState<string[]>(initialValues?.tags ?? []);
  const [nameError, setNameError] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [clearImage, setClearImage] = useState(false);
  const [canvasEnabled, setCanvasEnabled] = useState(initialValues?.canvas_enabled ?? false);
  const cropDraft = useImageCropDraft({
    initialImageSrc,
    initialOriginalImageSrc,
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Name is required.');
      return;
    }

    setNameError(null);
    setImageUploadError(null);

    await onSave({
      name: trimmedName,
      content: content.trim() ? content : null,
      image_src: clearImage ? null : undefined,
      original_image_src: clearImage ? null : undefined,
      image_crop: clearImage ? null : undefined,
      image_edit_draft: cropDraft.imageEditDraft ?? undefined,
      clear_image: clearImage,
      canvas_enabled: canvasEnabled,
      tags,
    });
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <EditorActionBar>
        <button
          type='button'
          className='btn btn-ghost'
          onClick={onClose}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button type='submit' className='btn btn-primary' disabled={isSaving}>
          {isSaving ? <span className='loading loading-spinner loading-xs' /> : null}
          <span>{initialValues ? 'Save' : 'Create'}</span>
        </button>
      </EditorActionBar>

      <div>
        <label
          htmlFor='lore-note-name'
          className='mb-1 block text-sm font-medium text-slate-700'
        >
          Name <span className='text-rose-500'>*</span>
        </label>
        <input
          id='lore-note-name'
          type='text'
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (nameError) {
              setNameError(null);
            }
          }}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
          placeholder='Lore note name'
          disabled={isSaving}
        />
        {nameError ? <p className='mt-1 text-xs text-rose-600'>{nameError}</p> : null}
      </div>

      <div>
        <label
          htmlFor='lore-note-content'
          className='mb-1 block text-sm font-medium text-slate-700'
        >
          Content
        </label>
        <RichTextEditor
          id='lore-note-content'
          value={content}
          onChange={setContent}
          variant='full'
          placeholder='Write this lore note...'
          editable={!isSaving}
          aria-label='Content'
        />
      </div>

      <TagInput
        tags={tags}
        onChange={setTags}
        suggestions={tagVocabulary}
        disabled={isSaving}
      />

      <label className='flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3'>
        <input
          type='checkbox'
          aria-label='Enable canvas'
          checked={canvasEnabled}
          onChange={(event) => setCanvasEnabled(event.target.checked)}
          className='mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500'
          disabled={isSaving}
        />
        <span className='space-y-1'>
          <span className='block text-sm font-medium text-slate-700'>Enable canvas</span>
          <span className='block text-xs text-slate-500'>
            Add dedicated Excalidraw canvas for whiteboard-style lore work.
          </span>
        </span>
      </label>

      <LoreNoteImageField
        cropDraft={cropDraft}
        initialCropJson={initialValues?.image_crop}
        clearImage={clearImage}
        isSaving={isSaving}
        imageUploadError={imageUploadError}
        onClearImageChange={setClearImage}
        onImageUploadErrorChange={setImageUploadError}
      />
    </form>
  );
}
