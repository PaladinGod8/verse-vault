import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from '../../../src/renderer/components/ui/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders default labels, danger tone, and triggers callbacks', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        isOpen
        title='Delete "Arc One"?'
        message="This cannot be undone."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Delete "Arc One"?' });
    expect(dialog).toBeVisible();
    expect(screen.getByText('This cannot be undone.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveClass(
      'btn-error',
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('supports custom labels, primary tone, and confirming state', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        isOpen
        title="Move this scene?"
        message="The scene will be removed from this list."
        onConfirm={onConfirm}
        onCancel={onCancel}
        confirmLabel="Move"
        cancelLabel="Back"
        confirmTone="primary"
        isConfirming
      />,
    );

    const cancelButton = screen.getByRole('button', { name: 'Back' });
    const confirmButton = screen.getByRole('button', { name: 'Move' });
    expect(cancelButton).toBeDisabled();
    expect(confirmButton).toBeDisabled();
    expect(confirmButton).toHaveClass('btn-primary');
    expect(
      screen.getByText('The scene will be removed from this list.'),
    ).toBeVisible();
    expect(document.querySelector('.loading-spinner')).toBeTruthy();
  });
});
