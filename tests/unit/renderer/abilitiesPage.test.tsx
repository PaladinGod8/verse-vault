import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AbilitiesPage from '../../../src/renderer/pages/AbilitiesPage';

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
const levelsGetAllByWorldMock = vi.fn();
const abilitiesGetAllByWorldMock = vi.fn();
const abilitiesAddMock = vi.fn();
const abilitiesUpdateMock = vi.fn();
const abilitiesDeleteMock = vi.fn();

function buildWorld(overrides: Partial<World> = {}): World {
  return {
    id: 1,
    name: 'Alpha',
    thumbnail: null,
    short_description: 'First world',
    last_viewed_at: null,
    config: '{}',
    created_at: '2026-02-27 00:00:00',
    updated_at: '2026-02-27 00:00:00',
    ...overrides,
  };
}

function buildAbility(overrides: Partial<Ability> = {}): Ability {
  return {
    id: 1,
    world_id: 1,
    name: 'Arc Flash',
    description: null,
    type: 'active',
    passive_subtype: null,
    level_id: null,
    effects: '[]',
    conditions: '[]',
    cast_cost: '{}',
    trigger: null,
    pick_count: null,
    pick_timing: null,
    pick_is_permanent: 0,
    range_cells: null,
    aoe_shape: null,
    aoe_size_cells: null,
    target_type: null,
    created_at: '2026-02-27 00:00:00',
    updated_at: '2026-02-27 00:00:00',
    ...overrides,
  };
}

function renderAbilitiesPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path='/world/:id/abilities' element={<AbilitiesPage />} />
        <Route path='/world/:id?/abilities' element={<AbilitiesPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AbilitiesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    window.db = {
      verses: {
        getAll: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      worlds: {
        getAll: vi.fn(),
        getById: worldsGetByIdMock,
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        markViewed: vi.fn(),
      },
      levels: {
        getAllByWorld: levelsGetAllByWorldMock,
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      abilities: {
        getAllByWorld: abilitiesGetAllByWorldMock,
        getById: vi.fn(),
        add: abilitiesAddMock,
        update: abilitiesUpdateMock,
        delete: abilitiesDeleteMock,
        addChild: vi.fn(),
        removeChild: vi.fn(),
        getChildren: vi.fn().mockResolvedValue([]),
      },
    } as unknown as DbApi;

    levelsGetAllByWorldMock.mockResolvedValue([]);
  });

  it('shows error when world id is invalid', async () => {
    renderAbilitiesPage('/world/not-a-number/abilities');

    expect(await screen.findByText('Invalid world id.')).toBeInTheDocument();
    expect(worldsGetByIdMock).not.toHaveBeenCalled();
  });

  it('shows error when world id param is missing', async () => {
    renderAbilitiesPage('/world/abilities');

    expect(await screen.findByText('Invalid world id.')).toBeInTheDocument();
    expect(worldsGetByIdMock).not.toHaveBeenCalled();
  });

  it('shows world-not-found state when world does not exist', async () => {
    worldsGetByIdMock.mockResolvedValue(null);

    renderAbilitiesPage('/world/1/abilities');

    expect(await screen.findByText('World not found.')).toBeInTheDocument();
    expect(worldsGetByIdMock).toHaveBeenCalledWith(1);
    expect(abilitiesGetAllByWorldMock).not.toHaveBeenCalled();
  });

  it('shows load error when worlds lookup throws', async () => {
    worldsGetByIdMock.mockRejectedValue(new Error('db unavailable'));

    renderAbilitiesPage('/world/1/abilities');

    expect(
      await screen.findByText('Unable to load abilities right now.'),
    ).toBeInTheDocument();
  });

  it('shows children manager action only for supported passive subtypes', async () => {
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    abilitiesGetAllByWorldMock.mockResolvedValue([
      buildAbility({ id: 1, name: 'Burst', type: 'active' }),
      buildAbility({
        id: 2,
        name: 'Anchor',
        type: 'passive',
        passive_subtype: 'linchpin',
      }),
      buildAbility({
        id: 3,
        name: 'Aura',
        type: 'passive',
        passive_subtype: null,
      }),
    ]);

    renderAbilitiesPage('/world/1/abilities');

    expect(await screen.findByText('Burst')).toBeInTheDocument();
    expect(screen.getByText('Anchor')).toBeInTheDocument();
    expect(screen.getByText('Aura')).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Manage children' }),
    ).toHaveLength(1);
  });

  it('creates a new ability from the create dialog', async () => {
    const user = userEvent.setup();
    const created = buildAbility({
      id: 7,
      name: 'Storm Step',
      type: 'active',
      trigger: 'On cast',
    });

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    abilitiesGetAllByWorldMock.mockResolvedValue([]);
    abilitiesAddMock.mockResolvedValue(created);

    renderAbilitiesPage('/world/1/abilities');

    await screen.findByText('No abilities yet.');
    await user.click(screen.getByRole('button', { name: 'New Ability' }));

    const dialog = await screen.findByRole('dialog', { name: 'New Ability' });
    await user.type(within(dialog).getByLabelText('Name'), 'Storm Step');
    await user.selectOptions(within(dialog).getByLabelText('Type'), 'active');
    await user.type(
      within(dialog).getByLabelText('Trigger (optional)'),
      'On cast',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Create ability' }),
    );

    expect(abilitiesAddMock).toHaveBeenCalledWith({
      world_id: 1,
      name: 'Storm Step',
      description: null,
      type: 'active',
      passive_subtype: null,
      level_id: null,
      effects: '[]',
      conditions: '[]',
      cast_cost: '{}',
      trigger: 'On cast',
      pick_count: null,
      pick_timing: null,
      pick_is_permanent: 0,
      range_cells: null,
      aoe_shape: null,
      aoe_size_cells: null,
      target_type: null,
    });
    expect(await screen.findByText('Storm Step')).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'New Ability' }),
    ).not.toBeInTheDocument();
  });

  it('edits an existing ability from the edit dialog', async () => {
    const user = userEvent.setup();
    const existing = buildAbility({ id: 9, name: 'Old Name', type: 'active' });
    const updated = buildAbility({
      id: 9,
      name: 'New Name',
      type: 'passive',
      passive_subtype: 'rostering',
      conditions: '[{"type":"on-rest"}]',
      pick_count: 2,
      pick_timing: 'rest',
      pick_is_permanent: 1,
    });

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    abilitiesGetAllByWorldMock.mockResolvedValue([existing]);
    abilitiesUpdateMock.mockResolvedValue(updated);

    renderAbilitiesPage('/world/1/abilities');

    await screen.findByText('Old Name');
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog', { name: 'Edit Ability' });
    const nameInput = within(dialog).getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');
    await user.selectOptions(within(dialog).getByLabelText('Type'), 'passive');
    await user.selectOptions(
      within(dialog).getByLabelText('Passive subtype (optional)'),
      'rostering',
    );
    fireEvent.change(within(dialog).getByLabelText('Conditions (JSON array)'), {
      target: { value: '[{"type":"on-rest"}]' },
    });
    await user.clear(within(dialog).getByLabelText('Pick count (optional)'));
    await user.type(
      within(dialog).getByLabelText('Pick count (optional)'),
      '2',
    );
    await user.selectOptions(
      within(dialog).getByLabelText('Pick timing (optional)'),
      'rest',
    );
    await user.click(within(dialog).getByLabelText('Picks are permanent'));
    await user.click(
      within(dialog).getByRole('button', { name: 'Save changes' }),
    );

    await waitFor(() => {
      expect(abilitiesUpdateMock).toHaveBeenCalledWith(9, {
        name: 'New Name',
        description: null,
        type: 'passive',
        passive_subtype: 'rostering',
        level_id: null,
        effects: '[]',
        conditions: '[{"type":"on-rest"}]',
        cast_cost: '{}',
        trigger: null,
        pick_count: 2,
        pick_timing: 'rest',
        pick_is_permanent: 1,
      });
    });

    expect(await screen.findByText('New Name')).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'Edit Ability' }),
    ).not.toBeInTheDocument();
  });

  it('deletes an ability after dialog confirmation', async () => {
    const user = userEvent.setup();
    const ability = buildAbility({ id: 11, name: 'Disposable' });

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    abilitiesGetAllByWorldMock.mockResolvedValue([ability]);
    abilitiesDeleteMock.mockResolvedValue({ id: 11 });

    renderAbilitiesPage('/world/1/abilities');

    await screen.findByText('Disposable');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const confirmDialog = await screen.findByRole('dialog', {
      name: 'Delete "Disposable"?',
    });
    await user.click(
      within(confirmDialog).getByRole('button', { name: 'Delete' }),
    );
    await waitFor(() => {
      expect(abilitiesDeleteMock).toHaveBeenCalledWith(11);
    });
    await waitFor(() => {
      expect(screen.queryByText('Disposable')).not.toBeInTheDocument();
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Ability deleted.',
      '"Disposable" was removed.',
    );
  });

  it('does not delete when dialog confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const ability = buildAbility({ id: 12, name: 'Keep Me' });

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    abilitiesGetAllByWorldMock.mockResolvedValue([ability]);

    renderAbilitiesPage('/world/1/abilities');

    await screen.findByText('Keep Me');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const confirmDialog = await screen.findByRole('dialog', {
      name: 'Delete "Keep Me"?',
    });
    await user.click(
      within(confirmDialog).getByRole('button', { name: 'Cancel' }),
    );

    expect(abilitiesDeleteMock).not.toHaveBeenCalled();
    expect(screen.getByText('Keep Me')).toBeInTheDocument();
    expect(toastSuccessMock).not.toHaveBeenCalled();
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('shows a delete failure toast when ability deletion fails', async () => {
    const user = userEvent.setup();
    const ability = buildAbility({ id: 13, name: 'Fragile' });

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    abilitiesGetAllByWorldMock.mockResolvedValue([ability]);
    abilitiesDeleteMock.mockRejectedValue(new Error('delete failed'));

    renderAbilitiesPage('/world/1/abilities');

    await screen.findByText('Fragile');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const confirmDialog = await screen.findByRole('dialog', {
      name: 'Delete "Fragile"?',
    });
    await user.click(
      within(confirmDialog).getByRole('button', { name: 'Delete' }),
    );

    await waitFor(() => {
      expect(abilitiesDeleteMock).toHaveBeenCalledWith(13);
    });
    expect(screen.getByText('Fragile')).toBeInTheDocument();
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Failed to delete ability.',
      'delete failed',
    );
  });

  it('opens and closes the manage children dialog', async () => {
    const user = userEvent.setup();
    const parent = buildAbility({
      id: 20,
      name: 'Anchor',
      type: 'passive',
      passive_subtype: 'linchpin',
    });

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    abilitiesGetAllByWorldMock.mockResolvedValue([parent]);

    renderAbilitiesPage('/world/1/abilities');

    await screen.findByText('Anchor');
    await user.click(screen.getByRole('button', { name: 'Manage children' }));
    expect(
      await screen.findByRole('dialog', { name: 'Manage children - Anchor' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Manage children - Anchor' }),
      ).not.toBeInTheDocument();
    });
  });

  it('closes manage children dialog after deleting the managed ability', async () => {
    const user = userEvent.setup();
    const managed = buildAbility({
      id: 21,
      name: 'Managed Ability',
      type: 'passive',
      passive_subtype: 'keystone',
    });

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    abilitiesGetAllByWorldMock.mockResolvedValue([managed]);
    abilitiesDeleteMock.mockResolvedValue({ id: 21 });

    renderAbilitiesPage('/world/1/abilities');

    await screen.findByText('Managed Ability');
    await user.click(screen.getByRole('button', { name: 'Manage children' }));
    expect(
      await screen.findByRole('dialog', {
        name: 'Manage children - Managed Ability',
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const confirmDialog = await screen.findByRole('dialog', {
      name: 'Delete "Managed Ability"?',
    });
    await user.click(
      within(confirmDialog).getByRole('button', { name: 'Delete' }),
    );

    await waitFor(() => {
      expect(abilitiesDeleteMock).toHaveBeenCalledWith(21);
    });
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', {
          name: 'Manage children - Managed Ability',
        }),
      ).not.toBeInTheDocument();
    });
  });
});
