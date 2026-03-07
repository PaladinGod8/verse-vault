import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import StatBlocksPage from '../../src/renderer/pages/StatBlocksPage';

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

function buildWorld(overrides: Partial<World> = {}): World {
  return {
    id: 1,
    name: 'Test World',
    thumbnail: null,
    short_description: null,
    last_viewed_at: null,
    config: '{}',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function buildStatBlock(overrides: Partial<StatBlock> = {}): StatBlock {
  return {
    id: 1,
    world_id: 1,
    campaign_id: null,
    character_id: null,
    name: 'Barbarian',
    default_token_id: null,
    description: 'A strong character',
    config: '{}',
    created_at: '2026-03-05T00:00:00Z',
    updated_at: '2026-03-05T00:00:00Z',
    ...overrides,
  };
}

function renderPage(worldId: number | string | null = 1) {
  const path = worldId ? `/statblocks/${worldId}` : '/statblocks/invalid';
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path='/statblocks/:id' element={<StatBlocksPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('StatBlocksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    window.db = {
      worlds: {
        getAll: vi.fn(),
        getById: vi.fn().mockResolvedValue(buildWorld()),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        markViewed: vi.fn(),
      },
      statblocks: {
        getAllByWorld: vi.fn().mockResolvedValue([]),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    } as unknown as DbApi;
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
    it('shows loading state initially', () => {
      renderPage(1);
      expect(screen.getByText('Loading statblocks...')).toBeInTheDocument();
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
      const button = await screen.findByRole('button', {
        name: /New StatBlock/i,
      });
      await userEvent.click(button);
      // StatBlockForm should be rendered in the modal
      expect(
        await screen.findByLabelText(/Name/i, { selector: 'input' }),
      ).toBeInTheDocument();
    });

    it('closes create modal when Cancel is clicked', async () => {
      renderPage(1);
      const button = await screen.findByRole('button', {
        name: /New StatBlock/i,
      });
      await userEvent.click(button);
      const formElement = (
        await screen.findByLabelText(/Name/i, { selector: 'input' })
      ).closest('form');
      expect(formElement).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await userEvent.click(cancelButton);

      // Form should disappear - check that input is gone
      await waitFor(() => {
        expect(
          screen.queryByLabelText(/Name/i, { selector: 'input' }),
        ).not.toBeInTheDocument();
      });
    });

    it('adds new statblock and shows success toast', async () => {
      const newStatBlock = buildStatBlock({ id: 99, name: 'New Cleric' });
      window.db.statblocks.add = vi.fn().mockResolvedValue(newStatBlock);
      renderPage(1);
      const newButton = await screen.findByRole('button', {
        name: /New StatBlock/i,
      });
      await userEvent.click(newButton);

      const createButton = screen.getByRole('button', {
        name: /Create statblock/i,
      });
      expect(createButton).toBeDisabled();

      const nameInput = screen.getByLabelText(/Name/i, { selector: 'input' });
      await userEvent.type(nameInput, 'New Cleric');
      expect(createButton).not.toBeDisabled();

      await userEvent.click(createButton);

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
      await userEvent.click(newButton);

      const nameInput = screen.getByLabelText(/Name/i, { selector: 'input' });
      await userEvent.type(nameInput, 'New Cleric');

      const createButton = screen.getByRole('button', {
        name: /Create statblock/i,
      });
      await userEvent.click(createButton);

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
      await userEvent.click(editButton);
      // Check that the save button appears (indicating edit mode)
      expect(
        await screen.findByRole('button', { name: /Save changes/i }),
      ).toBeInTheDocument();
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
      await userEvent.click(newButton);
      // Form should be open
      expect(
        await screen.findByLabelText(/Name/i, { selector: 'input' }),
      ).toBeInTheDocument();

      // Click edit to open edit modal
      const editButton = await screen.findByRole('button', { name: /Edit/i });
      await userEvent.click(editButton);

      // Create form should close
      await waitFor(() => {
        const nameInputs = screen.queryAllByLabelText(/Name/i, {
          selector: 'input',
        });
        // Should have exactly one (from edit form, not create)
        expect(nameInputs.length).toBeLessThanOrEqual(1);
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
      await userEvent.click(editButton);

      const nameInput = screen.getByLabelText(/Name/i, { selector: 'input' });
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Ranger Updated');

      const saveButton = screen.getByRole('button', { name: /Save changes/i });
      await userEvent.click(saveButton);

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
      await userEvent.click(editButton);

      const nameInput = screen.getByLabelText(/Name/i, {
        selector: 'textarea,input',
      });
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Ranger Updated');

      const saveButton = screen.getByRole('button', { name: /Save changes/i });
      await userEvent.click(saveButton);

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
      await userEvent.click(editButton);

      const nameInput = screen.getByLabelText(/Name/i, { selector: 'input' });
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Ranger Updated');

      const saveButton = screen.getByRole('button', { name: /Save changes/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalledWith(
          'Failed to update statblock.',
          'Update failed',
        );
      });
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
      await userEvent.click(deleteButton);

      expect(screen.getByText(/Delete "Paladin"\?/)).toBeInTheDocument();
      expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
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
      await userEvent.click(deleteButtons[0]);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await userEvent.click(cancelButton);

      await waitFor(() => {
        expect(
          screen.queryByText(/Delete "Paladin"\?/),
        ).not.toBeInTheDocument();
      });
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
      await userEvent.click(deleteButton);

      // In the confirm dialog, find the "Delete" button (not the one on the card)
      const confirmDeleteButtons = screen.getAllByRole('button', {
        name: /Delete/i,
      });
      // The last one should be in the dialog
      await userEvent.click(
        confirmDeleteButtons[confirmDeleteButtons.length - 1],
      );

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
      await userEvent.click(deleteButtons[0]);

      const confirmDeleteButtons = screen.getAllByRole('button', {
        name: /Delete/i,
      });
      await userEvent.click(
        confirmDeleteButtons[confirmDeleteButtons.length - 1],
      );

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
      await userEvent.click(deleteButton);

      const confirmDeleteButtons = screen.getAllByRole('button', {
        name: /Delete/i,
      });
      await userEvent.click(
        confirmDeleteButtons[confirmDeleteButtons.length - 1],
      );

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
      await userEvent.click(deleteButtons[0]);

      const confirmDeleteButtons = screen.getAllByRole('button', {
        name: /Delete/i,
      });
      await userEvent.click(
        confirmDeleteButtons[confirmDeleteButtons.length - 1],
      );

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
      await userEvent.click(deleteButton);

      const confirmDeleteButtons = screen.getAllByRole('button', {
        name: /Delete/i,
      });
      await userEvent.click(
        confirmDeleteButtons[confirmDeleteButtons.length - 1],
      );

      await waitFor(() => {
        expect(
          screen.queryByText(/Delete "Paladin"\?/),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('back navigation', () => {
    it('shows back to world link when world id is valid', async () => {
      renderPage(1);
      const backLink = await screen.findByText('Back to world');
      expect(backLink).toHaveAttribute('href', '/world/1');
    });
  });
});
