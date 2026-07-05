import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    campaign_id: 1,
    act_id: 1,
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
    currentActId: 1,
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
        getAllByCampaign: vi.fn(),
        getAllByAct: vi.fn(),
        getAllBySession: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        moveTo: vi.fn(),
      },
    } as unknown as DbApi;
  });

  it('shows the scene name in the heading', async () => {
    renderDialog({ scene: buildScene({ name: 'The Bridge' }) });

    expect(await screen.findByText(/The Bridge/)).toBeInTheDocument();
  });

  it('loads and renders act options grouped by arc', async () => {
    arcsGetAllByCampaignMock.mockResolvedValue([
      buildArc({ id: 5, name: 'Arc A' }),
    ]);
    actsGetAllByCampaignMock.mockResolvedValue([
      buildAct({ id: 10, arc_id: 5, name: 'Act A', sort_order: 0 }),
      buildAct({ id: 1, arc_id: 5, name: 'Act One', sort_order: 1 }),
    ]);

    renderDialog();

    expect(await screen.findByRole('radio', { name: /Act A/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Act One/i })).toBeInTheDocument();
    expect(screen.getByText('Arc A')).toBeInTheDocument();
    expect(arcsGetAllByCampaignMock).toHaveBeenCalledWith(1);
    expect(actsGetAllByCampaignMock).toHaveBeenCalledWith(1);
  });

  it('defaults to the current act, with Move disabled until a real change is made', async () => {
    actsGetAllByCampaignMock.mockResolvedValue([buildAct({ id: 1, arc_id: 5 })]);
    arcsGetAllByCampaignMock.mockResolvedValue([buildArc({ id: 5 })]);
    sessionsGetAllByActMock.mockResolvedValue([
      buildSession({ id: 1, name: 'Session One' }),
    ]);

    renderDialog({ currentActId: 1, currentSessionId: 1 });

    await screen.findByRole('radio', { name: /Act One|Act A/i });
    expect(sessionsGetAllByActMock).toHaveBeenCalledWith(1);
    expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled();
  });

  it('loads sessions for the selected act and offers a stray option', async () => {
    const user = userEvent.setup();
    arcsGetAllByCampaignMock.mockResolvedValue([buildArc({ id: 5 })]);
    actsGetAllByCampaignMock.mockResolvedValue([
      buildAct({ id: 1, arc_id: 5, name: 'Act One' }),
      buildAct({ id: 2, arc_id: 5, name: 'Act Two' }),
    ]);
    sessionsGetAllByActMock.mockImplementation(async (actId: number) => {
      if (actId === 2) {
        return [buildSession({ id: 9, act_id: 2, name: 'Session Nine' })];
      }
      return [buildSession({ id: 1, act_id: 1, name: 'Session One' })];
    });

    renderDialog({ currentActId: 1, currentSessionId: 1 });

    await user.click(await screen.findByRole('radio', { name: 'Act Two' }));

    expect(await screen.findByRole('radio', { name: /Session Nine/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /No session \(stray\)/i })).toBeInTheDocument();
    expect(sessionsGetAllByActMock).toHaveBeenCalledWith(2);
  });

  it('calls onConfirm with the selected act id and session id', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    arcsGetAllByCampaignMock.mockResolvedValue([buildArc({ id: 5 })]);
    actsGetAllByCampaignMock.mockResolvedValue([
      buildAct({ id: 1, arc_id: 5, name: 'Act One' }),
      buildAct({ id: 2, arc_id: 5, name: 'Act Two' }),
    ]);
    sessionsGetAllByActMock.mockImplementation(async (actId: number) => {
      if (actId === 2) {
        return [buildSession({ id: 9, act_id: 2, name: 'Session Nine' })];
      }
      return [];
    });

    renderDialog({ currentActId: 1, currentSessionId: null, onConfirm });

    await user.click(await screen.findByRole('radio', { name: 'Act Two' }));
    await user.click(await screen.findByRole('radio', { name: /Session Nine/i }));
    await user.click(screen.getByRole('button', { name: 'Move' }));

    expect(onConfirm).toHaveBeenCalledWith(2, 9);
  });

  it('calls onConfirm with a null session id when moving to stray', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    arcsGetAllByCampaignMock.mockResolvedValue([buildArc({ id: 5 })]);
    actsGetAllByCampaignMock.mockResolvedValue([
      buildAct({ id: 1, arc_id: 5, name: 'Act One' }),
      buildAct({ id: 2, arc_id: 5, name: 'Act Two' }),
    ]);
    sessionsGetAllByActMock.mockResolvedValue([]);

    renderDialog({ currentActId: 1, currentSessionId: 1, onConfirm });

    await user.click(await screen.findByRole('radio', { name: 'Act Two' }));
    await user.click(await screen.findByRole('radio', { name: /No session \(stray\)/i }));
    await user.click(screen.getByRole('button', { name: 'Move' }));

    expect(onConfirm).toHaveBeenCalledWith(2, null);
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderDialog({ onCancel });

    await screen.findByText(/No acts available/i);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows empty state when there are no acts', async () => {
    renderDialog();

    expect(await screen.findByText(/No acts available/i)).toBeInTheDocument();
  });

  it('shows error when acts fail to load', async () => {
    arcsGetAllByCampaignMock.mockRejectedValue(new Error('network'));
    actsGetAllByCampaignMock.mockRejectedValue(new Error('network'));

    renderDialog();

    expect(await screen.findByText('Failed to load acts.')).toBeInTheDocument();
  });

  it('shows error when sessions for the selected act fail to load', async () => {
    const user = userEvent.setup();
    arcsGetAllByCampaignMock.mockResolvedValue([buildArc({ id: 5 })]);
    actsGetAllByCampaignMock.mockResolvedValue([
      buildAct({ id: 1, arc_id: 5, name: 'Act One' }),
      buildAct({ id: 2, arc_id: 5, name: 'Act Two' }),
    ]);
    sessionsGetAllByActMock.mockImplementation(async (actId: number) => {
      if (actId === 2) {
        throw new Error('network');
      }
      return [];
    });

    renderDialog({ currentActId: 1, currentSessionId: null });

    await user.click(await screen.findByRole('radio', { name: 'Act Two' }));

    expect(await screen.findByText('Failed to load sessions.')).toBeInTheDocument();
  });
});
