import {
  cleanup,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import StatBlocksPage from '../../src/renderer/pages/StatBlocksPage';
import {
  buildStatBlock as buildStatBlockFactory,
  buildWorld as buildWorldFactory,
  resetFactoryIds,
} from '../helpers/factories';
import { resetWindowDb, setupWindowDb } from '../helpers/ipcMock';

const { toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('../../src/renderer/components/ui/ToastProvider', () => ({
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

vi.mock('../../src/renderer/components/ui/ModalShell', () => ({
  default: ({
    isOpen,
    children,
    labelledBy,
    ariaLabel,
  }: {
    isOpen: boolean;
    children: ReactNode;
    labelledBy?: string;
    ariaLabel?: string;
  }) => {
    if (!isOpen) {
      return null;
    }

    return (
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : (ariaLabel ?? 'Dialog')}
      >
        {children}
      </div>
    );
  },
}));

function buildWorld(overrides: Partial<World> = {}): World {
  return buildWorldFactory({
    id: 1,
    name: 'Test World',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  });
}

function buildStatBlock(overrides: Partial<StatBlock> = {}): StatBlock {
  return buildStatBlockFactory({
    id: 1,
    world_id: 1,
    name: 'Barbarian',
    description: 'A strong character',
    config: '{}',
    created_at: '2026-03-05T00:00:00Z',
    updated_at: '2026-03-05T00:00:00Z',
    ...overrides,
  });
}

function renderPage(worldId: number | string | null = 1) {
  const path = worldId !== null ? `/statblocks/${worldId}` : '/statblocks/invalid';
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path='/statblocks/:id' element={<StatBlocksPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function waitForLoadingToSettle() {
  await waitFor(() => {
    expect(screen.queryAllByText('Loading statblocks...')).toHaveLength(0);
  }, { timeout: 1500 });
}

describe('StatBlocksPage', () => {
  let user: ReturnType<typeof userEvent.setup>;

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    resetFactoryIds();
    user = userEvent.setup({ delay: null });

    const mockDb = setupWindowDb();
    resetWindowDb();
    mockDb.worlds.getById = vi
      .fn()
      .mockResolvedValue(buildWorld()) as typeof mockDb.worlds.getById;
    mockDb.statblocks.getAllByWorld = vi
      .fn()
      .mockResolvedValue([]) as typeof mockDb.statblocks.getAllByWorld;
    mockDb.statblocks.listAbilities = vi
      .fn()
      .mockResolvedValue([]) as typeof mockDb.statblocks.listAbilities;
    mockDb.statblocks.attachAbility = vi
      .fn()
      .mockResolvedValue(undefined) as typeof mockDb.statblocks.attachAbility;
    mockDb.statblocks.detachAbility = vi
      .fn()
      .mockResolvedValue(undefined) as typeof mockDb.statblocks.detachAbility;
    mockDb.abilities.getAllByWorld = vi
      .fn()
      .mockResolvedValue([]) as typeof mockDb.abilities.getAllByWorld;
  });

  describe('world parameter validation', () => {
    it('shows error when world id is not provided', async () => {
      renderPage(null);
      expect(await screen.findByText('Invalid world id.')).toBeInTheDocument();
    });

    it('shows error when world id is not an integer', async () => {
      renderPage('abc');
      expect(await screen.findByText('Invalid world id.')).toBeInTheDocument();
    });

    it('shows error when world id is zero', async () => {
      renderPage(0);
      expect(await screen.findByText('Invalid world id.')).toBeInTheDocument();
    });

    it('shows error when world id is negative', async () => {
      renderPage(-5);
      expect(await screen.findByText('Invalid world id.')).toBeInTheDocument();
    });
  });

  describe('load states', () => {
    it('shows loading state initially', async () => {
      renderPage(1);
      expect(screen.getByText('Loading statblocks...')).toBeInTheDocument();
      await waitForLoadingToSettle();
    });

    it('shows world name in heading after loading', async () => {
      window.db.worlds.getById = vi
        .fn()
        .mockResolvedValue(buildWorld({ name: 'Forgotten Realms' }));
      renderPage(1);
      expect(await screen.findByText('Forgotten Realms')).toBeInTheDocument();
    });

    it('shows error when world is not found', async () => {
      window.db.worlds.getById = vi.fn().mockResolvedValue(null);
      renderPage(1);
      expect(await screen.findByText('World not found.')).toBeInTheDocument();
    });

    it('shows error when load throws', async () => {
      window.db.worlds.getById = vi
        .fn()
        .mockRejectedValue(new Error('DB error'));
      renderPage(1);
      expect(
        await screen.findByText('Unable to load statblocks right now.'),
      ).toBeInTheDocument();
    });

    it('shows empty state when no statblocks exist', async () => {
      window.db.statblocks.getAllByWorld = vi.fn().mockResolvedValue([]);
      renderPage(1);
      expect(await screen.findByText('No statblocks yet.')).toBeInTheDocument();
    });

    it('renders statblock names after loading', async () => {
      window.db.statblocks.getAllByWorld = vi
        .fn()
        .mockResolvedValue([
          buildStatBlock({ id: 1, name: 'Barbarian' }),
          buildStatBlock({ id: 2, name: 'Wizard' }),
        ]);
      renderPage(1);
      expect(await screen.findByText('Barbarian')).toBeInTheDocument();
      expect(screen.getByText('Wizard')).toBeInTheDocument();
    });
  });

  describe('create statblock', () => {
    it('does not show create button when world id is invalid', async () => {
      renderPage(null);
      await screen.findByText('Invalid world id.');
      expect(
        screen.queryByRole('button', { name: /New StatBlock/i }),
      ).not.toBeInTheDocument();
    });

    it('shows create button when world is valid', async () => {
      renderPage(1);
      expect(
        await screen.findByRole('button', { name: /New StatBlock/i }),
      ).toBeInTheDocument();
    });

    it('opens create modal when New StatBlock is clicked', async () => {
      renderPage(1);
      await screen.findByRole('heading', { name: 'Test World' });
      const button = await screen.findByRole('button', {
        name: /New StatBlock/i,
      });
      await user.click(button);
      const dialog = await screen.findByRole('dialog', {
        name: /New StatBlock/i,
      });
      // StatBlockForm should be rendered in the create modal.
      expect(
        await within(dialog).findByLabelText(/^Name$/i, { selector: 'input' }),
      ).toBeInTheDocument();
    });

    it('closes create modal when Cancel is clicked', async () => {
      renderPage(1);
      const button = await screen.findByRole('button', {
        name: /New StatBlock/i,
      });
      await user.click(button);
      const dialog = await screen.findByRole('dialog', {
        name: /New StatBlock/i,
      });
      const formElement = (
        await within(dialog).findByLabelText(/^Name$/i, { selector: 'input' })
      ).closest('form');
      expect(formElement).toBeInTheDocument();

      const cancelButton = within(dialog).getByRole('button', {
        name: /Cancel/i,
      });
      await user.click(cancelButton);

      await waitForElementToBeRemoved(dialog);
    });

    it('adds new statblock and shows success toast', async () => {
      const newStatBlock = buildStatBlock({ id: 99, name: 'New Cleric' });
      window.db.statblocks.add = vi.fn().mockResolvedValue(newStatBlock);
      renderPage(1);
      const newButton = await screen.findByRole('button', {
        name: /New StatBlock/i,
      });
      await user.click(newButton);
      const dialog = await screen.findByRole('dialog', {
        name: /New StatBlock/i,
      });

      const createButton = within(dialog).getByRole('button', {
        name: /Create statblock/i,
      });
      expect(createButton).toBeDisabled();

      const nameInput = within(dialog).getByLabelText(/^Name$/i, {
        selector: 'input',
      });
      await user.type(nameInput, 'New Cleric');
      expect(createButton).not.toBeDisabled();

      await user.click(createButton);

      await waitFor(() => {
        expect(window.db.statblocks.add).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Cleric',
            world_id: 1,
          }),
        );
        expect(toastSuccessMock).toHaveBeenCalledWith(
          'StatBlock created.',
          expect.stringContaining('New Cleric'),
        );
      });
    });

    it('shows error toast when create fails', async () => {
      window.db.statblocks.add = vi
        .fn()
        .mockRejectedValue(new Error('Create failed'));
      renderPage(1);
      const newButton = await screen.findByRole('button', {
        name: /New StatBlock/i,
      });
      await user.click(newButton);
      const dialog = await screen.findByRole('dialog', {
        name: /New StatBlock/i,
      });

      const nameInput = within(dialog).getByLabelText(/^Name$/i, {
        selector: 'input',
      });
      await user.type(nameInput, 'New Cleric');

      const createButton = within(dialog).getByRole('button', {
        name: /Create statblock/i,
      });
      await user.click(createButton);

      await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalledWith(
          'Failed to create statblock.',
          'Create failed',
        );
      });
    });
  });

  describe('edit statblock', () => {
    it('opens edit modal when Edit is clicked', async () => {
      const statBlock = buildStatBlock({ name: 'Ranger' });
      window.db.statblocks.getAllByWorld = vi
        .fn()
        .mockResolvedValue([statBlock]);
      renderPage(1);
      const editButton = await screen.findByRole('button', { name: /Edit/i });
      await user.click(editButton);
      // Check that the save button appears (indicating edit mode)
      expect(
        await screen.findByRole('button', { name: /Save changes/i }),
      ).toBeInTheDocument();
      await waitForLoadingToSettle();
    });

    it('closes create modal when editing', async () => {
      const statBlock = buildStatBlock({ name: 'Ranger' });
      window.db.statblocks.getAllByWorld = vi
        .fn()
        .mockResolvedValue([statBlock]);
      renderPage(1);
      const newButton = await screen.findByRole('button', {
        name: /New StatBlock/i,
      });
      await user.click(newButton);
      const createDialog = await screen.findByRole('dialog', {
        name: /New StatBlock/i,
      });
      // Form should be open
      expect(
        await within(createDialog).findByLabelText(/^Name$/i, {
          selector: 'input',
        }),
      ).toBeInTheDocument();

      // Click edit to open edit modal
      const editButton = await screen.findByRole('button', { name: /Edit/i });
      await user.click(editButton);
      const editDialog = await screen.findByRole('dialog', {
        name: /Edit StatBlock/i,
      });

      // Create form should close
      await waitFor(() => {
        const nameInputs = within(editDialog).queryAllByLabelText(/^Name$/i, {
          selector: 'input',
        });
        expect(nameInputs).toHaveLength(1);
      });
    });

    it('updates statblock and shows success toast', async () => {
      const originalStatBlock = buildStatBlock({ id: 5, name: 'Ranger' });
      const updatedStatBlock = buildStatBlock({
        id: 5,
        name: 'Ranger Updated',
      });
      window.db.statblocks.getAllByWorld = vi
        .fn()
        .mockResolvedValue([originalStatBlock]);
      window.db.statblocks.update = vi.fn().mockResolvedValue(updatedStatBlock);

      renderPage(1);
      const editButton = await screen.findByRole('button', { name: /Edit/i });
      await user.click(editButton);
      const dialog = await screen.findByRole('dialog', {
        name: /Edit StatBlock/i,
      });

      const nameInput = within(dialog).getByLabelText(/^Name$/i, {
        selector: 'input',
      });
      await user.clear(nameInput);
      await user.type(nameInput, 'Ranger Updated');

      const saveButton = within(dialog).getByRole('button', {
        name: /Save changes/i,
      });
      await user.click(saveButton);

      await waitFor(() => {
        expect(window.db.statblocks.update).toHaveBeenCalledWith(5, {
          name: 'Ranger Updated',
          description: originalStatBlock.description,
          config: originalStatBlock.config,
        });
        expect(toastSuccessMock).toHaveBeenCalledWith(
          'StatBlock updated.',
          expect.stringContaining('Ranger Updated'),
        );
      });
    });

    it('closes edit modal after successful update', async () => {
      const statBlock = buildStatBlock({ name: 'Ranger' });
      const updatedStatBlock = buildStatBlock({ name: 'Ranger Updated' });
      window.db.statblocks.getAllByWorld = vi
        .fn()
        .mockResolvedValue([statBlock]);
      window.db.statblocks.update = vi.fn().mockResolvedValue(updatedStatBlock);

      renderPage(1);
      const editButton = await screen.findByRole('button', { name: /Edit/i });
      await user.click(editButton);
      const dialog = await screen.findByRole('dialog', {
        name: /Edit StatBlock/i,
      });

      const nameInput = within(dialog).getByLabelText(/^Name$/i, {
        selector: 'textarea,input',
      });
      await user.clear(nameInput);
      await user.type(nameInput, 'Ranger Updated');

      const saveButton = within(dialog).getByRole('button', {
        name: /Save changes/i,
      });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toastSuccessMock).toHaveBeenCalledWith(
          'StatBlock updated.',
          expect.stringContaining('Ranger Updated'),
        );
      });
    });

    it('shows error toast when update fails', async () => {
      const statBlock = buildStatBlock({ name: 'Ranger' });
      window.db.statblocks.getAllByWorld = vi
        .fn()
        .mockResolvedValue([statBlock]);
      window.db.statblocks.update = vi
        .fn()
        .mockRejectedValue(new Error('Update failed'));

      renderPage(1);
      const editButton = await screen.findByRole('button', { name: /Edit/i });
      await user.click(editButton);
      const dialog = await screen.findByRole('dialog', {
        name: /Edit StatBlock/i,
      });

      const nameInput = within(dialog).getByLabelText(/^Name$/i, {
        selector: 'input',
      });
      await user.clear(nameInput);
      await user.type(nameInput, 'Ranger Updated');

      const saveButton = within(dialog).getByRole('button', {
        name: /Save changes/i,
      });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalledWith(
          'Failed to update statblock.',
          'Update failed',
        );
      });
      await waitFor(() => {
        expect(window.db.worlds.getById).toHaveBeenCalledWith(1);
      });
      await waitFor(() => {
        expect(vi.mocked(window.db.worlds.getById).mock.calls.length).toBeGreaterThanOrEqual(2);
      });
      await waitForLoadingToSettle();
    });
  });

  describe('delete statblock', () => {
    it('opens delete confirmation when Delete is clicked', async () => {
      const statBlock = buildStatBlock({ name: 'Paladin' });
      window.db.statblocks.getAllByWorld = vi
        .fn()
        .mockResolvedValue([statBlock]);
      renderPage(1);

      const deleteButton = await screen.findByRole('button', {
        name: /Delete/i,
      });
      await user.click(deleteButton);

      const dialog = await screen.findByRole('dialog', {
        name: /Delete "Paladin"\?/i,
      });
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByText('This cannot be undone.')).toBeInTheDocument();
      await waitForLoadingToSettle();
    });

    it('closes confirmation when Cancel is clicked', async () => {
      const statBlock = buildStatBlock({ name: 'Paladin' });
      window.db.statblocks.getAllByWorld = vi
        .fn()
        .mockResolvedValue([statBlock]);
      renderPage(1);

      const deleteButtons = await screen.findAllByRole('button', {
        name: /Delete/i,
      });
      // First delete button is on the card, not the confirm dialog
      await user.click(deleteButtons[0]);

      const dialog = await screen.findByRole('dialog', {
        name: /Delete "Paladin"\?/i,
      });
      const cancelButton = within(dialog).getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      await waitForElementToBeRemoved(dialog);
    });

    it('deletes statblock and shows success toast', async () => {
      const statBlock = buildStatBlock({ id: 10, name: 'Paladin' });
      window.db.statblocks.getAllByWorld = vi
        .fn()
        .mockResolvedValue([statBlock]);
      window.db.statblocks.delete = vi.fn().mockResolvedValue(undefined);

      renderPage(1);

      const deleteButton = await screen.findByRole('button', {
        name: /Delete/i,
      });
      await user.click(deleteButton);

      const dialog = await screen.findByRole('dialog', {
        name: /Delete "Paladin"\?/i,
      });
      const confirmDeleteButton = await within(dialog).findByRole('button', {
        name: /^Delete$/i,
      });
      await user.click(confirmDeleteButton);

      await waitFor(() => {
        expect(window.db.statblocks.delete).toHaveBeenCalledWith(10);
        expect(toastSuccessMock).toHaveBeenCalledWith(
          'StatBlock deleted.',
          expect.stringContaining('Paladin'),
        );
      });
    });

    it('removes statblock from list after deletion', async () => {
      const statBlock1 = buildStatBlock({ id: 10, name: 'Paladin' });
      const statBlock2 = buildStatBlock({ id: 11, name: 'Cleric' });
      window.db.statblocks.getAllByWorld = vi
        .fn()
        .mockResolvedValue([statBlock1, statBlock2]);
      window.db.statblocks.delete = vi.fn().mockResolvedValue(undefined);

      renderPage(1);
      expect(await screen.findByText('Paladin')).toBeInTheDocument();
      expect(screen.getByText('Cleric')).toBeInTheDocument();

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      await user.click(deleteButtons[0]);

      const dialog = await screen.findByRole('dialog', {
        name: /Delete "Paladin"\?/i,
      });
      const confirmDeleteButton = await within(dialog).findByRole('button', {
        name: /^Delete$/i,
      });
      await user.click(confirmDeleteButton);

      await waitFor(() => {
        expect(screen.queryByText('Paladin')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Cleric')).toBeInTheDocument();
    });

    it('shows error toast when delete fails', async () => {
      const statBlock = buildStatBlock({ name: 'Paladin' });
      window.db.statblocks.getAllByWorld = vi
        .fn()
        .mockResolvedValue([statBlock]);
      window.db.statblocks.delete = vi
        .fn()
        .mockRejectedValue(new Error('Delete failed'));

      renderPage(1);

      const deleteButton = await screen.findByRole('button', {
        name: /Delete/i,
      });
      await user.click(deleteButton);

      const dialog = await screen.findByRole('dialog', {
        name: /Delete "Paladin"\?/i,
      });
      const confirmDeleteButton = await within(dialog).findByRole('button', {
        name: /^Delete$/i,
      });
      await user.click(confirmDeleteButton);

      await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalledWith(
          'Failed to delete statblock.',
          'Delete failed',
        );
      });
    });

    it('does not remove statblock if delete fails', async () => {
      const statBlock1 = buildStatBlock({ id: 10, name: 'Paladin' });
      const statBlock2 = buildStatBlock({ id: 11, name: 'Cleric' });
      window.db.statblocks.getAllByWorld = vi
        .fn()
        .mockResolvedValue([statBlock1, statBlock2]);
      window.db.statblocks.delete = vi
        .fn()
        .mockRejectedValue(new Error('Delete failed'));

      renderPage(1);
      expect(await screen.findByText('Paladin')).toBeInTheDocument();

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      await user.click(deleteButtons[0]);

      const dialog = await screen.findByRole('dialog', {
        name: /Delete "Paladin"\?/i,
      });
      const confirmDeleteButton = await within(dialog).findByRole('button', {
        name: /^Delete$/i,
      });
      await user.click(confirmDeleteButton);

      await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalled();
      });
      expect(screen.getByText('Paladin')).toBeInTheDocument();
    });

    it('closes confirmation after delete attempt', async () => {
      const statBlock = buildStatBlock({ name: 'Paladin' });
      window.db.statblocks.getAllByWorld = vi
        .fn()
        .mockResolvedValue([statBlock]);
      window.db.statblocks.delete = vi.fn().mockResolvedValue(undefined);

      renderPage(1);

      const deleteButton = await screen.findByRole('button', {
        name: /Delete/i,
      });
      await user.click(deleteButton);

      const dialog = await screen.findByRole('dialog', {
        name: /Delete "Paladin"\?/i,
      });
      const confirmDeleteButton = await within(dialog).findByRole('button', {
        name: /^Delete$/i,
      });
      await user.click(confirmDeleteButton);

      await waitForElementToBeRemoved(dialog);
    });
  });

  describe('back navigation', () => {
    it('shows back to world link when world id is valid', async () => {
      renderPage(1);
      const backLink = await screen.findByText('Back to world');
      expect(backLink).toHaveAttribute('href', '/world/1');
      await waitForLoadingToSettle();
    });
  });
});
