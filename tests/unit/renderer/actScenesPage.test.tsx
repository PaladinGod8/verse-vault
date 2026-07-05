import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ActScenesPage from '../../../src/renderer/pages/ActScenesPage';

vi.mock(
  '../../../src/renderer/components/ui/RichTextEditor',
  () => import('../../helpers/richTextEditorMock'),
);

import {
  buildAct as buildActFactory,
  buildScene as buildSceneFactory,
  buildSession as buildSessionFactory,
  resetFactoryIds,
} from '../../helpers/factories';
import { resetWindowDb, setupWindowDb } from '../../helpers/ipcMock';

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

function buildAct(overrides: Partial<Act> = {}): Act {
  return buildActFactory({
    id: 1,
    arc_id: 1,
    name: 'Act One',
    sort_order: 0,
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  });
}

function buildSession(overrides: Partial<Session> = {}): Session {
  return buildSessionFactory({
    id: 10,
    act_id: 1,
    name: 'Session One',
    notes: null,
    planned_at: null,
    sort_order: 0,
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  });
}

function buildScene(overrides: Partial<Scene> = {}): Scene {
  return buildSceneFactory({
    id: 1,
    campaign_id: 1,
    act_id: 1,
    session_id: null,
    name: 'Stray Scene',
    notes: null,
    payload: '{}',
    sort_order: 0,
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  });
}

function renderActScenesPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path='/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/scenes'
          element={<ActScenesPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ActScenesPage', () => {
  let mockDb: DbApi;

  beforeEach(() => {
    resetFactoryIds();
    mockDb = setupWindowDb();
    resetWindowDb();
    (mockDb.acts.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildAct());
  });

  it('shows an error for an invalid act id', async () => {
    renderActScenesPage('/world/1/campaign/1/arc/1/act/xyz/scenes');

    expect(
      await screen.findByText('Invalid world, campaign, arc, or act id.'),
    ).toBeInTheDocument();
  });

  it('groups scenes into a Stray Scenes section and per-session sections', async () => {
    (mockDb.scenes.getAllByAct as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildScene({ id: 1, name: 'Wandering Scene', session_id: null }),
      buildScene({ id: 2, name: 'Grouped Scene', session_id: 10 }),
    ]);
    (mockDb.sessions.getAllByAct as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildSession({ id: 10, name: 'Session One' }),
    ]);

    renderActScenesPage('/world/1/campaign/1/arc/1/act/1/scenes');

    expect(await screen.findByText('Stray Scenes')).toBeInTheDocument();
    expect(screen.getByText('Wandering Scene')).toBeInTheDocument();
    expect(screen.getByText('Session: Session One')).toBeInTheDocument();
    expect(screen.getByText('Grouped Scene')).toBeInTheDocument();
  });

  it('links scene name to the Scene Detail Page', async () => {
    (mockDb.scenes.getAllByAct as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildScene({ id: 1, name: 'Wandering Scene', session_id: null }),
    ]);

    renderActScenesPage('/world/1/campaign/1/arc/1/act/1/scenes');

    expect(await screen.findByRole('link', { name: 'Wandering Scene' })).toHaveAttribute(
      'href',
      '/world/1/scene/1',
    );
  });

  it('shows an empty state when the act has no scenes', async () => {
    renderActScenesPage('/world/1/campaign/1/arc/1/act/1/scenes');

    expect(await screen.findByText('No scenes yet.')).toBeInTheDocument();
  });

  it('creates a new stray scene through the create dialog', async () => {
    const user = userEvent.setup();
    (mockDb.scenes.add as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildScene({ id: 5, name: 'Fresh Scene' }),
    );

    renderActScenesPage('/world/1/campaign/1/arc/1/act/1/scenes');

    await screen.findByText('No scenes yet.');
    await user.click(screen.getByRole('button', { name: 'New Scene' }));

    const dialog = await screen.findByRole('dialog', { name: 'New Scene' });
    await user.type(within(dialog).getByLabelText('Name'), 'Fresh Scene');
    await user.click(within(dialog).getByRole('button', { name: 'Create scene' }));

    await waitFor(() => {
      expect(mockDb.scenes.add).toHaveBeenCalledWith({
        act_id: 1,
        session_id: null,
        name: 'Fresh Scene',
        notes: null,
        payload: '{}',
      });
    });
    expect(await screen.findByText('Fresh Scene')).toBeInTheDocument();
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Scene created.',
      '"Fresh Scene" was added.',
    );
  });

  it('edits a scene', async () => {
    const user = userEvent.setup();
    (mockDb.scenes.getAllByAct as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildScene({ id: 1, name: 'Original Name' }),
    ]);
    (mockDb.scenes.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildScene({ id: 1, name: 'Renamed Scene' }),
    );

    renderActScenesPage('/world/1/campaign/1/arc/1/act/1/scenes');

    await screen.findByText('Original Name');
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog', { name: 'Edit Scene' });
    const nameInput = within(dialog).getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Renamed Scene');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(screen.getByText('Renamed Scene')).toBeInTheDocument();
    });
  });

  it('deletes a scene after confirmation', async () => {
    const user = userEvent.setup();
    (mockDb.scenes.getAllByAct as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildScene({ id: 1, name: 'Doomed Scene' }),
    ]);
    (mockDb.scenes.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });

    renderActScenesPage('/world/1/campaign/1/arc/1/act/1/scenes');

    await screen.findByText('Doomed Scene');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const deleteButtons = await screen.findAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(mockDb.scenes.delete).toHaveBeenCalledWith(1);
    });
    await waitFor(() => {
      expect(screen.queryByText('Doomed Scene')).not.toBeInTheDocument();
    });
    expect(screen.getByText('No scenes yet.')).toBeInTheDocument();
  });

  it('keeps a scene in the list, regrouped, when moved within the same act', async () => {
    const user = userEvent.setup();
    (mockDb.scenes.getAllByAct as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildScene({ id: 1, name: 'Roaming Scene', session_id: null }),
    ]);
    (mockDb.arcs.getAllByCampaign as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1, campaign_id: 1, name: 'Arc One', sort_order: 0, created_at: '', updated_at: '' },
    ]);
    (mockDb.acts.getAllByCampaign as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildAct({ id: 1, arc_id: 1 }),
    ]);
    (mockDb.sessions.getAllByAct as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildSession({ id: 10, name: 'Session One' }),
    ]);
    (mockDb.scenes.moveTo as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildScene({ id: 1, name: 'Roaming Scene', session_id: 10 }),
    );

    renderActScenesPage('/world/1/campaign/1/arc/1/act/1/scenes');

    await screen.findByText('Roaming Scene');
    await user.click(screen.getByRole('button', { name: 'Move' }));
    await user.click(await screen.findByRole('radio', { name: /Session One/i }));
    const moveButtons = screen.getAllByRole('button', { name: 'Move' });
    await user.click(moveButtons[moveButtons.length - 1]);

    await waitFor(() => {
      expect(mockDb.scenes.moveTo).toHaveBeenCalledWith(1, 1, 10);
    });
    expect(await screen.findByText('Session: Session One')).toBeInTheDocument();
    expect(screen.getByText('Roaming Scene')).toBeInTheDocument();
  });

  it('removes a scene from the list when moved to a different act', async () => {
    const user = userEvent.setup();
    (mockDb.scenes.getAllByAct as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildScene({ id: 1, name: 'Traveling Scene', session_id: null }),
    ]);
    (mockDb.arcs.getAllByCampaign as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1, campaign_id: 1, name: 'Arc One', sort_order: 0, created_at: '', updated_at: '' },
    ]);
    (mockDb.acts.getAllByCampaign as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildAct({ id: 1, arc_id: 1, name: 'Act One' }),
      buildAct({ id: 2, arc_id: 1, name: 'Act Two' }),
    ]);
    (mockDb.sessions.getAllByAct as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockDb.scenes.moveTo as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildScene({ id: 1, name: 'Traveling Scene', act_id: 2, session_id: null }),
    );

    renderActScenesPage('/world/1/campaign/1/arc/1/act/1/scenes');

    await screen.findByText('Traveling Scene');
    await user.click(screen.getByRole('button', { name: 'Move' }));
    await user.click(await screen.findByRole('radio', { name: 'Act Two' }));
    const moveButtons = screen.getAllByRole('button', { name: 'Move' });
    await user.click(moveButtons[moveButtons.length - 1]);

    await waitFor(() => {
      expect(mockDb.scenes.moveTo).toHaveBeenCalledWith(1, 2, null);
    });
    await waitFor(() => {
      expect(screen.queryByText('Traveling Scene')).not.toBeInTheDocument();
    });
    expect(screen.getByText('No scenes yet.')).toBeInTheDocument();
  });
});
