import { describe, expect, it, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TokenForm from '../../../src/renderer/components/tokens/TokenForm';
import type { TokenFormValues } from '../../../src/renderer/components/tokens/TokenForm';

vi.mock(
  '../../../src/renderer/components/tokens/FootprintPainterModal',
  () => ({
    default: ({
      onClose,
      onConfirm,
      gridType,
      initialFootprint,
    }: {
      onClose: () => void;
      onConfirm: (result: {
        footprint: TokenFootprintConfig;
        framing: TokenFramingConfig;
      }) => void;
      gridType: TokenGridType;
      initialFootprint?: TokenFootprintConfig;
    }) => (
      <div role="dialog" aria-label="Footprint Painter">
        {initialFootprint ? (
          <span data-testid="initial-footprint">
            {JSON.stringify(initialFootprint)}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() =>
            onConfirm({
              footprint:
                gridType === 'hex'
                  ? {
                      version: 1,
                      grid_type: 'hex',
                      hex_cells: [{ q: 0, r: 0 }],
                      radius_cells: 0.5,
                    }
                  : {
                      version: 1,
                      grid_type: 'square',
                      square_cells: [{ col: 0, row: 0 }],
                      width_cells: 1,
                      height_cells: 1,
                    },
              framing: {
                center_x_cells: 0,
                center_y_cells: 0,
                extent_x_cells: 0.5,
                extent_y_cells: 0.5,
              },
            })
          }
        >
          Confirm
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    ),
  }),
);
vi.mock(
  '../../../src/renderer/components/tokens/FootprintPainterModal.tsx',
  () => ({
    default: ({
      onClose,
      onConfirm,
      gridType,
      initialFootprint,
    }: {
      onClose: () => void;
      onConfirm: (result: {
        footprint: TokenFootprintConfig;
        framing: TokenFramingConfig;
      }) => void;
      gridType: TokenGridType;
      initialFootprint?: TokenFootprintConfig;
    }) => (
      <div role="dialog" aria-label="Footprint Painter">
        {initialFootprint ? (
          <span data-testid="initial-footprint">
            {JSON.stringify(initialFootprint)}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() =>
            onConfirm({
              footprint:
                gridType === 'hex'
                  ? {
                      version: 1,
                      grid_type: 'hex',
                      hex_cells: [{ q: 0, r: 0 }],
                      radius_cells: 0.5,
                    }
                  : {
                      version: 1,
                      grid_type: 'square',
                      square_cells: [{ col: 0, row: 0 }],
                      width_cells: 1,
                      height_cells: 1,
                    },
              framing: {
                center_x_cells: 0,
                center_y_cells: 0,
                extent_x_cells: 0.5,
                extent_y_cells: 0.5,
              },
            })
          }
        >
          Confirm
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    ),
  }),
);

if (!('createObjectURL' in URL)) {
  Object.defineProperty(URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:token-preview'),
    configurable: true,
  });
}

if (!('revokeObjectURL' in URL)) {
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: vi.fn(),
    configurable: true,
  });
}

function makeImageFile(
  name = 'token.png',
  type = 'image/png',
  bytes: Uint8Array = new Uint8Array([1, 2, 3]),
): File {
  const file = new File([bytes], name, { type });
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  Object.defineProperty(file, 'arrayBuffer', {
    value: vi.fn(async () => buffer),
    configurable: true,
  });
  return file;
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

describe('TokenForm', () => {
  it('renders create mode fields and submit label when initial values are not provided', () => {
    render(<TokenForm onSave={vi.fn()} onClose={vi.fn()} isSaving={false} />);

    expect(screen.getByLabelText('Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Grid Type *')).toHaveValue('square');
    expect(screen.getByText('Token Image Upload')).toBeInTheDocument();
    expect(
      screen.getByText('Accepted: PNG, JPEG, WEBP, GIF. Max 5 MB.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Visible')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('renders edit mode values and submit label when initial values are provided', () => {
    render(
      <TokenForm
        initialValues={{
          name: 'Existing Token',
          grid_type: 'hex',
          image_src: 'https://assets.example/token.png',
          is_visible: 1,
        }}
        onSave={vi.fn()}
        onClose={vi.fn()}
        isSaving={false}
      />,
    );

    expect(screen.getByLabelText('Name *')).toHaveValue('Existing Token');
    expect(screen.getByLabelText('Grid Type *')).toHaveValue('hex');
    expect(screen.getByLabelText('Visible')).toBeChecked();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('accepts valid dropped image and emits create payload with image_upload', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const imageFile = makeImageFile();

    render(<TokenForm onSave={onSave} onClose={vi.fn()} isSaving={false} />);

    fireEvent.drop(getDropzoneButton(), {
      dataTransfer: {
        files: [imageFile],
      },
    });
    const painterDialog = await screen.findByRole('dialog', {
      name: 'Footprint Painter',
    });
    await user.click(
      within(painterDialog).getByRole('button', { name: 'Confirm' }),
    );
    expect(screen.getByText('token.png')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Name *'), 'Wolf');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = onSave.mock.calls[0][0] as TokenFormValues;
    expect(payload.name).toBe('Wolf');
    expect(payload.grid_type).toBe('square');
    expect(payload.image_src).toBeUndefined();
    expect(payload.is_visible).toBe(1);
    expect(payload.clear_image).toBe(false);
    expect(payload.image_upload).toMatchObject({
      fileName: 'token.png',
      mimeType: 'image/png',
    });
    expect(payload.image_upload?.bytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(payload.image_upload?.bytes ?? [])).toEqual([1, 2, 3]);
  });

  it('accepts valid picked image from file input', async () => {
    const onSave = vi.fn();
    const imageFile = makeImageFile('picked.webp', 'image/webp');
    const { container } = render(
      <TokenForm onSave={onSave} onClose={vi.fn()} isSaving={false} />,
    );

    fireEvent.change(getFileInput(container), {
      target: { files: [imageFile] },
    });

    const painterDialog = await screen.findByRole('dialog', {
      name: 'Footprint Painter',
    });
    await userEvent
      .setup()
      .click(within(painterDialog).getByRole('button', { name: 'Confirm' }));

    expect(screen.getByText('picked.webp')).toBeInTheDocument();
    expect(
      screen.queryByText(/Unsupported image type/i),
    ).not.toBeInTheDocument();
  });

  it('surfaces invalid type and size errors from dropzone selection', () => {
    const { container } = render(
      <TokenForm onSave={vi.fn()} onClose={vi.fn()} isSaving={false} />,
    );

    fireEvent.change(getFileInput(container), {
      target: {
        files: [new File(['plain text'], 'bad.txt', { type: 'text/plain' })],
      },
    });
    expect(
      screen.getByText('Unsupported image type. Use PNG, JPEG, WEBP, or GIF.'),
    ).toBeInTheDocument();

    fireEvent.drop(getDropzoneButton(), {
      dataTransfer: {
        files: [
          makeImageFile(
            'huge.png',
            'image/png',
            new Uint8Array(5 * 1024 * 1024 + 1),
          ),
        ],
      },
    });
    expect(screen.getByText('Image exceeds 5 MB limit.')).toBeInTheDocument();
  });

  it('blocks submit when name is empty or whitespace-only', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(<TokenForm onSave={onSave} onClose={vi.fn()} isSaving={false} />);

    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Name *'), '   ');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submits trimmed name and no-image payload when no file is selected', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(<TokenForm onSave={onSave} onClose={vi.fn()} isSaving={false} />);

    await user.type(screen.getByLabelText('Name *'), '  Arc Wolf  ');
    await user.click(screen.getByLabelText('Visible'));
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      name: 'Arc Wolf',
      grid_type: 'square',
      image_src: undefined,
      is_visible: 0,
      image_upload: undefined,
      clear_image: false,
      config: expect.stringContaining('"square_cells"'),
    });

    const payload = onSave.mock.calls[0][0] as TokenFormValues;
    const parsedConfig = JSON.parse(payload.config!);
    expect(parsedConfig.footprint.square_cells).toEqual([{ col: 0, row: 0 }]);
    expect(parsedConfig.footprint.width_cells).toBe(1);
    expect(parsedConfig.footprint.height_cells).toBe(1);
  });

  it('emits edit payload for no-change, replace, and clear image paths', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    const { rerender } = render(
      <TokenForm
        initialValues={{
          name: 'Existing Token',
          grid_type: 'hex',
          image_src: 'https://assets.example/current.png',
          is_visible: 1,
        }}
        onSave={onSave}
        onClose={vi.fn()}
        isSaving={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenLastCalledWith({
      name: 'Existing Token',
      grid_type: 'hex',
      image_src: undefined,
      is_visible: 1,
      image_upload: undefined,
      clear_image: false,
    });

    rerender(
      <TokenForm
        initialValues={{
          name: 'Existing Token',
          grid_type: 'hex',
          image_src: 'https://assets.example/current.png',
          is_visible: 1,
        }}
        onSave={onSave}
        onClose={vi.fn()}
        isSaving={false}
      />,
    );
    fireEvent.drop(getDropzoneButton(), {
      dataTransfer: {
        files: [makeImageFile('replacement.gif', 'image/gif')],
      },
    });
    const painterDialog = await screen.findByRole('dialog', {
      name: 'Footprint Painter',
    });
    await user.click(
      within(painterDialog).getByRole('button', { name: 'Confirm' }),
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    const replacePayload = onSave.mock.calls[1][0] as TokenFormValues;
    expect(replacePayload.image_upload).toMatchObject({
      fileName: 'replacement.gif',
      mimeType: 'image/gif',
    });
    expect(replacePayload.clear_image).toBe(false);
    expect(replacePayload.image_src).toBeUndefined();

    rerender(
      <TokenForm
        initialValues={{
          name: 'Existing Token',
          grid_type: 'hex',
          image_src: 'https://assets.example/current.png',
          is_visible: 1,
        }}
        onSave={onSave}
        onClose={vi.fn()}
        isSaving={false}
      />,
    );
    await user.click(
      screen.getByRole('button', { name: 'Clear image on save' }),
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(3));
    expect(onSave).toHaveBeenLastCalledWith({
      name: 'Existing Token',
      grid_type: 'hex',
      image_src: null,
      is_visible: 1,
      image_upload: undefined,
      clear_image: true,
    });
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<TokenForm onSave={vi.fn()} onClose={onClose} isSaving={false} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables submit while saving', () => {
    render(<TokenForm onSave={vi.fn()} onClose={vi.fn()} isSaving />);
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('submits default 1-hex config when creating a hex token with no image', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(<TokenForm onSave={onSave} onClose={vi.fn()} isSaving={false} />);

    await user.selectOptions(screen.getByLabelText('Grid Type *'), 'hex');
    await user.type(screen.getByLabelText('Name *'), 'Hex Token');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = onSave.mock.calls[0][0] as TokenFormValues;
    expect(payload.config).toBeDefined();
    const parsedConfig = JSON.parse(payload.config!);
    expect(parsedConfig.footprint.hex_cells).toEqual([{ q: 0, r: 0 }]);
    expect(parsedConfig.footprint.radius_cells).toBe(0.5);
  });

  it('passes default square initialFootprint to painter when creating with an image', async () => {
    const imageFile = makeImageFile();

    render(<TokenForm onSave={vi.fn()} onClose={vi.fn()} isSaving={false} />);

    fireEvent.drop(getDropzoneButton(), {
      dataTransfer: { files: [imageFile] },
    });

    const painterDialog = await screen.findByRole('dialog', {
      name: 'Footprint Painter',
    });

    const initialFootprintEl =
      within(painterDialog).getByTestId('initial-footprint');
    const initialFootprint = JSON.parse(initialFootprintEl.textContent!);
    expect(initialFootprint.grid_type).toBe('square');
    expect(initialFootprint.square_cells).toEqual([{ col: 0, row: 0 }]);
    expect(initialFootprint.width_cells).toBe(1);
    expect(initialFootprint.height_cells).toBe(1);
  });

  it('passes default hex initialFootprint to painter when creating a hex token with an image', async () => {
    const user = userEvent.setup();
    const imageFile = makeImageFile();

    render(<TokenForm onSave={vi.fn()} onClose={vi.fn()} isSaving={false} />);

    await user.selectOptions(screen.getByLabelText('Grid Type *'), 'hex');

    fireEvent.drop(getDropzoneButton(), {
      dataTransfer: { files: [imageFile] },
    });

    const painterDialog = await screen.findByRole('dialog', {
      name: 'Footprint Painter',
    });

    const initialFootprintEl =
      within(painterDialog).getByTestId('initial-footprint');
    const initialFootprint = JSON.parse(initialFootprintEl.textContent!);
    expect(initialFootprint.grid_type).toBe('hex');
    expect(initialFootprint.hex_cells).toEqual([{ q: 0, r: 0 }]);
    expect(initialFootprint.radius_cells).toBe(0.5);
  });

  it('does not pass initialFootprint to painter in edit mode', async () => {
    const imageFile = makeImageFile('new.png');

    render(
      <TokenForm
        initialValues={{
          name: 'Existing Token',
          grid_type: 'square',
          image_src: 'vv-media://token-images/old.png',
          is_visible: 1,
        }}
        onSave={vi.fn()}
        onClose={vi.fn()}
        isSaving={false}
      />,
    );

    fireEvent.drop(getDropzoneButton(), {
      dataTransfer: { files: [imageFile] },
    });

    const painterDialog = await screen.findByRole('dialog', {
      name: 'Footprint Painter',
    });

    expect(
      within(painterDialog).queryByTestId('initial-footprint'),
    ).not.toBeInTheDocument();
  });

  it('does not inject default config when saving an existing token with no image change', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <TokenForm
        initialValues={{
          name: 'Existing Token',
          grid_type: 'square',
          image_src: null,
          is_visible: 1,
        }}
        onSave={onSave}
        onClose={vi.fn()}
        isSaving={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));

    const payload = onSave.mock.calls[0][0] as TokenFormValues;
    expect(payload.config).toBeUndefined();
  });

  it('uses painter result for config rather than default when painter is confirmed', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const imageFile = makeImageFile();

    render(<TokenForm onSave={onSave} onClose={vi.fn()} isSaving={false} />);

    fireEvent.drop(getDropzoneButton(), {
      dataTransfer: { files: [imageFile] },
    });

    const painterDialog = await screen.findByRole('dialog', {
      name: 'Footprint Painter',
    });
    await user.click(
      within(painterDialog).getByRole('button', { name: 'Confirm' }),
    );

    await user.type(screen.getByLabelText('Name *'), 'Wolf');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = onSave.mock.calls[0][0] as TokenFormValues;
    expect(payload.config).toBeDefined();
    const parsedConfig = JSON.parse(payload.config!);
    expect(parsedConfig.footprint.square_cells).toEqual([{ col: 0, row: 0 }]);
    expect(payload.image_upload).toBeDefined();
  });
});
