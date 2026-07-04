import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
vi.mock(
  '../../../src/renderer/components/ui/RichTextEditor',
  () => import('../../helpers/richTextEditorMock'),
);
vi.mock('../../../src/renderer/components/media/ImageCropModal', () => ({
  default: ({
    isOpen,
    onCancel,
    onApply,
  }: {
    isOpen: boolean;
    onCancel: () => void;
    onApply: (result: {
      croppedBlob: Blob;
      crop: StoredImageCrop;
    }) => Promise<void> | void;
  }) =>
    isOpen
      ? (
        <div role='dialog' aria-label='Crop item image'>
          <button type='button' onClick={onCancel}>Cancel crop</button>
          <button
            type='button'
            onClick={() =>
              void onApply({
                croppedBlob: new Blob([new Uint8Array([9, 9, 9])], {
                  type: 'image/png',
                }),
                crop: {
                  version: 1,
                  aspect_ratio: 2,
                  selection: { x: 0, y: 0, width: 320, height: 160 },
                  transform: { matrix: [1, 0, 0, 1, 0, 0] },
                  source: { natural_width: 640, natural_height: 320 },
                  output: { mime_type: 'image/png' },
                },
              })}
          >
            Apply crop
          </button>
        </div>
      )
      : null,
}));

import ItemForm from '../../../src/renderer/components/items/ItemForm';

function getFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!input) {
    throw new Error('Expected hidden file input');
  }
  return input as HTMLInputElement;
}

describe('ItemForm', () => {
  it('requires a name before submitting', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ItemForm onSave={onSave} onClose={vi.fn()} isSaving={false} />);

    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submits name and description on create', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ItemForm onSave={onSave} onClose={vi.fn()} isSaving={false} />);

    await user.type(screen.getByLabelText('Name *'), 'Sunblade');
    await user.type(screen.getByLabelText('Description'), 'Ancient radiant sword.');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Sunblade',
        description: 'Ancient radiant sword.',
      }),
    );
  });

  it('prefills initial values and shows Save on edit', () => {
    render(
      <ItemForm
        initialValues={{
          name: 'Sunblade',
          description: 'Ancient radiant sword.',
          image_src: 'vv-media://item-images/sunblade.png',
        }}
        onSave={vi.fn()}
        onClose={vi.fn()}
        isSaving={false}
      />,
    );

    expect(screen.getByLabelText('Name *')).toHaveValue('Sunblade');
    expect(screen.getByLabelText('Description')).toHaveValue('Ancient radiant sword.');
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Current item' })).toBeInTheDocument();
  });

  it('calls onClose when Cancel clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ItemForm onSave={vi.fn()} onClose={onClose} isSaving={false} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clears existing image on save in edit mode', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <ItemForm
        initialValues={{
          name: 'Sunblade',
          description: 'Ancient radiant sword.',
          image_src: 'vv-media://item-images/sunblade.png',
        }}
        onSave={onSave}
        onClose={vi.fn()}
        isSaving={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Clear image on save' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Sunblade',
        image_src: null,
        clear_image: true,
      }),
    );
  });

  it('shows validation for unsupported image types before submit', async () => {
    const onSave = vi.fn();
    const { container } = render(<ItemForm onSave={onSave} onClose={vi.fn()} isSaving={false} />);

    const input = getFileInput(container);
    const file = new File([new Uint8Array([1])], 'bad.bmp', { type: 'image/bmp' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('Unsupported image type. Use PNG, JPEG, WEBP, or GIF.'))
      .toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows validation for empty image files before submit', async () => {
    const onSave = vi.fn();
    const { container } = render(<ItemForm onSave={onSave} onClose={vi.fn()} isSaving={false} />);

    const input = getFileInput(container);
    const file = new File([], 'empty.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('Selected file is empty.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows validation for oversized image files before submit', async () => {
    const onSave = vi.fn();
    const { container } = render(<ItemForm onSave={onSave} onClose={vi.fn()} isSaving={false} />);

    const input = getFileInput(container);
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'huge.png', {
      type: 'image/png',
    });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('Image exceeds 5 MB limit.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows read failure when selected image cannot be read', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const { container } = render(<ItemForm onSave={onSave} onClose={vi.fn()} isSaving={false} />);

    const input = getFileInput(container);
    const file = new File([new Uint8Array([1, 2, 3])], 'broken.png', { type: 'image/png' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: vi.fn().mockRejectedValue(new Error('broken read')),
    });

    fireEvent.change(input, { target: { files: [file] } });
    await user.click(screen.getByRole('button', { name: 'Apply crop' }));

    await waitFor(() =>
      expect(screen.getByText('Unable to read the selected image file. Try a different image.'))
        .toBeInTheDocument()
    );
    expect(onSave).not.toHaveBeenCalled();
  });
});
