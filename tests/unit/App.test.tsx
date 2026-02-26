import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/renderer/App';

const worldsGetAllMock = vi.fn();
const worldsGetByIdMock = vi.fn();
const worldsMarkViewedMock = vi.fn();

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

describe('App routes', () => {
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
        getAll: worldsGetAllMock,
        getById: worldsGetByIdMock,
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        markViewed: worldsMarkViewedMock,
      },
    } as DbApi;
  });

  it('renders worlds home empty state when no worlds are returned', async () => {
    worldsGetAllMock.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('No worlds yet')).toBeInTheDocument();
    expect(
      screen.getByText('Create your first world to get started.'),
    ).toBeInTheDocument();
  });

  it('navigates to world placeholder when a world card is opened', async () => {
    const user = userEvent.setup();
    const world = buildWorld();

    worldsGetAllMock.mockResolvedValue([world]);
    worldsGetByIdMock.mockResolvedValue(world);
    worldsMarkViewedMock.mockResolvedValue({
      ...world,
      last_viewed_at: '2026-02-26 01:00:00',
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'Open Alpha' }));

    expect(
      await screen.findByRole('heading', { name: 'World Placeholder' }),
    ).toBeInTheDocument();
    expect(worldsGetByIdMock).toHaveBeenCalledWith(1);
    expect(worldsMarkViewedMock).toHaveBeenCalledWith(1);
  });
});
