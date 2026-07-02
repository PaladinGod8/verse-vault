import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppSettingsProvider } from '../../../src/renderer/hooks/useAppSettings';
import CampaignNotesPage from '../../../src/renderer/pages/CampaignNotesPage';
import {
  buildCampaign,
  buildCampaignNote,
  buildWorld,
  resetFactoryIds,
} from '../../helpers/factories';
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

function renderPage(worldId: number | string = 1, campaignId: number | string = 2) {
  return render(
    <MemoryRouter initialEntries={[`/world/${worldId}/campaign/${campaignId}/notes`]}>
      <AppSettingsProvider>
        <Routes>
          <Route path='/world/:id/campaign/:campaignId/notes' element={<CampaignNotesPage />} />
          <Route
            path='/world/:id/campaign/:campaignId/notes/:campaignNoteId'
            element={<div>Campaign Note Editor</div>}
          />
        </Routes>
      </AppSettingsProvider>
    </MemoryRouter>,
  );
}

describe('CampaignNotesPage', () => {
  let mockDb: DbApi;

  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryIds();
    mockDb = setupWindowDb();
    resetWindowDb();
  });

  it('loads campaign notes as cards', async () => {
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildWorld({ id: 1 }));
    (mockDb.campaigns.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildCampaign({ id: 2, world_id: 1, name: 'Trial by Fire' }),
    );
    (mockDb.campaignNotes.getAllByCampaign as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildCampaignNote({
        id: 7,
        world_id: 1,
        campaign_id: 2,
        name: 'Boss Arena',
        tags: ['Encounter'],
      }),
    ]);

    renderPage();

    expect(await screen.findByText('Boss Arena')).toBeInTheDocument();
    expect(screen.getByText('Encounter')).toBeInTheDocument();
  });

  it('filters cards by name and #tag token', async () => {
    const user = userEvent.setup();
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildWorld({ id: 1 }));
    (mockDb.campaigns.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildCampaign({ id: 2, world_id: 1, name: 'Trial by Fire' }),
    );
    (mockDb.campaignNotes.getAllByCampaign as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildCampaignNote({
        id: 7,
        world_id: 1,
        campaign_id: 2,
        name: 'Boss Arena',
        tags: ['Encounter'],
      }),
      buildCampaignNote({
        id: 8,
        world_id: 1,
        campaign_id: 2,
        name: 'Travel Routes',
        tags: ['Logistics'],
      }),
    ]);

    renderPage();

    await screen.findByText('Boss Arena');
    await user.type(screen.getByPlaceholderText(/search campaign notes/i), '#logistics');

    expect(screen.getByText('Travel Routes')).toBeInTheDocument();
    expect(screen.queryByText('Boss Arena')).not.toBeInTheDocument();
  });

  it('creates blank note from modal and navigates to editor page', async () => {
    const user = userEvent.setup();
    const createdNote = buildCampaignNote({
      id: 11,
      world_id: 1,
      campaign_id: 2,
      name: 'Boss Arena',
      tags: ['Encounter'],
    });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildWorld({ id: 1 }));
    (mockDb.campaigns.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildCampaign({ id: 2, world_id: 1, name: 'Trial by Fire' }),
    );
    (mockDb.campaignNotes.getAllByCampaign as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockDb.campaignNotes.add as ReturnType<typeof vi.fn>).mockResolvedValue(createdNote);

    renderPage();

    await screen.findByText('No campaign notes yet.');
    await user.click(screen.getByRole('button', { name: 'New Campaign Note' }));
    const dialog = await screen.findByRole('dialog', { name: 'New Campaign Note' });
    await user.type(within(dialog).getByLabelText('Name *'), 'Boss Arena');
    await user.type(within(dialog).getByLabelText('Tags'), 'Encounter{Enter}');
    await user.click(within(dialog).getByRole('button', { name: 'Create note' }));

    await waitFor(() => {
      expect(mockDb.campaignNotes.add).toHaveBeenCalledWith({
        world_id: 1,
        campaign_id: 2,
        name: 'Boss Arena',
        tags: ['Encounter'],
        canvas_scene: null,
        canvas_preview_image: null,
      });
    });
    expect(await screen.findByText('Campaign Note Editor')).toBeInTheDocument();
  });

  it('deletes note after confirmation', async () => {
    const user = userEvent.setup();
    const note = buildCampaignNote({
      id: 7,
      world_id: 1,
      campaign_id: 2,
      name: 'Boss Arena',
    });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildWorld({ id: 1 }));
    (mockDb.campaigns.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildCampaign({ id: 2, world_id: 1, name: 'Trial by Fire' }),
    );
    (mockDb.campaignNotes.getAllByCampaign as ReturnType<typeof vi.fn>).mockResolvedValue([note]);

    renderPage();

    await screen.findByText('Boss Arena');
    await user.click(screen.getByRole('button', { name: 'Delete Boss Arena' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete "Boss Arena"?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockDb.campaignNotes.delete).toHaveBeenCalledWith(7);
    });
    expect(screen.queryByText('Boss Arena')).not.toBeInTheDocument();
  });

  it('shows no-match state when search filters all notes out', async () => {
    const user = userEvent.setup();
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildWorld({ id: 1 }));
    (mockDb.campaigns.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildCampaign({ id: 2, world_id: 1, name: 'Trial by Fire' }),
    );
    (mockDb.campaignNotes.getAllByCampaign as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildCampaignNote({
        id: 7,
        world_id: 1,
        campaign_id: 2,
        name: 'Boss Arena',
        tags: ['Encounter'],
      }),
    ]);

    renderPage();

    await screen.findByText('Boss Arena');
    await user.type(screen.getByPlaceholderText(/search campaign notes/i), '#missing');

    expect(screen.getByText('No campaign notes match your search.')).toBeInTheDocument();
  });

  it('shows not-found state when campaign cannot be loaded', async () => {
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildWorld({ id: 1 }));
    (mockDb.campaigns.getById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockDb.campaignNotes.getAllByCampaign as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockDb.campaignNotes.getAllTagsByCampaign as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Campaign not found.')).toBeInTheDocument();
  });

  it('shows load error state when campaign notes request fails', async () => {
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('db down'));

    renderPage();

    expect(await screen.findByText('Unable to load campaign notes right now.')).toBeInTheDocument();
  });

  it('shows route error for invalid campaign params', async () => {
    renderPage('bad-world', 'bad-campaign');

    expect(await screen.findByText('Invalid campaign route.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New Campaign Note' })).not.toBeInTheDocument();
  });
});
