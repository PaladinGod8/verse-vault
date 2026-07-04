import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppSettingsProvider } from '../../../src/renderer/hooks/useAppSettings';
import BackgroundsPage from '../../../src/renderer/pages/BackgroundsPage';

vi.mock(
  '../../../src/renderer/components/ui/RichTextEditor',
  () => import('../../helpers/richTextEditorMock'),
);
import { buildBackground, buildWorld, resetFactoryIds } from '../../helpers/factories';
import { resetWindowDb, setupWindowDb } from '../../helpers/ipcMock';

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

function renderPage(worldId = 1) {
  return render(
    <MemoryRouter initialEntries={[`/world/${worldId}/backgrounds`]}>
      <AppSettingsProvider>
        <Routes>
          <Route path='/world/:id/backgrounds' element={<BackgroundsPage />} />
        </Routes>
      </AppSettingsProvider>
    </MemoryRouter>,
  );
}

describe('BackgroundsPage', () => {
  let mockDb: DbApi;

  beforeEach(() => {
    resetFactoryIds();
    mockDb = setupWindowDb();
    resetWindowDb();
  });

  it('loads world and lists background cards', async () => {
    const world = buildWorld({ id: 1, name: 'Aetheria' });
    const background = buildBackground({ id: 5, world_id: 1, name: 'Royal Guard' });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.backgrounds.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([background]);

    renderPage(1);

    expect(await screen.findByText('Royal Guard')).toBeInTheDocument();
  });

  it('renders background cards in alphabetical order', async () => {
    const world = buildWorld({ id: 1, name: 'Aetheria' });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.backgrounds.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildBackground({ id: 3, world_id: 1, name: 'Zed' }),
      buildBackground({ id: 1, world_id: 1, name: 'A-LIVE' }),
      buildBackground({ id: 2, world_id: 1, name: 'Beta' }),
    ]);

    renderPage(1);

    await screen.findByText('A-LIVE');
    expect(screen.getAllByRole('button', { name: /^Open / }).map((card) => card.ariaLabel)).toEqual(
      ['Open A-LIVE', 'Open Beta', 'Open Zed'],
    );
  });

  it('switches to recently-viewed order and persists choice', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1, name: 'Aetheria' });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.backgrounds.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildBackground({ id: 1, world_id: 1, name: 'Zed', last_viewed_at: '2026-02-01 00:00:00' }),
      buildBackground({ id: 2, world_id: 1, name: 'Beta', last_viewed_at: '2026-03-01 00:00:00' }),
    ]);

    renderPage(1);

    await screen.findByText('Zed');
    await user.click(screen.getByRole('button', { name: 'Recently Viewed' }));

    expect(
      screen.getAllByRole('button', { name: /^Open / }).map((card) => card.ariaLabel),
    ).toEqual(['Open Beta', 'Open Zed']);
    expect(mockDb.settings.update).toHaveBeenCalledWith(
      JSON.stringify({ cardSortPreferences: { backgrounds: 'recentlyViewed' } }),
    );
  });

  it('filters by name and description text', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1 });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.backgrounds.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildBackground({ id: 1, world_id: 1, name: 'Royal Guard', description: 'City soldiers' }),
      buildBackground({ id: 2, world_id: 1, name: 'Scholar', description: 'Library archivist' }),
    ]);

    renderPage(1);

    await screen.findByText('Royal Guard');
    await user.type(screen.getByPlaceholderText(/search backgrounds/i), 'archivist');

    expect(screen.getByText('Scholar')).toBeInTheDocument();
    expect(screen.queryByText('Royal Guard')).not.toBeInTheDocument();
  });

  it('shows total background count and keeps it unchanged while filtering', async () => {
    const user = userEvent.setup();
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildWorld({ id: 1 }));
    (mockDb.backgrounds.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildBackground({ id: 1, world_id: 1, name: 'Royal Guard' }),
      buildBackground({ id: 2, world_id: 1, name: 'Scholar' }),
    ]);

    renderPage(1);

    await screen.findByText('Royal Guard');
    expect(screen.getByRole('status', { name: 'Total backgrounds' })).toHaveTextContent(
      '2 backgrounds',
    );

    await user.type(screen.getByPlaceholderText(/search backgrounds/i), 'Royal');
    expect(screen.getByRole('status', { name: 'Total backgrounds' })).toHaveTextContent(
      '2 backgrounds',
    );
  });

  it('shows empty state when world has no backgrounds', async () => {
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildWorld({ id: 1 }));
    (mockDb.backgrounds.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    renderPage(1);

    expect(await screen.findByText('No backgrounds yet.')).toBeInTheDocument();
  });

  it('paginates and resets to page one when search changes', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1, name: 'Aetheria' });
    const backgrounds = Array.from({ length: 55 }, (_, index) =>
      buildBackground({
        id: index + 1,
        world_id: 1,
        name: `Background ${String(index + 1).padStart(2, '0')}`,
      }));
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.backgrounds.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue(backgrounds);

    renderPage(1);

    await screen.findByText('Background 01');
    expect(screen.queryByText('Background 51')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await screen.findByText('Background 51');
    await user.type(screen.getByPlaceholderText(/search backgrounds/i), 'Background 01');

    expect(await screen.findByText('Background 01')).toBeInTheDocument();
    expect(screen.queryByText('Page 2 of')).not.toBeInTheDocument();
  });

  it('creates background through New Background form', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1 });
    const created = buildBackground({ id: 9, world_id: 1, name: 'Royal Guard' });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.backgrounds.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])
      .mockResolvedValueOnce([created]);
    (mockDb.backgrounds.add as ReturnType<typeof vi.fn>).mockResolvedValue(created);

    renderPage(1);
    await screen.findByText('No backgrounds yet.');

    await user.click(screen.getByRole('button', { name: 'New Background' }));
    await user.type(screen.getByLabelText('Name *'), 'Royal Guard');
    await user.type(screen.getByLabelText('Description'), 'City soldiers');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockDb.backgrounds.add).toHaveBeenCalledWith(
        expect.objectContaining({
          world_id: 1,
          name: 'Royal Guard',
          description: 'City soldiers',
        }),
      );
    });
    expect(await screen.findByText('Royal Guard')).toBeInTheDocument();
  });

  it('keeps existing image when saving edited background without touching image', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1 });
    const background = buildBackground({
      id: 7,
      world_id: 1,
      name: 'Royal Guard',
      image_src: 'vv-media://background-images/existing.png',
    });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.backgrounds.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([background]);
    (mockDb.backgrounds.update as ReturnType<typeof vi.fn>).mockResolvedValue(background);

    renderPage(1);
    await screen.findByText('Royal Guard');

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockDb.backgrounds.update).toHaveBeenCalled();
    });
    const updatePayload = (mockDb.backgrounds.update as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(updatePayload).not.toHaveProperty('image_src');
  });

  it('deletes background after confirming', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1 });
    const background = buildBackground({ id: 3, world_id: 1, name: 'Doomed Role' });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.backgrounds.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      background,
    ]).mockResolvedValueOnce([]);

    renderPage(1);
    await screen.findByText('Doomed Role');

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const confirmDialog = await screen.findByRole('dialog', { name: 'Delete "Doomed Role"?' });
    await user.click(within(confirmDialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockDb.backgrounds.delete).toHaveBeenCalledWith(3);
    });
  });
});
