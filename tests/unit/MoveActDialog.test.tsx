import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MoveActDialog from '../../src/renderer/components/acts/MoveActDialog';

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

function renderDialog(
  props: Partial<React.ComponentProps<typeof MoveActDialog>> = {},
) {
  const defaults = {
    act: buildAct(),
    currentArcId: 1,
    campaignId: 1,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };
  return render(<MoveActDialog {...defaults} {...props} />);
}

describe('MoveActDialog', () => {
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
        getAllBySession: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    } as DbApi;
  });

  it('shows act name in dialog heading', async () => {
    window.db.arcs.getAllByCampaign = vi.fn().mockResolvedValue([]);

    renderDialog({ act: buildAct({ name: 'The Great Heist' }) });

    expect(await screen.findByText(/The Great Heist/)).toBeInTheDocument();
  });

  it('renders flat arc list excluding the current arc', async () => {
    window.db.arcs.getAllByCampaign = vi
      .fn()
      .mockResolvedValue([
        buildArc({ id: 1, name: 'Current Arc' }),
        buildArc({ id: 2, name: 'Other Arc' }),
      ]);

    renderDialog({ currentArcId: 1 });

    expect(await screen.findByText('Other Arc')).toBeInTheDocument();
    expect(screen.queryByText('Current Arc')).not.toBeInTheDocument();
  });

  it('shows empty state when no other arcs are available', async () => {
    window.db.arcs.getAllByCampaign = vi
      .fn()
      .mockResolvedValue([buildArc({ id: 1, name: 'Only Arc' })]);

    renderDialog({ currentArcId: 1 });

    expect(
      await screen.findByText(/No other Arcs available/i),
    ).toBeInTheDocument();
  });

  it('shows empty state when campaign has no arcs', async () => {
    window.db.arcs.getAllByCampaign = vi.fn().mockResolvedValue([]);

    renderDialog();

    expect(
      await screen.findByText(/No other Arcs available/i),
    ).toBeInTheDocument();
  });

  it('calls onConfirm with selected arcId when Move is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    window.db.arcs.getAllByCampaign = vi
      .fn()
      .mockResolvedValue([
        buildArc({ id: 1, name: 'Arc One' }),
        buildArc({ id: 2, name: 'Arc Two' }),
      ]);

    renderDialog({ currentArcId: 1, onConfirm });

    await screen.findByText('Arc Two');
    await user.click(screen.getByRole('radio', { name: 'Arc Two' }));
    await user.click(screen.getByRole('button', { name: 'Move' }));

    expect(onConfirm).toHaveBeenCalledWith(2);
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    window.db.arcs.getAllByCampaign = vi.fn().mockResolvedValue([]);

    renderDialog({ onCancel });
    await screen.findByText(/No other Arcs available/i);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
  });

  it('shows error message when fetch fails', async () => {
    window.db.arcs.getAllByCampaign = vi
      .fn()
      .mockRejectedValue(new Error('Network error'));

    renderDialog();

    expect(await screen.findByText('Failed to load arcs.')).toBeInTheDocument();
  });

  it('keeps Move button disabled until a selection is made', async () => {
    const user = userEvent.setup();
    window.db.arcs.getAllByCampaign = vi
      .fn()
      .mockResolvedValue([
        buildArc({ id: 1, name: 'Arc One' }),
        buildArc({ id: 2, name: 'Arc Two' }),
      ]);

    renderDialog({ currentArcId: 1 });
    await screen.findByText('Arc Two');

    const moveButton = screen.getByRole('button', { name: 'Move' });
    expect(moveButton).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: 'Arc Two' }));

    await waitFor(() => expect(moveButton).toBeEnabled());
  });

  it('does not call onConfirm when Move is clicked with no selection', async () => {
    const onConfirm = vi.fn();
    window.db.arcs.getAllByCampaign = vi
      .fn()
      .mockResolvedValue([
        buildArc({ id: 1, name: 'Arc One' }),
        buildArc({ id: 2, name: 'Arc Two' }),
      ]);

    renderDialog({ currentArcId: 1, onConfirm });
    await screen.findByText('Arc Two');

    // Move button is disabled so click has no effect
    const moveButton = screen.getByRole('button', { name: 'Move' });
    expect(moveButton).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
