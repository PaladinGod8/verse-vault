import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TokensPage from '../../../src/renderer/pages/TokensPage';

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

const { toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('../../../src/renderer/components/ui/ToastProvider', () => ({
  useToast: () => ({
    showToast: vi.fn(),
    dismissToast: vi.fn(),
    clearToasts: vi.fn(),
    success: toastSuccessMock,
    error: toastErrorMock,
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

vi.mock(
  '../../../src/renderer/components/tokens/FootprintPainterModal',
  () => ({
    default: ({
      onClose,
      onConfirm,
      gridType,
    }: {
      onClose: () => void;
      onConfirm: (result: {
        footprint: TokenFootprintConfig;
        framing: TokenFramingConfig;
      }) => void;
      gridType: TokenGridType;
    }) => (
      <div role="dialog" aria-label="Footprint Painter">
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
                      radius_cells: 1,
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
    }: {
      onClose: () => void;
      onConfirm: (result: {
        footprint: TokenFootprintConfig;
        framing: TokenFramingConfig;
      }) => void;
      gridType: TokenGridType;
    }) => (
      <div role="dialog" aria-label="Footprint Painter">
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
                      radius_cells: 1,
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

const worldsGetByIdMock = vi.fn();
const tokensGetAllByWorldMock = vi.fn();
const tokensImportImageMock = vi.fn();
const tokensAddMock = vi.fn();
const tokensUpdateMock = vi.fn();
const tokensDeleteMock = vi.fn();
const campaignsGetAllByWorldMock = vi.fn();

function buildWorld(overrides: Partial<World> = {}): World {
  return {
    id: 1,
    name: 'Arcadia',
    thumbnail: null,
    short_description: null,
    last_viewed_at: null,
    created_at: '2026-03-01 00:00:00',
    updated_at: '2026-03-01 00:00:00',
    ...overrides,
  };
}

function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 10,
    world_id: 1,
    name: 'Main Campaign',
    summary: null,
    config: '{}',
    created_at: '2026-03-01 00:00:00',
    updated_at: '2026-03-01 00:00:00',
    ...overrides,
  };
}

function buildToken(overrides: Partial<Token> = {}): Token {
  return {
    id: 1,
    world_id: 1,
    campaign_id: null,
    grid_type: 'square',
    name: 'Wolf',
    image_src: null,
    config: '{}',
    is_visible: 1,
    created_at: '2026-03-01 00:00:00',
    updated_at: '2026-03-02 00:00:00',
    ...overrides,
  };
}

function renderTokensPage(path = '/world/1/tokens') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/world/:id/tokens" element={<TokensPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TokensPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    window.db = {
      verses: {
        getAll: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      levels: {
        getAllByWorld: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      abilities: {
        getAllByWorld: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        addChild: vi.fn(),
        removeChild: vi.fn(),
        getChildren: vi.fn(),
      },
      worlds: {
        getAll: vi.fn(),
        getById: worldsGetByIdMock,
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        markViewed: vi.fn(),
      },
      campaigns: {
        getAllByWorld: campaignsGetAllByWorldMock,
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      battlemaps: {
        getAllByWorld: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      tokens: {
        getAllByWorld: tokensGetAllByWorldMock,
        getAllByCampaign: vi.fn(),
        getById: vi.fn(),
        importImage: tokensImportImageMock,
        add: tokensAddMock,
        update: tokensUpdateMock,
        delete: tokensDeleteMock,
      },
      arcs: {
        getAllByCampaign: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      acts: {
        getAllByArc: vi.fn(),
        getAllByCampaign: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        moveTo: vi.fn(),
      },
      sessions: {
        getAllByAct: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        moveTo: vi.fn(),
      },
      scenes: {
        getAllByCampaign: vi.fn(),
        getAllBySession: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        moveTo: vi.fn(),
      },
    } as DbApi;
  });

  it('renders loading state, table columns, scope labels, and copy action visibility', async () => {
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([
      buildCampaign({ id: 101, name: 'Campaign One' }),
    ]);
    tokensGetAllByWorldMock.mockResolvedValue([
      buildToken({ id: 1, campaign_id: null, name: 'World Wolf' }),
      buildToken({ id: 2, campaign_id: 101, name: 'Campaign Guard' }),
    ]);

    renderTokensPage();

    expect(screen.getByText('Loading tokens...')).toBeInTheDocument();
    expect(await screen.findByText('World Wolf')).toBeInTheDocument();

    expect(screen.getByText('Image')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Grid')).toBeInTheDocument();
    expect(screen.getByText('Scope')).toBeInTheDocument();
    expect(screen.getByText('Updated')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();

    expect(screen.getByText('World')).toBeInTheDocument();
    expect(screen.getByText('Campaign: Campaign One')).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Copy to Campaign' }),
    ).toHaveLength(1);
  });

  it('renders empty state when no tokens exist', async () => {
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([]);
    tokensGetAllByWorldMock.mockResolvedValue([]);

    renderTokensPage();
    expect(await screen.findByText('No tokens yet.')).toBeInTheDocument();
  });

  it('shows invalid world id state and does not render create button', async () => {
    renderTokensPage('/world/not-a-number/tokens');

    expect(await screen.findByText('Invalid world id.')).toBeInTheDocument();
    expect(worldsGetByIdMock).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: 'New Token' }),
    ).not.toBeInTheDocument();
  });

  it('shows world-not-found state', async () => {
    worldsGetByIdMock.mockResolvedValue(null);

    renderTokensPage('/world/1/tokens');

    expect(await screen.findByText('World not found.')).toBeInTheDocument();
    expect(tokensGetAllByWorldMock).not.toHaveBeenCalled();
    expect(campaignsGetAllByWorldMock).not.toHaveBeenCalled();
  });

  it('renders generic Campaign scope label when campaign metadata is missing', async () => {
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([]);
    tokensGetAllByWorldMock.mockResolvedValue([
      buildToken({ id: 44, campaign_id: 999, name: 'Orphan Token' }),
    ]);

    renderTokensPage();

    expect(await screen.findByText('Orphan Token')).toBeInTheDocument();
    expect(screen.getByText('Campaign')).toBeInTheDocument();
  });

  it('creates token from New Token form and refreshes list', async () => {
    const user = userEvent.setup();
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([buildCampaign()]);
    tokensGetAllByWorldMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([buildToken({ id: 7, name: 'Arc Wolf' })]);
    tokensAddMock.mockResolvedValue(buildToken({ id: 7, name: 'Arc Wolf' }));

    renderTokensPage();

    await screen.findByText('No tokens yet.');
    await user.click(screen.getByRole('button', { name: 'New Token' }));
    const dialog = await screen.findByRole('dialog', { name: 'New Token' });
    await user.type(within(dialog).getByLabelText('Name *'), '  Arc Wolf  ');
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));

    expect(tokensAddMock).toHaveBeenCalledWith({
      world_id: 1,
      name: 'Arc Wolf',
      grid_type: 'square',
      image_src: null,
      is_visible: 1,
    });
    await waitFor(() => {
      expect(tokensGetAllByWorldMock).toHaveBeenCalledTimes(2);
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Token created.',
      '"Arc Wolf" was added.',
    );
  });

  it('create flow uploads image before tokens.add when image_upload is provided', async () => {
    const user = userEvent.setup();
    const imageFile = new File([new Uint8Array([1, 2, 3])], 'wolf.png', {
      type: 'image/png',
    });
    Object.defineProperty(imageFile, 'arrayBuffer', {
      value: vi.fn(async () => new Uint8Array([1, 2, 3]).buffer),
      configurable: true,
    });

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([]);
    tokensGetAllByWorldMock.mockResolvedValueOnce([]).mockResolvedValueOnce([
      buildToken({
        id: 501,
        name: 'Uploaded Wolf',
        image_src: 'file:///a.png',
      }),
    ]);
    tokensImportImageMock.mockResolvedValue({ image_src: 'file:///a.png' });
    tokensAddMock.mockResolvedValue(
      buildToken({ id: 501, name: 'Uploaded Wolf' }),
    );

    renderTokensPage();
    await screen.findByText('No tokens yet.');
    await user.click(screen.getByRole('button', { name: 'New Token' }));
    const dialog = await screen.findByRole('dialog', { name: 'New Token' });

    fireEvent.drop(
      within(dialog).getByRole('button', {
        name: /Drag an image here, or click to choose a file/i,
      }),
      { dataTransfer: { files: [imageFile] } },
    );
    const painterDialog = await screen.findByRole('dialog', {
      name: 'Footprint Painter',
    });
    await user.click(within(painterDialog).getByRole('button', { name: 'Confirm' }));
    await user.type(within(dialog).getByLabelText('Name *'), 'Uploaded Wolf');
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(tokensImportImageMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(tokensAddMock).toHaveBeenCalledTimes(1));
    expect(tokensImportImageMock.mock.invocationCallOrder[0]).toBeLessThan(
      tokensAddMock.mock.invocationCallOrder[0],
    );
    expect(tokensAddMock).toHaveBeenCalledWith(
      expect.objectContaining({
        world_id: 1,
        name: 'Uploaded Wolf',
        grid_type: 'square',
        image_src: 'file:///a.png',
        is_visible: 1,
      }),
    );
    const addPayload = tokensAddMock.mock.calls[0][0] as {
      config?: string;
    };
    expect(addPayload.config).toContain('"footprint"');
  });

  it('shows create error toast when add fails', async () => {
    const user = userEvent.setup();
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([]);
    tokensGetAllByWorldMock.mockResolvedValue([]);
    tokensAddMock.mockRejectedValue(new Error('duplicate token'));

    renderTokensPage();

    await screen.findByText('No tokens yet.');
    await user.click(screen.getByRole('button', { name: 'New Token' }));
    const dialog = await screen.findByRole('dialog', { name: 'New Token' });
    await user.type(within(dialog).getByLabelText('Name *'), 'Wolf');
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Failed to create token.',
        'duplicate token',
      );
    });
  });

  it('edits an existing token and refreshes with success toast', async () => {
    const user = userEvent.setup();
    const existingToken = buildToken({ id: 3, name: 'Scout' });
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([]);
    tokensGetAllByWorldMock
      .mockResolvedValueOnce([existingToken])
      .mockResolvedValueOnce([buildToken({ id: 3, name: 'Scout Prime' })]);
    tokensUpdateMock.mockResolvedValue(
      buildToken({ id: 3, name: 'Scout Prime' }),
    );

    renderTokensPage();

    await screen.findByText('Scout');
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog', { name: 'Edit Token' });
    const nameInput = within(dialog).getByLabelText('Name *');
    expect(nameInput).toHaveValue('Scout');
    await user.clear(nameInput);
    await user.type(nameInput, 'Scout Prime');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(tokensUpdateMock).toHaveBeenCalledWith(3, {
      name: 'Scout Prime',
      grid_type: 'square',
      image_src: null,
      is_visible: 1,
    });
    await waitFor(() => {
      expect(tokensGetAllByWorldMock).toHaveBeenCalledTimes(2);
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Token updated.',
      '"Scout Prime" was saved.',
    );
  });

  it('edit replace flow uploads image before tokens.update', async () => {
    const user = userEvent.setup();
    const existingToken = buildToken({
      id: 300,
      name: 'Scout',
      image_src: 'https://assets.example/scout.png',
    });
    const imageFile = new File([new Uint8Array([4, 5, 6])], 'replace.png', {
      type: 'image/png',
    });
    Object.defineProperty(imageFile, 'arrayBuffer', {
      value: vi.fn(async () => new Uint8Array([4, 5, 6]).buffer),
      configurable: true,
    });

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([]);
    tokensGetAllByWorldMock
      .mockResolvedValueOnce([existingToken])
      .mockResolvedValueOnce([
        buildToken({ id: 300, name: 'Scout', image_src: 'file:///new.png' }),
      ]);
    tokensImportImageMock.mockResolvedValue({ image_src: 'file:///new.png' });
    tokensUpdateMock.mockResolvedValue(
      buildToken({ id: 300, name: 'Scout', image_src: 'file:///new.png' }),
    );

    renderTokensPage();
    await screen.findByText('Scout');
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Token' });

    fireEvent.drop(
      within(dialog).getByRole('button', {
        name: /Drag an image here, or click to choose a file/i,
      }),
      { dataTransfer: { files: [imageFile] } },
    );
    const painterDialog = await screen.findByRole('dialog', {
      name: 'Footprint Painter',
    });
    await user.click(within(painterDialog).getByRole('button', { name: 'Confirm' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(tokensImportImageMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(tokensUpdateMock).toHaveBeenCalledTimes(1));
    expect(tokensImportImageMock.mock.invocationCallOrder[0]).toBeLessThan(
      tokensUpdateMock.mock.invocationCallOrder[0],
    );
    expect(tokensUpdateMock).toHaveBeenCalledWith(
      300,
      expect.objectContaining({
        name: 'Scout',
        grid_type: 'square',
        image_src: 'file:///new.png',
        is_visible: 1,
      }),
    );
    const updatePayload = tokensUpdateMock.mock.calls[0][1] as {
      config?: string;
    };
    expect(updatePayload.config).toContain('"footprint"');
  });

  it('edit clear image flow sends image_src null without upload', async () => {
    const user = userEvent.setup();
    const existingToken = buildToken({
      id: 301,
      name: 'Scout',
      image_src: 'https://assets.example/scout.png',
    });

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([]);
    tokensGetAllByWorldMock
      .mockResolvedValueOnce([existingToken])
      .mockResolvedValueOnce([
        buildToken({ id: 301, name: 'Scout', image_src: null }),
      ]);
    tokensUpdateMock.mockResolvedValue(
      buildToken({ id: 301, image_src: null }),
    );

    renderTokensPage();
    await screen.findByText('Scout');
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Token' });
    await user.click(
      within(dialog).getByRole('button', { name: 'Clear image on save' }),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(tokensUpdateMock).toHaveBeenCalledTimes(1));
    expect(tokensImportImageMock).not.toHaveBeenCalled();
    expect(tokensUpdateMock).toHaveBeenCalledWith(301, {
      name: 'Scout',
      grid_type: 'square',
      image_src: null,
      is_visible: 1,
    });
  });

  it('shows update error toast fallback for non-Error rejections', async () => {
    const user = userEvent.setup();
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([]);
    tokensGetAllByWorldMock.mockResolvedValue([
      buildToken({ id: 88, name: 'Mage' }),
    ]);
    tokensUpdateMock.mockRejectedValue('unexpected');

    renderTokensPage();

    await screen.findByText('Mage');
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Token' });
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Failed to update token.',
        'Please try again.',
      );
    });
  });

  it('blocks create mutation and shows error when image upload fails', async () => {
    const user = userEvent.setup();
    const imageFile = new File([new Uint8Array([1])], 'wolf.png', {
      type: 'image/png',
    });
    Object.defineProperty(imageFile, 'arrayBuffer', {
      value: vi.fn(async () => new Uint8Array([1]).buffer),
      configurable: true,
    });

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([]);
    tokensGetAllByWorldMock.mockResolvedValue([]);
    tokensImportImageMock.mockRejectedValue(new Error('upload failed'));

    renderTokensPage();
    await screen.findByText('No tokens yet.');
    await user.click(screen.getByRole('button', { name: 'New Token' }));
    const dialog = await screen.findByRole('dialog', { name: 'New Token' });
    fireEvent.drop(
      within(dialog).getByRole('button', {
        name: /Drag an image here, or click to choose a file/i,
      }),
      { dataTransfer: { files: [imageFile] } },
    );
    const painterDialog = await screen.findByRole('dialog', {
      name: 'Footprint Painter',
    });
    await user.click(within(painterDialog).getByRole('button', { name: 'Confirm' }));
    await user.type(within(dialog).getByLabelText('Name *'), 'Upload Fail');
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Failed to create token.',
        'upload failed',
      );
    });
    expect(tokensAddMock).not.toHaveBeenCalled();
  });

  it('blocks edit mutation and shows error when replacement upload fails', async () => {
    const user = userEvent.setup();
    const existingToken = buildToken({
      id: 302,
      name: 'Mage',
      image_src: 'https://assets.example/mage.png',
    });
    const imageFile = new File([new Uint8Array([2])], 'replace.png', {
      type: 'image/png',
    });
    Object.defineProperty(imageFile, 'arrayBuffer', {
      value: vi.fn(async () => new Uint8Array([2]).buffer),
      configurable: true,
    });

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([]);
    tokensGetAllByWorldMock.mockResolvedValue([existingToken]);
    tokensImportImageMock.mockRejectedValue(new Error('upload broke'));

    renderTokensPage();
    await screen.findByText('Mage');
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Token' });
    fireEvent.drop(
      within(dialog).getByRole('button', {
        name: /Drag an image here, or click to choose a file/i,
      }),
      { dataTransfer: { files: [imageFile] } },
    );
    const painterDialog = await screen.findByRole('dialog', {
      name: 'Footprint Painter',
    });
    await user.click(within(painterDialog).getByRole('button', { name: 'Confirm' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Failed to update token.',
        'upload broke',
      );
    });
    expect(tokensUpdateMock).not.toHaveBeenCalled();
  });

  it('cancels delete confirmation without deleting', async () => {
    const user = userEvent.setup();
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([]);
    tokensGetAllByWorldMock.mockResolvedValue([
      buildToken({ id: 4, name: 'Warden' }),
    ]);

    renderTokensPage();

    await screen.findByText('Warden');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const confirmDialog = await screen.findByRole('dialog', {
      name: 'Delete "Warden"?',
    });
    await user.click(
      within(confirmDialog).getByRole('button', { name: 'Cancel' }),
    );

    expect(tokensDeleteMock).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('dialog', { name: 'Delete "Warden"?' }),
    ).not.toBeInTheDocument();
  });

  it('deletes token after confirmation and refreshes list', async () => {
    const user = userEvent.setup();
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([]);
    tokensGetAllByWorldMock
      .mockResolvedValueOnce([buildToken({ id: 5, name: 'Rogue' })])
      .mockResolvedValueOnce([]);
    tokensDeleteMock.mockResolvedValue({ id: 5 });

    renderTokensPage();

    await screen.findByText('Rogue');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const confirmDialog = await screen.findByRole('dialog', {
      name: 'Delete "Rogue"?',
    });
    await user.click(
      within(confirmDialog).getByRole('button', { name: 'Delete' }),
    );

    await waitFor(() => {
      expect(tokensDeleteMock).toHaveBeenCalledWith(5);
    });
    await waitFor(() => {
      expect(tokensGetAllByWorldMock).toHaveBeenCalledTimes(2);
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Token deleted.',
      '"Rogue" was removed.',
    );
  });

  it('shows delete error toast when delete fails', async () => {
    const user = userEvent.setup();
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([]);
    tokensGetAllByWorldMock.mockResolvedValue([
      buildToken({ id: 90, name: 'Rogue' }),
    ]);
    tokensDeleteMock.mockRejectedValue(new Error('cannot delete'));

    renderTokensPage();

    await screen.findByText('Rogue');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const confirmDialog = await screen.findByRole('dialog', {
      name: 'Delete "Rogue"?',
    });
    await user.click(
      within(confirmDialog).getByRole('button', { name: 'Delete' }),
    );

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Failed to delete token.',
        'cannot delete',
      );
    });
  });

  it('copies world-scoped token to campaign', async () => {
    const user = userEvent.setup();
    const sourceToken = buildToken({
      id: 6,
      campaign_id: null,
      name: 'Knight',
      image_src: 'https://assets.example/knight.png',
      config: '{"role":"tank"}',
      is_visible: 0,
    });
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([
      buildCampaign({ id: 51, name: 'Campaign One' }),
      buildCampaign({ id: 52, name: 'Campaign Two' }),
    ]);
    tokensGetAllByWorldMock
      .mockResolvedValueOnce([sourceToken])
      .mockResolvedValueOnce([sourceToken]);
    tokensAddMock.mockResolvedValue(buildToken({ id: 77, campaign_id: 52 }));

    renderTokensPage();

    await screen.findByText('Knight');
    await user.click(screen.getByRole('button', { name: 'Copy to Campaign' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Copy "Knight" to Campaign',
    });
    await user.selectOptions(within(dialog).getByLabelText('Campaign'), '52');
    await user.click(within(dialog).getByRole('button', { name: 'Copy' }));

    expect(tokensAddMock).toHaveBeenCalledWith({
      world_id: 1,
      campaign_id: 52,
      name: 'Knight',
      image_src: 'https://assets.example/knight.png',
      config: '{"role":"tank"}',
      is_visible: 0,
    });
    await waitFor(() => {
      expect(tokensGetAllByWorldMock).toHaveBeenCalledTimes(2);
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Token copied to campaign.',
      '"Knight" was copied.',
    );
  });

  it('shows copy error toast fallback for non-Error rejections', async () => {
    const user = userEvent.setup();
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([
      buildCampaign({ id: 61, name: 'Campaign One' }),
    ]);
    tokensGetAllByWorldMock.mockResolvedValue([
      buildToken({ id: 66, campaign_id: null, name: 'Knight' }),
    ]);
    tokensAddMock.mockRejectedValue('copy failed');

    renderTokensPage();

    await screen.findByText('Knight');
    await user.click(screen.getByRole('button', { name: 'Copy to Campaign' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Copy "Knight" to Campaign',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Copy' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Failed to copy token.',
        'Please try again.',
      );
    });
  });

  it('shows error message when getAllByWorld rejects', async () => {
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([]);
    tokensGetAllByWorldMock.mockRejectedValue(new Error('db offline'));

    renderTokensPage();
    expect(
      await screen.findByText('Unable to load tokens right now.'),
    ).toBeInTheDocument();
  });
});
