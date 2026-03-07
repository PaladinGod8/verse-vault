import { type MouseEvent, type ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type ModalShellProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  ariaLabel?: string;
  className?: string;
  boxClassName?: string;
  closeOnBackdrop?: boolean;
};

const joinClasses = (...classes: Array<string | undefined>) => classes.filter(Boolean).join(' ');

export default function ModalShell({
  isOpen,
  onClose,
  children,
  labelledBy,
  ariaLabel,
  className,
  boxClassName,
  closeOnBackdrop = true,
}: ModalShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previouslyFocusedElement = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocusedElement instanceof HTMLElement) {
        previouslyFocusedElement.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (!closeOnBackdrop || event.target !== event.currentTarget) {
      return;
    }
    onClose();
  };

  return createPortal(
    <div
      className={joinClasses('modal modal-open p-4', className)}
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role='dialog'
        aria-modal='true'
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : (ariaLabel ?? 'Dialog')}
        className={joinClasses(
          'modal-box bg-base-100 text-base-content w-11/12 max-w-2xl p-6',
          boxClassName,
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
