import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppSettingsProvider } from '../../../src/renderer/hooks/useAppSettings';
import BackgroundDetailPage from '../../../src/renderer/pages/BackgroundDetailPage';

vi.mock(
  '../../../src/renderer/components/ui/RichTextEditor',
  () => import('../../helpers/richTextEditorMock'),
);
import { buildBackground, resetFactoryIds } from '../../helpers/factories';
import { resetWindowDb, setupWindowDb } from '../../helpers/ipcMock';

vi.mock('../../../src/renderer/components/ui/ToastProvider', () => ({
  useToast: () => ({
    showToast: vi.fn(),
    dismissToast: vi.fn(),
    clearToasts: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

function renderPage(worldId = 1, backgroundId = 5) {
  return render(
    <MemoryRouter initialEntries={[`/world/${worldId}/backgrounds/${backgroundId}`]}>
      <AppSettingsProvider>
        <Routes>
          <Route
            path='/world/:id/backgrounds/:backgroundId'
            element={<BackgroundDetailPage />}
          />
        </Routes>
      </AppSettingsProvider>
    </MemoryRouter>,
  );
}

describe('BackgroundDetailPage', () => {
  let mockDb: DbApi;

  beforeEach(() => {
    resetFactoryIds();
    mockDb = setupWindowDb();
    resetWindowDb();
  });

  it('renders background name and description', async () => {
    const background = buildBackground({
      id: 5,
      world_id: 1,
      name: 'Royal Guard',
      description: 'Elite city soldiers.',
    });
    (mockDb.backgrounds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(background);
    (mockDb.backgrounds.markViewed as ReturnType<typeof vi.fn>).mockResolvedValue(background);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Royal Guard' })).toBeInTheDocument();
    expect(screen.getByText('Elite city soldiers.')).toBeInTheDocument();
    expect(mockDb.backgrounds.markViewed).toHaveBeenCalledWith(5);
  });

  it('opens edit form prefilled and saves via window.db.backgrounds.update', async () => {
    const background = buildBackground({
      id: 5,
      world_id: 1,
      name: 'Royal Guard',
      description: 'Elite city soldiers.',
    });
    (mockDb.backgrounds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(background);
    (mockDb.backgrounds.markViewed as ReturnType<typeof vi.fn>).mockResolvedValue(background);
    (mockDb.backgrounds.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildBackground({ id: 5, world_id: 1, name: 'Updated Guard', description: 'Updated desc.' }),
    );

    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('heading', { name: 'Royal Guard' });
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Name *'));
    await user.type(screen.getByLabelText('Name *'), 'Updated Guard');
    await user.clear(screen.getByLabelText('Description'));
    await user.type(screen.getByLabelText('Description'), 'Updated desc.');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(mockDb.backgrounds.update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({
        name: 'Updated Guard',
        description: 'Updated desc.',
      }),
    );
  });

  it('applies stored background detail image dimensions from app settings', async () => {
    const background = buildBackground({
      id: 5,
      world_id: 1,
      name: 'Royal Guard',
      image_src: 'vv-media://background-images/guard.png',
    });
    (mockDb.settings.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      config: JSON.stringify({
        cardDisplays: {
          backgroundDetail: {
            width: 144,
            height: 192,
            lockAspectRatio: false,
          },
        },
      }),
      created_at: '',
      updated_at: '',
    });
    (mockDb.backgrounds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(background);
    (mockDb.backgrounds.markViewed as ReturnType<typeof vi.fn>).mockResolvedValue(background);

    renderPage();

    expect(await screen.findByRole('img', { name: 'Royal Guard' })).toHaveStyle({
      width: '144px',
      height: '192px',
    });
  });

  it('shows invalid-id and not-found states', async () => {
    renderPage(1, Number.NaN);
    expect(await screen.findByText('Invalid background id.')).toBeInTheDocument();

    (mockDb.backgrounds.getById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    renderPage(1, 999);
    expect(await screen.findByText('Background not found.')).toBeInTheDocument();
  });

  it('shows load failure state when background fetch rejects', async () => {
    (mockDb.backgrounds.getById as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('boom'),
    );

    renderPage();

    expect(await screen.findByText('Unable to load this background right now.'))
      .toBeInTheDocument();
  });
});
