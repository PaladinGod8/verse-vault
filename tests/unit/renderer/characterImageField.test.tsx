import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CharacterImageField from '../../../src/renderer/components/characters/CharacterImageField';
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
    imageEditDraft: null,
    setImageEditDraft: vi.fn(),
    cropSource: null,
    activePreviewSrc: 'vv-media://character-images/ledros.png',
    closeCropSource: vi.fn(),
    openCropperForFile: vi.fn(),
    openCropperForExistingImage: vi.fn(),
    clearDraft: vi.fn(),
    applyCrop: vi.fn().mockResolvedValue(true),
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

describe('CharacterImageField', () => {
  it('reopens existing images, clears previews, and validates file selection', async () => {
    const user = userEvent.setup();
    const cropDraft = createCropDraft();
    const onClearImageChange = vi.fn();
    const onImageUploadErrorChange = vi.fn();
    const { container } = render(
      <CharacterImageField
        cropDraft={cropDraft}
        initialCropJson={null}
        clearImage={false}
        isSaving={false}
        imageUploadError={null}
        onClearImageChange={onClearImageChange}
        onImageUploadErrorChange={onImageUploadErrorChange}
      />,
    );

    expect(screen.getByRole('img', { name: 'Current character' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit crop' }));
    expect(cropDraft.openCropperForExistingImage).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Clear image on save' }));
    expect(onClearImageChange).toHaveBeenCalledWith(true);
    expect(cropDraft.clearDraft).toHaveBeenCalledTimes(1);
    expect(onImageUploadErrorChange).toHaveBeenCalledWith(null);

    fireEvent.change(getFileInput(container), {
      target: {
        files: [new File([new Uint8Array([1])], 'bad.svg', { type: 'image/svg+xml' })],
      },
    });
    expect(cropDraft.clearDraft).toHaveBeenCalledTimes(2);
    expect(onImageUploadErrorChange).toHaveBeenCalledWith(
      'Unsupported image type. Use PNG, JPEG, WEBP, or GIF.',
    );

    const validFile = new File([new Uint8Array([1])], 'good.png', { type: 'image/png' });
    fireEvent.change(getFileInput(container), {
      target: { files: [validFile] },
    });
    expect(onImageUploadErrorChange).toHaveBeenCalledWith(null);
    expect(cropDraft.openCropperForFile).toHaveBeenCalledWith(validFile);
  });

  it('applies crop results and clears errors when modal succeeds', async () => {
    const user = userEvent.setup();
    const cropDraft = createCropDraft({
      cropSource: {
        sourceImageSrc: 'blob:selected-file',
        sourceFileName: 'good.png',
        sourceMimeType: 'image/png',
      },
    });
    const onClearImageChange = vi.fn();
    const onImageUploadErrorChange = vi.fn();

    render(
      <CharacterImageField
        cropDraft={cropDraft}
        initialCropJson={null}
        clearImage={false}
        isSaving={false}
        imageUploadError={null}
        onClearImageChange={onClearImageChange}
        onImageUploadErrorChange={onImageUploadErrorChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Apply crop' }));

    expect(cropDraft.applyCrop).toHaveBeenCalledTimes(1);
    expect(onClearImageChange).toHaveBeenCalledWith(false);
    expect(onImageUploadErrorChange).not.toHaveBeenCalledWith(
      'Unable to read the selected image file. Try a different image.',
    );
  });

  it('clears selected files from dropzone and reports crop apply failures', async () => {
    const user = userEvent.setup();
    const selectedFile = new File([new Uint8Array([2])], 'hero.png', { type: 'image/png' });
    const cropDraft = createCropDraft({
      selectedImageFile: selectedFile,
      cropSource: {
        sourceImageSrc: 'blob:selected-file',
        sourceFileName: 'hero.png',
        sourceMimeType: 'image/png',
      },
      applyCrop: vi.fn().mockResolvedValue(false),
    });
    const onImageUploadErrorChange = vi.fn();

    const { container } = render(
      <CharacterImageField
        cropDraft={cropDraft}
        initialCropJson={null}
        clearImage={false}
        isSaving={false}
        imageUploadError={null}
        onClearImageChange={vi.fn()}
        onImageUploadErrorChange={onImageUploadErrorChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Remove selected file' }));
    expect(cropDraft.clearDraft).toHaveBeenCalledTimes(1);
    expect(onImageUploadErrorChange).toHaveBeenCalledWith(null);

    fireEvent.change(getFileInput(container), {
      target: { files: [selectedFile] },
    });
    await user.click(screen.getByRole('button', { name: 'Apply crop' }));

    expect(cropDraft.applyCrop).toHaveBeenCalledTimes(1);
    expect(onImageUploadErrorChange).toHaveBeenCalledWith(
      'Unable to read the selected image file. Try a different image.',
    );
  });
});
