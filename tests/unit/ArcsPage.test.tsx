import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { DragEndEvent } from '@dnd-kit/core';

import ArcsPage from '../../src/renderer/pages/ArcsPage';

const { toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('../../src/renderer/components/ui/ToastProvider', () => ({
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

// Capture the DndContext onDragEnd handler so tests can invoke it directly.
let capturedOnDragEnd: ((event: DragEndEvent) => void) | undefined;

vi.mock('@dnd-kit/core', async () => {
  const actual =
    await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core');
  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
    }: {
      children: React.ReactNode;
      onDragEnd?: (event: DragEndEvent) => void;
    }) => {
      capturedOnDragEnd = onDragEnd;
      return <>{children}</>;
    },
  };
});

vi.mock('@dnd-kit/sortable', async () => {
  const actual =
    await vi.importActual<typeof import('@dnd-kit/sortable')>(
      '@dnd-kit/sortable',
    );
  return {
    ...actual,
    SortableContext: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    useSortable: vi.fn().mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      setActivatorNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: false,
    }),
  };
});

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: vi.fn().mockReturnValue('') } },
}));

function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 1,
    world_id: 1,
    name: 'Test Campaign',
    summary: null,
    config: '{}',
    created_at: '2026-01-01 00:00:00',
    updated_at: '2026-01-01 00:00:00',
    ...overrides,
  };
}

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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/world/1/campaign/1/arcs']}>
      <Routes>
        <Route
          path="/world/:id/campaign/:campaignId/arcs"
          element={<ArcsPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ArcsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnDragEnd = undefined;

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
        getById: vi.fn().mockResolvedValue(buildCampaign()),
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

  describe('load states', () => {
    it('shows empty state when no arcs exist', async () => {
      renderPage();
      expect(await screen.findByText('No arcs yet.')).toBeInTheDocument();
    });

    it('renders arc names after loading', async () => {
      window.db.arcs.getAllByCampaign = vi
        .fn()
        .mockResolvedValue([
          buildArc({ id: 1, name: 'Arc One', sort_order: 0 }),
          buildArc({ id: 2, name: 'Arc Two', sort_order: 1 }),
        ]);
      renderPage();
      expect(await screen.findByText('Arc One')).toBeInTheDocument();
      expect(screen.getByText('Arc Two')).toBeInTheDocument();
    });

    it('shows campaign name in heading', async () => {
      window.db.campaigns.getById = vi
        .fn()
        .mockResolvedValue(buildCampaign({ name: 'Epic Campaign' }));
      renderPage();
      expect(
        await screen.findByText('Epic Campaign — Arcs'),
      ).toBeInTheDocument();
    });

    it('shows error when campaign is not found', async () => {
      window.db.campaigns.getById = vi.fn().mockResolvedValue(null);
      renderPage();
      expect(
        await screen.findByText('Campaign not found.'),
      ).toBeInTheDocument();
    });

    it('shows error when load throws', async () => {
      window.db.campaigns.getById = vi
        .fn()
        .mockRejectedValue(new Error('DB error'));
      renderPage();
      expect(
        await screen.findByText('Unable to load arcs right now.'),
      ).toBeInTheDocument();
    });
  });

  describe('create arc', () => {
    it('opens create dialog when New Arc is clicked', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('No arcs yet.');
      await user.click(screen.getByRole('button', { name: 'New Arc' }));
      expect(
        screen.getByRole('dialog', { name: 'New Arc' }),
      ).toBeInTheDocument();
    });

    it('closes create dialog when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('No arcs yet.');
      await user.click(screen.getByRole('button', { name: 'New Arc' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('creates arc on valid submit and shows it in list', async () => {
      const user = userEvent.setup();
      const newArc = buildArc({ id: 3, name: 'Story Arc' });
      window.db.arcs.add = vi.fn().mockResolvedValue(newArc);

      renderPage();
      await screen.findByText('No arcs yet.');
      await user.click(screen.getByRole('button', { name: 'New Arc' }));
      await user.type(screen.getByLabelText(/name/i), 'Story Arc');
      await user.click(screen.getByRole('button', { name: 'Create Arc' }));

      await screen.findByText('Story Arc');
      expect(window.db.arcs.add).toHaveBeenCalledWith({
        campaign_id: 1,
        name: 'Story Arc',
      });
    });

    it('shows validation error and blocks submit when name is empty', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('No arcs yet.');
      await user.click(screen.getByRole('button', { name: 'New Arc' }));
      await user.click(screen.getByRole('button', { name: 'Create Arc' }));

      expect(screen.getByText('Arc name is required')).toBeInTheDocument();
      expect(window.db.arcs.add).not.toHaveBeenCalled();
    });
  });

  describe('edit arc', () => {
    it('opens edit dialog with existing name pre-filled', async () => {
      const user = userEvent.setup();
      window.db.arcs.getAllByCampaign = vi
        .fn()
        .mockResolvedValue([buildArc({ id: 1, name: 'Arc One' })]);

      renderPage();
      await screen.findByText('Arc One');
      await user.click(screen.getByRole('button', { name: 'Edit' }));

      expect(
        screen.getByRole('dialog', { name: 'Edit Arc' }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toHaveValue('Arc One');
    });

    it('updates arc on edit submit', async () => {
      const user = userEvent.setup();
      const arc = buildArc({ id: 1, name: 'Arc One' });
      const updated = buildArc({ id: 1, name: 'Arc Renamed' });
      window.db.arcs.getAllByCampaign = vi.fn().mockResolvedValue([arc]);
      window.db.arcs.update = vi.fn().mockResolvedValue(updated);

      renderPage();
      await screen.findByText('Arc One');
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      const input = screen.getByLabelText(/name/i);
      await user.clear(input);
      await user.type(input, 'Arc Renamed');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await screen.findByText('Arc Renamed');
      expect(window.db.arcs.update).toHaveBeenCalledWith(1, {
        name: 'Arc Renamed',
      });
    });

    it('closes edit dialog on Cancel', async () => {
      const user = userEvent.setup();
      window.db.arcs.getAllByCampaign = vi
        .fn()
        .mockResolvedValue([buildArc({ id: 1, name: 'Arc One' })]);

      renderPage();
      await screen.findByText('Arc One');
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('delete arc', () => {
    it('removes arc from list after dialog confirmation', async () => {
      const user = userEvent.setup();
      window.db.arcs.getAllByCampaign = vi
        .fn()
        .mockResolvedValue([buildArc({ id: 1, name: 'Arc One' })]);
      window.db.arcs.delete = vi.fn().mockResolvedValue({ id: 1 });

      renderPage();
      await screen.findByText('Arc One');
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      const confirmDialog = await screen.findByRole('dialog', {
        name: 'Delete "Arc One"?',
      });
      await user.click(
        within(confirmDialog).getByRole('button', { name: 'Delete' }),
      );

      await waitFor(() =>
        expect(screen.queryByText('Arc One')).not.toBeInTheDocument(),
      );
      expect(window.db.arcs.delete).toHaveBeenCalledWith(1);
      expect(toastSuccessMock).toHaveBeenCalledWith(
        'Arc deleted.',
        '"Arc One" was removed.',
      );
    });

    it('keeps arc in list when dialog confirmation is cancelled', async () => {
      const user = userEvent.setup();
      window.db.arcs.getAllByCampaign = vi
        .fn()
        .mockResolvedValue([buildArc({ id: 1, name: 'Arc One' })]);

      renderPage();
      await screen.findByText('Arc One');
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      const confirmDialog = await screen.findByRole('dialog', {
        name: 'Delete "Arc One"?',
      });
      await user.click(
        within(confirmDialog).getByRole('button', { name: 'Cancel' }),
      );

      expect(screen.getByText('Arc One')).toBeInTheDocument();
      expect(window.db.arcs.delete).not.toHaveBeenCalled();
      expect(toastSuccessMock).not.toHaveBeenCalled();
      expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it('shows a delete failure toast when arc deletion fails', async () => {
      const user = userEvent.setup();
      window.db.arcs.getAllByCampaign = vi
        .fn()
        .mockResolvedValue([buildArc({ id: 1, name: 'Arc One' })]);
      window.db.arcs.delete = vi
        .fn()
        .mockRejectedValue(new Error('delete failed'));

      renderPage();
      await screen.findByText('Arc One');
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      const confirmDialog = await screen.findByRole('dialog', {
        name: 'Delete "Arc One"?',
      });
      await user.click(
        within(confirmDialog).getByRole('button', { name: 'Delete' }),
      );

      await waitFor(() =>
        expect(window.db.arcs.delete).toHaveBeenCalledWith(1),
      );
      expect(screen.getByText('Arc One')).toBeInTheDocument();
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Failed to delete arc.',
        'delete failed',
      );
    });
  });

  describe('reorder arcs', () => {
    it('calls arcs.update with new sort_order after drag', async () => {
      const arc1 = buildArc({ id: 1, name: 'Arc One', sort_order: 0 });
      const arc2 = buildArc({ id: 2, name: 'Arc Two', sort_order: 1 });
      window.db.arcs.getAllByCampaign = vi.fn().mockResolvedValue([arc1, arc2]);
      window.db.arcs.update = vi.fn().mockResolvedValue({ ...arc1 });

      renderPage();
      await screen.findByText('Arc One');
      await waitFor(() => expect(capturedOnDragEnd).toBeDefined());

      // Move arc1 (id=1) over arc2 (id=2)
      (capturedOnDragEnd as (event: DragEndEvent) => void)({
        active: { id: 1 },
        over: { id: 2 },
      } as unknown as DragEndEvent);

      await waitFor(() => expect(window.db.arcs.update).toHaveBeenCalled());
    });

    it('shows reorder error and restores order when update fails', async () => {
      const arc1 = buildArc({ id: 1, name: 'Arc One', sort_order: 0 });
      const arc2 = buildArc({ id: 2, name: 'Arc Two', sort_order: 1 });
      window.db.arcs.getAllByCampaign = vi
        .fn()
        .mockResolvedValueOnce([arc1, arc2])
        .mockResolvedValue([arc1, arc2]);
      window.db.arcs.update = vi
        .fn()
        .mockRejectedValue(new Error('Save failed'));

      renderPage();
      await screen.findByText('Arc One');
      await waitFor(() => expect(capturedOnDragEnd).toBeDefined());

      (capturedOnDragEnd as (event: DragEndEvent) => void)({
        active: { id: 1 },
        over: { id: 2 },
      } as unknown as DragEndEvent);

      await waitFor(() =>
        expect(screen.getByText('Save failed')).toBeInTheDocument(),
      );
    });

    it('no-ops when active and over are the same item', async () => {
      const arc1 = buildArc({ id: 1, name: 'Arc One', sort_order: 0 });
      window.db.arcs.getAllByCampaign = vi.fn().mockResolvedValue([arc1]);
      window.db.arcs.update = vi.fn();

      renderPage();
      await screen.findByText('Arc One');
      await waitFor(() => expect(capturedOnDragEnd).toBeDefined());

      (capturedOnDragEnd as (event: DragEndEvent) => void)({
        active: { id: 1 },
        over: { id: 1 },
      } as unknown as DragEndEvent);

      // update should NOT be called for a no-op drag
      expect(window.db.arcs.update).not.toHaveBeenCalled();
    });
  });
});
