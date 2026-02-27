import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import WorldsHomePage from '../../../src/renderer/pages/WorldsHomePage';

const worldsGetAllMock = vi.fn();
const worldsAddMock = vi.fn();
const worldsUpdateMock = vi.fn();
const worldsDeleteMock = vi.fn();

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

function renderWorldsHomePage() {
  return render(
    <MemoryRouter>
      <WorldsHomePage />
    </MemoryRouter>,
  );
}

describe('WorldsHomePage renderer behaviors', () => {
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
      worlds: {
        getAll: worldsGetAllMock,
        getById: vi.fn(),
        add: worldsAddMock,
        update: worldsUpdateMock,
        delete: worldsDeleteMock,
        markViewed: vi.fn(),
      },
    } as DbApi;

    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders world cards from loaded worlds data', async () => {
    worldsGetAllMock.mockResolvedValue([
      buildWorld(),
      buildWorld({
        id: 2,
        name: 'Beta',
        short_description: null,
      }),
    ]);

    renderWorldsHomePage();

    expect(
      await screen.findByRole('button', { name: 'Open Alpha' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open Beta' }),
    ).toBeInTheDocument();
    expect(screen.getByText('First world')).toBeInTheDocument();
    expect(screen.getByText('No description yet.')).toBeInTheDocument();
  });

  it('creates a world through the create dialog', async () => {
    const user = userEvent.setup();
    const createdWorld = buildWorld({
      id: 5,
      name: 'New Realm',
      thumbnail: 'https://example.com/new.png',
      short_description: 'Created in test',
    });

    worldsGetAllMock.mockResolvedValue([]);
    worldsAddMock.mockResolvedValue(createdWorld);

    renderWorldsHomePage();

    await screen.findByText('No worlds yet');
    await user.click(screen.getByRole('button', { name: 'Create world' }));

    const dialog = await screen.findByRole('dialog', { name: 'Create world' });
    await user.type(within(dialog).getByLabelText('Name'), '  New Realm  ');
    await user.type(
      within(dialog).getByLabelText('Thumbnail URL (optional)'),
      'https://example.com/new.png',
    );
    await user.type(
      within(dialog).getByLabelText('Short description (optional)'),
      'Created in test',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Create world' }),
    );

    expect(worldsAddMock).toHaveBeenCalledWith({
      name: 'New Realm',
      thumbnail: 'https://example.com/new.png',
      short_description: 'Created in test',
    });
    expect(
      await screen.findByRole('button', { name: 'Open New Realm' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'Create world' }),
    ).not.toBeInTheDocument();
  });

  it('updates a world from the edit dialog', async () => {
    const user = userEvent.setup();

    worldsGetAllMock.mockResolvedValue([buildWorld()]);
    worldsUpdateMock.mockResolvedValue(
      buildWorld({
        name: 'Alpha Prime',
        short_description: 'Updated description',
      }),
    );

    renderWorldsHomePage();

    await screen.findByRole('button', { name: 'Open Alpha' });
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog', { name: 'Edit world' });
    const nameInput = within(dialog).getByLabelText('Name');
    const descriptionInput = within(dialog).getByLabelText(
      'Short description (optional)',
    );

    await user.clear(nameInput);
    await user.type(nameInput, '  Alpha Prime  ');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, '  Updated description  ');
    await user.click(
      within(dialog).getByRole('button', { name: 'Save changes' }),
    );

    expect(worldsUpdateMock).toHaveBeenCalledWith(1, {
      name: 'Alpha Prime',
      thumbnail: null,
      short_description: 'Updated description',
    });
    expect(
      await screen.findByRole('button', { name: 'Open Alpha Prime' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'Edit world' }),
    ).not.toBeInTheDocument();
  });

  it('deletes a world when deletion is confirmed', async () => {
    const user = userEvent.setup();
    const world = buildWorld();

    worldsGetAllMock.mockResolvedValue([world]);
    worldsDeleteMock.mockResolvedValue({ id: 1 });

    renderWorldsHomePage();

    await screen.findByRole('button', { name: 'Open Alpha' });
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Delete "Alpha"? This cannot be undone.',
    );
    await waitFor(() => {
      expect(worldsDeleteMock).toHaveBeenCalledWith(1);
    });
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Open Alpha' }),
      ).not.toBeInTheDocument();
    });
  });
});
