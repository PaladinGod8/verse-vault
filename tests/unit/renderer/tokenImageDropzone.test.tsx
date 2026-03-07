import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TokenImageDropzone from '../../../src/renderer/components/tokens/TokenImageDropzone';

function makeImageFile(
  name = 'token.png',
  type = 'image/png',
  bytes: Uint8Array = new Uint8Array([1, 2, 3]),
): File {
  return new File([bytes], name, { type });
}

function getDropzoneButton(): HTMLElement {
  return screen.getByRole('button', {
    name: /Drag an image here, or click to choose a file/i,
  });
}

function getFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!input) {
    throw new Error('Expected hidden file input');
  }
  return input as HTMLInputElement;
}

describe('TokenImageDropzone', () => {
  it('renders dropzone controls and helper text', () => {
    render(
      <TokenImageDropzone
        selectedFile={null}
        onFileSelect={vi.fn()}
        onClearFile={vi.fn()}
      />,
    );

    expect(screen.getByText('Token Image Upload')).toBeInTheDocument();
    expect(
      screen.getByText('Drag an image here, or click to choose a file.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Accepted: PNG, JPEG, WEBP, GIF. Max 5 MB.'),
    ).toBeInTheDocument();
  });

  it('calls onFileSelect for dropped file', () => {
    const onFileSelect = vi.fn();
    const droppedFile = makeImageFile('dropped.png');

    render(
      <TokenImageDropzone
        selectedFile={null}
        onFileSelect={onFileSelect}
        onClearFile={vi.fn()}
      />,
    );

    fireEvent.drop(getDropzoneButton(), {
      dataTransfer: { files: [droppedFile] },
    });

    expect(onFileSelect).toHaveBeenCalledWith(droppedFile);
  });

  it('calls onFileSelect for picked file from input', () => {
    const onFileSelect = vi.fn();
    const pickedFile = makeImageFile('picked.webp', 'image/webp');
    const { container } = render(
      <TokenImageDropzone
        selectedFile={null}
        onFileSelect={onFileSelect}
        onClearFile={vi.fn()}
      />,
    );

    fireEvent.change(getFileInput(container), {
      target: { files: [pickedFile] },
    });

    expect(onFileSelect).toHaveBeenCalledWith(pickedFile);
  });

  it('shows selected file details and clears selected file', () => {
    const onClearFile = vi.fn();
    const selected = makeImageFile('selected.gif', 'image/gif');

    render(
      <TokenImageDropzone
        selectedFile={selected}
        onFileSelect={vi.fn()}
        onClearFile={onClearFile}
      />,
    );

    expect(screen.getByText('selected.gif')).toBeInTheDocument();
    expect(screen.getByText(/image\/gif/i)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove selected file' }),
    );
    expect(onClearFile).toHaveBeenCalledTimes(1);
  });

  it('formats selected file sizes in KB and MB', () => {
    const kbFile = makeImageFile(
      'medium.png',
      'image/png',
      new Uint8Array(2 * 1024),
    );
    const mbFile = makeImageFile(
      'large.png',
      'image/png',
      new Uint8Array(2 * 1024 * 1024),
    );

    const { rerender } = render(
      <TokenImageDropzone
        selectedFile={kbFile}
        onFileSelect={vi.fn()}
        onClearFile={vi.fn()}
      />,
    );
    expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument();

    rerender(
      <TokenImageDropzone
        selectedFile={mbFile}
        onFileSelect={vi.fn()}
        onClearFile={vi.fn()}
      />,
    );
    expect(screen.getByText(/2\.00 MB/)).toBeInTheDocument();
  });

  it('renders provided invalid file error state', () => {
    render(
      <TokenImageDropzone
        selectedFile={null}
        onFileSelect={vi.fn()}
        onClearFile={vi.fn()}
        error='Image exceeds 5 MB limit.'
      />,
    );

    expect(screen.getByText('Image exceeds 5 MB limit.')).toBeInTheDocument();
  });

  it('disables drop and pick actions when disabled', () => {
    const onFileSelect = vi.fn();
    const onClearFile = vi.fn();
    const disabledFile = makeImageFile('disabled.png');
    const { container } = render(
      <TokenImageDropzone
        selectedFile={disabledFile}
        onFileSelect={onFileSelect}
        onClearFile={onClearFile}
        disabled
      />,
    );

    fireEvent.drop(getDropzoneButton(), {
      dataTransfer: { files: [makeImageFile('new.png')] },
    });
    fireEvent.change(getFileInput(container), {
      target: { files: [makeImageFile('new2.png')] },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove selected file' }),
    );

    expect(onFileSelect).not.toHaveBeenCalled();
    expect(onClearFile).not.toHaveBeenCalled();
    expect(getDropzoneButton()).toHaveAttribute('aria-disabled', 'true');
  });

  it('supports keyboard activation and drag-over styles', () => {
    const { container } = render(
      <TokenImageDropzone
        selectedFile={null}
        onFileSelect={vi.fn()}
        onClearFile={vi.fn()}
      />,
    );
    const button = getDropzoneButton();
    const fileInput = getFileInput(container);
    const clickSpy = vi.spyOn(fileInput, 'click');

    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.keyDown(button, { key: ' ' });
    expect(clickSpy).toHaveBeenCalledTimes(2);

    const dragData = { dropEffect: 'none' };
    fireEvent.dragEnter(button, { dataTransfer: dragData });
    expect(button.className).toContain('border-slate-600');
    fireEvent.dragOver(button, { dataTransfer: dragData });
    expect(dragData.dropEffect).toBe('copy');
    fireEvent.dragLeave(button, { relatedTarget: null });
    expect(button.className).toContain('border-slate-300');
  });
});
