import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppSettingsProvider } from '../../../src/renderer/hooks/useAppSettings';
import CampaignNoteDetailPage from '../../../src/renderer/pages/CampaignNoteDetailPage';
import {
  buildCampaign,
  buildCampaignNote,
  buildWorld,
  resetFactoryIds,
} from '../../helpers/factories';
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
          previewImage: 'data:image/png;base64,campaign-preview',
        }),
      }));

      return (
        <div>
          <div>Mock Campaign Canvas</div>
          <button type='button' onClick={() => props.onSceneChange?.(mockScene)}>
            Change Scene
          </button>
        </div>
      );
    }),
  };
});

function renderPage(
  worldId: number | string = 1,
  campaignId: number | string = 2,
  campaignNoteId: number | string = 7,
) {
  return render(
    <MemoryRouter
      initialEntries={[`/world/${worldId}/campaign/${campaignId}/notes/${campaignNoteId}`]}
    >
      <AppSettingsProvider>
        <Routes>
          <Route
            path='/world/:id/campaign/:campaignId/notes/:campaignNoteId'
            element={<CampaignNoteDetailPage />}
          />
          <Route
            path='/world/:id/campaign/:campaignId/notes'
            element={<div>Campaign Notes List</div>}
          />
        </Routes>
      </AppSettingsProvider>
    </MemoryRouter>,
  );
}

describe('CampaignNoteDetailPage', () => {
  let mockDb: DbApi;

  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryIds();
    mockDb = setupWindowDb();
    resetWindowDb();
  });

  it('loads note metadata and saves canvas snapshot', async () => {
    const note = buildCampaignNote({
      id: 7,
      world_id: 1,
      campaign_id: 2,
      name: 'Boss Arena',
      tags: ['Encounter'],
    });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildWorld({ id: 1 }));
    (mockDb.campaigns.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildCampaign({ id: 2, world_id: 1, name: 'Trial by Fire' }),
    );
    (mockDb.campaignNotes.getById as ReturnType<typeof vi.fn>).mockResolvedValue(note);
    (mockDb.campaignNotes.getAllTagsByCampaign as ReturnType<typeof vi.fn>).mockResolvedValue([
      'Encounter',
    ]);
    (mockDb.campaignNotes.update as ReturnType<typeof vi.fn>).mockResolvedValue(note);

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByDisplayValue('Boss Arena')).toBeInTheDocument();
    expect(await screen.findByText('Mock Campaign Canvas')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Change Scene' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockDb.campaignNotes.update).toHaveBeenCalledWith(
        7,
        expect.objectContaining({
          name: 'Boss Arena',
          tags: ['Encounter'],
          canvas_scene: mockScene,
          canvas_preview_image: 'data:image/png;base64,campaign-preview',
        }),
      );
    });
  });

  it('returns to list when Back clicked', async () => {
    const note = buildCampaignNote({
      id: 7,
      world_id: 1,
      campaign_id: 2,
      name: 'Boss Arena',
    });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildWorld({ id: 1 }));
    (mockDb.campaigns.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildCampaign({ id: 2, world_id: 1, name: 'Trial by Fire' }),
    );
    (mockDb.campaignNotes.getById as ReturnType<typeof vi.fn>).mockResolvedValue(note);
    (mockDb.campaignNotes.getAllTagsByCampaign as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const user = userEvent.setup();
    renderPage();

    await screen.findByDisplayValue('Boss Arena');
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(await screen.findByText('Campaign Notes List')).toBeInTheDocument();
  });

  it('shows validation toast when save attempted without name', async () => {
    const note = buildCampaignNote({
      id: 7,
      world_id: 1,
      campaign_id: 2,
      name: 'Boss Arena',
      tags: ['Encounter'],
    });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildWorld({ id: 1 }));
    (mockDb.campaigns.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildCampaign({ id: 2, world_id: 1, name: 'Trial by Fire' }),
    );
    (mockDb.campaignNotes.getById as ReturnType<typeof vi.fn>).mockResolvedValue(note);
    (mockDb.campaignNotes.getAllTagsByCampaign as ReturnType<typeof vi.fn>).mockResolvedValue([
      'Encounter',
    ]);

    const user = userEvent.setup();
    renderPage();

    const nameInput = await screen.findByDisplayValue('Boss Arena');
    await user.clear(nameInput);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(toastErrorMock).toHaveBeenCalledWith(
      'Campaign note name required.',
      'Enter a name before saving.',
    );
    expect(mockDb.campaignNotes.update).not.toHaveBeenCalled();
  });

  it('shows not-found state when note does not exist', async () => {
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildWorld({ id: 1 }));
    (mockDb.campaigns.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildCampaign({ id: 2, world_id: 1, name: 'Trial by Fire' }),
    );
    (mockDb.campaignNotes.getById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockDb.campaignNotes.getAllTagsByCampaign as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Campaign note not found.')).toBeInTheDocument();
  });

  it('shows route error for invalid params', async () => {
    renderPage('bad-world', 'bad-campaign', 'bad-note');

    expect(await screen.findByText('Invalid campaign note route.')).toBeInTheDocument();
  });

  it('shows save error toast when update fails', async () => {
    const note = buildCampaignNote({
      id: 7,
      world_id: 1,
      campaign_id: 2,
      name: 'Boss Arena',
      tags: ['Encounter'],
    });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildWorld({ id: 1 }));
    (mockDb.campaigns.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildCampaign({ id: 2, world_id: 1, name: 'Trial by Fire' }),
    );
    (mockDb.campaignNotes.getById as ReturnType<typeof vi.fn>).mockResolvedValue(note);
    (mockDb.campaignNotes.getAllTagsByCampaign as ReturnType<typeof vi.fn>).mockResolvedValue([
      'Encounter',
    ]);
    (mockDb.campaignNotes.update as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('save failed'),
    );

    const user = userEvent.setup();
    renderPage();

    await screen.findByDisplayValue('Boss Arena');
    await user.click(await screen.findByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Failed to save campaign note.',
        'save failed',
      );
    });
  });
});
