import { useRef } from 'react';
import { useImageCropDraft } from '../../hooks/useImageCropDraft';
import { validateImageFile } from '../../lib/imageCrop';
import ImageCropModal from '../media/ImageCropModal';
import FactionCurrentImagePreview from './FactionCurrentImagePreview';
import FactionImageDropzone from './FactionImageDropzone';

type FactionImageFieldProps = {
  cropDraft: ReturnType<typeof useImageCropDraft>;
  initialCropJson?: string | null;
  clearImage: boolean;
  isSaving: boolean;
  imageUploadError: string | null;
  onClearImageChange: (value: boolean) => void;
  onImageUploadErrorChange: (value: string | null) => void;
};

export default function FactionImageField({
  cropDraft,
  initialCropJson,
  clearImage,
  isSaving,
  imageUploadError,
  onClearImageChange,
  onImageUploadErrorChange,
}: FactionImageFieldProps) {
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
          <FactionCurrentImagePreview
            imageSrc={cropDraft.activePreviewSrc}
            previewUrl={cropDraft.imageEditDraft?.preview_url}
            isCleared={clearImage}
            onEditCrop={handleEditCrop}
            onReplaceImage={() => imageInputRef.current?.click()}
            onClear={handleClear}
            disabled={isSaving}
          />
        )
        : null}

      <FactionImageDropzone
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
        title='Crop faction image'
        sourceImageSrc={cropDraft.cropSource?.sourceImageSrc ?? ''}
        sourceFileName={cropDraft.cropSource?.sourceFileName ?? 'faction-image.png'}
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
