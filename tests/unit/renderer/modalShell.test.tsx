import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ModalShell from '../../../src/renderer/components/ui/ModalShell';

describe('ModalShell', () => {
  it('renders nothing when closed', () => {
    const onClose = vi.fn();
    const { container } = render(
      <ModalShell isOpen={false} onClose={onClose} ariaLabel='Closed dialog'>
        <p>Hidden</p>
      </ModalShell>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders an open dialog with ariaLabel and restores body overflow on unmount', () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <ModalShell isOpen onClose={onClose} ariaLabel='Create item'>
        <button type='button'>Focusable child</button>
      </ModalShell>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Create item' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('closes on Escape and on backdrop click, but not on panel click', () => {
    const onClose = vi.fn();
    render(
      <ModalShell isOpen onClose={onClose} ariaLabel='Delete item'>
        <p>Body</p>
      </ModalShell>,
    );

    const backdrop = screen.getByRole('dialog').parentElement as HTMLElement;
    const panel = screen.getByRole('dialog');

    fireEvent.mouseDown(panel);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('renders modal panel with DaisyUI light-mode classes', () => {
    const onClose = vi.fn();
    render(
      <ModalShell isOpen onClose={onClose} ariaLabel='Light mode dialog'>
        <p>Content</p>
      </ModalShell>,
    );

    const panel = screen.getByRole('dialog');
    expect(panel).toHaveClass('bg-base-100');
    expect(panel).toHaveClass('text-base-content');
  });

  it('does not close on backdrop when closeOnBackdrop is false', () => {
    const onClose = vi.fn();
    render(
      <ModalShell
        isOpen
        onClose={onClose}
        closeOnBackdrop={false}
        labelledBy='modal-title'
      >
        <h2 id='modal-title'>Read-only modal</h2>
      </ModalShell>,
    );

    const backdrop = screen.getByRole('dialog').parentElement as HTMLElement;
    fireEvent.mouseDown(backdrop);

    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByRole('dialog', { name: 'Read-only modal' }),
    ).toBeVisible();
  });
});
