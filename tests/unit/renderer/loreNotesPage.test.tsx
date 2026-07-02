import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppSettingsProvider } from '../../../src/renderer/hooks/useAppSettings';
import LoreNotesPage from '../../../src/renderer/pages/LoreNotesPage';
import { buildLoreNote, buildWorld, resetFactoryIds } from '../../helpers/factories';
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
    <MemoryRouter initialEntries={[`/world/${worldId}/lore-notes`]}>
      <AppSettingsProvider>
        <Routes>
          <Route path='/world/:id/lore-notes' element={<LoreNotesPage />} />
        </Routes>
      </AppSettingsProvider>
    </MemoryRouter>,
  );
}

describe('LoreNotesPage', () => {
  let mockDb: DbApi;

  beforeEach(() => {
    resetFactoryIds();
    mockDb = setupWindowDb();
    resetWindowDb();
  });

  it('loads world and lists lore note cards', async () => {
    const world = buildWorld({ id: 1, name: 'Aetheria' });
    const loreNote = buildLoreNote({ id: 5, world_id: 1, name: 'Founding Myth' });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.loreNotes.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([loreNote]);

    renderPage(1);

    expect(await screen.findByText('Founding Myth')).toBeInTheDocument();
  });

  it('shows total lore note count', async () => {
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildWorld({ id: 1 }));
    (mockDb.loreNotes.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildLoreNote({ id: 1, world_id: 1, name: 'Myth One' }),
      buildLoreNote({ id: 2, world_id: 1, name: 'Myth Two' }),
    ]);

    renderPage(1);

    await screen.findByText('Myth One');
    expect(screen.getByRole('status', { name: 'Total lore notes' })).toHaveTextContent(
      '2 lore notes',
    );
  });

  it('filters by name and content text', async () => {
    const user = userEvent.setup();
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildWorld({ id: 1 }));
    (mockDb.loreNotes.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildLoreNote({ id: 1, world_id: 1, name: 'Founding Myth', content: 'Trade agreement' }),
      buildLoreNote({ id: 2, world_id: 1, name: 'Scholar Note', content: 'Archive records' }),
    ]);

    renderPage(1);

    await screen.findByText('Founding Myth');
    await user.type(screen.getByPlaceholderText(/search lore notes/i), 'archive');

    expect(screen.getByText('Scholar Note')).toBeInTheDocument();
    expect(screen.queryByText('Founding Myth')).not.toBeInTheDocument();
  });

  it('filters by #tag token', async () => {
    const user = userEvent.setup();
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildWorld({ id: 1 }));
    (mockDb.loreNotes.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildLoreNote({ id: 1, world_id: 1, name: 'Founding Myth', tags: ['Economics'] }),
      buildLoreNote({ id: 2, world_id: 1, name: 'Scholar Note', tags: ['Magic'] }),
    ]);

    renderPage(1);

    await screen.findByText('Founding Myth');
    await user.type(screen.getByPlaceholderText(/search lore notes/i), '#Economics');

    expect(screen.getByText('Founding Myth')).toBeInTheDocument();
    expect(screen.queryByText('Scholar Note')).not.toBeInTheDocument();
  });

  it('shows empty state when world has no lore notes', async () => {
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildWorld({ id: 1 }));
    (mockDb.loreNotes.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    renderPage(1);

    expect(await screen.findByText('No lore notes yet.')).toBeInTheDocument();
  });

  it('creates lore note through New Lore Note form with a tag', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1 });
    const created = buildLoreNote({
      id: 9,
      world_id: 1,
      name: 'Founding Myth',
      tags: ['Economics'],
    });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.loreNotes.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])
      .mockResolvedValueOnce([created]);
    (mockDb.loreNotes.add as ReturnType<typeof vi.fn>).mockResolvedValue(created);

    renderPage(1);
    await screen.findByText('No lore notes yet.');

    await user.click(screen.getByRole('button', { name: 'New Lore Note' }));
    await user.type(screen.getByLabelText('Name *'), 'Founding Myth');
    await user.type(screen.getByLabelText('Content'), 'Long ago...');
    await user.type(screen.getByLabelText('Tags'), 'Economics{Enter}');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockDb.loreNotes.add).toHaveBeenCalledWith(
        expect.objectContaining({
          world_id: 1,
          name: 'Founding Myth',
          content: 'Long ago...',
          tags: ['Economics'],
        }),
      );
    });
    expect(await screen.findByText('Founding Myth')).toBeInTheDocument();
  });

  it('keeps existing image when saving edited lore note without touching image', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1 });
    const loreNote = buildLoreNote({
      id: 7,
      world_id: 1,
      name: 'Founding Myth',
      image_src: 'vv-media://lore-note-images/existing.png',
    });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.loreNotes.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([loreNote]);
    (mockDb.loreNotes.update as ReturnType<typeof vi.fn>).mockResolvedValue(loreNote);

    renderPage(1);
    await screen.findByText('Founding Myth');

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockDb.loreNotes.update).toHaveBeenCalled();
    });
    const updatePayload = (mockDb.loreNotes.update as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(updatePayload).not.toHaveProperty('image_src');
  });

  it('switches to recently-viewed order and persists choice', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1, name: 'Aetheria' });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.loreNotes.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildLoreNote({
        id: 1,
        world_id: 1,
        name: 'Zed Legend',
        last_viewed_at: '2026-02-01 00:00:00',
      }),
      buildLoreNote({
        id: 2,
        world_id: 1,
        name: 'Beta Legend',
        last_viewed_at: '2026-03-01 00:00:00',
      }),
    ]);

    renderPage(1);

    await screen.findByText('Zed Legend');
    await user.click(screen.getByRole('button', { name: 'Recently Viewed' }));

    expect(
      screen.getAllByRole('button', { name: /^Open / }).map((card) => card.ariaLabel),
    ).toEqual(['Open Beta Legend', 'Open Zed Legend']);
    expect(mockDb.settings.update).toHaveBeenCalledWith(
      JSON.stringify({ cardSortPreferences: { loreNotes: 'recentlyViewed' } }),
    );
  });

  it('paginates and resets to page one when search changes', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1, name: 'Aetheria' });
    const loreNotesList = Array.from({ length: 55 }, (_, index) =>
      buildLoreNote({
        id: index + 1,
        world_id: 1,
        name: `Myth ${String(index + 1).padStart(2, '0')}`,
      }));
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.loreNotes.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue(
      loreNotesList,
    );

    renderPage(1);

    await screen.findByText('Myth 01');
    expect(screen.queryByText('Myth 51')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await screen.findByText('Myth 51');
    await user.type(screen.getByPlaceholderText(/search lore notes/i), 'Myth 01');

    expect(await screen.findByText('Myth 01')).toBeInTheDocument();
    expect(screen.queryByText('Page 2 of')).not.toBeInTheDocument();
  });

  it('deletes lore note after confirming', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1 });
    const loreNote = buildLoreNote({ id: 3, world_id: 1, name: 'Doomed Legend' });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.loreNotes.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValueOnce([loreNote])
      .mockResolvedValueOnce([]);

    renderPage(1);
    await screen.findByText('Doomed Legend');

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const confirmDialog = await screen.findByRole('dialog', { name: 'Delete "Doomed Legend"?' });
    await user.click(within(confirmDialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockDb.loreNotes.delete).toHaveBeenCalledWith(3);
    });
  });
});
