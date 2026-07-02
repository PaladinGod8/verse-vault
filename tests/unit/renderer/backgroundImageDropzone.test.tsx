import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BackgroundImageDropzone from '../../../src/renderer/components/backgrounds/BackgroundImageDropzone';

function makeImageFile(
  name = 'background.png',
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

describe('BackgroundImageDropzone', () => {
  it('renders helper copy and accepts file selection from input', () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <BackgroundImageDropzone
        selectedFile={null}
        onFileSelect={onFileSelect}
        onClearFile={vi.fn()}
      />,
    );

    expect(screen.getByText('Background Image Upload')).toBeInTheDocument();
    expect(screen.getByText('Accepted: PNG, JPEG, WEBP, GIF. Max 5 MB.')).toBeInTheDocument();

    const input = getFileInput(container);
    const file = makeImageFile();
    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalledWith(file);
    expect(input.value).toBe('');
  });

  it('supports click, keyboard, drag, and drop when enabled', () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <BackgroundImageDropzone
        selectedFile={null}
        onFileSelect={onFileSelect}
        onClearFile={vi.fn()}
      />,
    );

    const input = getFileInput(container);
    const inputClickSpy = vi.spyOn(input, 'click');
    const dropzone = screen.getByRole('button', {
      name: /drag an image here, or click to choose a file\./i,
    });
    const file = makeImageFile('drop.png');

    fireEvent.click(dropzone);
    fireEvent.keyDown(dropzone, { key: 'Enter' });
    fireEvent.keyDown(dropzone, { key: ' ' });
    expect(inputClickSpy).toHaveBeenCalledTimes(3);

    fireEvent.dragEnter(dropzone);
    expect(dropzone.className).toContain('border-slate-600');

    fireEvent.dragLeave(dropzone, { relatedTarget: document.body });
    expect(dropzone.className).toContain('border-slate-300');

    fireEvent.dragOver(dropzone, {
      dataTransfer: { files: [file], dropEffect: 'none' },
    });
    expect(dropzone.className).toContain('border-slate-600');

    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });
    expect(onFileSelect).toHaveBeenCalledWith(file);
    expect(dropzone.className).toContain('border-slate-300');
  });

  it('shows selected file metadata and allows clearing', () => {
    const onClearFile = vi.fn();
    const file = makeImageFile('ancient-hall.webp', '', new Uint8Array(2 * 1024 * 1024));
    render(
      <BackgroundImageDropzone
        selectedFile={file}
        onFileSelect={vi.fn()}
        onClearFile={onClearFile}
      />,
    );

    expect(screen.getByText('ancient-hall.webp')).toBeInTheDocument();
    expect(screen.getByText('unknown type - 2.00 MB')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove selected file' }));
    expect(onClearFile).toHaveBeenCalledTimes(1);
  });

  it('stays inert while disabled and renders passed error text', () => {
    const onFileSelect = vi.fn();
    const onClearFile = vi.fn();
    const { container } = render(
      <BackgroundImageDropzone
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
    expect(dropzone).toHaveAttribute('tabindex', '-1');
    expect(removeButton).toBeDisabled();

    fireEvent.click(dropzone);
    fireEvent.keyDown(dropzone, { key: 'Enter' });
    fireEvent.dragEnter(dropzone);
    fireEvent.dragOver(dropzone, { dataTransfer: { files: [file], dropEffect: 'none' } });
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(removeButton);

    expect(inputClickSpy).not.toHaveBeenCalled();
    expect(onFileSelect).not.toHaveBeenCalled();
    expect(onClearFile).not.toHaveBeenCalled();
  });
});
