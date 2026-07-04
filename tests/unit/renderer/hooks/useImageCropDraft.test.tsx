import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useImageCropDraft } from '../../../../src/renderer/hooks/useImageCropDraft';
import type { ImageEditDraft } from '../../../../src/renderer/lib/imageCrop';
import type { StoredImageCrop } from '../../../../src/shared/contracts/imageCropTypes';

const SAMPLE_CROP: StoredImageCrop = {
  version: 1,
  aspect_ratio: 2,
  selection: { x: 0, y: 0, width: 320, height: 160 },
  transform: { matrix: [1, 0, 0, 1, 0, 0] },
  source: { natural_width: 640, natural_height: 320 },
  output: { mime_type: 'image/png' },
};

if (!('createObjectURL' in URL)) {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:generated-source'),
  });
}

if (!('revokeObjectURL' in URL)) {
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
}

function createDraft(overrides: Partial<ImageEditDraft> = {}): ImageEditDraft {
  return {
    cropped_upload: {
      fileName: 'cropped.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([7, 8, 9]),
    },
    crop_json: JSON.stringify(SAMPLE_CROP),
    preview_url: 'blob:preview-url',
    source_image_src: 'vv-media://draft-source.png',
    ...overrides,
  };
}

function createImageFile(
  bytes: number[],
  name = 'cover.png',
  type = 'image/png',
): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe('useImageCropDraft', () => {
  let createObjectUrlSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectUrlSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:selected-file')
      .mockReturnValue('blob:cropped-preview');
    revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  afterEach(() => {
    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
  });

  it('exposes initial preview source and no-ops existing image open when nothing exists', () => {
    const { result } = renderHook(() =>
      useImageCropDraft({
        initialImageSrc: 'vv-media://cropped.png',
      })
    );
    const empty = renderHook(() => useImageCropDraft({}));

    expect(result.current.activePreviewSrc).toBe('vv-media://cropped.png');

    act(() => {
      result.current.openCropperForExistingImage();
      empty.result.current.openCropperForExistingImage();
    });

    expect(result.current.cropSource).toMatchObject({
      sourceImageSrc: 'vv-media://cropped.png',
      sourceImageRecordSrc: 'vv-media://cropped.png',
      sourceMimeType: 'image/png',
    });
    expect(empty.result.current.cropSource).toBeNull();

    empty.unmount();
  });

  it('prefers draft source image, then initial original, when reopening cropper', () => {
    const { result } = renderHook(() =>
      useImageCropDraft({
        initialImageSrc: 'vv-media://cropped.png',
        initialOriginalImageSrc: 'vv-media://original.png',
      })
    );

    act(() => {
      result.current.openCropperForExistingImage();
    });
    expect(result.current.cropSource?.sourceImageRecordSrc).toBe('vv-media://original.png');

    act(() => {
      result.current.setImageEditDraft(createDraft());
    });
    act(() => {
      result.current.openCropperForExistingImage();
    });
    expect(result.current.cropSource?.sourceImageRecordSrc).toBe('vv-media://draft-source.png');
  });

  it('opens from a file, applies crop, clears draft state, and revokes object urls', async () => {
    const { result, unmount } = renderHook(() => useImageCropDraft({}));
    const file = createImageFile([1, 2, 3], 'portrait.png', 'image/png');

    act(() => {
      result.current.openCropperForFile(file);
    });

    expect(result.current.cropSource).toMatchObject({
      sourceImageSrc: 'blob:selected-file',
      sourceFileName: 'portrait.png',
      sourceMimeType: 'image/png',
      originalFile: file,
    });

    await act(async () => {
      const didApply = await result.current.applyCrop({
        croppedBlob: new Blob([new Uint8Array([4, 5, 6])], { type: 'image/png' }),
        crop: SAMPLE_CROP,
      });
      expect(didApply).toBe(true);
    });

    expect(result.current.selectedImageFile).toBe(file);
    expect(result.current.cropSource).toBeNull();
    expect(result.current.imageEditDraft).toEqual(
      expect.objectContaining({
        preview_url: 'blob:cropped-preview',
        source_image_src: 'blob:selected-file',
      }),
    );
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:selected-file');

    act(() => {
      result.current.clearDraft();
    });
    expect(result.current.selectedImageFile).toBeNull();
    expect(result.current.imageEditDraft).toBeNull();

    act(() => {
      result.current.setImageEditDraft(createDraft({ preview_url: 'blob:preview-url' }));
    });
    unmount();

    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:preview-url');
  });

  it('returns false and closes crop source when crop apply cannot read selected file', async () => {
    const { result, unmount } = renderHook(() => useImageCropDraft({}));
    const brokenFile = createImageFile([1], 'broken.png', 'image/png');
    Object.defineProperty(brokenFile, 'arrayBuffer', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('broken read')),
    });

    act(() => {
      result.current.openCropperForFile(brokenFile);
    });

    await act(async () => {
      const didApply = await result.current.applyCrop({
        croppedBlob: new Blob([new Uint8Array([8])], { type: 'image/png' }),
        crop: SAMPLE_CROP,
      });
      expect(didApply).toBe(false);
    });

    expect(result.current.cropSource).toBeNull();
    expect(result.current.imageEditDraft).toBeNull();
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:selected-file');

    await act(async () => {
      const didApply = await result.current.applyCrop({
        croppedBlob: new Blob([new Uint8Array([9])], { type: 'image/png' }),
        crop: SAMPLE_CROP,
      });
      expect(didApply).toBe(false);
    });

    unmount();
  });
});
