import { useId } from 'react';
import ModalShell from './ModalShell';

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  confirmTone?: 'danger' | 'primary';
};

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isConfirming = false,
  confirmTone = 'danger',
}: ConfirmDialogProps) {
  const titleId = useId();
  const confirmButtonClass =
    confirmTone === 'danger' ? 'btn btn-error' : 'btn btn-primary';

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      labelledBy={titleId}
      boxClassName="max-w-lg"
    >
      <h2 id={titleId} className="text-base-content text-lg font-semibold">
        {title}
      </h2>
      <p className="text-base-content/80 mt-2 text-sm">{message}</p>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onCancel}
          disabled={isConfirming}
          autoFocus
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={confirmButtonClass}
          onClick={onConfirm}
          disabled={isConfirming}
        >
          {isConfirming ? (
            <span className="loading loading-spinner loading-xs" />
          ) : null}
          <span>{confirmLabel}</span>
        </button>
      </div>
    </ModalShell>
  );
}
