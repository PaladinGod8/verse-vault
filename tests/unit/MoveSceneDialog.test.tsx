import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MoveSceneDialog from '../../src/renderer/components/scenes/MoveSceneDialog';

const arcsGetAllByCampaignMock = vi.fn();
const actsGetAllByCampaignMock = vi.fn();
const sessionsGetAllByActMock = vi.fn();

function buildArc(overrides: Partial<Arc> = {}): Arc {
  return {
    id: 1,
    campaign_id: 1,
    name: 'Arc One',
    sort_order: 0,
    created_at: '2026-01-01 00:00:00',
    updated_at: '2026-01-01 00:00:00',
    ...overrides,
  };
}

function buildAct(overrides: Partial<Act> = {}): Act {
  return {
    id: 1,
    arc_id: 1,
    name: 'Act One',
    sort_order: 0,
    created_at: '2026-01-01 00:00:00',
    updated_at: '2026-01-01 00:00:00',
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
    created_at: '2026-01-01 00:00:00',
    updated_at: '2026-01-01 00:00:00',
    ...overrides,
  };
}

function buildScene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: 9,
    session_id: 1,
    name: 'Scene Alpha',
    notes: null,
    payload: '{}',
    sort_order: 0,
    created_at: '2026-01-01 00:00:00',
    updated_at: '2026-01-01 00:00:00',
    ...overrides,
  };
}

function renderDialog(
  props: Partial<React.ComponentProps<typeof MoveSceneDialog>> = {},
) {
  const defaults = {
    scene: buildScene(),
    currentSessionId: 1,
    campaignId: 1,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };
  return render(<MoveSceneDialog {...defaults} {...props} />);
}

describe('MoveSceneDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    arcsGetAllByCampaignMock.mockResolvedValue([]);
    actsGetAllByCampaignMock.mockResolvedValue([]);
    sessionsGetAllByActMock.mockResolvedValue([]);

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
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      arcs: {
        getAllByCampaign: arcsGetAllByCampaignMock,
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      acts: {
        getAllByArc: vi.fn(),
        getAllByCampaign: actsGetAllByCampaignMock,
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        moveTo: vi.fn(),
      },
      sessions: {
        getAllByCampaign: vi.fn(),
        getAllByAct: sessionsGetAllByActMock,
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        moveTo: vi.fn(),
      },
      scenes: {
        getAllBySession: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        moveTo: vi.fn(),
      },
    } as DbApi;
  });

  it('shows the scene name in the heading', async () => {
    renderDialog({ scene: buildScene({ name: 'The Bridge' }) });

    expect(await screen.findByText(/The Bridge/)).toBeInTheDocument();
  });

  it('loads and renders session options excluding the current session', async () => {
    arcsGetAllByCampaignMock.mockResolvedValue([
      buildArc({ id: 5, name: 'Arc A' }),
    ]);
    actsGetAllByCampaignMock.mockResolvedValue([
      buildAct({ id: 10, arc_id: 5, name: 'Act A', sort_order: 0 }),
    ]);
    sessionsGetAllByActMock.mockResolvedValue([
      buildSession({ id: 1, name: 'Current Session', sort_order: 0 }),
      buildSession({ id: 2, name: 'Session Two', sort_order: 1 }),
    ]);

    renderDialog({ currentSessionId: 1 });

    expect(
      await screen.findByRole('radio', { name: /Session Two/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('radio', { name: /Current Session/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Arc A / Act A')).toBeInTheDocument();
    expect(arcsGetAllByCampaignMock).toHaveBeenCalledWith(1);
    expect(actsGetAllByCampaignMock).toHaveBeenCalledWith(1);
    expect(sessionsGetAllByActMock).toHaveBeenCalledWith(10);
  });

  it('keeps Move disabled until a target session is selected', async () => {
    const user = userEvent.setup();
    arcsGetAllByCampaignMock.mockResolvedValue([buildArc({ id: 5 })]);
    actsGetAllByCampaignMock.mockResolvedValue([
      buildAct({ id: 10, arc_id: 5 }),
    ]);
    sessionsGetAllByActMock.mockResolvedValue([
      buildSession({ id: 2, name: 'Session Two' }),
    ]);

    renderDialog({ currentSessionId: 1 });

    const option = await screen.findByRole('radio', { name: /Session Two/i });
    const moveButton = screen.getByRole('button', { name: 'Move' });
    expect(moveButton).toBeDisabled();

    await user.click(option);
    expect(moveButton).toBeEnabled();
  });

  it('calls onConfirm with selected session id', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    arcsGetAllByCampaignMock.mockResolvedValue([buildArc({ id: 5 })]);
    actsGetAllByCampaignMock.mockResolvedValue([
      buildAct({ id: 10, arc_id: 5 }),
    ]);
    sessionsGetAllByActMock.mockResolvedValue([
      buildSession({ id: 2, name: 'Session Two' }),
    ]);

    renderDialog({ currentSessionId: 1, onConfirm });

    await user.click(
      await screen.findByRole('radio', { name: /Session Two/i }),
    );
    await user.click(screen.getByRole('button', { name: 'Move' }));

    expect(onConfirm).toHaveBeenCalledWith(2);
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderDialog({ onCancel });

    await screen.findByText(/No other Sessions available/i);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows empty state when there are no eligible target sessions', async () => {
    arcsGetAllByCampaignMock.mockResolvedValue([buildArc({ id: 5 })]);
    actsGetAllByCampaignMock.mockResolvedValue([
      buildAct({ id: 10, arc_id: 5 }),
    ]);
    sessionsGetAllByActMock.mockResolvedValue([
      buildSession({ id: 1, name: 'Only Session' }),
    ]);

    renderDialog({ currentSessionId: 1 });

    expect(
      await screen.findByText(/No other Sessions available in this Campaign/i),
    ).toBeInTheDocument();
  });

  it('shows error when target sessions fail to load', async () => {
    arcsGetAllByCampaignMock.mockRejectedValue(new Error('network'));
    actsGetAllByCampaignMock.mockRejectedValue(new Error('network'));

    renderDialog();

    expect(
      await screen.findByText('Failed to load target sessions.'),
    ).toBeInTheDocument();
  });
});
