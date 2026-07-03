import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorldSidebar from '../../../src/renderer/components/worlds/WorldSidebar';

const { toastErrorMock } = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
}));

vi.mock('../../../src/renderer/components/ui/ToastProvider', () => ({
  useToast: () => ({
    showToast: vi.fn(),
    dismissToast: vi.fn(),
    clearToasts: vi.fn(),
    success: vi.fn(),
    error: toastErrorMock,
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

const openEditorMock = vi.fn();

function renderSidebar(worldId: number | null) {
  return render(
    <MemoryRouter>
      <WorldSidebar worldId={worldId} />
    </MemoryRouter>,
  );
}

describe('WorldSidebar World Map trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    openEditorMock.mockResolvedValue({ opened: true, worldMapId: null });
    window.db = {
      worldMaps: {
        getByWorld: vi.fn(),
        openEditor: openEditorMock,
      },
    } as unknown as typeof window.db;
  });

  it('renders an enabled World Map button for a valid world id', () => {
    renderSidebar(5);
    const button = screen.getByRole('button', { name: 'World Map' });
    expect(button).toBeEnabled();
  });

  it('opens the world-map editor for the current world on click', async () => {
    renderSidebar(5);
    await userEvent.click(screen.getByRole('button', { name: 'World Map' }));
    expect(openEditorMock).toHaveBeenCalledWith(5);
  });

  it('disables the World Map button when there is no valid world id', async () => {
    renderSidebar(null);
    const button = screen.getByRole('button', { name: 'World Map' });
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(openEditorMock).not.toHaveBeenCalled();
  });

  it('surfaces an error toast when opening the editor fails', async () => {
    openEditorMock.mockRejectedValueOnce(new Error('boom'));
    renderSidebar(5);

    await userEvent.click(screen.getByRole('button', { name: 'World Map' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Could not open World Map',
        expect.any(String),
      );
    });
  });
});
