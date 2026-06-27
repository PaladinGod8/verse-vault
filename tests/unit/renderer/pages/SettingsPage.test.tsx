import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../../../src/renderer/components/ui/ToastProvider';
import { AppSettingsProvider } from '../../../../src/renderer/hooks/useAppSettings';
import SettingsPage from '../../../../src/renderer/pages/SettingsPage';
import { setupWindowDb } from '../../../helpers/ipcMock';

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AppSettingsProvider>
          <SettingsPage />
        </AppSettingsProvider>
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
    expect(screen.getByLabelText('Theme')).toHaveValue('dark');
    expect(screen.getByLabelText('Card size')).toHaveValue('medium');
    expect(screen.queryByRole('heading', { name: 'Theme preview' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Blue' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Custom color' })).not.toBeInTheDocument();
  });

  it('persists a theme change via window.db.settings.update', async () => {
    renderPage();
    await screen.findByLabelText('Theme');

    await userEvent.selectOptions(screen.getByLabelText('Theme'), 'light');

    await waitFor(() => {
      expect(window.db.settings.update).toHaveBeenCalledWith('{"theme":"light"}');
    });
  });

  it('reveals custom theme controls only after custom theme is selected', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByLabelText('Theme');
    expect(screen.queryByRole('heading', { name: 'Theme preview' })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Theme'), 'custom');

    expect(await screen.findByRole('heading', { name: 'Theme preview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Blue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom color' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Theme color custom hex color')).not.toBeInTheDocument();
  });

  it('persists a custom theme palette color selection', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByLabelText('Theme');
    await user.selectOptions(screen.getByLabelText('Theme'), 'custom');
    await screen.findByRole('button', { name: 'Red' });
    await user.click(screen.getByRole('button', { name: 'Red' }));

    await waitFor(() => {
      expect(window.db.settings.update).toHaveBeenCalled();
    });

    const latestConfig = JSON.parse(
      (window.db.settings.update as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0] as string,
    );

    expect(latestConfig).toEqual({
      theme: 'custom',
      themeColors: {
        primary: {
          palette: 'red',
        },
      },
    });
  });

  it('persists a custom hex color after custom color is selected', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByLabelText('Theme');
    await user.selectOptions(screen.getByLabelText('Theme'), 'custom');
    await screen.findByRole('button', { name: 'Custom color' });
    await user.click(screen.getByRole('button', { name: 'Custom color' }));

    const themeColorHexInput = await screen.findByLabelText('Theme color custom hex color');
    fireEvent.change(themeColorHexInput, { target: { value: '#ff44aa' } });

    await waitFor(() => {
      expect(window.db.settings.update).toHaveBeenCalled();
    });

    const latestConfig = JSON.parse(
      (window.db.settings.update as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0] as string,
    );

    expect(latestConfig).toEqual({
      theme: 'custom',
      themeColors: {
        primary: {
          palette: 'custom',
          customHex: '#ff44aa',
        },
      },
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
