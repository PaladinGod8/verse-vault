import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FactionImageDropzone from '../../../src/renderer/components/factions/FactionImageDropzone';

function makeImageFile(
  name = 'faction.png',
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

describe('FactionImageDropzone', () => {
  it('renders helper copy and supports input selection', () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <FactionImageDropzone
        selectedFile={null}
        onFileSelect={onFileSelect}
        onClearFile={vi.fn()}
      />,
    );

    expect(screen.getByText('Faction Image Upload')).toBeInTheDocument();
    expect(
      screen.getByText('Drag an image here, or click to choose a file.'),
    ).toBeInTheDocument();

    const input = getFileInput(container);
    const file = makeImageFile();
    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('ignores empty selections and exposes selected file metadata', () => {
    const onFileSelect = vi.fn();
    const twoKilobyteFile = makeImageFile('guild-banner.webp', '', new Uint8Array(2048));
    const { container, rerender } = render(
      <FactionImageDropzone
        selectedFile={null}
        onFileSelect={onFileSelect}
        onClearFile={vi.fn()}
      />,
    );

    const input = getFileInput(container);
    fireEvent.change(input, { target: { files: [] } });
    expect(onFileSelect).not.toHaveBeenCalled();

    rerender(
      <FactionImageDropzone
        selectedFile={twoKilobyteFile}
        onFileSelect={onFileSelect}
        onClearFile={vi.fn()}
      />,
    );

    expect(screen.getByText('guild-banner.webp')).toBeInTheDocument();
    expect(screen.getByText('unknown type - 2.0 KB')).toBeInTheDocument();
  });

  it('supports drag-drop and keyboard activation when enabled', () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <FactionImageDropzone
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
    const file = makeImageFile('drop.webp');

    fireEvent.keyDown(dropzone, { key: ' ' });
    expect(inputClickSpy).toHaveBeenCalledTimes(1);

    fireEvent.dragEnter(dropzone);
    expect(dropzone.className).toContain('border-slate-600');

    fireEvent.dragLeave(dropzone, { relatedTarget: document.body });
    expect(dropzone.className).toContain('border-slate-300');

    fireEvent.dragOver(dropzone, {
      dataTransfer: { files: [file], dropEffect: 'none' },
    });
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalledWith(file);
    expect(dropzone.className).toContain('border-slate-300');
  });

  it('keeps clear/remove path disabled when the dropzone is locked', () => {
    const onFileSelect = vi.fn();
    const onClearFile = vi.fn();
    const { container } = render(
      <FactionImageDropzone
        selectedFile={makeImageFile('sigil.png')}
        onFileSelect={onFileSelect}
        onClearFile={onClearFile}
        disabled
        error='Upload locked'
      />,
    );

    const input = getFileInput(container);
    const inputClickSpy = vi.spyOn(input, 'click');
    const dropzone = screen.getByRole('button', {
      name: /drag an image here, or click to choose a file\./i,
    });
    const removeButton = screen.getByRole('button', { name: 'Remove selected file' });
    const file = makeImageFile('ignore.png');

    fireEvent.click(dropzone);
    fireEvent.keyDown(dropzone, { key: 'Enter' });
    fireEvent.dragEnter(dropzone);
    fireEvent.dragOver(dropzone, { dataTransfer: { files: [file], dropEffect: 'none' } });
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(removeButton);

    expect(screen.getByText('Upload locked')).toBeInTheDocument();
    expect(dropzone).toHaveAttribute('aria-disabled', 'true');
    expect(removeButton).toBeDisabled();
    expect(inputClickSpy).not.toHaveBeenCalled();
    expect(onFileSelect).not.toHaveBeenCalled();
    expect(onClearFile).not.toHaveBeenCalled();
  });
});
