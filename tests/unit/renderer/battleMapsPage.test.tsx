import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import BattleMapsPage from '../../../src/renderer/pages/BattleMapsPage';

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

const worldsGetByIdMock = vi.fn();
const battlemapsGetAllByWorldMock = vi.fn();
const battlemapsAddMock = vi.fn();
const battlemapsUpdateMock = vi.fn();
const battlemapsDeleteMock = vi.fn();

function buildWorld(overrides: Partial<World> = {}): World {
  return {
    id: 1,
    name: 'Alpha',
    thumbnail: null,
    short_description: 'First world',
    last_viewed_at: null,
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  };
}

function buildBattleMap(overrides: Partial<BattleMap> = {}): BattleMap {
  return {
    id: 1,
    world_id: 1,
    name: 'Dungeon Grid',
    config: '{}',
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  };
}

function renderBattleMapsPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/world/:id/battlemaps" element={<BattleMapsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BattleMapsPage', () => {
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
        getAllByWorld: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      battlemaps: {
        getAllByWorld: battlemapsGetAllByWorldMock,
        getById: vi.fn(),
        add: battlemapsAddMock,
        update: battlemapsUpdateMock,
        delete: battlemapsDeleteMock,
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

  it('shows error when world id is invalid', async () => {
    renderBattleMapsPage('/world/abc/battlemaps');

    expect(await screen.findByText('Invalid world id.')).toBeInTheDocument();
    expect(worldsGetByIdMock).not.toHaveBeenCalled();
  });

  it('shows error when world is not found', async () => {
    worldsGetByIdMock.mockResolvedValue(null);

    renderBattleMapsPage('/world/1/battlemaps');

    expect(await screen.findByText('World not found.')).toBeInTheDocument();
    expect(worldsGetByIdMock).toHaveBeenCalledWith(1);
    expect(battlemapsGetAllByWorldMock).not.toHaveBeenCalled();
  });

  it('shows load error when list loading fails', async () => {
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    battlemapsGetAllByWorldMock.mockRejectedValue(new Error('db unavailable'));

    renderBattleMapsPage('/world/1/battlemaps');

    expect(
      await screen.findByText('Unable to load BattleMaps right now.'),
    ).toBeInTheDocument();
  });

  it('shows empty state when world has no battlemaps', async () => {
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    battlemapsGetAllByWorldMock.mockResolvedValue([]);

    renderBattleMapsPage('/world/1/battlemaps');

    expect(await screen.findByText('No BattleMaps yet.')).toBeInTheDocument();
    expect(battlemapsGetAllByWorldMock).toHaveBeenCalledWith(1);
  });

  it('renders battlemaps list after successful load', async () => {
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    battlemapsGetAllByWorldMock.mockResolvedValue([
      buildBattleMap(),
      buildBattleMap({
        id: 2,
        name: 'Forest Ambush',
        config: '{"seed":2}',
      }),
    ]);

    renderBattleMapsPage('/world/1/battlemaps');

    expect(await screen.findByText('Dungeon Grid')).toBeInTheDocument();
    expect(screen.getByText('Forest Ambush')).toBeInTheDocument();
  });

  it('creates a battlemap through the create dialog', async () => {
    const user = userEvent.setup();
    const newBattleMap = buildBattleMap({
      id: 3,
      name: 'Sky Keep',
    });

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    battlemapsGetAllByWorldMock.mockResolvedValue([]);
    battlemapsAddMock.mockResolvedValue(newBattleMap);

    renderBattleMapsPage('/world/1/battlemaps');

    await screen.findByText('No BattleMaps yet.');
    await user.click(screen.getByRole('button', { name: 'New BattleMap' }));

    const dialog = await screen.findByRole('dialog', { name: 'New BattleMap' });
    await user.type(within(dialog).getByLabelText('Name'), 'Sky Keep');
    await user.click(
      within(dialog).getByRole('button', { name: 'Create BattleMap' }),
    );

    expect(battlemapsAddMock).toHaveBeenCalledWith({
      world_id: 1,
      name: 'Sky Keep',
      config: '{}',
    });
    expect(await screen.findByText('Sky Keep')).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'New BattleMap' }),
    ).not.toBeInTheDocument();
  });

  it('shows create validation error when name is empty', async () => {
    const user = userEvent.setup();
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    battlemapsGetAllByWorldMock.mockResolvedValue([]);

    renderBattleMapsPage('/world/1/battlemaps');

    await screen.findByText('No BattleMaps yet.');
    await user.click(screen.getByRole('button', { name: 'New BattleMap' }));

    const dialog = await screen.findByRole('dialog', { name: 'New BattleMap' });
    await user.click(
      within(dialog).getByRole('button', { name: 'Create BattleMap' }),
    );

    expect(within(dialog).getByLabelText('Name')).toBeInvalid();
    expect(battlemapsAddMock).not.toHaveBeenCalled();
  });

  it('shows create validation error when config is invalid json', async () => {
    const user = userEvent.setup();
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    battlemapsGetAllByWorldMock.mockResolvedValue([]);

    renderBattleMapsPage('/world/1/battlemaps');

    await screen.findByText('No BattleMaps yet.');
    await user.click(screen.getByRole('button', { name: 'New BattleMap' }));

    const dialog = await screen.findByRole('dialog', { name: 'New BattleMap' });
    await user.type(within(dialog).getByLabelText('Name'), 'Broken Config Map');
    const configInput = within(dialog).getByLabelText('Config JSON (optional)');
    await user.clear(configInput);
    await user.type(configInput, 'not-json');
    await user.click(
      within(dialog).getByRole('button', { name: 'Create BattleMap' }),
    );

    expect(
      await within(dialog).findByText('Config must be valid JSON.'),
    ).toBeInTheDocument();
    expect(battlemapsAddMock).not.toHaveBeenCalled();
  });

  it('edits a battlemap from the edit dialog', async () => {
    const user = userEvent.setup();
    const battleMap = buildBattleMap();
    const updatedBattleMap = buildBattleMap({ name: 'Updated Dungeon Grid' });

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    battlemapsGetAllByWorldMock.mockResolvedValue([battleMap]);
    battlemapsUpdateMock.mockResolvedValue(updatedBattleMap);

    renderBattleMapsPage('/world/1/battlemaps');

    await screen.findByText('Dungeon Grid');
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog', {
      name: 'Edit BattleMap',
    });
    const nameInput = within(dialog).getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Dungeon Grid');
    await user.click(
      within(dialog).getByRole('button', { name: 'Save changes' }),
    );

    expect(battlemapsUpdateMock).toHaveBeenCalledWith(1, {
      name: 'Updated Dungeon Grid',
      config: '{}',
    });
    expect(await screen.findByText('Updated Dungeon Grid')).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'Edit BattleMap' }),
    ).not.toBeInTheDocument();
  });

  it('shows edit validation error when config is invalid json', async () => {
    const user = userEvent.setup();
    const battleMap = buildBattleMap();

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    battlemapsGetAllByWorldMock.mockResolvedValue([battleMap]);

    renderBattleMapsPage('/world/1/battlemaps');

    await screen.findByText('Dungeon Grid');
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog', {
      name: 'Edit BattleMap',
    });
    const configInput = within(dialog).getByLabelText('Config JSON (optional)');
    await user.clear(configInput);
    await user.type(configInput, 'not-json');
    await user.click(
      within(dialog).getByRole('button', { name: 'Save changes' }),
    );

    expect(
      await within(dialog).findByText('Config must be valid JSON.'),
    ).toBeInTheDocument();
    expect(battlemapsUpdateMock).not.toHaveBeenCalled();
  });

  it('deletes a battlemap after dialog confirmation', async () => {
    const user = userEvent.setup();
    const battleMap = buildBattleMap();

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    battlemapsGetAllByWorldMock.mockResolvedValue([battleMap]);
    battlemapsDeleteMock.mockResolvedValue({ id: 1 });

    renderBattleMapsPage('/world/1/battlemaps');

    await screen.findByText('Dungeon Grid');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const confirmDialog = await screen.findByRole('dialog', {
      name: 'Delete "Dungeon Grid"?',
    });
    await user.click(
      within(confirmDialog).getByRole('button', { name: 'Delete' }),
    );
    await waitFor(() => {
      expect(battlemapsDeleteMock).toHaveBeenCalledWith(1);
    });
    await waitFor(() => {
      expect(screen.queryByText('Dungeon Grid')).not.toBeInTheDocument();
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'BattleMap deleted.',
      '"Dungeon Grid" was removed.',
    );
  });

  it('does not delete when dialog confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const battleMap = buildBattleMap();

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    battlemapsGetAllByWorldMock.mockResolvedValue([battleMap]);

    renderBattleMapsPage('/world/1/battlemaps');

    await screen.findByText('Dungeon Grid');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const confirmDialog = await screen.findByRole('dialog', {
      name: 'Delete "Dungeon Grid"?',
    });
    await user.click(
      within(confirmDialog).getByRole('button', { name: 'Cancel' }),
    );

    expect(battlemapsDeleteMock).not.toHaveBeenCalled();
    expect(screen.getByText('Dungeon Grid')).toBeInTheDocument();
    expect(toastSuccessMock).not.toHaveBeenCalled();
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('shows a delete failure toast when battlemap deletion fails', async () => {
    const user = userEvent.setup();
    const battleMap = buildBattleMap();

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    battlemapsGetAllByWorldMock.mockResolvedValue([battleMap]);
    battlemapsDeleteMock.mockRejectedValue(new Error('delete failed'));

    renderBattleMapsPage('/world/1/battlemaps');

    await screen.findByText('Dungeon Grid');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const confirmDialog = await screen.findByRole('dialog', {
      name: 'Delete "Dungeon Grid"?',
    });
    await user.click(
      within(confirmDialog).getByRole('button', { name: 'Delete' }),
    );

    await waitFor(() => {
      expect(battlemapsDeleteMock).toHaveBeenCalledWith(1);
    });
    expect(screen.getByText('Dungeon Grid')).toBeInTheDocument();
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Failed to delete BattleMap.',
      'delete failed',
    );
  });
});
