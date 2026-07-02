import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppSettingsProvider } from '../../../src/renderer/hooks/useAppSettings';
import LoreNoteDetailPage from '../../../src/renderer/pages/LoreNoteDetailPage';
import { buildLoreNote, resetFactoryIds } from '../../helpers/factories';
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

function renderPage(worldId = 1, loreNoteId = 5) {
  return render(
    <MemoryRouter initialEntries={[`/world/${worldId}/lore-notes/${loreNoteId}`]}>
      <AppSettingsProvider>
        <Routes>
          <Route
            path='/world/:id/lore-notes/:loreNoteId'
            element={<LoreNoteDetailPage />}
          />
        </Routes>
      </AppSettingsProvider>
    </MemoryRouter>,
  );
}

describe('LoreNoteDetailPage', () => {
  let mockDb: DbApi;

  beforeEach(() => {
    resetFactoryIds();
    mockDb = setupWindowDb();
    resetWindowDb();
  });

  it('renders lore note name, content, and tags', async () => {
    const loreNote = buildLoreNote({
      id: 5,
      world_id: 1,
      name: 'Founding Myth',
      content: 'Long ago...',
      tags: ['Economics', 'History'],
    });
    (mockDb.loreNotes.getById as ReturnType<typeof vi.fn>).mockResolvedValue(loreNote);
    (mockDb.loreNotes.markViewed as ReturnType<typeof vi.fn>).mockResolvedValue(loreNote);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Founding Myth' })).toBeInTheDocument();
    expect(screen.getByText('Long ago...')).toBeInTheDocument();
    expect(screen.getByText('Economics')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(mockDb.loreNotes.markViewed).toHaveBeenCalledWith(5);
  });

  it('opens edit form prefilled and saves via window.db.loreNotes.update', async () => {
    const loreNote = buildLoreNote({
      id: 5,
      world_id: 1,
      name: 'Founding Myth',
      content: 'Long ago...',
      tags: ['Economics'],
    });
    (mockDb.loreNotes.getById as ReturnType<typeof vi.fn>).mockResolvedValue(loreNote);
    (mockDb.loreNotes.markViewed as ReturnType<typeof vi.fn>).mockResolvedValue(loreNote);
    (mockDb.loreNotes.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildLoreNote({ id: 5, world_id: 1, name: 'Updated Myth', content: 'Updated content.' }),
    );

    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('heading', { name: 'Founding Myth' });
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Name *'));
    await user.type(screen.getByLabelText('Name *'), 'Updated Myth');
    await user.clear(screen.getByLabelText('Content'));
    await user.type(screen.getByLabelText('Content'), 'Updated content.');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(mockDb.loreNotes.update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({
        name: 'Updated Myth',
        content: 'Updated content.',
      }),
    );
  });

  it('shows invalid-id and not-found states', async () => {
    renderPage(1, Number.NaN);
    expect(await screen.findByText('Invalid lore note id.')).toBeInTheDocument();

    (mockDb.loreNotes.getById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    renderPage(1, 999);
    expect(await screen.findByText('Lore note not found.')).toBeInTheDocument();
  });

  it('shows load failure state when lore note fetch rejects', async () => {
    (mockDb.loreNotes.getById as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('boom'),
    );

    renderPage();

    expect(await screen.findByText('Unable to load this lore note right now.'))
      .toBeInTheDocument();
  });
});
