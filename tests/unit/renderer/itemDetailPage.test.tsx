import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppSettingsProvider } from '../../../src/renderer/hooks/useAppSettings';
import ItemDetailPage from '../../../src/renderer/pages/ItemDetailPage';

vi.mock(
  '../../../src/renderer/components/ui/RichTextEditor',
  () => import('../../helpers/richTextEditorMock'),
);
import { buildItem, resetFactoryIds } from '../../helpers/factories';
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

function renderPage(worldId = 1, itemId = 5) {
  return render(
    <MemoryRouter initialEntries={[`/world/${worldId}/items/${itemId}`]}>
      <AppSettingsProvider>
        <Routes>
          <Route
            path='/world/:id/items/:itemId'
            element={<ItemDetailPage />}
          />
        </Routes>
      </AppSettingsProvider>
    </MemoryRouter>,
  );
}

describe('ItemDetailPage', () => {
  let mockDb: DbApi;

  beforeEach(() => {
    resetFactoryIds();
    mockDb = setupWindowDb();
    resetWindowDb();
  });

  it('renders item name and description', async () => {
    const item = buildItem({
      id: 5,
      world_id: 1,
      name: 'Sunblade',
      description: 'Ancient radiant sword.',
    });
    (mockDb.items.getById as ReturnType<typeof vi.fn>).mockResolvedValue(item);
    (mockDb.items.markViewed as ReturnType<typeof vi.fn>).mockResolvedValue(item);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Sunblade' })).toBeInTheDocument();
    expect(screen.getByText('Ancient radiant sword.')).toBeInTheDocument();
    expect(mockDb.items.markViewed).toHaveBeenCalledWith(5);
  });

  it('opens edit form prefilled and saves via window.db.items.update', async () => {
    const item = buildItem({
      id: 5,
      world_id: 1,
      name: 'Sunblade',
      description: 'Ancient radiant sword.',
    });
    (mockDb.items.getById as ReturnType<typeof vi.fn>).mockResolvedValue(item);
    (mockDb.items.markViewed as ReturnType<typeof vi.fn>).mockResolvedValue(item);
    (mockDb.items.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildItem({ id: 5, world_id: 1, name: 'Updated Blade', description: 'Updated desc.' }),
    );

    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('heading', { name: 'Sunblade' });
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Name *'));
    await user.type(screen.getByLabelText('Name *'), 'Updated Blade');
    await user.clear(screen.getByLabelText('Description'));
    await user.type(screen.getByLabelText('Description'), 'Updated desc.');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(mockDb.items.update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({
        name: 'Updated Blade',
        description: 'Updated desc.',
      }),
    );
  });

  it('applies stored item detail image dimensions from app settings', async () => {
    const item = buildItem({
      id: 5,
      world_id: 1,
      name: 'Sunblade',
      image_src: 'vv-media://item-images/sunblade.png',
    });
    (mockDb.settings.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      config: JSON.stringify({
        cardDisplays: {
          itemDetail: {
            width: 144,
            height: 192,
            lockAspectRatio: false,
          },
        },
      }),
      created_at: '',
      updated_at: '',
    });
    (mockDb.items.getById as ReturnType<typeof vi.fn>).mockResolvedValue(item);
    (mockDb.items.markViewed as ReturnType<typeof vi.fn>).mockResolvedValue(item);

    renderPage();

    expect(await screen.findByRole('img', { name: 'Sunblade' })).toHaveStyle({
      width: '144px',
      height: '192px',
    });
  });

  it('shows invalid-id and not-found states', async () => {
    renderPage(1, Number.NaN);
    expect(await screen.findByText('Invalid item id.')).toBeInTheDocument();

    (mockDb.items.getById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    renderPage(1, 999);
    expect(await screen.findByText('Item not found.')).toBeInTheDocument();
  });

  it('shows load failure state when item fetch rejects', async () => {
    (mockDb.items.getById as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('boom'),
    );

    renderPage();

    expect(await screen.findByText('Unable to load this item right now.'))
      .toBeInTheDocument();
  });
});
