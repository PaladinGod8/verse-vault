import { useRef } from 'react';
import { useImageCropDraft } from '../../hooks/useImageCropDraft';
import { validateImageFile } from '../../lib/imageCrop';
import CharacterCurrentImageSection from '../characters/CharacterCurrentImageSection';
import ImageCropModal from '../media/ImageCropModal';
import LoreNoteImageDropzone from './LoreNoteImageDropzone';

type LoreNoteImageFieldProps = {
  cropDraft: ReturnType<typeof useImageCropDraft>;
  initialCropJson?: string | null;
  clearImage: boolean;
  isSaving: boolean;
  imageUploadError: string | null;
  onClearImageChange: (value: boolean) => void;
  onImageUploadErrorChange: (value: string | null) => void;
};

export default function LoreNoteImageField({
  cropDraft,
  initialCropJson,
  clearImage,
  isSaving,
  imageUploadError,
  onClearImageChange,
  onImageUploadErrorChange,
}: LoreNoteImageFieldProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const handleEditCrop = () => {
    if (cropDraft.selectedImageFile) {
      cropDraft.openCropperForFile(cropDraft.selectedImageFile);
      return;
    }

    cropDraft.openCropperForExistingImage();
  };

  const handleClear = () => {
    onClearImageChange(true);
    cropDraft.clearDraft();
    onImageUploadErrorChange(null);
  };

  return (
    <>
      {cropDraft.activePreviewSrc
        ? (
          <CharacterCurrentImageSection
            imageSrc={cropDraft.activePreviewSrc}
            label={cropDraft.imageEditDraft ? 'Cropped Preview' : 'Current Image'}
            altText='Current lore note'
            clearImage={clearImage}
            isSaving={isSaving}
            onEditCrop={handleEditCrop}
            onReplaceImage={() => imageInputRef.current?.click()}
            onClear={handleClear}
          />
        )
        : null}

      <LoreNoteImageDropzone
        selectedFile={cropDraft.selectedImageFile}
        inputRef={imageInputRef}
        onFileSelect={(file) => {
          const validationError = validateImageFile(file);
          if (validationError) {
            cropDraft.clearDraft();
            onImageUploadErrorChange(validationError);
            return;
          }

          onImageUploadErrorChange(null);
          cropDraft.openCropperForFile(file);
        }}
        onClearFile={() => {
          cropDraft.clearDraft();
          onImageUploadErrorChange(null);
        }}
        error={imageUploadError}
        disabled={isSaving}
      />

      <ImageCropModal
        isOpen={cropDraft.cropSource !== null}
        title='Crop lore note image'
        sourceImageSrc={cropDraft.cropSource?.sourceImageSrc ?? ''}
        sourceFileName={cropDraft.cropSource?.sourceFileName ?? 'lore-note-image.png'}
        sourceMimeType={cropDraft.cropSource?.sourceMimeType ?? 'image/png'}
        initialCropJson={cropDraft.imageEditDraft?.crop_json ?? initialCropJson ?? null}
        onCancel={cropDraft.closeCropSource}
        onApply={async (cropResult) => {
          const didApply = await cropDraft.applyCrop(cropResult);
          if (didApply) {
            onClearImageChange(false);
            return;
          }
          if (cropDraft.cropSource) {
            onImageUploadErrorChange(
              'Unable to read the selected image file. Try a different image.',
            );
          }
        }}
      />
    </>
  );
}
