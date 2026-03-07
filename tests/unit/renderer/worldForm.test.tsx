import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorldForm from '../../../src/renderer/components/worlds/WorldForm';

const mockImportImage = vi.fn();

beforeEach(() => {
  Object.defineProperty(window, 'db', {
    value: {
      worlds: {
        importImage: mockImportImage,
      },
    },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

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

  describe('thumbnail upload', () => {
    it('calls importImage and disables submit during upload (success path)', async () => {
      let resolveImport!: (v: { image_src: string; }) => void;
      mockImportImage.mockReturnValue(
        new Promise((res) => {
          resolveImport = res;
        }),
      );

      const user = userEvent.setup();
      const { container } = render(
        <WorldForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const file = new File([new Uint8Array([1, 2, 3])], 'cover.png', {
        type: 'image/png',
      });
      await user.upload(fileInput, file);

      // While import is in flight, submit should be disabled
      expect(
        screen.getByRole('button', { name: 'Create world' }),
      ).toBeDisabled();

      resolveImport({ image_src: 'vv-media://world-images/cover.png' });
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: 'Create world' }),
        ).toBeEnabled()
      );

      expect(mockImportImage).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'cover.png',
          mimeType: 'image/png',
        }),
      );
    });

    it('shows importImage error in dropzone error slot on failure', async () => {
      mockImportImage.mockRejectedValue(
        new Error('World image exceeds 5 MB limit'),
      );

      const user = userEvent.setup();
      const { container } = render(
        <WorldForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const file = new File([new Uint8Array([1])], 'big.png', {
        type: 'image/png',
      });
      await user.upload(fileInput, file);

      expect(
        await screen.findByText('World image exceeds 5 MB limit'),
      ).toBeInTheDocument();
    });

    it('clears thumbnailSrc and file when clear is called', async () => {
      mockImportImage.mockResolvedValue({
        image_src: 'vv-media://world-images/cover.png',
      });

      const user = userEvent.setup();
      const { container } = render(
        <WorldForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      await user.upload(
        fileInput,
        new File([new Uint8Array([1])], 'cover.png', { type: 'image/png' }),
      );

      await waitFor(() => expect(screen.getByText('cover.png')).toBeInTheDocument());

      await user.click(
        screen.getByRole('button', { name: 'Remove selected file' }),
      );

      expect(screen.queryByText('cover.png')).not.toBeInTheDocument();
    });

    it('submits thumbnailSrc returned by importImage as thumbnail field', async () => {
      mockImportImage.mockResolvedValue({
        image_src: 'vv-media://world-images/t.png',
      });
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      const { container } = render(
        <WorldForm onSubmit={onSubmit} onCancel={vi.fn()} />,
      );

      await user.type(screen.getByLabelText('Name'), 'Test World');
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      await user.upload(
        fileInput,
        new File([new Uint8Array([1])], 't.png', { type: 'image/png' }),
      );
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: 'Create world' }),
        ).toBeEnabled()
      );
      await user.click(screen.getByRole('button', { name: 'Create world' }));

      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            thumbnail: 'vv-media://world-images/t.png',
          }),
        )
      );
    });

    it('submits thumbnail: null in create mode with no file', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<WorldForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      await user.type(screen.getByLabelText('Name'), 'No Thumb');
      await user.click(screen.getByRole('button', { name: 'Create world' }));

      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ thumbnail: null }),
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

    it('clears existing thumbnail on Remove thumbnail click', async () => {
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
        screen.getByRole('button', { name: 'Remove thumbnail' }),
      );
      expect(
        screen.queryByRole('img', { name: 'Current world thumbnail' }),
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Save changes' }));
      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ thumbnail: null }),
        )
      );
    });

    it('replaces existing thumbnail when new file uploaded in edit mode', async () => {
      mockImportImage.mockResolvedValue({
        image_src: 'vv-media://world-images/new.png',
      });
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

      // Existing thumbnail is shown
      expect(
        screen.getByRole('img', { name: 'Current world thumbnail' }),
      ).toBeInTheDocument();

      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      await user.upload(
        fileInput,
        new File([new Uint8Array([1])], 'new.png', { type: 'image/png' }),
      );

      // After upload, the new file appears in the dropzone; existing preview hidden
      await waitFor(() => expect(screen.getByText('new.png')).toBeInTheDocument());
      expect(
        screen.queryByRole('img', { name: 'Current world thumbnail' }),
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Save changes' }));
      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            thumbnail: 'vv-media://world-images/new.png',
          }),
        )
      );
    });
  });
});
