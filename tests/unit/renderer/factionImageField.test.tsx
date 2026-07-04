import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FactionImageField from '../../../src/renderer/components/factions/FactionImageField';
import { useImageCropDraft } from '../../../src/renderer/hooks/useImageCropDraft';

const SAMPLE_CROP = {
  version: 1,
  aspect_ratio: 2,
  selection: { x: 0, y: 0, width: 320, height: 160 },
  transform: { matrix: [1, 0, 0, 1, 0, 0] },
  source: { natural_width: 640, natural_height: 320 },
  output: { mime_type: 'image/png' },
};

vi.mock('../../../src/renderer/components/media/ImageCropModal', () => ({
  default: ({
    isOpen,
    title,
    onCancel,
    onApply,
  }: {
    isOpen: boolean;
    title: string;
    onCancel: () => void;
    onApply: (result: { croppedBlob: Blob; crop: typeof SAMPLE_CROP; }) => Promise<void> | void;
  }) =>
    isOpen
      ? (
        <div role='dialog' aria-label={title}>
          <button type='button' onClick={onCancel}>Cancel crop</button>
          <button
            type='button'
            onClick={() =>
              void onApply({
                croppedBlob: new Blob([new Uint8Array([1])], { type: 'image/png' }),
                crop: SAMPLE_CROP,
              })}
          >
            Apply crop
          </button>
        </div>
      )
      : null,
}));

type CropDraftState = ReturnType<typeof useImageCropDraft>;

function createCropDraft(overrides: Partial<CropDraftState> = {}): CropDraftState {
  return {
    selectedImageFile: null,
    setSelectedImageFile: vi.fn(),
    imageEditDraft: {
      cropped_upload: {
        fileName: 'preview.png',
        mimeType: 'image/png',
        bytes: new Uint8Array([7]),
      },
      crop_json: JSON.stringify(SAMPLE_CROP),
      preview_url: 'blob:preview-url',
      source_image_src: 'vv-media://faction-images/original.png',
    },
    setImageEditDraft: vi.fn(),
    cropSource: null,
    activePreviewSrc: 'vv-media://faction-images/tribunal.png',
    closeCropSource: vi.fn(),
    openCropperForFile: vi.fn(),
    openCropperForExistingImage: vi.fn(),
    clearDraft: vi.fn(),
    applyCrop: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

function getFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!input) {
    throw new Error('Expected file input');
  }

  return input as HTMLInputElement;
}

describe('FactionImageField', () => {
  it('reopens selected files, uses preview urls, and clears selected files', async () => {
    const user = userEvent.setup();
    const selectedFile = new File([new Uint8Array([3])], 'tribunal.png', {
      type: 'image/png',
    });
    const cropDraft = createCropDraft({ selectedImageFile: selectedFile });
    const onClearImageChange = vi.fn();
    const onImageUploadErrorChange = vi.fn();
    const { container } = render(
      <FactionImageField
        cropDraft={cropDraft}
        initialCropJson={null}
        clearImage={false}
        isSaving={false}
        imageUploadError={null}
        onClearImageChange={onClearImageChange}
        onImageUploadErrorChange={onImageUploadErrorChange}
      />,
    );

    expect(screen.getByRole('img', { name: 'Current faction' })).toHaveAttribute(
      'src',
      'blob:preview-url',
    );

    await user.click(screen.getByRole('button', { name: 'Edit crop' }));
    expect(cropDraft.openCropperForFile).toHaveBeenCalledWith(selectedFile);
    expect(cropDraft.openCropperForExistingImage).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Clear image on save' }));
    expect(onClearImageChange).toHaveBeenCalledWith(true);
    expect(cropDraft.clearDraft).toHaveBeenCalledTimes(1);
    expect(onImageUploadErrorChange).toHaveBeenCalledWith(null);

    fireEvent.change(getFileInput(container), {
      target: { files: [selectedFile] },
    });
    expect(cropDraft.openCropperForFile).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole('button', { name: 'Remove selected file' }));
    expect(cropDraft.clearDraft).toHaveBeenCalledTimes(2);
  });

  it('reports crop apply failures when modal cannot build next draft', async () => {
    const user = userEvent.setup();
    const cropDraft = createCropDraft({
      cropSource: {
        sourceImageSrc: 'blob:selected-file',
        sourceFileName: 'tribunal.png',
        sourceMimeType: 'image/png',
      },
    });
    const onImageUploadErrorChange = vi.fn();

    render(
      <FactionImageField
        cropDraft={cropDraft}
        initialCropJson={null}
        clearImage={false}
        isSaving={false}
        imageUploadError={null}
        onClearImageChange={vi.fn()}
        onImageUploadErrorChange={onImageUploadErrorChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Apply crop' }));

    expect(cropDraft.applyCrop).toHaveBeenCalledTimes(1);
    expect(onImageUploadErrorChange).toHaveBeenCalledWith(
      'Unable to read the selected image file. Try a different image.',
    );
  });

  it('reopens existing images and rejects invalid file selections', async () => {
    const user = userEvent.setup();
    const cropDraft = createCropDraft({
      selectedImageFile: null,
      imageEditDraft: null,
    });
    const onImageUploadErrorChange = vi.fn();
    const { container } = render(
      <FactionImageField
        cropDraft={cropDraft}
        initialCropJson={null}
        clearImage={false}
        isSaving={false}
        imageUploadError={null}
        onClearImageChange={vi.fn()}
        onImageUploadErrorChange={onImageUploadErrorChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit crop' }));
    expect(cropDraft.openCropperForExistingImage).toHaveBeenCalledTimes(1);

    fireEvent.change(getFileInput(container), {
      target: {
        files: [new File([new Uint8Array([1])], 'bad.svg', { type: 'image/svg+xml' })],
      },
    });

    expect(cropDraft.clearDraft).toHaveBeenCalledTimes(1);
    expect(onImageUploadErrorChange).toHaveBeenCalledWith(
      'Unsupported image type. Use PNG, JPEG, WEBP, or GIF.',
    );
  });
});
