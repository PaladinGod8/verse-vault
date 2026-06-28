import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppSettingsProvider } from '../../../src/renderer/hooks/useAppSettings';
import FactionsPage from '../../../src/renderer/pages/FactionsPage';
import {
  buildFaction,
  buildFactionType,
  buildWorld,
  resetFactoryIds,
} from '../../helpers/factories';
import { resetWindowDb, setupWindowDb } from '../../helpers/ipcMock';

vi.mock('../../../src/renderer/components/ui/ToastProvider', () => ({
  useToast: () => ({
    showToast: vi.fn(),
    dismissToast: vi.fn(),
    clearToasts: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

function renderPage(worldId = 1) {
  return render(
    <MemoryRouter initialEntries={[`/world/${worldId}/factions`]}>
      <AppSettingsProvider>
        <Routes>
          <Route path='/world/:id/factions' element={<FactionsPage />} />
        </Routes>
      </AppSettingsProvider>
    </MemoryRouter>,
  );
}

describe('FactionsPage', () => {
  let mockDb: DbApi;

  beforeEach(() => {
    resetFactoryIds();
    mockDb = setupWindowDb();
    resetWindowDb();
  });

  it('loads the world and lists its factions as cards', async () => {
    const world = buildWorld({ id: 1, name: 'Aetheria' });
    const faction = buildFaction({ id: 5, world_id: 1, name: 'Cult of Contagion' });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.factions.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([faction]);

    renderPage(1);

    expect(await screen.findByText('Cult of Contagion')).toBeInTheDocument();
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
  });

  it('renders faction cards in alphabetical order', async () => {
    const world = buildWorld({ id: 1, name: 'Aetheria' });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.factions.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildFaction({ id: 3, world_id: 1, name: 'Zealots' }),
      buildFaction({ id: 1, world_id: 1, name: 'Aegis' }),
      buildFaction({ id: 2, world_id: 1, name: 'Brotherhood' }),
    ]);

    renderPage(1);

    await screen.findByText('Aegis');
    expect(screen.getAllByRole('button', { name: /^Open / }).map((card) => card.ariaLabel)).toEqual([
      'Open Aegis',
      'Open Brotherhood',
      'Open Zealots',
    ]);
  });

  it('shows an empty state when the world has no factions', async () => {
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildWorld({ id: 1 }));
    (mockDb.factions.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    renderPage(1);

    expect(await screen.findByText('No factions yet.')).toBeInTheDocument();
  });

  it('filters by search text and by the type dropdown', async () => {
    const world = buildWorld({ id: 1 });
    const companyType = buildFactionType({ id: 2, world_id: 1, name: 'Company' });
    const companyFaction = buildFaction({
      id: 1,
      world_id: 1,
      name: 'Acme Corp',
      type_id: 2,
    });
    const cultFaction = buildFaction({
      id: 2,
      world_id: 1,
      name: 'Cult of Contagion',
      type_id: null,
    });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.factions.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([
      companyFaction,
      cultFaction,
    ]);
    (mockDb.factionTypes.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([
      companyType,
    ]);

    const user = userEvent.setup();
    renderPage(1);

    await screen.findByText('Acme Corp');
    await user.type(screen.getByPlaceholderText(/search factions/i), 'Acme');
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.queryByText('Cult of Contagion')).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/search factions/i));
    await user.selectOptions(screen.getByLabelText('Filter by type'), '2');
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.queryByText('Cult of Contagion')).not.toBeInTheDocument();
  });

  it('creates a faction through the New Faction form', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1 });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.factions.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])
      .mockResolvedValueOnce([buildFaction({ id: 9, world_id: 1, name: 'New Faction' })]);
    (mockDb.factions.add as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildFaction({ id: 9, world_id: 1, name: 'New Faction' }),
    );

    renderPage(1);
    await screen.findByText('No factions yet.');

    await user.click(screen.getByRole('button', { name: 'New Faction' }));
    await user.type(screen.getByLabelText('Name *'), 'New Faction');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByRole('heading', { name: 'New Faction' })).toBeInTheDocument();
    expect(mockDb.factions.add).toHaveBeenCalledWith(
      expect.objectContaining({ world_id: 1, name: 'New Faction' }),
    );
  });

  it('keeps the existing image when saving an edited faction without touching the image', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1 });
    const faction = buildFaction({
      id: 7,
      world_id: 1,
      name: 'Cult of Contagion',
      image_src: 'vv-media://faction-images/existing.png',
    });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.factions.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([faction]);
    (mockDb.factions.update as ReturnType<typeof vi.fn>).mockResolvedValue(faction);

    renderPage(1);
    await screen.findByText('Cult of Contagion');

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await screen.findByText('Edit Faction');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockDb.factions.update).toHaveBeenCalled();
    });
    const updatePayload = (mockDb.factions.update as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(updatePayload).not.toHaveProperty('image_src');
  });

  it('opens the Manage Types modal', async () => {
    const user = userEvent.setup();
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildWorld({ id: 1 }));
    (mockDb.factions.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    renderPage(1);
    await screen.findByText('No factions yet.');

    await user.click(screen.getByRole('button', { name: 'Manage Types' }));
    expect(screen.getByText('Manage Faction Types')).toBeInTheDocument();
  });
});
