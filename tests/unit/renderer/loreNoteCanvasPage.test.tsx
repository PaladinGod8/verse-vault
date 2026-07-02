import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppSettingsProvider } from '../../../src/renderer/hooks/useAppSettings';
import LoreNoteCanvasPage from '../../../src/renderer/pages/LoreNoteCanvasPage';
import { buildLoreNote, resetFactoryIds } from '../../helpers/factories';
import { resetWindowDb, setupWindowDb } from '../../helpers/ipcMock';

const { toastSuccessMock, toastErrorMock, mockScene } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  mockScene: {
    elements: [{ id: 'shape-1' }],
    appState: { viewBackgroundColor: '#ffffff' },
    files: {},
  } as CanvasSceneData,
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

vi.mock('../../../src/renderer/components/excalidraw/ExcalidrawCanvasEditor', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    default: React.forwardRef(function MockExcalidrawCanvasEditor(
      props: {
        initialScene: CanvasSceneData | null;
        onSceneChange?: (scene: CanvasSceneData | null) => void;
      },
      ref: React.ForwardedRef<
        {
          captureSnapshot: () => Promise<
            { scene: CanvasSceneData | null; previewImage: string | null; }
          >;
        }
      >,
    ) {
      React.useImperativeHandle(ref, () => ({
        captureSnapshot: async () => ({
          scene: mockScene,
          previewImage: 'data:image/png;base64,lore-preview',
        }),
      }));

      return (
        <div>
          <div>Mock Lore Canvas</div>
          <button type='button' onClick={() => props.onSceneChange?.(mockScene)}>
            Change Scene
          </button>
        </div>
      );
    }),
  };
});

function renderPage(worldId: number | string = 1, loreNoteId: number | string = 5) {
  return render(
    <MemoryRouter initialEntries={[`/world/${worldId}/lore-notes/${loreNoteId}/canvas`]}>
      <AppSettingsProvider>
        <Routes>
          <Route path='/world/:id/lore-notes/:loreNoteId/canvas' element={<LoreNoteCanvasPage />} />
          <Route path='/world/:id/lore-notes/:loreNoteId' element={<div>Lore Note Detail</div>} />
        </Routes>
      </AppSettingsProvider>
    </MemoryRouter>,
  );
}

describe('LoreNoteCanvasPage', () => {
  let mockDb: DbApi;

  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryIds();
    mockDb = setupWindowDb();
    resetWindowDb();
  });

  it('saves lore note canvas preview and scene', async () => {
    const loreNote = buildLoreNote({
      id: 5,
      world_id: 1,
      name: 'Founding Myth',
      canvas_enabled: true,
      tags: ['History'],
    });
    (mockDb.loreNotes.getById as ReturnType<typeof vi.fn>).mockResolvedValue(loreNote);
    (mockDb.loreNotes.update as ReturnType<typeof vi.fn>).mockResolvedValue(loreNote);

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Mock Lore Canvas')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Change Scene' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockDb.loreNotes.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          canvas_enabled: true,
          canvas_scene: mockScene,
          canvas_preview_image: 'data:image/png;base64,lore-preview',
        }),
      );
    });
  });

  it('keeps the world navigation sidebar so the canvas is not a trapping fullscreen overlay', async () => {
    const loreNote = buildLoreNote({
      id: 5,
      world_id: 1,
      name: 'Founding Myth',
      canvas_enabled: true,
    });
    (mockDb.loreNotes.getById as ReturnType<typeof vi.fn>).mockResolvedValue(loreNote);

    renderPage();

    expect(await screen.findByText('Mock Lore Canvas')).toBeInTheDocument();

    const loreNotesNav = screen.getByRole('link', { name: /Lore Notes/i });
    expect(loreNotesNav).toHaveAttribute('href', '/world/1/lore-notes');

    const backLink = screen.getByRole('link', { name: /Back to lore note/i });
    expect(backLink).toHaveAttribute('href', '/world/1/lore-notes/5');
  });

  it('shows not-found state when lore note does not exist', async () => {
    (mockDb.loreNotes.getById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    renderPage();

    expect(await screen.findByText('Lore note not found.')).toBeInTheDocument();
  });

  it('returns to lore note detail when Escape is pressed', async () => {
    const loreNote = buildLoreNote({
      id: 5,
      world_id: 1,
      name: 'Founding Myth',
      canvas_enabled: true,
    });
    (mockDb.loreNotes.getById as ReturnType<typeof vi.fn>).mockResolvedValue(loreNote);

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Mock Lore Canvas')).toBeInTheDocument();
    await user.keyboard('{Escape}');

    expect(await screen.findByText('Lore Note Detail')).toBeInTheDocument();
  });

  it('shows unsaved status after scene change and resets after save', async () => {
    const loreNote = buildLoreNote({
      id: 5,
      world_id: 1,
      name: 'Founding Myth',
      canvas_enabled: true,
    });
    (mockDb.loreNotes.getById as ReturnType<typeof vi.fn>).mockResolvedValue(loreNote);
    (mockDb.loreNotes.update as ReturnType<typeof vi.fn>).mockResolvedValue(loreNote);

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Saved')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Change Scene' }));
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });
  });

  it('shows save error toast when canvas update fails', async () => {
    const loreNote = buildLoreNote({
      id: 5,
      world_id: 1,
      name: 'Founding Myth',
      canvas_enabled: true,
    });
    (mockDb.loreNotes.getById as ReturnType<typeof vi.fn>).mockResolvedValue(loreNote);
    (mockDb.loreNotes.update as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('save failed'),
    );

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Mock Lore Canvas')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Failed to save lore note canvas.',
        'save failed',
      );
    });
  });

  it('shows route error for invalid lore note id', async () => {
    renderPage(1, 'bad-note');

    expect(await screen.findByText('Invalid lore note id.')).toBeInTheDocument();
  });

  it('shows load error state when lore note request fails', async () => {
    (mockDb.loreNotes.getById as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('db down'));

    renderPage();

    expect(await screen.findByText('Unable to load this lore note right now.')).toBeInTheDocument();
  });
});
