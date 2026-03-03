import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import SessionsPage from '../../../src/renderer/pages/SessionsPage';

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: ReactNode;
    onDragEnd?: (event: {
      active: { id: number };
      over: { id: number } | null;
    }) => void;
  }) => (
    <div>
      <button
        type="button"
        data-testid="mock-dnd-drag-end"
        onClick={() =>
          onDragEnd?.(
            ((globalThis as { __TEST_DND_DRAG_END_EVENT__?: unknown })
              .__TEST_DND_DRAG_END_EVENT__ as
              | {
                  active: { id: number };
                  over: { id: number } | null;
                }
              | undefined) ?? {
              active: { id: 1 },
              over: { id: 2 },
            },
          )
        }
      >
        Trigger drag end
      </button>
      {children}
    </div>
  ),
  KeyboardSensor: function KeyboardSensor() {
    return null;
  },
  PointerSensor: function PointerSensor() {
    return null;
  },
  closestCenter: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn((...configuredSensors: unknown[]) => configuredSensors),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: ReactNode }) => children,
  arrayMove: <T,>(items: T[], oldIndex: number, newIndex: number): T[] => {
    const nextItems = [...items];
    const [movedItem] = nextItems.splice(oldIndex, 1);
    nextItems.splice(newIndex, 0, movedItem);
    return nextItems;
  },
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    setActivatorNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  })),
  verticalListSortingStrategy: {},
}));

const actsGetByIdMock = vi.fn();
const sessionsGetAllByActMock = vi.fn();
const sessionsAddMock = vi.fn();
const sessionsUpdateMock = vi.fn();
const sessionsDeleteMock = vi.fn();

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
    notes: 'Initial meeting',
    planned_at: null,
    sort_order: 0,
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  };
}

function formatPlannedAtForAssertion(value: string): string {
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

const SESSION_ROUTE =
  '/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/sessions';
const SCENES_ROUTE =
  '/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/session/:sessionId/scenes';

function renderSessionsPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={SESSION_ROUTE} element={<SessionsPage />} />
        <Route path={SCENES_ROUTE} element={<div>Scenes Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function setDragEndEvent(activeId: number, overId: number | null): void {
  (
    globalThis as { __TEST_DND_DRAG_END_EVENT__?: unknown }
  ).__TEST_DND_DRAG_END_EVENT__ = {
    active: { id: activeId },
    over: overId === null ? null : { id: overId },
  };
}

function getSessionRows() {
  return screen.getAllByRole('row').slice(1);
}

function getRenderedSessionNames() {
  return getSessionRows().map((row) => {
    const cells = within(row).getAllByRole('cell');
    return cells[1].textContent?.trim();
  });
}

function getRenderedSessionNumbers() {
  return getSessionRows().map((row) => {
    const orderCellText = within(row).getAllByRole('cell')[0].textContent ?? '';
    return Number(orderCellText.match(/\d+/)?.[0]);
  });
}

function getRenderedPlannedAtValues() {
  return getSessionRows().map((row) => {
    const cells = within(row).getAllByRole('cell');
    return cells[3].textContent?.trim();
  });
}

describe('SessionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDragEndEvent(1, 2);

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
        getAllByCampaign: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      acts: {
        getAllByArc: vi.fn(),
        getAllByCampaign: vi.fn(),
        getById: actsGetByIdMock,
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        moveTo: vi.fn(),
      },
      sessions: {
        getAllByAct: sessionsGetAllByActMock,
        getById: vi.fn(),
        add: sessionsAddMock,
        update: sessionsUpdateMock,
        delete: sessionsDeleteMock,
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

    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('shows error when world id is invalid', async () => {
    renderSessionsPage('/world/abc/campaign/1/arc/1/act/1/sessions');

    expect(
      await screen.findByText('Invalid world, campaign, arc, or act id.'),
    ).toBeInTheDocument();
    expect(actsGetByIdMock).not.toHaveBeenCalled();
  });

  it('shows error when act id is invalid', async () => {
    renderSessionsPage('/world/1/campaign/1/arc/1/act/xyz/sessions');

    expect(
      await screen.findByText('Invalid world, campaign, arc, or act id.'),
    ).toBeInTheDocument();
    expect(actsGetByIdMock).not.toHaveBeenCalled();
  });

  it('shows error when act is not found', async () => {
    actsGetByIdMock.mockResolvedValue(null);

    renderSessionsPage('/world/1/campaign/1/arc/1/act/1/sessions');

    expect(await screen.findByText('Act not found.')).toBeInTheDocument();
    expect(actsGetByIdMock).toHaveBeenCalledWith(1);
    expect(sessionsGetAllByActMock).not.toHaveBeenCalled();
  });

  it('shows load error when api throws', async () => {
    actsGetByIdMock.mockRejectedValue(new Error('db unavailable'));

    renderSessionsPage('/world/1/campaign/1/arc/1/act/1/sessions');

    expect(
      await screen.findByText('Unable to load sessions right now.'),
    ).toBeInTheDocument();
  });

  it('shows empty state when act has no sessions', async () => {
    actsGetByIdMock.mockResolvedValue(buildAct());
    sessionsGetAllByActMock.mockResolvedValue([]);

    renderSessionsPage('/world/1/campaign/1/arc/1/act/1/sessions');

    expect(await screen.findByText('No sessions yet.')).toBeInTheDocument();
    expect(sessionsGetAllByActMock).toHaveBeenCalledWith(1);
  });

  it('renders sessions list after successful load', async () => {
    actsGetByIdMock.mockResolvedValue(buildAct());
    sessionsGetAllByActMock.mockResolvedValue([
      buildSession(),
      buildSession({ id: 2, name: 'Session Two', notes: null }),
    ]);

    renderSessionsPage('/world/1/campaign/1/arc/1/act/1/sessions');

    expect(await screen.findByText('Session One')).toBeInTheDocument();
    expect(screen.getByText('Initial meeting')).toBeInTheDocument();
    expect(screen.getByText('Session Two')).toBeInTheDocument();
  });

  it('renders a formatted planned date-time when a session has planned_at', async () => {
    const plannedAt = '2026-03-20T14:30';
    actsGetByIdMock.mockResolvedValue(buildAct());
    sessionsGetAllByActMock.mockResolvedValue([
      buildSession({ planned_at: plannedAt }),
    ]);

    renderSessionsPage('/world/1/campaign/1/arc/1/act/1/sessions');

    await screen.findByText('Session One');
    expect(screen.getByText(formatPlannedAtForAssertion(plannedAt))).toBeInTheDocument();
  });

  it('renders planned date-time fallback when planned_at is missing', async () => {
    actsGetByIdMock.mockResolvedValue(buildAct());
    sessionsGetAllByActMock.mockResolvedValue([buildSession({ planned_at: null })]);

    renderSessionsPage('/world/1/campaign/1/arc/1/act/1/sessions');

    await screen.findByText('Session One');
    expect(getRenderedPlannedAtValues()).toEqual(['-']);
  });

  it('renders sessions in sort_order order with contiguous numbering', async () => {
    actsGetByIdMock.mockResolvedValue(buildAct());
    sessionsGetAllByActMock.mockResolvedValue([
      buildSession({ id: 3, name: 'Session Three', sort_order: 2 }),
      buildSession({ id: 1, name: 'Session One', sort_order: 0 }),
      buildSession({ id: 2, name: 'Session Two', sort_order: 1 }),
    ]);

    renderSessionsPage('/world/1/campaign/1/arc/1/act/1/sessions');

    await screen.findByText('Session One');
    expect(getRenderedSessionNames()).toEqual([
      'Session One',
      'Session Two',
      'Session Three',
    ]);
    expect(getRenderedSessionNumbers()).toEqual([1, 2, 3]);
  });

  it('persists only changed sort_order values when sessions are reordered', async () => {
    const user = userEvent.setup();
    actsGetByIdMock.mockResolvedValue(buildAct());
    sessionsGetAllByActMock.mockResolvedValue([
      buildSession({ id: 1, name: 'Session One', sort_order: 0 }),
      buildSession({ id: 2, name: 'Session Two', sort_order: 1 }),
      buildSession({ id: 3, name: 'Session Three', sort_order: 2 }),
    ]);
    sessionsUpdateMock.mockResolvedValue(buildSession());

    renderSessionsPage('/world/1/campaign/1/arc/1/act/1/sessions');

    await screen.findByText('Session One');
    setDragEndEvent(1, 2);
    await user.click(screen.getByTestId('mock-dnd-drag-end'));

    await waitFor(() => {
      expect(sessionsUpdateMock).toHaveBeenCalledTimes(2);
    });
    expect(sessionsUpdateMock).toHaveBeenNthCalledWith(1, 2, { sort_order: 0 });
    expect(sessionsUpdateMock).toHaveBeenNthCalledWith(2, 1, { sort_order: 1 });
    expect(getRenderedSessionNames()).toEqual([
      'Session Two',
      'Session One',
      'Session Three',
    ]);
    expect(getRenderedSessionNumbers()).toEqual([1, 2, 3]);
  });

  it('shows reorder failure and reloads canonical order from backend', async () => {
    const user = userEvent.setup();
    actsGetByIdMock.mockResolvedValue(buildAct());
    sessionsGetAllByActMock
      .mockResolvedValueOnce([
        buildSession({ id: 1, name: 'Session One', sort_order: 0 }),
        buildSession({ id: 2, name: 'Session Two', sort_order: 1 }),
        buildSession({ id: 3, name: 'Session Three', sort_order: 2 }),
      ])
      .mockResolvedValueOnce([
        buildSession({ id: 3, name: 'Session Three', sort_order: 0 }),
        buildSession({ id: 1, name: 'Session One', sort_order: 1 }),
        buildSession({ id: 2, name: 'Session Two', sort_order: 2 }),
      ]);
    sessionsUpdateMock.mockRejectedValue(
      new Error('Unable to reorder sessions right now.'),
    );

    renderSessionsPage('/world/1/campaign/1/arc/1/act/1/sessions');

    await screen.findByText('Session One');
    setDragEndEvent(1, 2);
    await user.click(screen.getByTestId('mock-dnd-drag-end'));

    expect(
      await screen.findByText('Unable to reorder sessions right now.'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(sessionsGetAllByActMock).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(getRenderedSessionNames()).toEqual([
        'Session Three',
        'Session One',
        'Session Two',
      ]);
    });
  });

  it('creates a session through the create dialog', async () => {
    const user = userEvent.setup();
    const newSession = buildSession({
      id: 3,
      name: 'Session Three',
      notes: 'New notes',
    });

    actsGetByIdMock.mockResolvedValue(buildAct());
    sessionsGetAllByActMock.mockResolvedValue([]);
    sessionsAddMock.mockResolvedValue(newSession);

    renderSessionsPage('/world/1/campaign/1/arc/1/act/1/sessions');

    await screen.findByText('No sessions yet.');
    await user.click(screen.getByRole('button', { name: 'New Session' }));

    const dialog = await screen.findByRole('dialog', { name: 'New Session' });
    await user.type(within(dialog).getByLabelText('Name'), 'Session Three');
    await user.type(
      within(dialog).getByLabelText('Notes (optional)'),
      'New notes',
    );
    await user.type(
      within(dialog).getByLabelText('Planned date-time (optional)'),
      '2026-03-10T09:45',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Create session' }),
    );

    expect(sessionsAddMock).toHaveBeenCalledWith({
      act_id: 1,
      name: 'Session Three',
      notes: 'New notes',
      planned_at: '2026-03-10T09:45',
    });
    expect(await screen.findByText('Session Three')).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'New Session' }),
    ).not.toBeInTheDocument();
  });

  it('cancels the create dialog without creating', async () => {
    const user = userEvent.setup();
    actsGetByIdMock.mockResolvedValue(buildAct());
    sessionsGetAllByActMock.mockResolvedValue([]);

    renderSessionsPage('/world/1/campaign/1/arc/1/act/1/sessions');

    await screen.findByText('No sessions yet.');
    await user.click(screen.getByRole('button', { name: 'New Session' }));

    await screen.findByRole('dialog', { name: 'New Session' });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(
      screen.queryByRole('dialog', { name: 'New Session' }),
    ).not.toBeInTheDocument();
    expect(sessionsAddMock).not.toHaveBeenCalled();
  });

  it('edits a session from the edit dialog', async () => {
    const user = userEvent.setup();
    const session = buildSession({ notes: null });
    const updatedSession = buildSession({
      name: 'Updated Session',
      notes: 'Updated notes',
      planned_at: '2026-03-11T13:15',
    });

    actsGetByIdMock.mockResolvedValue(buildAct());
    sessionsGetAllByActMock.mockResolvedValue([session]);
    sessionsUpdateMock.mockResolvedValue(updatedSession);

    renderSessionsPage('/world/1/campaign/1/arc/1/act/1/sessions');

    await screen.findByText('Session One');
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog', { name: 'Edit Session' });
    const nameInput = within(dialog).getByLabelText('Name');

    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Session');
    await user.type(
      within(dialog).getByLabelText('Notes (optional)'),
      'Updated notes',
    );
    const plannedAtInput = within(dialog).getByLabelText(
      'Planned date-time (optional)',
    );
    await user.type(plannedAtInput, '2026-03-11T13:15');
    await user.click(
      within(dialog).getByRole('button', { name: 'Save changes' }),
    );

    expect(sessionsUpdateMock).toHaveBeenCalledWith(1, {
      name: 'Updated Session',
      notes: 'Updated notes',
      planned_at: '2026-03-11T13:15',
    });
    expect(await screen.findByText('Updated Session')).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'Edit Session' }),
    ).not.toBeInTheDocument();
  });

  it('deletes a session after confirmation', async () => {
    const user = userEvent.setup();
    const session = buildSession();

    actsGetByIdMock.mockResolvedValue(buildAct());
    sessionsGetAllByActMock.mockResolvedValue([session]);
    sessionsDeleteMock.mockResolvedValue({ id: 1 });

    renderSessionsPage('/world/1/campaign/1/arc/1/act/1/sessions');

    await screen.findByText('Session One');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Delete "Session One"? This cannot be undone.',
    );
    await waitFor(() => {
      expect(sessionsDeleteMock).toHaveBeenCalledWith(1);
    });
    await waitFor(() => {
      expect(screen.queryByText('Session One')).not.toBeInTheDocument();
    });
  });

  it('does not delete when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const session = buildSession();

    actsGetByIdMock.mockResolvedValue(buildAct());
    sessionsGetAllByActMock.mockResolvedValue([session]);

    renderSessionsPage('/world/1/campaign/1/arc/1/act/1/sessions');

    await screen.findByText('Session One');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(window.confirm).toHaveBeenCalled();
    expect(sessionsDeleteMock).not.toHaveBeenCalled();
    expect(screen.getByText('Session One')).toBeInTheDocument();
  });

  it('navigates to scenes page when Scenes link is clicked', async () => {
    const user = userEvent.setup();
    const session = buildSession();

    actsGetByIdMock.mockResolvedValue(buildAct());
    sessionsGetAllByActMock.mockResolvedValue([session]);

    renderSessionsPage('/world/1/campaign/1/arc/1/act/1/sessions');

    await screen.findByText('Session One');
    await user.click(screen.getByRole('link', { name: 'Scenes' }));

    expect(await screen.findByText('Scenes Page')).toBeInTheDocument();
  });
});
