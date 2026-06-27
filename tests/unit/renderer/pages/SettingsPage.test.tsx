import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../../../src/renderer/components/ui/ToastProvider';
import SettingsPage from '../../../../src/renderer/pages/SettingsPage';
import { setupWindowDb } from '../../../helpers/ipcMock';

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <SettingsPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    setupWindowDb();
  });

  it('loads settings and renders the Display section with default values', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(window.db.settings.get).toHaveBeenCalled();
    expect(screen.getByLabelText('Theme')).toHaveValue('light');
    expect(screen.getByLabelText('Card size')).toHaveValue('medium');
  });

  it('persists a theme change via window.db.settings.update', async () => {
    renderPage();
    await screen.findByLabelText('Theme');

    await userEvent.selectOptions(screen.getByLabelText('Theme'), 'dark');

    await waitFor(() => {
      expect(window.db.settings.update).toHaveBeenCalledWith('{"theme":"dark"}');
    });
  });

  it('shows an error toast when saving fails', async () => {
    (window.db.settings.update as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('boom'),
    );
    renderPage();
    await screen.findByLabelText('Card size');

    await userEvent.selectOptions(screen.getByLabelText('Card size'), 'large');

    expect(await screen.findByText('Failed to save settings.')).toBeInTheDocument();
  });
});
