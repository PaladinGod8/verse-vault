import { useEffect, useState } from 'react';
import type { ImageCropApplyResult, ImageEditDraft } from '../lib/imageCrop';
import { buildImageEditDraft, guessFileNameFromImageSrc } from '../lib/imageCrop';

type CropSourceState = {
  sourceImageSrc: string;
  sourceFileName: string;
  sourceMimeType: string;
  originalFile?: File | null;
  sourceImageRecordSrc?: string | null;
};

type UseImageCropDraftParams = {
  initialImageSrc?: string | null;
  initialOriginalImageSrc?: string | null;
};

function useObjectUrlCleanup(url: string | null | undefined, shouldRevoke: boolean) {
  useEffect(() => {
    return () => {
      if (shouldRevoke && url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [shouldRevoke, url]);
}

function resolveExistingCropSource(params: {
  imageEditDraft: ImageEditDraft | null;
  initialOriginalImageSrc?: string | null;
  activePreviewSrc: string | null;
}): CropSourceState | null {
  const sourceImageSrc = params.imageEditDraft?.source_image_src
    ?? params.initialOriginalImageSrc
    ?? params.activePreviewSrc;
  if (!sourceImageSrc) {
    return null;
  }

  return {
    sourceImageSrc,
    sourceFileName: guessFileNameFromImageSrc(sourceImageSrc),
    sourceMimeType: 'image/png',
    sourceImageRecordSrc: sourceImageSrc,
  };
}

function buildFileCropSource(file: File): CropSourceState {
  return {
    sourceImageSrc: URL.createObjectURL(file),
    sourceFileName: file.name,
    sourceMimeType: file.type.toLowerCase(),
    originalFile: file,
  };
}

export function useImageCropDraft({
  initialImageSrc,
  initialOriginalImageSrc,
}: UseImageCropDraftParams) {
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imageEditDraft, setImageEditDraft] = useState<ImageEditDraft | null>(null);
  const [cropSource, setCropSource] = useState<CropSourceState | null>(null);
  const activePreviewSrc = imageEditDraft?.preview_url ?? initialImageSrc ?? null;

  useObjectUrlCleanup(imageEditDraft?.preview_url, Boolean(imageEditDraft?.preview_url));
  useObjectUrlCleanup(cropSource?.sourceImageSrc, Boolean(cropSource?.originalFile));

  const closeCropSource = () => {
    if (cropSource?.originalFile) {
      URL.revokeObjectURL(cropSource.sourceImageSrc);
    }
    setCropSource(null);
  };

  const openCropperForFile = (file: File) => setCropSource(buildFileCropSource(file));

  const openCropperForExistingImage = () => {
    const nextCropSource = resolveExistingCropSource({
      imageEditDraft,
      initialOriginalImageSrc,
      activePreviewSrc,
    });
    if (nextCropSource) {
      setCropSource(nextCropSource);
    }
  };

  const clearDraft = () => {
    setSelectedImageFile(null);
    setImageEditDraft(null);
  };

  const applyCrop = async (cropResult: ImageCropApplyResult): Promise<boolean> => {
    if (!cropSource) {
      return false;
    }

    try {
      const nextDraft = await buildImageEditDraft({
        cropResult,
        sourceFileName: cropSource.sourceFileName,
        originalFile: cropSource.originalFile,
        sourceImageSrc: cropSource.sourceImageRecordSrc ?? cropSource.sourceImageSrc,
      });
      setSelectedImageFile(cropSource.originalFile ?? null);
      setImageEditDraft(nextDraft);
      closeCropSource();
      return true;
    } catch {
      closeCropSource();
      return false;
    }
  };

  return {
    selectedImageFile,
    setSelectedImageFile,
    imageEditDraft,
    setImageEditDraft,
    cropSource,
    activePreviewSrc,
    closeCropSource,
    openCropperForFile,
    openCropperForExistingImage,
    clearDraft,
    applyCrop,
  };
}
