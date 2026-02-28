import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ScenesPage from '../../../src/renderer/pages/ScenesPage';

const sessionsGetByIdMock = vi.fn();
const scenesGetAllBySessionMock = vi.fn();
const scenesAddMock = vi.fn();
const scenesUpdateMock = vi.fn();
const scenesDeleteMock = vi.fn();

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

describe('ScenesPage', () => {
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
      sessions: {
        getAllByCampaign: vi.fn(),
        getById: sessionsGetByIdMock,
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      scenes: {
        getAllBySession: scenesGetAllBySessionMock,
        getById: vi.fn(),
        add: scenesAddMock,
        update: scenesUpdateMock,
        delete: scenesDeleteMock,
      },
    } as DbApi;

    vi.spyOn(window, 'confirm').mockReturnValue(true);
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

  it('deletes a scene after confirmation', async () => {
    const user = userEvent.setup();
    const scene = buildScene();

    sessionsGetByIdMock.mockResolvedValue(buildSession());
    scenesGetAllBySessionMock.mockResolvedValue([scene]);
    scenesDeleteMock.mockResolvedValue({ id: 1 });

    renderScenesPage('/world/1/campaign/1/session/1/scenes');

    await screen.findByText('The Opening');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Delete "The Opening"? This cannot be undone.',
    );
    await waitFor(() => {
      expect(scenesDeleteMock).toHaveBeenCalledWith(1);
    });
    await waitFor(() => {
      expect(screen.queryByText('The Opening')).not.toBeInTheDocument();
    });
  });

  it('does not delete when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const scene = buildScene();

    sessionsGetByIdMock.mockResolvedValue(buildSession());
    scenesGetAllBySessionMock.mockResolvedValue([scene]);

    renderScenesPage('/world/1/campaign/1/session/1/scenes');

    await screen.findByText('The Opening');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(window.confirm).toHaveBeenCalled();
    expect(scenesDeleteMock).not.toHaveBeenCalled();
    expect(screen.getByText('The Opening')).toBeInTheDocument();
  });
});
