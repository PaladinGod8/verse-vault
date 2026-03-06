import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WorldPage from '../../../src/renderer/pages/WorldPage';

const worldsGetByIdMock = vi.fn();
const worldsMarkViewedMock = vi.fn();

function buildWorld(overrides: Partial<World> = {}): World {
  return {
    id: 1,
    name: 'Alpha',
    thumbnail: null,
    short_description: 'First world',
    last_viewed_at: null,
    config: '{}',
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  };
}

function renderWorldPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/world/:id?" element={<WorldPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('WorldPage', () => {
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
        getAll: vi.fn(),
        getById: worldsGetByIdMock,
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        markViewed: worldsMarkViewedMock,
      },
    } as unknown as DbApi;
  });

  it('shows invalid id error when route id is missing', async () => {
    renderWorldPage('/world');

    expect(await screen.findByText('Invalid world id.')).toBeInTheDocument();
    expect(worldsGetByIdMock).not.toHaveBeenCalled();
    expect(worldsMarkViewedMock).not.toHaveBeenCalled();
  });

  it('shows invalid id error when route id is non-positive', async () => {
    renderWorldPage('/world/0');

    expect(await screen.findByText('Invalid world id.')).toBeInTheDocument();
    expect(worldsGetByIdMock).not.toHaveBeenCalled();
    expect(worldsMarkViewedMock).not.toHaveBeenCalled();
  });

  it('shows not found when world does not exist', async () => {
    worldsGetByIdMock.mockResolvedValue(null);

    renderWorldPage('/world/7');

    expect(await screen.findByText('World not found.')).toBeInTheDocument();
    expect(worldsGetByIdMock).toHaveBeenCalledWith(7);
    expect(worldsMarkViewedMock).not.toHaveBeenCalled();
  });

  it('shows load error when worlds api throws', async () => {
    worldsGetByIdMock.mockRejectedValue(new Error('db unavailable'));

    renderWorldPage('/world/9');

    expect(
      await screen.findByText('Unable to load this world right now.'),
    ).toBeInTheDocument();
  });

  it('renders world details after a successful load', async () => {
    const existingWorld = buildWorld({ id: 5 });
    worldsGetByIdMock.mockResolvedValue(existingWorld);
    worldsMarkViewedMock.mockResolvedValue(
      buildWorld({
        id: 5,
        short_description: '   ',
        last_viewed_at: null,
        updated_at: 'not-a-timestamp',
      }),
    );

    renderWorldPage('/world/5');

    expect(screen.getByText('Loading world...')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Alpha' }),
    ).toBeInTheDocument();
    expect(screen.getByText('No description yet.')).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
    expect(screen.getByText('not-a-timestamp')).toBeInTheDocument();
    expect(worldsGetByIdMock).toHaveBeenCalledWith(5);
    expect(worldsMarkViewedMock).toHaveBeenCalledWith(5);
  });
});
