import { describe, expect, it, vi } from 'vitest';
import {
  aspectRatioToPresetId,
  blobToImageUploadPayload,
  buildCropOutputSize,
  buildImageEditDraft,
  fileToImageUploadPayload,
  guessFileNameFromImageSrc,
  parseStoredImageCrop,
  persistImageEditDraft,
  presetIdToAspectRatio,
  replaceFileExtension,
  resolveCropOutputMimeType,
  stringifyStoredImageCrop,
  validateImageFile,
} from '../../../../src/renderer/lib/imageCrop';
import type { StoredImageCrop } from '../../../../src/shared/contracts/imageCropTypes';

const SAMPLE_CROP: StoredImageCrop = {
  version: 1,
  aspect_ratio: 2,
  selection: { x: 10, y: 20, width: 320, height: 160 },
  transform: { matrix: [1, 0, 0, 1, 0, 0] },
  source: { natural_width: 640, natural_height: 320 },
  output: { mime_type: 'image/png' },
};

if (!('createObjectURL' in URL)) {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:generated-preview'),
  });
}

function createImageFile(
  bytes: number[],
  name: string,
  type: string,
): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe('imageCrop helpers', () => {
  it('validates supported, empty, oversized, and unsupported files', () => {
    const validFile = createImageFile([1, 2, 3], 'cover.png', 'image/png');
    const emptyFile = createImageFile([], 'empty.png', 'image/png');
    const oversizedFile = createImageFile([1], 'large.png', 'image/png');
    Object.defineProperty(oversizedFile, 'size', { value: 6 * 1024 * 1024 });
    const unsupportedFile = createImageFile([1], 'cover.svg', 'image/svg+xml');

    expect(validateImageFile(validFile)).toBeNull();
    expect(validateImageFile(emptyFile)).toBe('Selected file is empty.');
    expect(validateImageFile(oversizedFile)).toBe('Image exceeds 5 MB limit.');
    expect(validateImageFile(unsupportedFile)).toBe(
      'Unsupported image type. Use PNG, JPEG, WEBP, or GIF.',
    );
  });

  it('parses and stringifies stored crop json defensively', () => {
    const cropJson = stringifyStoredImageCrop(SAMPLE_CROP);

    expect(parseStoredImageCrop(undefined)).toBeNull();
    expect(parseStoredImageCrop(null)).toBeNull();
    expect(parseStoredImageCrop('   ')).toBeNull();
    expect(parseStoredImageCrop('{bad json')).toBeNull();
    expect(parseStoredImageCrop(cropJson)).toEqual(SAMPLE_CROP);
  });

  it('maps aspect presets and output sizes', () => {
    expect(aspectRatioToPresetId(2)).toBe('card');
    expect(aspectRatioToPresetId(1)).toBe('square');
    expect(aspectRatioToPresetId(1.5)).toBe('free');
    expect(aspectRatioToPresetId(null)).toBe('free');

    expect(presetIdToAspectRatio('card')).toBe(2);
    expect(presetIdToAspectRatio('square')).toBe(1);
    expect(presetIdToAspectRatio('free')).toBeNull();

    expect(buildCropOutputSize('card', 111, 222)).toEqual({ width: 320, height: 160 });
    expect(buildCropOutputSize('square', 111, 222)).toEqual({ width: 320, height: 320 });
    expect(buildCropOutputSize('free', 12.3, 0.2)).toEqual({ width: 12, height: 1 });
  });

  it('normalizes output mime types and file extensions', () => {
    expect(resolveCropOutputMimeType(' image/png ')).toBe('image/png');
    expect(resolveCropOutputMimeType('image/jpeg')).toBe('image/jpeg');
    expect(resolveCropOutputMimeType('image/webp')).toBe('image/webp');
    expect(resolveCropOutputMimeType('image/gif')).toBe('image/png');

    expect(replaceFileExtension('cover.jpeg', 'image/jpeg')).toBe('cover.jpg');
    expect(replaceFileExtension('cover.jpeg', 'image/webp')).toBe('cover.webp');
    expect(replaceFileExtension('cover', 'image/png')).toBe('cover.png');
    expect(replaceFileExtension('.png', 'image/png')).toBe('cropped-image.png');
  });

  it('derives file names from existing sources and payload bytes from files/blobs', async () => {
    const file = createImageFile([3, 4, 5], 'token name.png', 'image/png');
    const blob = new Blob([new Uint8Array([6, 7])], { type: 'image/webp' });

    expect(guessFileNameFromImageSrc(undefined)).toBe('cropped-image.png');
    expect(guessFileNameFromImageSrc('not a url')).toBe('cropped-image.png');
    expect(
      guessFileNameFromImageSrc('vv-media://token-images/token%20name.png'),
    ).toBe('token name.png');

    await expect(fileToImageUploadPayload(file)).resolves.toEqual({
      fileName: 'token name.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([3, 4, 5]),
    });
    await expect(blobToImageUploadPayload(blob, 'cropped.webp')).resolves.toEqual({
      fileName: 'cropped.webp',
      mimeType: 'image/webp',
      bytes: new Uint8Array([6, 7]),
    });
  });

  it('builds image edit drafts with or without original uploads', async () => {
    const createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:cropped-preview');
    const sourceFile = createImageFile([1, 2, 3], 'portrait.jpeg', 'image/jpeg');
    const croppedBlob = new Blob([new Uint8Array([9, 8, 7])], { type: 'image/webp' });

    const withOriginal = await buildImageEditDraft({
      cropResult: { croppedBlob, crop: SAMPLE_CROP },
      sourceFileName: sourceFile.name,
      originalFile: sourceFile,
      sourceImageSrc: 'vv-media://character-images/original.png',
    });
    const withoutOriginal = await buildImageEditDraft({
      cropResult: { croppedBlob, crop: SAMPLE_CROP },
      sourceFileName: sourceFile.name,
    });

    expect(withOriginal).toEqual({
      original_upload: {
        fileName: 'portrait.jpeg',
        mimeType: 'image/jpeg',
        bytes: new Uint8Array([1, 2, 3]),
      },
      cropped_upload: {
        fileName: 'portrait.webp',
        mimeType: 'image/webp',
        bytes: new Uint8Array([9, 8, 7]),
      },
      crop_json: stringifyStoredImageCrop(SAMPLE_CROP),
      preview_url: 'blob:cropped-preview',
      source_image_src: 'vv-media://character-images/original.png',
    });
    expect(withoutOriginal.original_upload).toBeUndefined();
    expect(withoutOriginal.source_image_src).toBeNull();

    createObjectUrlSpy.mockRestore();
  });

  it('persists drafts with imported originals, existing originals, or source fallbacks', async () => {
    const importImage = vi
      .fn()
      .mockResolvedValueOnce({ image_src: 'vv-media://item-images/crop-1.png' })
      .mockResolvedValueOnce({ image_src: 'vv-media://item-images/original-1.png' })
      .mockResolvedValueOnce({ image_src: 'vv-media://item-images/crop-2.png' })
      .mockResolvedValueOnce({ image_src: 'vv-media://item-images/crop-3.png' });

    const withOriginal = await persistImageEditDraft({
      draft: {
        cropped_upload: {
          fileName: 'crop-1.png',
          mimeType: 'image/png',
          bytes: new Uint8Array([1]),
        },
        original_upload: {
          fileName: 'original-1.png',
          mimeType: 'image/png',
          bytes: new Uint8Array([2]),
        },
        crop_json: stringifyStoredImageCrop(SAMPLE_CROP),
        preview_url: 'blob:preview-1',
        source_image_src: 'vv-media://item-images/should-not-win.png',
      },
      importImage,
    });
    const withExistingOriginal = await persistImageEditDraft({
      draft: {
        cropped_upload: {
          fileName: 'crop-2.png',
          mimeType: 'image/png',
          bytes: new Uint8Array([3]),
        },
        crop_json: stringifyStoredImageCrop(SAMPLE_CROP),
        preview_url: 'blob:preview-2',
      },
      currentOriginalImageSrc: 'vv-media://item-images/existing-original.png',
      importImage,
    });
    const withSourceFallback = await persistImageEditDraft({
      draft: {
        cropped_upload: {
          fileName: 'crop-3.png',
          mimeType: 'image/png',
          bytes: new Uint8Array([4]),
        },
        crop_json: stringifyStoredImageCrop(SAMPLE_CROP),
        preview_url: 'blob:preview-3',
        source_image_src: 'vv-media://item-images/source-fallback.png',
      },
      importImage,
    });

    expect(withOriginal).toEqual({
      imageSrc: 'vv-media://item-images/crop-1.png',
      originalImageSrc: 'vv-media://item-images/original-1.png',
      imageCrop: stringifyStoredImageCrop(SAMPLE_CROP),
    });
    expect(withExistingOriginal).toEqual({
      imageSrc: 'vv-media://item-images/crop-2.png',
      originalImageSrc: 'vv-media://item-images/existing-original.png',
      imageCrop: stringifyStoredImageCrop(SAMPLE_CROP),
    });
    expect(withSourceFallback).toEqual({
      imageSrc: 'vv-media://item-images/crop-3.png',
      originalImageSrc: 'vv-media://item-images/source-fallback.png',
      imageCrop: stringifyStoredImageCrop(SAMPLE_CROP),
    });
    expect(importImage).toHaveBeenCalledTimes(4);
  });
});
