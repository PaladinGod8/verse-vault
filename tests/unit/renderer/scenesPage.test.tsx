import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import ScenesPage from '../../../src/renderer/pages/ScenesPage';

const { toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('../../../src/renderer/components/ui/ToastProvider', () => ({
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

const sessionsGetByIdMock = vi.fn();
const sessionsGetAllByActMock = vi.fn();
const scenesGetAllBySessionMock = vi.fn();
const scenesAddMock = vi.fn();
const scenesUpdateMock = vi.fn();
const scenesDeleteMock = vi.fn();
const scenesMoveToMock = vi.fn();
const arcsGetAllByCampaignMock = vi.fn();
const actsGetAllByCampaignMock = vi.fn();

function buildSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 1,
    campaign_id: 1,
    name: 'Session One',
    notes: 'Initial meeting',
    sort_order: 0,
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  };
}

function buildScene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: 1,
    session_id: 1,
    name: 'The Opening',
    notes: 'Players arrive at tavern',
    payload: '{}',
    sort_order: 0,
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  };
}

function renderScenesPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/world/:id/campaign/:campaignId/session/:sessionId/scenes"
          element={<ScenesPage />}
        />
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

function getSceneRows() {
  return screen.getAllByRole('row').slice(1);
}

function getRenderedSceneNames() {
  return getSceneRows().map((row) => {
    const cells = within(row).getAllByRole('cell');
    return cells[1].textContent?.trim();
  });
}

function getRenderedSceneNumbers() {
  return getSceneRows().map((row) => {
    const orderCellText = within(row).getAllByRole('cell')[0].textContent ?? '';
    return Number(orderCellText.match(/\d+/)?.[0]);
  });
}

describe('ScenesPage', () => {
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
        getById: sessionsGetByIdMock,
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        moveTo: vi.fn(),
      },
      scenes: {
        getAllBySession: scenesGetAllBySessionMock,
        getById: vi.fn(),
        add: scenesAddMock,
        update: scenesUpdateMock,
        delete: scenesDeleteMock,
        moveTo: scenesMoveToMock,
      },
    } as DbApi;
  });

  it('shows error when world id is invalid', async () => {
    renderScenesPage('/world/abc/campaign/1/session/1/scenes');

    expect(
      await screen.findByText('Invalid world, campaign, or session id.'),
    ).toBeInTheDocument();
    expect(sessionsGetByIdMock).not.toHaveBeenCalled();
  });

  it('shows error when session id is invalid', async () => {
    renderScenesPage('/world/1/campaign/1/session/xyz/scenes');

    expect(
      await screen.findByText('Invalid world, campaign, or session id.'),
    ).toBeInTheDocument();
    expect(sessionsGetByIdMock).not.toHaveBeenCalled();
  });

  it('shows error when session is not found', async () => {
    sessionsGetByIdMock.mockResolvedValue(null);

    renderScenesPage('/world/1/campaign/1/session/1/scenes');

    expect(await screen.findByText('Session not found.')).toBeInTheDocument();
    expect(sessionsGetByIdMock).toHaveBeenCalledWith(1);
    expect(scenesGetAllBySessionMock).not.toHaveBeenCalled();
  });

  it('shows load error when api throws', async () => {
    sessionsGetByIdMock.mockRejectedValue(new Error('db unavailable'));

    renderScenesPage('/world/1/campaign/1/session/1/scenes');

    expect(
      await screen.findByText('Unable to load scenes right now.'),
    ).toBeInTheDocument();
  });

  it('shows empty state when session has no scenes', async () => {
    sessionsGetByIdMock.mockResolvedValue(buildSession());
    scenesGetAllBySessionMock.mockResolvedValue([]);

    renderScenesPage('/world/1/campaign/1/session/1/scenes');

    expect(await screen.findByText('No scenes yet.')).toBeInTheDocument();
    expect(scenesGetAllBySessionMock).toHaveBeenCalledWith(1);
  });

  it('renders scenes list after successful load', async () => {
    sessionsGetByIdMock.mockResolvedValue(buildSession());
    scenesGetAllBySessionMock.mockResolvedValue([
      buildScene(),
      buildScene({ id: 2, name: 'The Reveal', notes: null }),
    ]);

    renderScenesPage('/world/1/campaign/1/session/1/scenes');

    expect(await screen.findByText('The Opening')).toBeInTheDocument();
    expect(screen.getByText('Players arrive at tavern')).toBeInTheDocument();
    expect(screen.getByText('The Reveal')).toBeInTheDocument();
  });

  it('renders scenes in sort_order order with contiguous numbering', async () => {
    sessionsGetByIdMock.mockResolvedValue(buildSession());
    scenesGetAllBySessionMock.mockResolvedValue([
      buildScene({ id: 3, name: 'The Finale', sort_order: 2 }),
      buildScene({ id: 1, name: 'The Opening', sort_order: 0 }),
      buildScene({ id: 2, name: 'The Reveal', sort_order: 1 }),
    ]);

    renderScenesPage('/world/1/campaign/1/session/1/scenes');

    await screen.findByText('The Opening');
    expect(getRenderedSceneNames()).toEqual([
      'The Opening',
      'The Reveal',
      'The Finale',
    ]);
    expect(getRenderedSceneNumbers()).toEqual([1, 2, 3]);
  });

  it('persists only changed sort_order values when scenes are reordered', async () => {
    const user = userEvent.setup();
    sessionsGetByIdMock.mockResolvedValue(buildSession());
    scenesGetAllBySessionMock.mockResolvedValue([
      buildScene({ id: 1, name: 'The Opening', sort_order: 0 }),
      buildScene({ id: 2, name: 'The Reveal', sort_order: 1 }),
      buildScene({ id: 3, name: 'The Finale', sort_order: 2 }),
    ]);
    scenesUpdateMock.mockResolvedValue(buildScene());

    renderScenesPage('/world/1/campaign/1/session/1/scenes');

    await screen.findByText('The Opening');
    setDragEndEvent(1, 2);
    await user.click(screen.getByTestId('mock-dnd-drag-end'));

    await waitFor(() => {
      expect(scenesUpdateMock).toHaveBeenCalledTimes(2);
    });
    expect(scenesUpdateMock).toHaveBeenNthCalledWith(1, 2, { sort_order: 0 });
    expect(scenesUpdateMock).toHaveBeenNthCalledWith(2, 1, { sort_order: 1 });
    expect(getRenderedSceneNames()).toEqual([
      'The Reveal',
      'The Opening',
      'The Finale',
    ]);
    expect(getRenderedSceneNumbers()).toEqual([1, 2, 3]);
  });

  it('shows reorder failure and reloads canonical order from backend', async () => {
    const user = userEvent.setup();
    sessionsGetByIdMock.mockResolvedValue(buildSession());
    scenesGetAllBySessionMock
      .mockResolvedValueOnce([
        buildScene({ id: 1, name: 'The Opening', sort_order: 0 }),
        buildScene({ id: 2, name: 'The Reveal', sort_order: 1 }),
        buildScene({ id: 3, name: 'The Finale', sort_order: 2 }),
      ])
      .mockResolvedValueOnce([
        buildScene({ id: 3, name: 'The Finale', sort_order: 0 }),
        buildScene({ id: 1, name: 'The Opening', sort_order: 1 }),
        buildScene({ id: 2, name: 'The Reveal', sort_order: 2 }),
      ]);
    scenesUpdateMock.mockRejectedValue(
      new Error('Unable to reorder scenes right now.'),
    );

    renderScenesPage('/world/1/campaign/1/session/1/scenes');

    await screen.findByText('The Opening');
    setDragEndEvent(1, 2);
    await user.click(screen.getByTestId('mock-dnd-drag-end'));

    expect(
      await screen.findByText('Unable to reorder scenes right now.'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(scenesGetAllBySessionMock).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(getRenderedSceneNames()).toEqual([
        'The Finale',
        'The Opening',
        'The Reveal',
      ]);
    });
  });

  it('opens move dialog and loads target session options', async () => {
    const user = userEvent.setup();
    sessionsGetByIdMock.mockResolvedValue(buildSession());
    scenesGetAllBySessionMock.mockResolvedValue([buildScene()]);
    arcsGetAllByCampaignMock.mockResolvedValue([
      {
        id: 7,
        campaign_id: 1,
        name: 'Arc Prime',
        sort_order: 0,
        created_at: '2026-02-26 00:00:00',
        updated_at: '2026-02-26 00:00:00',
      } satisfies Arc,
    ]);
    actsGetAllByCampaignMock.mockResolvedValue([
      {
        id: 11,
        arc_id: 7,
        name: 'Act Prime',
        sort_order: 0,
        created_at: '2026-02-26 00:00:00',
        updated_at: '2026-02-26 00:00:00',
      } satisfies Act,
    ]);
    sessionsGetAllByActMock.mockResolvedValue([
      buildSession({ id: 1, name: 'Session One', sort_order: 0 }),
      buildSession({ id: 2, name: 'Session Two', sort_order: 1 }),
    ]);

    renderScenesPage('/world/1/campaign/1/session/1/scenes');

    await screen.findByText('The Opening');
    await user.click(screen.getByRole('button', { name: 'Move' }));

    expect(await screen.findByText(/Move .* to Session/i)).toBeInTheDocument();
    expect(
      await screen.findByRole('radio', { name: /Session Two/i }),
    ).toBeInTheDocument();
    expect(arcsGetAllByCampaignMock).toHaveBeenCalledWith(1);
    expect(actsGetAllByCampaignMock).toHaveBeenCalledWith(1);
    expect(sessionsGetAllByActMock).toHaveBeenCalledWith(11);
  });

  it('keeps move confirm disabled until a target session is selected', async () => {
    const user = userEvent.setup();
    sessionsGetByIdMock.mockResolvedValue(buildSession());
    scenesGetAllBySessionMock.mockResolvedValue([buildScene()]);
    arcsGetAllByCampaignMock.mockResolvedValue([
      {
        id: 7,
        campaign_id: 1,
        name: 'Arc Prime',
        sort_order: 0,
        created_at: '2026-02-26 00:00:00',
        updated_at: '2026-02-26 00:00:00',
      } satisfies Arc,
    ]);
    actsGetAllByCampaignMock.mockResolvedValue([
      {
        id: 11,
        arc_id: 7,
        name: 'Act Prime',
        sort_order: 0,
        created_at: '2026-02-26 00:00:00',
        updated_at: '2026-02-26 00:00:00',
      } satisfies Act,
    ]);
    sessionsGetAllByActMock.mockResolvedValue([
      buildSession({ id: 1, name: 'Session One', sort_order: 0 }),
      buildSession({ id: 2, name: 'Session Two', sort_order: 1 }),
    ]);

    renderScenesPage('/world/1/campaign/1/session/1/scenes');

    await screen.findByText('The Opening');
    await user.click(screen.getByRole('button', { name: 'Move' }));

    const targetOption = await screen.findByRole('radio', {
      name: /Session Two/i,
    });
    const moveButtons = screen.getAllByRole('button', { name: 'Move' });
    const confirmButton = moveButtons[moveButtons.length - 1];

    expect(confirmButton).toBeDisabled();
    await user.click(targetOption);
    expect(confirmButton).toBeEnabled();
  });

  it('moves a scene to another session and removes it from current list', async () => {
    const user = userEvent.setup();
    sessionsGetByIdMock.mockResolvedValue(buildSession());
    scenesGetAllBySessionMock.mockResolvedValue([buildScene()]);
    scenesMoveToMock.mockResolvedValue(
      buildScene({ id: 1, session_id: 2, sort_order: 4 }),
    );
    arcsGetAllByCampaignMock.mockResolvedValue([
      {
        id: 7,
        campaign_id: 1,
        name: 'Arc Prime',
        sort_order: 0,
        created_at: '2026-02-26 00:00:00',
        updated_at: '2026-02-26 00:00:00',
      } satisfies Arc,
    ]);
    actsGetAllByCampaignMock.mockResolvedValue([
      {
        id: 11,
        arc_id: 7,
        name: 'Act Prime',
        sort_order: 0,
        created_at: '2026-02-26 00:00:00',
        updated_at: '2026-02-26 00:00:00',
      } satisfies Act,
    ]);
    sessionsGetAllByActMock.mockResolvedValue([
      buildSession({ id: 1, name: 'Session One', sort_order: 0 }),
      buildSession({ id: 2, name: 'Session Two', sort_order: 1 }),
    ]);

    renderScenesPage('/world/1/campaign/1/session/1/scenes');

    await screen.findByText('The Opening');
    await user.click(screen.getByRole('button', { name: 'Move' }));
    await user.click(
      await screen.findByRole('radio', { name: /Session Two/i }),
    );
    const moveButtons = screen.getAllByRole('button', { name: 'Move' });
    await user.click(moveButtons[moveButtons.length - 1]);

    await waitFor(() => {
      expect(scenesMoveToMock).toHaveBeenCalledWith(1, 2);
    });
    await waitFor(() => {
      expect(screen.queryByText('The Opening')).not.toBeInTheDocument();
    });
    expect(screen.getByText('No scenes yet.')).toBeInTheDocument();
  });

  it('shows move error and keeps scene in current list when move fails', async () => {
    const user = userEvent.setup();
    sessionsGetByIdMock.mockResolvedValue(buildSession());
    scenesGetAllBySessionMock.mockResolvedValue([buildScene()]);
    scenesMoveToMock.mockRejectedValue(new Error('move failed'));
    arcsGetAllByCampaignMock.mockResolvedValue([
      {
        id: 7,
        campaign_id: 1,
        name: 'Arc Prime',
        sort_order: 0,
        created_at: '2026-02-26 00:00:00',
        updated_at: '2026-02-26 00:00:00',
      } satisfies Arc,
    ]);
    actsGetAllByCampaignMock.mockResolvedValue([
      {
        id: 11,
        arc_id: 7,
        name: 'Act Prime',
        sort_order: 0,
        created_at: '2026-02-26 00:00:00',
        updated_at: '2026-02-26 00:00:00',
      } satisfies Act,
    ]);
    sessionsGetAllByActMock.mockResolvedValue([
      buildSession({ id: 1, name: 'Session One', sort_order: 0 }),
      buildSession({ id: 2, name: 'Session Two', sort_order: 1 }),
    ]);

    renderScenesPage('/world/1/campaign/1/session/1/scenes');

    await screen.findByText('The Opening');
    await user.click(screen.getByRole('button', { name: 'Move' }));
    await user.click(
      await screen.findByRole('radio', { name: /Session Two/i }),
    );
    const moveButtons = screen.getAllByRole('button', { name: 'Move' });
    await user.click(moveButtons[moveButtons.length - 1]);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Failed to move scene.',
        'move failed',
      );
    });
    expect(screen.getByText('The Opening')).toBeInTheDocument();
  });

  it('creates a scene through the create dialog', async () => {
    const user = userEvent.setup();
    const newScene = buildScene({
      id: 3,
      name: 'The Confrontation',
      notes: 'Boss fight',
      payload: '{}',
    });

    sessionsGetByIdMock.mockResolvedValue(buildSession());
    scenesGetAllBySessionMock.mockResolvedValue([]);
    scenesAddMock.mockResolvedValue(newScene);

    renderScenesPage('/world/1/campaign/1/session/1/scenes');

    await screen.findByText('No scenes yet.');
    await user.click(screen.getByRole('button', { name: 'New Scene' }));

    const dialog = await screen.findByRole('dialog', { name: 'New Scene' });
    await user.type(within(dialog).getByLabelText('Name'), 'The Confrontation');
    await user.type(
      within(dialog).getByLabelText('Notes (optional)'),
      'Boss fight',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Create scene' }),
    );

    expect(scenesAddMock).toHaveBeenCalledWith({
      session_id: 1,
      name: 'The Confrontation',
      notes: 'Boss fight',
      payload: '{}',
    });
    expect(await screen.findByText('The Confrontation')).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'New Scene' }),
    ).not.toBeInTheDocument();
  });

  it('cancels the create dialog without creating', async () => {
    const user = userEvent.setup();
    sessionsGetByIdMock.mockResolvedValue(buildSession());
    scenesGetAllBySessionMock.mockResolvedValue([]);

    renderScenesPage('/world/1/campaign/1/session/1/scenes');

    await screen.findByText('No scenes yet.');
    await user.click(screen.getByRole('button', { name: 'New Scene' }));

    await screen.findByRole('dialog', { name: 'New Scene' });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(
      screen.queryByRole('dialog', { name: 'New Scene' }),
    ).not.toBeInTheDocument();
    expect(scenesAddMock).not.toHaveBeenCalled();
  });

  it('edits a scene from the edit dialog', async () => {
    const user = userEvent.setup();
    const scene = buildScene({ notes: null });
    const updatedScene = buildScene({
      name: 'Updated Scene',
      notes: 'Updated notes',
    });

    sessionsGetByIdMock.mockResolvedValue(buildSession());
    scenesGetAllBySessionMock.mockResolvedValue([scene]);
    scenesUpdateMock.mockResolvedValue(updatedScene);

    renderScenesPage('/world/1/campaign/1/session/1/scenes');

    await screen.findByText('The Opening');
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog', { name: 'Edit Scene' });
    const nameInput = within(dialog).getByLabelText('Name');

    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Scene');
    await user.type(
      within(dialog).getByLabelText('Notes (optional)'),
      'Updated notes',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Save changes' }),
    );

    expect(scenesUpdateMock).toHaveBeenCalledWith(1, {
      name: 'Updated Scene',
      notes: 'Updated notes',
      payload: '{}',
    });
    expect(await screen.findByText('Updated Scene')).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'Edit Scene' }),
    ).not.toBeInTheDocument();
  });

  it('deletes a scene after dialog confirmation', async () => {
    const user = userEvent.setup();
    const scene = buildScene();

    sessionsGetByIdMock.mockResolvedValue(buildSession());
    scenesGetAllBySessionMock.mockResolvedValue([scene]);
    scenesDeleteMock.mockResolvedValue({ id: 1 });

    renderScenesPage('/world/1/campaign/1/session/1/scenes');

    await screen.findByText('The Opening');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const confirmDialog = await screen.findByRole('dialog', {
      name: 'Delete "The Opening"?',
    });
    await user.click(
      within(confirmDialog).getByRole('button', { name: 'Delete' }),
    );
    await waitFor(() => {
      expect(scenesDeleteMock).toHaveBeenCalledWith(1);
    });
    await waitFor(() => {
      expect(screen.queryByText('The Opening')).not.toBeInTheDocument();
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Scene deleted.',
      '"The Opening" was removed.',
    );
  });

  it('does not delete when dialog confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const scene = buildScene();

    sessionsGetByIdMock.mockResolvedValue(buildSession());
    scenesGetAllBySessionMock.mockResolvedValue([scene]);

    renderScenesPage('/world/1/campaign/1/session/1/scenes');

    await screen.findByText('The Opening');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const confirmDialog = await screen.findByRole('dialog', {
      name: 'Delete "The Opening"?',
    });
    await user.click(
      within(confirmDialog).getByRole('button', { name: 'Cancel' }),
    );

    expect(scenesDeleteMock).not.toHaveBeenCalled();
    expect(screen.getByText('The Opening')).toBeInTheDocument();
    expect(toastSuccessMock).not.toHaveBeenCalled();
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('shows a delete failure toast when scene deletion fails', async () => {
    const user = userEvent.setup();
    const scene = buildScene();

    sessionsGetByIdMock.mockResolvedValue(buildSession());
    scenesGetAllBySessionMock.mockResolvedValue([scene]);
    scenesDeleteMock.mockRejectedValue(new Error('delete failed'));

    renderScenesPage('/world/1/campaign/1/session/1/scenes');

    await screen.findByText('The Opening');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const confirmDialog = await screen.findByRole('dialog', {
      name: 'Delete "The Opening"?',
    });
    await user.click(
      within(confirmDialog).getByRole('button', { name: 'Delete' }),
    );

    await waitFor(() => {
      expect(scenesDeleteMock).toHaveBeenCalledWith(1);
    });
    expect(screen.getByText('The Opening')).toBeInTheDocument();
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Failed to delete scene.',
      'delete failed',
    );
  });
});
