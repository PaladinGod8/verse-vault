import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MoveSessionDialog from '../../src/renderer/components/sessions/MoveSessionDialog';

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
    id: 5,
    act_id: 2,
    name: 'Session Alpha',
    notes: null,
    planned_at: null,
    sort_order: 0,
    created_at: '2026-01-01 00:00:00',
    updated_at: '2026-01-01 00:00:00',
    ...overrides,
  };
}

function renderDialog(
  props: Partial<React.ComponentProps<typeof MoveSessionDialog>> = {},
) {
  const defaults = {
    session: buildSession(),
    currentActId: 2,
    campaignId: 1,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };
  return render(<MoveSessionDialog {...defaults} {...props} />);
}

describe('MoveSessionDialog', () => {
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
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      arcs: {
        getAllByCampaign: vi.fn().mockResolvedValue([]),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      acts: {
        getAllByArc: vi.fn(),
        getAllByCampaign: vi.fn().mockResolvedValue([]),
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
        getAllBySession: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    } as unknown as DbApi;
  });

  it('shows session name in dialog heading', async () => {
    window.db.arcs.getAllByCampaign = vi.fn().mockResolvedValue([]);
    window.db.acts.getAllByCampaign = vi.fn().mockResolvedValue([]);

    renderDialog({ session: buildSession({ name: 'Night of Betrayal' }) });

    expect(await screen.findByText(/Night of Betrayal/)).toBeInTheDocument();
  });

  it('renders grouped arc/act list after loading', async () => {
    window.db.arcs.getAllByCampaign = vi
      .fn()
      .mockResolvedValue([buildArc({ id: 1, name: 'Arc One' })]);
    window.db.acts.getAllByCampaign = vi
      .fn()
      .mockResolvedValue([buildAct({ id: 3, arc_id: 1, name: 'Act Bravo' })]);

    renderDialog({ currentActId: 2 });

    expect(await screen.findByText('Act Bravo')).toBeInTheDocument();
    expect(screen.getByText('Arc One')).toBeInTheDocument();
  });

  it('excludes the current act from options', async () => {
    window.db.arcs.getAllByCampaign = vi
      .fn()
      .mockResolvedValue([buildArc({ id: 1, name: 'Arc One' })]);
    window.db.acts.getAllByCampaign = vi
      .fn()
      .mockResolvedValue([
        buildAct({ id: 2, arc_id: 1, name: 'Current Act' }),
        buildAct({ id: 3, arc_id: 1, name: 'Other Act' }),
      ]);

    renderDialog({ currentActId: 2 });

    expect(await screen.findByText('Other Act')).toBeInTheDocument();
    expect(screen.queryByText('Current Act')).not.toBeInTheDocument();
  });

  it('shows empty state when no other acts are available', async () => {
    window.db.arcs.getAllByCampaign = vi.fn().mockResolvedValue([]);
    window.db.acts.getAllByCampaign = vi.fn().mockResolvedValue([]);

    renderDialog();

    expect(
      await screen.findByText(/No other Acts available/i),
    ).toBeInTheDocument();
  });

  it('shows empty state when all acts are in the current act', async () => {
    window.db.arcs.getAllByCampaign = vi
      .fn()
      .mockResolvedValue([buildArc({ id: 1, name: 'Arc One' })]);
    window.db.acts.getAllByCampaign = vi
      .fn()
      .mockResolvedValue([buildAct({ id: 2, arc_id: 1, name: 'Only Act' })]);

    renderDialog({ currentActId: 2 });

    expect(
      await screen.findByText(/No other Acts available/i),
    ).toBeInTheDocument();
  });

  it('calls onConfirm with selected actId when Move is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    window.db.arcs.getAllByCampaign = vi
      .fn()
      .mockResolvedValue([buildArc({ id: 1, name: 'Arc One' })]);
    window.db.acts.getAllByCampaign = vi
      .fn()
      .mockResolvedValue([buildAct({ id: 3, arc_id: 1, name: 'Act Bravo' })]);

    renderDialog({ currentActId: 2, onConfirm });

    await screen.findByText('Act Bravo');
    await user.click(screen.getByRole('radio', { name: 'Act Bravo' }));
    await user.click(screen.getByRole('button', { name: 'Move' }));

    expect(onConfirm).toHaveBeenCalledWith(3);
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    window.db.arcs.getAllByCampaign = vi.fn().mockResolvedValue([]);
    window.db.acts.getAllByCampaign = vi.fn().mockResolvedValue([]);

    renderDialog({ onCancel });
    // Wait for loading to finish
    await screen.findByText(/No other Acts available/i);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
  });

  it('shows error message when fetch fails', async () => {
    window.db.arcs.getAllByCampaign = vi
      .fn()
      .mockRejectedValue(new Error('Network error'));
    window.db.acts.getAllByCampaign = vi
      .fn()
      .mockRejectedValue(new Error('Network error'));

    renderDialog();

    expect(await screen.findByText('Failed to load acts.')).toBeInTheDocument();
  });

  it('keeps Move button disabled until a selection is made', async () => {
    const user = userEvent.setup();
    window.db.arcs.getAllByCampaign = vi
      .fn()
      .mockResolvedValue([buildArc({ id: 1, name: 'Arc One' })]);
    window.db.acts.getAllByCampaign = vi
      .fn()
      .mockResolvedValue([buildAct({ id: 3, arc_id: 1, name: 'Act Bravo' })]);

    renderDialog({ currentActId: 2 });
    await screen.findByText('Act Bravo');

    const moveButton = screen.getByRole('button', { name: 'Move' });
    expect(moveButton).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: 'Act Bravo' }));
    expect(moveButton).toBeEnabled();
  });

  it('groups acts under their arc headings', async () => {
    window.db.arcs.getAllByCampaign = vi
      .fn()
      .mockResolvedValue([
        buildArc({ id: 1, name: 'Arc Alpha' }),
        buildArc({ id: 2, name: 'Arc Beta' }),
      ]);
    window.db.acts.getAllByCampaign = vi
      .fn()
      .mockResolvedValue([
        buildAct({ id: 3, arc_id: 1, name: 'Act A1' }),
        buildAct({ id: 4, arc_id: 2, name: 'Act B1' }),
      ]);

    renderDialog({ currentActId: 99 });

    await screen.findByText('Act A1');
    expect(screen.getByText('Arc Alpha')).toBeInTheDocument();
    expect(screen.getByText('Act B1')).toBeInTheDocument();
    expect(screen.getByText('Arc Beta')).toBeInTheDocument();
  });

  it('hides arc group when all its acts are excluded', async () => {
    window.db.arcs.getAllByCampaign = vi
      .fn()
      .mockResolvedValue([
        buildArc({ id: 1, name: 'Arc Alpha' }),
        buildArc({ id: 2, name: 'Arc Beta' }),
      ]);
    window.db.acts.getAllByCampaign = vi.fn().mockResolvedValue([
      // Act 2 is the current act — entire Arc Alpha group is excluded
      buildAct({ id: 2, arc_id: 1, name: 'Current Act' }),
      buildAct({ id: 4, arc_id: 2, name: 'Act B1' }),
    ]);

    renderDialog({ currentActId: 2 });

    await screen.findByText('Act B1');
    expect(screen.getByText('Arc Beta')).toBeInTheDocument();
    expect(screen.queryByText('Arc Alpha')).not.toBeInTheDocument();
  });
});
