import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CampaignsPage from '../../../src/renderer/pages/CampaignsPage';

const worldsGetByIdMock = vi.fn();
const campaignsGetAllByWorldMock = vi.fn();
const campaignsAddMock = vi.fn();
const campaignsUpdateMock = vi.fn();
const campaignsDeleteMock = vi.fn();

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

function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 1,
    world_id: 1,
    name: 'The Dragon Saga',
    summary: 'An epic dragon quest',
    config: '{}',
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  };
}

function renderCampaignsPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/world/:id/campaigns" element={<CampaignsPage />} />
        <Route
          path="/world/:id/campaign/:campaignId/scenes"
          element={<div>Campaign Scenes Page</div>}
        />
        <Route
          path="/world/:id/campaign/:campaignId/arcs"
          element={<div>Arcs Page</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CampaignsPage', () => {
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
      abilities: {
        getAllByWorld: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        addChild: vi.fn(),
        removeChild: vi.fn(),
        getChildren: vi.fn(),
      },
      worlds: {
        getAll: vi.fn(),
        getById: worldsGetByIdMock,
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        markViewed: vi.fn(),
      },
      campaigns: {
        getAllByWorld: campaignsGetAllByWorldMock,
        getById: vi.fn(),
        add: campaignsAddMock,
        update: campaignsUpdateMock,
        delete: campaignsDeleteMock,
      },
      sessions: {
        getAllByCampaign: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      scenes: {
        getAllBySession: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    } as DbApi;

    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('shows error when world id is invalid', async () => {
    renderCampaignsPage('/world/abc/campaigns');

    expect(await screen.findByText('Invalid world id.')).toBeInTheDocument();
    expect(worldsGetByIdMock).not.toHaveBeenCalled();
  });

  it('shows error when world is not found', async () => {
    worldsGetByIdMock.mockResolvedValue(null);

    renderCampaignsPage('/world/1/campaigns');

    expect(await screen.findByText('World not found.')).toBeInTheDocument();
    expect(worldsGetByIdMock).toHaveBeenCalledWith(1);
    expect(campaignsGetAllByWorldMock).not.toHaveBeenCalled();
  });

  it('shows load error when api throws', async () => {
    worldsGetByIdMock.mockRejectedValue(new Error('db unavailable'));

    renderCampaignsPage('/world/1/campaigns');

    expect(
      await screen.findByText('Unable to load campaigns right now.'),
    ).toBeInTheDocument();
  });

  it('shows empty state when world has no campaigns', async () => {
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([]);

    renderCampaignsPage('/world/1/campaigns');

    expect(await screen.findByText('No campaigns yet.')).toBeInTheDocument();
    expect(campaignsGetAllByWorldMock).toHaveBeenCalledWith(1);
  });

  it('renders campaigns list after successful load', async () => {
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([
      buildCampaign(),
      buildCampaign({ id: 2, name: 'Shattered Realms', summary: null }),
    ]);

    renderCampaignsPage('/world/1/campaigns');

    expect(await screen.findByText('The Dragon Saga')).toBeInTheDocument();
    expect(screen.getByText('An epic dragon quest')).toBeInTheDocument();
    expect(screen.getByText('Shattered Realms')).toBeInTheDocument();
  });

  it('creates a campaign through the create dialog', async () => {
    const user = userEvent.setup();
    const newCampaign = buildCampaign({
      id: 3,
      name: 'New Adventure',
      summary: 'Starts here',
    });

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([]);
    campaignsAddMock.mockResolvedValue(newCampaign);

    renderCampaignsPage('/world/1/campaigns');

    await screen.findByText('No campaigns yet.');
    await user.click(screen.getByRole('button', { name: 'New Campaign' }));

    const dialog = await screen.findByRole('dialog', { name: 'New Campaign' });
    await user.type(within(dialog).getByLabelText('Name'), 'New Adventure');
    await user.type(
      within(dialog).getByLabelText('Summary (optional)'),
      'Starts here',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Create campaign' }),
    );

    expect(campaignsAddMock).toHaveBeenCalledWith({
      world_id: 1,
      name: 'New Adventure',
      summary: 'Starts here',
    });
    expect(await screen.findByText('New Adventure')).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'New Campaign' }),
    ).not.toBeInTheDocument();
  });

  it('cancels the create dialog without creating', async () => {
    const user = userEvent.setup();
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([]);

    renderCampaignsPage('/world/1/campaigns');

    await screen.findByText('No campaigns yet.');
    await user.click(screen.getByRole('button', { name: 'New Campaign' }));

    await screen.findByRole('dialog', { name: 'New Campaign' });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(
      screen.queryByRole('dialog', { name: 'New Campaign' }),
    ).not.toBeInTheDocument();
    expect(campaignsAddMock).not.toHaveBeenCalled();
  });

  it('edits a campaign from the edit dialog', async () => {
    const user = userEvent.setup();
    const campaign = buildCampaign({ summary: null });
    const updatedCampaign = buildCampaign({
      name: 'Updated Saga',
      summary: 'New summary',
    });

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([campaign]);
    campaignsUpdateMock.mockResolvedValue(updatedCampaign);

    renderCampaignsPage('/world/1/campaigns');

    await screen.findByText('The Dragon Saga');
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog', { name: 'Edit Campaign' });
    const nameInput = within(dialog).getByLabelText('Name');

    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Saga');
    await user.type(
      within(dialog).getByLabelText('Summary (optional)'),
      'New summary',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Save changes' }),
    );

    expect(campaignsUpdateMock).toHaveBeenCalledWith(1, {
      name: 'Updated Saga',
      summary: 'New summary',
    });
    expect(await screen.findByText('Updated Saga')).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'Edit Campaign' }),
    ).not.toBeInTheDocument();
  });

  it('deletes a campaign after confirmation', async () => {
    const user = userEvent.setup();
    const campaign = buildCampaign();

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([campaign]);
    campaignsDeleteMock.mockResolvedValue({ id: 1 });

    renderCampaignsPage('/world/1/campaigns');

    await screen.findByText('The Dragon Saga');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Delete "The Dragon Saga"? This cannot be undone.',
    );
    await waitFor(() => {
      expect(campaignsDeleteMock).toHaveBeenCalledWith(1);
    });
    await waitFor(() => {
      expect(screen.queryByText('The Dragon Saga')).not.toBeInTheDocument();
    });
  });

  it('does not delete when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const campaign = buildCampaign();

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([campaign]);

    renderCampaignsPage('/world/1/campaigns');

    await screen.findByText('The Dragon Saga');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(window.confirm).toHaveBeenCalled();
    expect(campaignsDeleteMock).not.toHaveBeenCalled();
    expect(screen.getByText('The Dragon Saga')).toBeInTheDocument();
  });

  it('navigates to arcs page when Arcs link is clicked', async () => {
    const user = userEvent.setup();
    const campaign = buildCampaign();

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([campaign]);

    renderCampaignsPage('/world/1/campaigns');

    await screen.findByText('The Dragon Saga');
    await user.click(screen.getByRole('link', { name: 'Arcs' }));

    expect(await screen.findByText('Arcs Page')).toBeInTheDocument();
  });

  it('navigates to campaign scenes page when Scenes link is clicked', async () => {
    const user = userEvent.setup();
    const campaign = buildCampaign();

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([campaign]);

    renderCampaignsPage('/world/1/campaigns');

    await screen.findByText('The Dragon Saga');
    await user.click(screen.getByRole('link', { name: 'Scenes' }));

    expect(await screen.findByText('Campaign Scenes Page')).toBeInTheDocument();
  });
});
