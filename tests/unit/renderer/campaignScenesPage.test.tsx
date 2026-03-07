import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CampaignScenesPage from '../../../src/renderer/pages/CampaignScenesPage';

const campaignsGetByIdMock = vi.fn();
const scenesGetAllByCampaignMock = vi.fn();

function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 1,
    world_id: 1,
    name: 'The Dragon Saga',
    summary: null,
    config: '{}',
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  };
}

function buildCampaignScene(
  overrides: Partial<CampaignSceneListItem> = {},
): CampaignSceneListItem {
  return {
    id: 11,
    session_id: 31,
    name: 'Scene Alpha',
    notes: null,
    payload: '{}',
    sort_order: 0,
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    session_name: 'Session One',
    act_id: 21,
    act_name: 'Act One',
    arc_id: 12,
    arc_name: 'Arc One',
    ...overrides,
  };
}

function renderCampaignScenesPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path='/world/:id/campaign/:campaignId/scenes'
          element={<CampaignScenesPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CampaignScenesPage', () => {
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
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        markViewed: vi.fn(),
      },
      campaigns: {
        getAllByWorld: vi.fn(),
        getById: campaignsGetByIdMock,
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      arcs: {
        getAllByCampaign: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      acts: {
        getAllByArc: vi.fn(),
        getAllByCampaign: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        moveTo: vi.fn(),
      },
      sessions: {
        getAllByAct: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        moveTo: vi.fn(),
      },
      scenes: {
        getAllByCampaign: scenesGetAllByCampaignMock,
        getAllBySession: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        moveTo: vi.fn(),
      },
    } as unknown as DbApi;
  });

  it('shows error when world id is invalid', async () => {
    renderCampaignScenesPage('/world/abc/campaign/1/scenes');

    expect(
      await screen.findByText('Invalid world or campaign id.'),
    ).toBeInTheDocument();
    expect(campaignsGetByIdMock).not.toHaveBeenCalled();
    expect(scenesGetAllByCampaignMock).not.toHaveBeenCalled();
  });

  it('shows error when campaign id is invalid', async () => {
    renderCampaignScenesPage('/world/1/campaign/abc/scenes');

    expect(
      await screen.findByText('Invalid world or campaign id.'),
    ).toBeInTheDocument();
    expect(campaignsGetByIdMock).not.toHaveBeenCalled();
    expect(scenesGetAllByCampaignMock).not.toHaveBeenCalled();
  });

  it('shows load error when api throws', async () => {
    campaignsGetByIdMock.mockRejectedValue(new Error('db unavailable'));

    renderCampaignScenesPage('/world/1/campaign/1/scenes');

    expect(
      await screen.findByText('Unable to load campaign scenes right now.'),
    ).toBeInTheDocument();
    expect(scenesGetAllByCampaignMock).not.toHaveBeenCalled();
  });

  it('shows empty state when campaign has no scenes', async () => {
    campaignsGetByIdMock.mockResolvedValue(buildCampaign());
    scenesGetAllByCampaignMock.mockResolvedValue([]);

    renderCampaignScenesPage('/world/1/campaign/1/scenes');

    expect(await screen.findByText('No scenes yet.')).toBeInTheDocument();
    expect(campaignsGetByIdMock).toHaveBeenCalledWith(1);
    expect(scenesGetAllByCampaignMock).toHaveBeenCalledWith(1);
  });

  it('renders campaign scenes table after successful load', async () => {
    campaignsGetByIdMock.mockResolvedValue(buildCampaign());
    scenesGetAllByCampaignMock.mockResolvedValue([
      buildCampaignScene(),
      buildCampaignScene({
        id: 12,
        name: 'Scene Beta',
        session_id: 32,
        session_name: 'Session Two',
        act_id: 22,
        act_name: 'Act Two',
        arc_id: 13,
        arc_name: 'Arc Two',
      }),
    ]);

    renderCampaignScenesPage('/world/1/campaign/1/scenes');

    expect(
      await screen.findByText('The Dragon Saga - Scenes'),
    ).toBeInTheDocument();
    expect(screen.getByText('Scene Alpha')).toBeInTheDocument();
    expect(screen.getByText('Session One')).toBeInTheDocument();
    expect(screen.getByText('Act One')).toBeInTheDocument();
    expect(screen.getByText('Arc One')).toBeInTheDocument();
    expect(screen.getByText('Scene Beta')).toBeInTheDocument();

    const openLinks = screen.getAllByRole('link', {
      name: 'Open Session Scenes',
    });
    expect(openLinks[0]).toHaveAttribute(
      'href',
      '/world/1/campaign/1/arc/12/act/21/session/31/scenes',
    );
  });
});
