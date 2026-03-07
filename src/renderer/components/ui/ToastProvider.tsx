import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export type ShowToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastRecord = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  durationMs: number;
};

type ToastContextValue = {
  showToast: (input: ShowToastInput) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  success: (title: string, description?: string, durationMs?: number) => string;
  error: (title: string, description?: string, durationMs?: number) => string;
  warning: (title: string, description?: string, durationMs?: number) => string;
  info: (title: string, description?: string, durationMs?: number) => string;
};

const DEFAULT_DURATION_MS = 4000;
const MIN_DURATION_MS = 1000;
const MAX_VISIBLE_TOASTS = 4;
const NOOP_TOAST_ID = 'toast-noop';
const noop = (): void => undefined;
const noopToast = (): string => NOOP_TOAST_ID;

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const fallbackToastContext: ToastContextValue = {
  showToast: noopToast,
  dismissToast: noop,
  clearToasts: noop,
  success: noopToast,
  error: noopToast,
  warning: noopToast,
  info: noopToast,
};

const variantClassMap: Record<ToastVariant, string> = {
  success: 'alert-success',
  error: 'alert-error',
  warning: 'alert-warning',
  info: 'alert-info',
};

const normalizeDuration = (durationMs?: number) =>
  Math.max(MIN_DURATION_MS, durationMs ?? DEFAULT_DURATION_MS);

const createVariantHelper =
  (variant: ToastVariant, showToast: ToastContextValue['showToast']) =>
  (title: string, description?: string, durationMs?: number) =>
    showToast({ title, description, variant, durationMs });

type ToastNoticeProps = {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
};

function ToastNotice({ toast, onDismiss }: ToastNoticeProps) {
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      onDismiss(toast.id);
    }, toast.durationMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [onDismiss, toast.durationMs, toast.id]);

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      className={`alert ${variantClassMap[toast.variant]} shadow-lg`}
    >
      <div className='min-w-0'>
        <p className='truncate font-semibold'>{toast.title}</p>
        {toast.description ? <p className='mt-1 text-xs opacity-80'>{toast.description}</p> : null}
      </div>
      <button
        type='button'
        className='btn btn-ghost btn-xs'
        onClick={() => onDismiss(toast.id)}
        aria-label={`Dismiss notification: ${toast.title}`}
      >
        Close
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode; }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const idRef = useRef(0);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback((input: ShowToastInput) => {
    const id = `toast-${idRef.current++}`;
    const nextToast: ToastRecord = {
      id,
      title: input.title,
      description: input.description,
      variant: input.variant ?? 'info',
      durationMs: normalizeDuration(input.durationMs),
    };

    setToasts((current) => [...current, nextToast].slice(-MAX_VISIBLE_TOASTS));
    return id;
  }, []);

  const success = useMemo(
    () => createVariantHelper('success', showToast),
    [showToast],
  );
  const error = useMemo(
    () => createVariantHelper('error', showToast),
    [showToast],
  );
  const warning = useMemo(
    () => createVariantHelper('warning', showToast),
    [showToast],
  );
  const info = useMemo(
    () => createVariantHelper('info', showToast),
    [showToast],
  );

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
      clearToasts,
      success,
      error,
      warning,
      info,
    }),
    [showToast, dismissToast, clearToasts, success, error, warning, info],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className='toast toast-top toast-end z-[70]' aria-live='polite'>
        {toasts.map((toast) => (
          <ToastNotice
            key={toast.id}
            toast={toast}
            onDismiss={dismissToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  return context ?? fallbackToastContext;
}
