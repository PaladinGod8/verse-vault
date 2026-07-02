import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import IpaToolDrawer from '../../../src/renderer/components/ipa/IpaToolDrawer';
import { ToastProvider } from '../../../src/renderer/components/ui/ToastProvider';

// Deterministic stand-in for the real phonemize wrapper.
vi.mock('../../../src/renderer/lib/ipa/englishToIpa', () => ({
  DEFAULT_ACCENT: 'en-GB',
  convertToIpa: vi.fn((text: string) => (text.trim() ? `IPA(${text.trim()})` : '')),
}));

function renderDrawer(isOpen = true, onClose = vi.fn()) {
  return render(
    <ToastProvider>
      <IpaToolDrawer isOpen={isOpen} onClose={onClose} />
    </ToastProvider>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('IpaToolDrawer', () => {
  it('renders nothing when closed', () => {
    renderDrawer(false);
    expect(screen.queryByLabelText('IPA staging')).toBeNull();
  });

  it('converts English into the staging box, appending at the cursor', async () => {
    const user = userEvent.setup();
    renderDrawer();

    const staging = screen.getByLabelText('IPA staging');
    await user.type(staging, 'hi');

    await user.type(screen.getByLabelText('English text'), 'bus');
    await user.click(screen.getByRole('button', { name: /convert/i }));

    // Existing "hi" kept; converted text appended with a separating space.
    expect(staging).toHaveValue('hi IPA(bus)');
  });

  it('inserts a clicked palette symbol into the staging box', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole('button', { name: 'ə as in comma' }));

    expect(screen.getByLabelText('IPA staging')).toHaveValue('ə');
  });

  it('copies the staging contents to the clipboard and toasts', async () => {
    const user = userEvent.setup();
    // userEvent.setup() installs its own navigator.clipboard stub; spy on it.
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    renderDrawer();

    await user.type(screen.getByLabelText('IPA staging'), 'staged');
    await user.click(screen.getByRole('button', { name: /copy/i }));

    expect(writeText).toHaveBeenCalledWith('staged');
    expect(await screen.findByText('Copied to clipboard')).toBeVisible();
  });

  it('clears the staging box', async () => {
    const user = userEvent.setup();
    renderDrawer();

    const staging = screen.getByLabelText('IPA staging');
    await user.type(staging, 'stuff');
    await user.click(screen.getByRole('button', { name: /clear/i }));

    expect(staging).toHaveValue('');
  });

  it('keeps staging contents across a close/reopen (session persistence)', async () => {
    const user = userEvent.setup();
    const { rerender } = renderDrawer(true);

    await user.type(screen.getByLabelText('IPA staging'), 'keep me');

    rerender(
      <ToastProvider>
        <IpaToolDrawer isOpen={false} onClose={vi.fn()} />
      </ToastProvider>,
    );
    expect(screen.queryByLabelText('IPA staging')).toBeNull();

    rerender(
      <ToastProvider>
        <IpaToolDrawer isOpen onClose={vi.fn()} />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('IPA staging')).toHaveValue('keep me');
    });
  });
});
