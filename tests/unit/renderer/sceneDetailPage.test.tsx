import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SceneDetailPage from '../../../src/renderer/pages/SceneDetailPage';

vi.mock(
  '../../../src/renderer/components/ui/RichTextEditor',
  () => import('../../helpers/richTextEditorMock'),
);
import { buildAct, buildScene, resetFactoryIds } from '../../helpers/factories';
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

function renderPage(worldId = 1, sceneId: number | string = 5) {
  return render(
    <MemoryRouter initialEntries={[`/world/${worldId}/scene/${sceneId}`]}>
      <Routes>
        <Route path='/world/:id/scene/:sceneId' element={<SceneDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SceneDetailPage', () => {
  let mockDb: DbApi;

  beforeEach(() => {
    resetFactoryIds();
    mockDb = setupWindowDb();
    resetWindowDb();
  });

  it('renders scene name and notes', async () => {
    const scene = buildScene({
      id: 5,
      campaign_id: 1,
      act_id: 10,
      session_id: null,
      name: 'The Ambush',
      notes: 'Bandits attack at dusk.',
    });
    (mockDb.scenes.getById as ReturnType<typeof vi.fn>).mockResolvedValue(scene);
    (mockDb.acts.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildAct({ id: 10, arc_id: 7 }),
    );

    renderPage();

    expect(await screen.findByDisplayValue('The Ambush')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bandits attack at dusk.')).toBeInTheDocument();
  });

  it('saves edited name and notes together via window.db.scenes.update', async () => {
    const scene = buildScene({
      id: 5,
      campaign_id: 1,
      act_id: 10,
      session_id: null,
      name: 'The Ambush',
      notes: 'Bandits attack at dusk.',
    });
    (mockDb.scenes.getById as ReturnType<typeof vi.fn>).mockResolvedValue(scene);
    (mockDb.acts.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildAct({ id: 10, arc_id: 7 }),
    );
    (mockDb.scenes.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildScene({ ...scene, name: 'The Ambush Renewed', notes: 'Updated notes.' }),
    );

    const user = userEvent.setup();
    renderPage();

    const nameInput = await screen.findByDisplayValue('The Ambush');
    await user.clear(nameInput);
    await user.type(nameInput, 'The Ambush Renewed');

    const notesInput = screen.getByDisplayValue('Bandits attack at dusk.');
    await user.clear(notesInput);
    await user.type(notesInput, 'Updated notes.');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(mockDb.scenes.update).toHaveBeenCalledWith(5, {
      name: 'The Ambush Renewed',
      notes: 'Updated notes.',
    });
    expect(toastSuccessMock).toHaveBeenCalled();
  });

  it('derives Back link to ScenesPage when scene belongs to a session', async () => {
    const scene = buildScene({
      id: 5,
      campaign_id: 2,
      act_id: 10,
      session_id: 40,
      name: 'The Ambush',
      notes: null,
    });
    (mockDb.scenes.getById as ReturnType<typeof vi.fn>).mockResolvedValue(scene);
    (mockDb.acts.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildAct({ id: 10, arc_id: 7 }),
    );

    renderPage(1, 5);

    await screen.findByDisplayValue('The Ambush');
    expect(mockDb.acts.getById).toHaveBeenCalledWith(10);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      '/world/1/campaign/2/arc/7/act/10/session/40/scenes',
    );
  });

  it('derives Back link to ActScenesPage when scene has no session', async () => {
    const scene = buildScene({
      id: 5,
      campaign_id: 2,
      act_id: 10,
      session_id: null,
      name: 'The Ambush',
      notes: null,
    });
    (mockDb.scenes.getById as ReturnType<typeof vi.fn>).mockResolvedValue(scene);
    (mockDb.acts.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildAct({ id: 10, arc_id: 7 }),
    );

    renderPage(1, 5);

    await screen.findByDisplayValue('The Ambush');
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      '/world/1/campaign/2/arc/7/act/10/scenes',
    );
  });

  it('shows invalid-id and not-found states', async () => {
    renderPage(1, Number.NaN);
    expect(await screen.findByText('Invalid scene id.')).toBeInTheDocument();

    (mockDb.scenes.getById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    renderPage(1, 999);
    expect(await screen.findByText('Scene not found.')).toBeInTheDocument();
  });

  it('shows load failure state when scene fetch rejects', async () => {
    (mockDb.scenes.getById as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('boom'),
    );

    renderPage();

    expect(await screen.findByText('Unable to load this scene right now.'))
      .toBeInTheDocument();
  });

  it('omits the Back link when the owning act cannot be resolved', async () => {
    const scene = buildScene({
      id: 5,
      campaign_id: 2,
      act_id: 10,
      session_id: null,
      name: 'The Ambush',
      notes: null,
    });
    (mockDb.scenes.getById as ReturnType<typeof vi.fn>).mockResolvedValue(scene);
    (mockDb.acts.getById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    renderPage(1, 5);

    await screen.findByDisplayValue('The Ambush');
    expect(screen.queryByRole('link', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('blocks save and shows a toast when name is cleared', async () => {
    const scene = buildScene({ id: 5, act_id: 10, name: 'The Ambush', notes: null });
    (mockDb.scenes.getById as ReturnType<typeof vi.fn>).mockResolvedValue(scene);
    (mockDb.acts.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildAct({ id: 10, arc_id: 7 }),
    );

    const user = userEvent.setup();
    renderPage(1, 5);

    const nameInput = await screen.findByDisplayValue('The Ambush');
    await user.clear(nameInput);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(toastErrorMock).toHaveBeenCalledWith(
      'Scene name required.',
      'Enter a name before saving.',
    );
    expect(mockDb.scenes.update).not.toHaveBeenCalled();
  });

  it('saves empty notes as null and shows a failure toast when save rejects', async () => {
    const scene = buildScene({ id: 5, act_id: 10, name: 'The Ambush', notes: 'Old notes' });
    (mockDb.scenes.getById as ReturnType<typeof vi.fn>).mockResolvedValue(scene);
    (mockDb.acts.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildAct({ id: 10, arc_id: 7 }),
    );
    (mockDb.scenes.update as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('save failed'),
    );

    const user = userEvent.setup();
    renderPage(1, 5);

    const notesInput = await screen.findByDisplayValue('Old notes');
    await user.clear(notesInput);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(mockDb.scenes.update).toHaveBeenCalledWith(5, { name: 'The Ambush', notes: null });
    expect(toastErrorMock).toHaveBeenCalledWith('Failed to save scene.', 'save failed');
  });
});
