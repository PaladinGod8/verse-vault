import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CharacterImageDropzone from '../../../src/renderer/components/characters/CharacterImageDropzone';

function makeImageFile(
  name = 'character.png',
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

describe('CharacterImageDropzone', () => {
  it('renders dropzone controls and helper text', () => {
    render(
      <CharacterImageDropzone
        selectedFile={null}
        onFileSelect={vi.fn()}
        onClearFile={vi.fn()}
      />,
    );

    expect(screen.getByText('Character Image Upload')).toBeInTheDocument();
    expect(
      screen.getByText('Drag an image here, or click to choose a file.'),
    ).toBeInTheDocument();
  });

  it('calls onFileSelect when a file is chosen via the input', () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <CharacterImageDropzone
        selectedFile={null}
        onFileSelect={onFileSelect}
        onClearFile={vi.fn()}
      />,
    );

    const input = getFileInput(container);
    const file = makeImageFile();
    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('shows the selected file and clears it on click', () => {
    const onClearFile = vi.fn();
    const file = makeImageFile('dragon.png');
    render(
      <CharacterImageDropzone
        selectedFile={file}
        onFileSelect={vi.fn()}
        onClearFile={onClearFile}
      />,
    );

    expect(screen.getByText('dragon.png')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove selected file' }));
    expect(onClearFile).toHaveBeenCalledTimes(1);
  });

  it('shows an error message when provided', () => {
    render(
      <CharacterImageDropzone
        selectedFile={null}
        onFileSelect={vi.fn()}
        onClearFile={vi.fn()}
        error='Unsupported file type'
      />,
    );

    expect(screen.getByText('Unsupported file type')).toBeInTheDocument();
  });
});
