import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppSettingsProvider } from '../../../src/renderer/hooks/useAppSettings';
import ItemsPage from '../../../src/renderer/pages/ItemsPage';

vi.mock(
  '../../../src/renderer/components/ui/RichTextEditor',
  () => import('../../helpers/richTextEditorMock'),
);
import { buildItem, buildWorld, resetFactoryIds } from '../../helpers/factories';
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

function renderPage(worldId = 1) {
  return render(
    <MemoryRouter initialEntries={[`/world/${worldId}/items`]}>
      <AppSettingsProvider>
        <Routes>
          <Route path='/world/:id/items' element={<ItemsPage />} />
        </Routes>
      </AppSettingsProvider>
    </MemoryRouter>,
  );
}

describe('ItemsPage', () => {
  let mockDb: DbApi;

  beforeEach(() => {
    resetFactoryIds();
    mockDb = setupWindowDb();
    resetWindowDb();
  });

  it('loads world and lists item cards', async () => {
    const world = buildWorld({ id: 1, name: 'Aetheria' });
    const item = buildItem({ id: 5, world_id: 1, name: 'Sunblade' });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.items.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([item]);

    renderPage(1);

    expect(await screen.findByText('Sunblade')).toBeInTheDocument();
  });

  it('renders item cards in alphabetical order', async () => {
    const world = buildWorld({ id: 1, name: 'Aetheria' });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.items.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildItem({ id: 3, world_id: 1, name: 'Zed Blade' }),
      buildItem({ id: 1, world_id: 1, name: 'A-LIVE Amulet' }),
      buildItem({ id: 2, world_id: 1, name: 'Beta Charm' }),
    ]);

    renderPage(1);

    await screen.findByText('A-LIVE Amulet');
    expect(screen.getAllByRole('button', { name: /^Open / }).map((card) => card.ariaLabel)).toEqual(
      ['Open A-LIVE Amulet', 'Open Beta Charm', 'Open Zed Blade'],
    );
  });

  it('switches to recently-viewed order and persists choice', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1, name: 'Aetheria' });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.items.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildItem({ id: 1, world_id: 1, name: 'Zed Blade', last_viewed_at: '2026-02-01 00:00:00' }),
      buildItem({ id: 2, world_id: 1, name: 'Beta Charm', last_viewed_at: '2026-03-01 00:00:00' }),
    ]);

    renderPage(1);

    await screen.findByText('Zed Blade');
    await user.click(screen.getByRole('button', { name: 'Recently Viewed' }));

    expect(
      screen.getAllByRole('button', { name: /^Open / }).map((card) => card.ariaLabel),
    ).toEqual(['Open Beta Charm', 'Open Zed Blade']);
    expect(mockDb.settings.update).toHaveBeenCalledWith(
      JSON.stringify({ cardSortPreferences: { items: 'recentlyViewed' } }),
    );
  });

  it('filters by name and description text', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1 });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.items.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildItem({ id: 1, world_id: 1, name: 'Sunblade', description: 'Radiant sword' }),
      buildItem({ id: 2, world_id: 1, name: 'Scholar Lens', description: 'Archive monocle' }),
    ]);

    renderPage(1);

    await screen.findByText('Sunblade');
    await user.type(screen.getByPlaceholderText(/search items/i), 'archive');

    expect(screen.getByText('Scholar Lens')).toBeInTheDocument();
    expect(screen.queryByText('Sunblade')).not.toBeInTheDocument();
  });

  it('shows total item count and keeps it unchanged while filtering', async () => {
    const user = userEvent.setup();
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildWorld({ id: 1 }));
    (mockDb.items.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildItem({ id: 1, world_id: 1, name: 'Sunblade' }),
      buildItem({ id: 2, world_id: 1, name: 'Scholar Lens' }),
    ]);

    renderPage(1);

    await screen.findByText('Sunblade');
    expect(screen.getByRole('status', { name: 'Total items' })).toHaveTextContent(
      '2 items',
    );

    await user.type(screen.getByPlaceholderText(/search items/i), 'Sun');
    expect(screen.getByRole('status', { name: 'Total items' })).toHaveTextContent(
      '2 items',
    );
  });

  it('shows empty state when world has no items', async () => {
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildWorld({ id: 1 }));
    (mockDb.items.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    renderPage(1);

    expect(await screen.findByText('No items yet.')).toBeInTheDocument();
  });

  it('paginates and resets to page one when search changes', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1, name: 'Aetheria' });
    const items = Array.from({ length: 55 }, (_, index) =>
      buildItem({
        id: index + 1,
        world_id: 1,
        name: `Item ${String(index + 1).padStart(2, '0')}`,
      }));
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.items.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue(items);

    renderPage(1);

    await screen.findByText('Item 01');
    expect(screen.queryByText('Item 51')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await screen.findByText('Item 51');
    await user.type(screen.getByPlaceholderText(/search items/i), 'Item 01');

    expect(await screen.findByText('Item 01')).toBeInTheDocument();
    expect(screen.queryByText('Page 2 of')).not.toBeInTheDocument();
  });

  it('creates item through New Item form', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1 });
    const created = buildItem({ id: 9, world_id: 1, name: 'Sunblade' });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.items.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])
      .mockResolvedValueOnce([created]);
    (mockDb.items.add as ReturnType<typeof vi.fn>).mockResolvedValue(created);

    renderPage(1);
    await screen.findByText('No items yet.');

    await user.click(screen.getByRole('button', { name: 'New Item' }));
    await user.type(screen.getByLabelText('Name *'), 'Sunblade');
    await user.type(screen.getByLabelText('Description'), 'Radiant sword');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockDb.items.add).toHaveBeenCalledWith(
        expect.objectContaining({
          world_id: 1,
          name: 'Sunblade',
          description: 'Radiant sword',
        }),
      );
    });
    expect(await screen.findByText('Sunblade')).toBeInTheDocument();
  });

  it('keeps existing image when saving edited item without touching image', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1 });
    const item = buildItem({
      id: 7,
      world_id: 1,
      name: 'Sunblade',
      image_src: 'vv-media://item-images/existing.png',
    });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.items.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([item]);
    (mockDb.items.update as ReturnType<typeof vi.fn>).mockResolvedValue(item);

    renderPage(1);
    await screen.findByText('Sunblade');

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockDb.items.update).toHaveBeenCalled();
    });
    const updatePayload = (mockDb.items.update as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(updatePayload).not.toHaveProperty('image_src');
  });

  it('deletes item after confirming', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1 });
    const item = buildItem({ id: 3, world_id: 1, name: 'Doomed Relic' });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.items.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValueOnce([item])
      .mockResolvedValueOnce([]);

    renderPage(1);
    await screen.findByText('Doomed Relic');

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const confirmDialog = await screen.findByRole('dialog', { name: 'Delete "Doomed Relic"?' });
    await user.click(within(confirmDialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockDb.items.delete).toHaveBeenCalledWith(3);
    });
  });
});
