import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorldPage from '../../../src/renderer/pages/WorldPage';

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
const worldsMarkViewedMock = vi.fn();
const worldsExportMock = vi.fn();

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
        <Route path='/world/:id?' element={<WorldPage />} />
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
        export: worldsExportMock,
        import: vi.fn(),
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

  it('exports world from header action and shows success toast', async () => {
    const user = userEvent.setup();
    const existingWorld = buildWorld({ id: 5 });

    worldsGetByIdMock.mockResolvedValue(existingWorld);
    worldsMarkViewedMock.mockResolvedValue(existingWorld);
    worldsExportMock.mockResolvedValue({
      canceled: false,
      filePath: 'C:\\Exports\\alpha.zip',
      worldName: 'Alpha',
    });

    renderWorldPage('/world/5');

    await screen.findByRole('heading', { name: 'Alpha' });
    await user.click(screen.getByRole('button', { name: 'Export World Data' }));

    await waitFor(() => {
      expect(worldsExportMock).toHaveBeenCalledWith(5);
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'World exported.',
      '"Alpha" was saved to C:\\Exports\\alpha.zip.',
    );
  });

  it('shows export failure toast when export throws', async () => {
    const user = userEvent.setup();
    const existingWorld = buildWorld({ id: 5 });

    worldsGetByIdMock.mockResolvedValue(existingWorld);
    worldsMarkViewedMock.mockResolvedValue(existingWorld);
    worldsExportMock.mockRejectedValue(new Error('disk full'));

    renderWorldPage('/world/5');

    await screen.findByRole('heading', { name: 'Alpha' });
    await user.click(screen.getByRole('button', { name: 'Export World Data' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Failed to export world.',
        'disk full',
      );
    });
  });
});
