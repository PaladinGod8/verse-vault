import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { DragEndEvent } from '@dnd-kit/core';

import ActsPage from '../../src/renderer/pages/ActsPage';

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

// MoveActDialog also uses window.db — the mock in beforeEach covers it.
// Stub MoveActDialog to avoid nested db fetches in the dialog tests here.
vi.mock('../../src/renderer/components/acts/MoveActDialog', () => ({
  default: ({
    act,
    onConfirm,
    onCancel,
  }: {
    act: Act;
    onConfirm: (arcId: number) => void;
    onCancel: () => void;
  }) => (
    <div role="dialog" aria-label="Move Act">
      <p>Move {act.name}</p>
      <button onClick={() => onConfirm(99)}>Confirm Move</button>
      <button onClick={onCancel}>Cancel Move</button>
    </div>
  ),
}));

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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/world/1/campaign/1/arc/1/acts']}>
      <Routes>
        <Route
          path="/world/:id/campaign/:campaignId/arc/:arcId/acts"
          element={<ActsPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ActsPage', () => {
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
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      arcs: {
        getAllByCampaign: vi.fn().mockResolvedValue([]),
        getById: vi.fn().mockResolvedValue(buildArc()),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      acts: {
        getAllByArc: vi.fn().mockResolvedValue([]),
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
    } as DbApi;
  });

  describe('load states', () => {
    it('shows empty state when no acts exist', async () => {
      renderPage();
      expect(await screen.findByText('No acts yet.')).toBeInTheDocument();
    });

    it('renders act names after loading', async () => {
      window.db.acts.getAllByArc = vi
        .fn()
        .mockResolvedValue([
          buildAct({ id: 1, name: 'Act One', sort_order: 0 }),
          buildAct({ id: 2, name: 'Act Two', sort_order: 1 }),
        ]);
      renderPage();
      expect(await screen.findByText('Act One')).toBeInTheDocument();
      expect(screen.getByText('Act Two')).toBeInTheDocument();
    });

    it('shows arc name in heading', async () => {
      window.db.arcs.getById = vi
        .fn()
        .mockResolvedValue(buildArc({ name: 'Dragon Arc' }));
      renderPage();
      expect(await screen.findByText('Dragon Arc — Acts')).toBeInTheDocument();
    });

    it('shows error when arc is not found', async () => {
      window.db.arcs.getById = vi.fn().mockResolvedValue(null);
      renderPage();
      expect(await screen.findByText('Arc not found.')).toBeInTheDocument();
    });

    it('shows error when load throws', async () => {
      window.db.arcs.getById = vi.fn().mockRejectedValue(new Error('DB error'));
      renderPage();
      expect(
        await screen.findByText('Unable to load acts right now.'),
      ).toBeInTheDocument();
    });
  });

  describe('create act', () => {
    it('opens create dialog when New Act is clicked', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('No acts yet.');
      await user.click(screen.getByRole('button', { name: 'New Act' }));
      expect(
        screen.getByRole('dialog', { name: 'New Act' }),
      ).toBeInTheDocument();
    });

    it('closes create dialog when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('No acts yet.');
      await user.click(screen.getByRole('button', { name: 'New Act' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(
        screen.queryByRole('dialog', { name: 'New Act' }),
      ).not.toBeInTheDocument();
    });

    it('creates act on valid submit and shows it in list', async () => {
      const user = userEvent.setup();
      const newAct = buildAct({ id: 5, name: 'Chapter One' });
      window.db.acts.add = vi.fn().mockResolvedValue(newAct);

      renderPage();
      await screen.findByText('No acts yet.');
      await user.click(screen.getByRole('button', { name: 'New Act' }));
      await user.type(screen.getByLabelText(/name/i), 'Chapter One');
      await user.click(screen.getByRole('button', { name: 'Create Act' }));

      await screen.findByText('Chapter One');
      expect(window.db.acts.add).toHaveBeenCalledWith({
        arc_id: 1,
        name: 'Chapter One',
      });
    });

    it('shows validation error and blocks submit when name is empty', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('No acts yet.');
      await user.click(screen.getByRole('button', { name: 'New Act' }));
      await user.click(screen.getByRole('button', { name: 'Create Act' }));

      expect(screen.getByText('Act name is required')).toBeInTheDocument();
      expect(window.db.acts.add).not.toHaveBeenCalled();
    });
  });

  describe('edit act', () => {
    it('opens edit dialog with existing name pre-filled', async () => {
      const user = userEvent.setup();
      window.db.acts.getAllByArc = vi
        .fn()
        .mockResolvedValue([buildAct({ id: 1, name: 'Act One' })]);

      renderPage();
      await screen.findByText('Act One');
      await user.click(screen.getByRole('button', { name: 'Edit' }));

      expect(
        screen.getByRole('dialog', { name: 'Edit Act' }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toHaveValue('Act One');
    });

    it('updates act on edit submit', async () => {
      const user = userEvent.setup();
      const act = buildAct({ id: 1, name: 'Act One' });
      const updated = buildAct({ id: 1, name: 'Act Renamed' });
      window.db.acts.getAllByArc = vi.fn().mockResolvedValue([act]);
      window.db.acts.update = vi.fn().mockResolvedValue(updated);

      renderPage();
      await screen.findByText('Act One');
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      const input = screen.getByLabelText(/name/i);
      await user.clear(input);
      await user.type(input, 'Act Renamed');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await screen.findByText('Act Renamed');
      expect(window.db.acts.update).toHaveBeenCalledWith(1, {
        name: 'Act Renamed',
      });
    });

    it('closes edit dialog on Cancel', async () => {
      const user = userEvent.setup();
      window.db.acts.getAllByArc = vi
        .fn()
        .mockResolvedValue([buildAct({ id: 1, name: 'Act One' })]);

      renderPage();
      await screen.findByText('Act One');
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(
        screen.queryByRole('dialog', { name: 'Edit Act' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('delete act', () => {
    it('removes act from list after dialog confirmation', async () => {
      const user = userEvent.setup();
      window.db.acts.getAllByArc = vi
        .fn()
        .mockResolvedValue([buildAct({ id: 1, name: 'Act One' })]);
      window.db.acts.delete = vi.fn().mockResolvedValue({ id: 1 });

      renderPage();
      await screen.findByText('Act One');
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      const confirmDialog = await screen.findByRole('dialog', {
        name: 'Delete "Act One"?',
      });
      await user.click(
        within(confirmDialog).getByRole('button', { name: 'Delete' }),
      );

      await waitFor(() =>
        expect(screen.queryByText('Act One')).not.toBeInTheDocument(),
      );
      expect(window.db.acts.delete).toHaveBeenCalledWith(1);
      expect(toastSuccessMock).toHaveBeenCalledWith(
        'Act deleted.',
        '"Act One" was removed.',
      );
    });

    it('keeps act in list when dialog confirmation is cancelled', async () => {
      const user = userEvent.setup();
      window.db.acts.getAllByArc = vi
        .fn()
        .mockResolvedValue([buildAct({ id: 1, name: 'Act One' })]);

      renderPage();
      await screen.findByText('Act One');
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      const confirmDialog = await screen.findByRole('dialog', {
        name: 'Delete "Act One"?',
      });
      await user.click(
        within(confirmDialog).getByRole('button', { name: 'Cancel' }),
      );

      expect(screen.getByText('Act One')).toBeInTheDocument();
      expect(window.db.acts.delete).not.toHaveBeenCalled();
      expect(toastSuccessMock).not.toHaveBeenCalled();
      expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it('shows a delete failure toast when act deletion fails', async () => {
      const user = userEvent.setup();
      window.db.acts.getAllByArc = vi
        .fn()
        .mockResolvedValue([buildAct({ id: 1, name: 'Act One' })]);
      window.db.acts.delete = vi
        .fn()
        .mockRejectedValue(new Error('delete failed'));

      renderPage();
      await screen.findByText('Act One');
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      const confirmDialog = await screen.findByRole('dialog', {
        name: 'Delete "Act One"?',
      });
      await user.click(
        within(confirmDialog).getByRole('button', { name: 'Delete' }),
      );

      await waitFor(() =>
        expect(window.db.acts.delete).toHaveBeenCalledWith(1),
      );
      expect(screen.getByText('Act One')).toBeInTheDocument();
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Failed to delete act.',
        'delete failed',
      );
    });
  });

  describe('move act', () => {
    it('opens MoveActDialog when Move is clicked', async () => {
      const user = userEvent.setup();
      window.db.acts.getAllByArc = vi
        .fn()
        .mockResolvedValue([buildAct({ id: 1, name: 'Act One' })]);

      renderPage();
      await screen.findByText('Act One');
      await user.click(screen.getByRole('button', { name: 'Move' }));

      expect(
        screen.getByRole('dialog', { name: 'Move Act' }),
      ).toBeInTheDocument();
      expect(screen.getByText('Move Act One')).toBeInTheDocument();
    });

    it('removes act from list after move is confirmed', async () => {
      const user = userEvent.setup();
      window.db.acts.getAllByArc = vi
        .fn()
        .mockResolvedValue([buildAct({ id: 1, name: 'Act One' })]);
      window.db.acts.moveTo = vi
        .fn()
        .mockResolvedValue(buildAct({ id: 1, arc_id: 99 }));

      renderPage();
      await screen.findByText('Act One');
      await user.click(screen.getByRole('button', { name: 'Move' }));
      await user.click(screen.getByRole('button', { name: 'Confirm Move' }));

      await waitFor(() =>
        expect(screen.queryByText('Act One')).not.toBeInTheDocument(),
      );
      expect(window.db.acts.moveTo).toHaveBeenCalledWith(1, 99);
    });

    it('shows move error when moveTo fails', async () => {
      const user = userEvent.setup();
      window.db.acts.getAllByArc = vi
        .fn()
        .mockResolvedValue([buildAct({ id: 1, name: 'Act One' })]);
      window.db.acts.moveTo = vi
        .fn()
        .mockRejectedValue(new Error('Move failed'));

      renderPage();
      await screen.findByText('Act One');
      await user.click(screen.getByRole('button', { name: 'Move' }));
      await user.click(screen.getByRole('button', { name: 'Confirm Move' }));

      expect(toastErrorMock).toHaveBeenCalledWith(
        'Failed to move act.',
        'Move failed',
      );
      expect(screen.getByText('Act One')).toBeInTheDocument();
    });

    it('closes MoveActDialog when Cancel Move is clicked', async () => {
      const user = userEvent.setup();
      window.db.acts.getAllByArc = vi
        .fn()
        .mockResolvedValue([buildAct({ id: 1, name: 'Act One' })]);

      renderPage();
      await screen.findByText('Act One');
      await user.click(screen.getByRole('button', { name: 'Move' }));
      await user.click(screen.getByRole('button', { name: 'Cancel Move' }));

      expect(
        screen.queryByRole('dialog', { name: 'Move Act' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('reorder acts', () => {
    it('calls acts.update with new sort_order after drag', async () => {
      const act1 = buildAct({ id: 1, name: 'Act One', sort_order: 0 });
      const act2 = buildAct({ id: 2, name: 'Act Two', sort_order: 1 });
      window.db.acts.getAllByArc = vi.fn().mockResolvedValue([act1, act2]);
      window.db.acts.update = vi.fn().mockResolvedValue({ ...act1 });

      renderPage();
      await screen.findByText('Act One');
      await waitFor(() => expect(capturedOnDragEnd).toBeDefined());

      (capturedOnDragEnd as (event: DragEndEvent) => void)({
        active: { id: 1 },
        over: { id: 2 },
      } as unknown as DragEndEvent);

      await waitFor(() => expect(window.db.acts.update).toHaveBeenCalled());
    });

    it('shows reorder error and restores order when update fails', async () => {
      const act1 = buildAct({ id: 1, name: 'Act One', sort_order: 0 });
      const act2 = buildAct({ id: 2, name: 'Act Two', sort_order: 1 });
      window.db.acts.getAllByArc = vi
        .fn()
        .mockResolvedValueOnce([act1, act2])
        .mockResolvedValue([act1, act2]);
      window.db.acts.update = vi
        .fn()
        .mockRejectedValue(new Error('Save failed'));

      renderPage();
      await screen.findByText('Act One');
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
      const act1 = buildAct({ id: 1, name: 'Act One', sort_order: 0 });
      window.db.acts.getAllByArc = vi.fn().mockResolvedValue([act1]);
      window.db.acts.update = vi.fn();

      renderPage();
      await screen.findByText('Act One');
      await waitFor(() => expect(capturedOnDragEnd).toBeDefined());

      (capturedOnDragEnd as (event: DragEndEvent) => void)({
        active: { id: 1 },
        over: { id: 1 },
      } as unknown as DragEndEvent);

      expect(window.db.acts.update).not.toHaveBeenCalled();
    });
  });
});
