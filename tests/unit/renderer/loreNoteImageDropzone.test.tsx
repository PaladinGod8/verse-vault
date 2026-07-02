import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoreNoteImageDropzone from '../../../src/renderer/components/loreNotes/LoreNoteImageDropzone';

function makeImageFile(
  name = 'note.png',
  type = 'image/png',
  bytes: Uint8Array = new Uint8Array([1, 2, 3]),
): File {
  return new File([bytes], name, { type });
}

function getFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!input) {
    throw new Error('Expected hidden file input');
  }
  return input as HTMLInputElement;
}

describe('LoreNoteImageDropzone', () => {
  it('renders helper copy and accepts file selection from input', () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <LoreNoteImageDropzone
        selectedFile={null}
        onFileSelect={onFileSelect}
        onClearFile={vi.fn()}
      />,
    );

    expect(screen.getByText('Lore Note Image Upload')).toBeInTheDocument();
    expect(screen.getByText('Accepted: PNG, JPEG, WEBP, GIF. Max 5 MB.')).toBeInTheDocument();

    const input = getFileInput(container);
    const file = makeImageFile();
    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalledWith(file);
    expect(input.value).toBe('');
  });

  it('shows selected file metadata and allows clearing', () => {
    const onClearFile = vi.fn();
    const file = makeImageFile('myth.webp', '', new Uint8Array(2 * 1024 * 1024));
    render(
      <LoreNoteImageDropzone
        selectedFile={file}
        onFileSelect={vi.fn()}
        onClearFile={onClearFile}
      />,
    );

    expect(screen.getByText('myth.webp')).toBeInTheDocument();
    expect(screen.getByText('unknown type - 2.00 MB')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove selected file' }));
    expect(onClearFile).toHaveBeenCalledTimes(1);
  });

  it('stays inert while disabled and renders passed error text', () => {
    const onFileSelect = vi.fn();
    const onClearFile = vi.fn();
    const { container } = render(
      <LoreNoteImageDropzone
        selectedFile={makeImageFile('locked.png')}
        onFileSelect={onFileSelect}
        onClearFile={onClearFile}
        disabled
        error='Unsupported file type'
      />,
    );

    const input = getFileInput(container);
    const inputClickSpy = vi.spyOn(input, 'click');
    const dropzone = screen.getByRole('button', {
      name: /drag an image here, or click to choose a file\./i,
    });
    const removeButton = screen.getByRole('button', { name: 'Remove selected file' });
    const file = makeImageFile('ignored.png');

    expect(screen.getByText('Unsupported file type')).toBeInTheDocument();
    expect(dropzone).toHaveAttribute('aria-disabled', 'true');
    expect(removeButton).toBeDisabled();

    fireEvent.click(dropzone);
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(removeButton);

    expect(inputClickSpy).not.toHaveBeenCalled();
    expect(onFileSelect).not.toHaveBeenCalled();
    expect(onClearFile).not.toHaveBeenCalled();
  });
});
