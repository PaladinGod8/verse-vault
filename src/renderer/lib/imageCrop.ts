import type { StoredImageCrop } from '../../shared/contracts/imageCropTypes';
import { normalizeAnyMediaImageSrc } from '../../shared/media/imageSource';

const IMAGE_ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);
const IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const CROP_PREVIEW_CARD_WIDTH = 320;
const CROP_PREVIEW_CARD_HEIGHT = 160;
const CROP_PREVIEW_SQUARE_SIZE = 320;

export type ImageUploadPayload = {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type ImageEditDraft = {
  original_upload?: ImageUploadPayload;
  cropped_upload: ImageUploadPayload;
  crop_json: string;
  preview_url: string;
  source_image_src?: string | null;
};

export type ImageCropApplyResult = {
  croppedBlob: Blob;
  crop: StoredImageCrop;
};

export type ImageCropAspectPresetId = 'card' | 'square' | 'free';

export type ImageCropAspectPreset = {
  id: ImageCropAspectPresetId;
  label: string;
  aspectRatio: number | null;
};

export const IMAGE_CROP_ASPECT_PRESETS: ImageCropAspectPreset[] = [
  { id: 'card', label: 'Card', aspectRatio: 2 },
  { id: 'square', label: 'Square', aspectRatio: 1 },
  { id: 'free', label: 'Free', aspectRatio: null },
];

export function validateImageFile(file: File): string | null {
  const mimeType = file.type.toLowerCase();
  if (!IMAGE_ALLOWED_MIME_TYPES.has(mimeType)) {
    return 'Unsupported image type. Use PNG, JPEG, WEBP, or GIF.';
  }
  if (file.size === 0) {
    return 'Selected file is empty.';
  }
  if (file.size > IMAGE_MAX_SIZE_BYTES) {
    return 'Image exceeds 5 MB limit.';
  }
  return null;
}

export async function fileToImageUploadPayload(file: File): Promise<ImageUploadPayload> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return {
    fileName: file.name,
    mimeType: file.type.toLowerCase(),
    bytes,
  };
}

export async function blobToImageUploadPayload(
  blob: Blob,
  fileName: string,
): Promise<ImageUploadPayload> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return {
    fileName,
    mimeType: blob.type,
    bytes,
  };
}

export function parseStoredImageCrop(
  cropJson: string | null | undefined,
): StoredImageCrop | null {
  if (typeof cropJson !== 'string') {
    return null;
  }

  const trimmed = cropJson.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as StoredImageCrop;
  } catch {
    return null;
  }
}

export function stringifyStoredImageCrop(crop: StoredImageCrop): string {
  return JSON.stringify(crop);
}

export function aspectRatioToPresetId(
  aspectRatio: number | null | undefined,
): ImageCropAspectPresetId {
  if (aspectRatio === 2) {
    return 'card';
  }
  if (aspectRatio === 1) {
    return 'square';
  }
  return 'free';
}

export function presetIdToAspectRatio(
  presetId: ImageCropAspectPresetId,
): number | null {
  return IMAGE_CROP_ASPECT_PRESETS.find((preset) => preset.id === presetId)?.aspectRatio ?? null;
}

export function buildCropOutputSize(
  presetId: ImageCropAspectPresetId,
  selectionWidth: number,
  selectionHeight: number,
): { width: number; height: number; } {
  if (presetId === 'card') {
    return { width: CROP_PREVIEW_CARD_WIDTH, height: CROP_PREVIEW_CARD_HEIGHT };
  }
  if (presetId === 'square') {
    return { width: CROP_PREVIEW_SQUARE_SIZE, height: CROP_PREVIEW_SQUARE_SIZE };
  }

  return {
    width: Math.max(1, Math.round(selectionWidth)),
    height: Math.max(1, Math.round(selectionHeight)),
  };
}

export function resolveCropOutputMimeType(sourceMimeType: string): string {
  const normalized = sourceMimeType.trim().toLowerCase();
  if (
    normalized === 'image/png'
    || normalized === 'image/jpeg'
    || normalized === 'image/webp'
  ) {
    return normalized;
  }
  return 'image/png';
}

export function replaceFileExtension(fileName: string, mimeType: string): string {
  const baseName = fileName.replace(/\.[^./\\]+$/, '');
  const extension = mimeType === 'image/jpeg'
    ? 'jpg'
    : mimeType === 'image/webp'
    ? 'webp'
    : 'png';
  return `${baseName || 'cropped-image'}.${extension}`;
}

export function guessFileNameFromImageSrc(imageSrc: string | null | undefined): string {
  if (typeof imageSrc !== 'string') {
    return 'cropped-image.png';
  }

  try {
    const parsed = new URL(imageSrc);
    const fileName = decodeURIComponent(parsed.pathname.split('/').pop() ?? '').trim();
    return fileName || 'cropped-image.png';
  } catch {
    return 'cropped-image.png';
  }
}

export async function buildImageEditDraft(params: {
  cropResult: ImageCropApplyResult;
  sourceFileName: string;
  originalFile?: File | null;
  sourceImageSrc?: string | null;
}): Promise<ImageEditDraft> {
  const croppedFileName = replaceFileExtension(
    params.sourceFileName,
    params.cropResult.croppedBlob.type,
  );

  return {
    original_upload: params.originalFile
      ? await fileToImageUploadPayload(params.originalFile)
      : undefined,
    cropped_upload: await blobToImageUploadPayload(
      params.cropResult.croppedBlob,
      croppedFileName,
    ),
    crop_json: stringifyStoredImageCrop(params.cropResult.crop),
    preview_url: URL.createObjectURL(params.cropResult.croppedBlob),
    source_image_src: params.sourceImageSrc ?? null,
  };
}

export async function persistImageEditDraft(params: {
  draft: ImageEditDraft;
  currentOriginalImageSrc?: string | null;
  importImage: (payload: ImageUploadPayload) => Promise<TokenImageImportResult>;
}): Promise<{
  imageSrc: string | null;
  originalImageSrc: string | null;
  imageCrop: string;
}> {
  const croppedImportResult = await params.importImage(params.draft.cropped_upload);
  const imageSrc = normalizeAnyMediaImageSrc(croppedImportResult.image_src);

  let originalImageSrc = normalizeAnyMediaImageSrc(params.currentOriginalImageSrc);
  if (params.draft.original_upload) {
    const originalImportResult = await params.importImage(params.draft.original_upload);
    originalImageSrc = normalizeAnyMediaImageSrc(originalImportResult.image_src);
  } else if (!originalImageSrc) {
    originalImageSrc = normalizeAnyMediaImageSrc(params.draft.source_image_src);
  }

  return {
    imageSrc,
    originalImageSrc,
    imageCrop: params.draft.crop_json,
  };
}
