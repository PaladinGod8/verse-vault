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
        <div role='dialog' aria-label='Crop world thumbnail'>
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

import WorldForm from '../../../src/renderer/components/worlds/WorldForm';

function getFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!input) {
    throw new Error('Expected hidden file input');
  }
  return input as HTMLInputElement;
}

describe('WorldForm', () => {
  it('shows validation error when submitted without a world name', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<WorldForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText('Name'), '   ');
    await user.click(screen.getByRole('button', { name: 'Create world' }));

    expect(screen.getByText('World name is required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows thrown Error message when create submit fails', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('Save failed'));

    render(<WorldForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText('Name'), '  Alpha  ');
    await user.click(screen.getByRole('button', { name: 'Create world' }));

    expect(await screen.findByText('Save failed')).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Create world' }),
      ).toBeEnabled();
    });
  });

  it('shows generic create failure for non-Error exceptions', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue('unknown failure');

    render(<WorldForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText('Name'), 'Alpha');
    await user.click(screen.getByRole('button', { name: 'Create world' }));

    expect(
      await screen.findByText('Failed to create world.'),
    ).toBeInTheDocument();
  });

  it('shows generic edit failure for non-Error exceptions', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue({ reason: 'unknown' });

    render(
      <WorldForm
        mode='edit'
        initialValues={{
          name: 'Alpha',
          thumbnail: null,
          short_description: null,
        }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByText('Failed to save world changes.'),
    ).toBeInTheDocument();
  });

  it('submits image edit draft after crop apply', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <WorldForm onSubmit={onSubmit} onCancel={vi.fn()} />,
    );

    await user.type(screen.getByLabelText('Name'), 'Test World');
    fireEvent.change(getFileInput(container), {
      target: {
        files: [new File([new Uint8Array([1, 2, 3])], 'cover.png', { type: 'image/png' })],
      },
    });
    await user.click(screen.getByRole('button', { name: 'Apply crop' }));
    await user.click(screen.getByRole('button', { name: 'Create world' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test World',
        short_description: null,
        clear_thumbnail: false,
        image_edit_draft: expect.objectContaining({
          crop_json: expect.stringContaining('"version":1'),
          preview_url: expect.stringMatching(/^blob:/),
          cropped_upload: expect.objectContaining({
            fileName: 'cover.png',
            mimeType: 'image/png',
          }),
          original_upload: expect.objectContaining({
            fileName: 'cover.png',
            mimeType: 'image/png',
          }),
        }),
      }),
    );
  });

  it('submits without thumbnail draft in create mode with no file', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<WorldForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), 'No Thumb');
    await user.click(screen.getByRole('button', { name: 'Create world' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'No Thumb',
          short_description: null,
          clear_thumbnail: false,
        }),
      )
    );
  });

  it('shows existing thumbnail preview in edit mode', () => {
    render(
      <WorldForm
        mode='edit'
        initialValues={{
          name: 'Alpha',
          thumbnail: 'vv-media://world-images/existing.png',
          short_description: null,
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const preview = screen.getByRole('img', {
      name: 'Current world thumbnail',
    });
    expect(preview).toHaveAttribute(
      'src',
      'vv-media://world-images/existing.png',
    );
  });

  it('clears existing thumbnail on clear action', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <WorldForm
        mode='edit'
        initialValues={{
          name: 'Alpha',
          thumbnail: 'vv-media://world-images/existing.png',
          short_description: null,
        }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Clear image on save' }),
    );
    expect(
      screen.queryByRole('img', { name: 'Current world thumbnail' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          thumbnail: null,
          original_thumbnail_src: null,
          thumbnail_crop: null,
          clear_thumbnail: true,
        }),
      )
    );
  });

  it('replaces existing thumbnail with cropped draft in edit mode', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { container } = render(
      <WorldForm
        mode='edit'
        initialValues={{
          name: 'Alpha',
          thumbnail: 'vv-media://world-images/existing.png',
          short_description: null,
        }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(getFileInput(container), {
      target: {
        files: [new File([new Uint8Array([1])], 'new.png', { type: 'image/png' })],
      },
    });
    await user.click(screen.getByRole('button', { name: 'Apply crop' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        clear_thumbnail: false,
        image_edit_draft: expect.objectContaining({
          cropped_upload: expect.objectContaining({ fileName: 'new.png' }),
          original_upload: expect.objectContaining({ fileName: 'new.png' }),
        }),
      }),
    );
  });

  it('shows read failure when selected image cannot be read', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(
      <WorldForm onSubmit={onSubmit} onCancel={vi.fn()} />,
    );

    const file = new File([new Uint8Array([1, 2, 3])], 'broken.png', { type: 'image/png' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: vi.fn().mockRejectedValue(new Error('broken read')),
    });

    fireEvent.change(getFileInput(container), { target: { files: [file] } });
    await user.click(screen.getByRole('button', { name: 'Apply crop' }));

    await waitFor(() =>
      expect(screen.getByText('Unable to read the selected image file. Try a different image.'))
        .toBeInTheDocument()
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
