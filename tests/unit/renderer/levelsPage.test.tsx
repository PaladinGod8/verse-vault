import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LevelsPage from '../../../src/renderer/pages/LevelsPage';

const worldsGetByIdMock = vi.fn();
const levelsGetAllByWorldMock = vi.fn();
const levelsAddMock = vi.fn();
const levelsUpdateMock = vi.fn();
const levelsDeleteMock = vi.fn();

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

function buildLevel(overrides: Partial<Level> = {}): Level {
  return {
    id: 1,
    world_id: 1,
    name: 'Cave of Shadows',
    category: 'Dungeon',
    description: 'A dark dungeon',
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  };
}

function renderLevelsPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/world/:id/levels" element={<LevelsPage />} />
        <Route path="/world/:id?" element={<LevelsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LevelsPage', () => {
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
        getAllByWorld: levelsGetAllByWorldMock,
        getById: vi.fn(),
        add: levelsAddMock,
        update: levelsUpdateMock,
        delete: levelsDeleteMock,
      },
      worlds: {
        getAll: vi.fn(),
        getById: worldsGetByIdMock,
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        markViewed: vi.fn(),
      },
    } as DbApi;

    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('shows error when world id is invalid', async () => {
    renderLevelsPage('/world/abc/levels');

    expect(await screen.findByText('Invalid world id.')).toBeInTheDocument();
    expect(worldsGetByIdMock).not.toHaveBeenCalled();
  });

  it('shows error when world is not found', async () => {
    worldsGetByIdMock.mockResolvedValue(null);

    renderLevelsPage('/world/1/levels');

    expect(await screen.findByText('World not found.')).toBeInTheDocument();
    expect(worldsGetByIdMock).toHaveBeenCalledWith(1);
    expect(levelsGetAllByWorldMock).not.toHaveBeenCalled();
  });

  it('shows load error when api throws', async () => {
    worldsGetByIdMock.mockRejectedValue(new Error('db unavailable'));

    renderLevelsPage('/world/1/levels');

    expect(
      await screen.findByText('Unable to load levels right now.'),
    ).toBeInTheDocument();
  });

  it('shows empty state when world has no levels', async () => {
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    levelsGetAllByWorldMock.mockResolvedValue([]);

    renderLevelsPage('/world/1/levels');

    expect(await screen.findByText('No levels yet.')).toBeInTheDocument();
    expect(levelsGetAllByWorldMock).toHaveBeenCalledWith(1);
  });

  it('renders levels list after successful load', async () => {
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    levelsGetAllByWorldMock.mockResolvedValue([
      buildLevel(),
      buildLevel({ id: 2, name: 'Forest Trail', category: 'Overworld', description: null }),
    ]);

    renderLevelsPage('/world/1/levels');

    expect(await screen.findByText('Cave of Shadows')).toBeInTheDocument();
    expect(screen.getByText('Dungeon')).toBeInTheDocument();
    expect(screen.getByText('A dark dungeon')).toBeInTheDocument();
    expect(screen.getByText('Forest Trail')).toBeInTheDocument();
    expect(screen.getByText('Overworld')).toBeInTheDocument();
  });

  it('creates a level through the create dialog', async () => {
    const user = userEvent.setup();
    const newLevel = buildLevel({ id: 3, name: 'Sky Fortress', category: 'Aerial' });

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    levelsGetAllByWorldMock.mockResolvedValue([]);
    levelsAddMock.mockResolvedValue(newLevel);

    renderLevelsPage('/world/1/levels');

    await screen.findByText('No levels yet.');
    await user.click(screen.getByRole('button', { name: 'New Level' }));

    const dialog = await screen.findByRole('dialog', { name: 'New Level' });
    await user.type(within(dialog).getByLabelText('Name'), 'Sky Fortress');
    await user.type(within(dialog).getByLabelText('Category'), 'Aerial');
    await user.click(
      within(dialog).getByRole('button', { name: 'Create level' }),
    );

    expect(levelsAddMock).toHaveBeenCalledWith({
      world_id: 1,
      name: 'Sky Fortress',
      category: 'Aerial',
      description: null,
    });
    expect(await screen.findByText('Sky Fortress')).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'New Level' }),
    ).not.toBeInTheDocument();
  });

  it('edits a level from the edit dialog', async () => {
    const user = userEvent.setup();
    const level = buildLevel({ description: null });
    const updatedLevel = buildLevel({ name: 'Updated Cave', category: 'Boss', description: null });

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    levelsGetAllByWorldMock.mockResolvedValue([level]);
    levelsUpdateMock.mockResolvedValue(updatedLevel);

    renderLevelsPage('/world/1/levels');

    await screen.findByText('Cave of Shadows');
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog', { name: 'Edit Level' });
    const nameInput = within(dialog).getByLabelText('Name');
    const categoryInput = within(dialog).getByLabelText('Category');

    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Cave');
    await user.clear(categoryInput);
    await user.type(categoryInput, 'Boss');
    await user.click(
      within(dialog).getByRole('button', { name: 'Save changes' }),
    );

    expect(levelsUpdateMock).toHaveBeenCalledWith(1, {
      name: 'Updated Cave',
      category: 'Boss',
      description: null,
    });
    expect(await screen.findByText('Updated Cave')).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'Edit Level' }),
    ).not.toBeInTheDocument();
  });

  it('deletes a level after confirmation', async () => {
    const user = userEvent.setup();
    const level = buildLevel();

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    levelsGetAllByWorldMock.mockResolvedValue([level]);
    levelsDeleteMock.mockResolvedValue({ id: 1 });

    renderLevelsPage('/world/1/levels');

    await screen.findByText('Cave of Shadows');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Delete "Cave of Shadows"? This cannot be undone.',
    );
    await waitFor(() => {
      expect(levelsDeleteMock).toHaveBeenCalledWith(1);
    });
    await waitFor(() => {
      expect(
        screen.queryByText('Cave of Shadows'),
      ).not.toBeInTheDocument();
    });
  });

  it('does not delete when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const level = buildLevel();

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    levelsGetAllByWorldMock.mockResolvedValue([level]);

    renderLevelsPage('/world/1/levels');

    await screen.findByText('Cave of Shadows');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(window.confirm).toHaveBeenCalled();
    expect(levelsDeleteMock).not.toHaveBeenCalled();
    expect(screen.getByText('Cave of Shadows')).toBeInTheDocument();
  });
});
