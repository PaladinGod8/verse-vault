import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/renderer/App';

const worldsGetAllMock = vi.fn();
const worldsGetByIdMock = vi.fn();
const worldsMarkViewedMock = vi.fn();
const campaignsGetAllByWorldMock = vi.fn();
const battlemapsGetAllByWorldMock = vi.fn();
const campaignsGetByIdMock = vi.fn();
const arcsGetAllByCampaignMock = vi.fn();
const arcsGetByIdMock = vi.fn();
const actsGetAllByArcMock = vi.fn();
const actsGetByIdMock = vi.fn();
const sessionsGetAllByActMock = vi.fn();
const sessionsGetByIdMock = vi.fn();
const scenesGetAllByCampaignMock = vi.fn();
const scenesGetAllBySessionMock = vi.fn();

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

function buildAct(overrides: Partial<Act> = {}): Act {
  return {
    id: 1,
    arc_id: 1,
    name: 'Act One',
    sort_order: 0,
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  };
}

function buildSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 1,
    act_id: 1,
    name: 'Session One',
    notes: null,
    planned_at: null,
    sort_order: 0,
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
        getAll: worldsGetAllMock,
        getById: worldsGetByIdMock,
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        markViewed: worldsMarkViewedMock,
      },
      campaigns: {
        getAllByWorld: campaignsGetAllByWorldMock,
        getById: campaignsGetByIdMock,
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      battlemaps: {
        getAllByWorld: battlemapsGetAllByWorldMock,
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      arcs: {
        getAllByCampaign: arcsGetAllByCampaignMock,
        getById: arcsGetByIdMock,
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      acts: {
        getAllByArc: actsGetAllByArcMock,
        getAllByCampaign: vi.fn(),
        getById: actsGetByIdMock,
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        moveTo: vi.fn(),
      },
      sessions: {
        getAllByAct: sessionsGetAllByActMock,
        getById: sessionsGetByIdMock,
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        moveTo: vi.fn(),
      },
      scenes: {
        getAllByCampaign: scenesGetAllByCampaignMock,
        getAllBySession: scenesGetAllBySessionMock,
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        moveTo: vi.fn(),
      },
    } as unknown as DbApi;
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

  it('navigates to world page when a world card is opened', async () => {
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
      await screen.findByRole('heading', { name: 'World Overview' }),
    ).toBeInTheDocument();
    expect(worldsGetByIdMock).toHaveBeenCalledWith(1);
    expect(worldsMarkViewedMock).toHaveBeenCalledWith(1);
  });

  it('renders campaigns page at /world/:id/campaigns', async () => {
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/world/1/campaigns']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('No campaigns yet.')).toBeInTheDocument();
  });

  it('renders battlemaps page at /world/:id/battlemaps', async () => {
    worldsGetByIdMock.mockResolvedValue(buildWorld());
    battlemapsGetAllByWorldMock.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/world/1/battlemaps']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('No BattleMaps yet.')).toBeInTheDocument();
    expect(worldsGetByIdMock).toHaveBeenCalledWith(1);
    expect(battlemapsGetAllByWorldMock).toHaveBeenCalledWith(1);
  });

  it('renders arcs page at /world/:id/campaign/:campaignId/arcs', async () => {
    campaignsGetByIdMock.mockResolvedValue(buildCampaign());
    arcsGetAllByCampaignMock.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/world/1/campaign/1/arcs']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('No arcs yet.')).toBeInTheDocument();
  });

  it('renders campaign scenes page at /world/:id/campaign/:campaignId/scenes', async () => {
    campaignsGetByIdMock.mockResolvedValue(buildCampaign());
    scenesGetAllByCampaignMock.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/world/1/campaign/1/scenes']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('No scenes yet.')).toBeInTheDocument();
    expect(campaignsGetByIdMock).toHaveBeenCalledWith(1);
    expect(scenesGetAllByCampaignMock).toHaveBeenCalledWith(1);
  });

  it('renders sessions page at /world/:id/campaign/:campaignId/arc/:arcId/act/:actId/sessions', async () => {
    actsGetByIdMock.mockResolvedValue(buildAct());
    sessionsGetAllByActMock.mockResolvedValue([]);

    render(
      <MemoryRouter
        initialEntries={['/world/1/campaign/1/arc/1/act/1/sessions']}
      >
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('No sessions yet.')).toBeInTheDocument();
  });

  it('renders scenes page at /world/:id/campaign/:campaignId/arc/:arcId/act/:actId/session/:sessionId/scenes', async () => {
    sessionsGetByIdMock.mockResolvedValue(buildSession());
    scenesGetAllBySessionMock.mockResolvedValue([]);

    render(
      <MemoryRouter
        initialEntries={['/world/1/campaign/1/arc/1/act/1/session/1/scenes']}
      >
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('No scenes yet.')).toBeInTheDocument();
  });

  it('navigates from campaign list to arcs page', async () => {
    const user = userEvent.setup();
    const campaign = buildCampaign();

    worldsGetByIdMock.mockResolvedValue(buildWorld());
    campaignsGetAllByWorldMock.mockResolvedValue([campaign]);
    campaignsGetByIdMock.mockResolvedValue(campaign);
    arcsGetAllByCampaignMock.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/world/1/campaigns']}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByText('The Dragon Saga');
    await user.click(screen.getByRole('link', { name: 'Arcs' }));

    expect(await screen.findByText('No arcs yet.')).toBeInTheDocument();
  });

  it('navigates from session list to scenes page', async () => {
    const user = userEvent.setup();
    const session = buildSession();

    actsGetByIdMock.mockResolvedValue(buildAct());
    sessionsGetAllByActMock.mockResolvedValue([session]);
    sessionsGetByIdMock.mockResolvedValue(session);
    scenesGetAllBySessionMock.mockResolvedValue([]);

    render(
      <MemoryRouter
        initialEntries={['/world/1/campaign/1/arc/1/act/1/sessions']}
      >
        <App />
      </MemoryRouter>,
    );

    await screen.findByText('Session One');
    await user.click(screen.getByRole('link', { name: 'Scenes' }));

    expect(await screen.findByText('No scenes yet.')).toBeInTheDocument();
  });
});
