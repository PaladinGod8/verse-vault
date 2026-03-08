import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from '../../../src/renderer/components/ui/ToastProvider';

function ToastHarness({
  action,
  children,
}: {
  action: (api: ReturnType<typeof useToast>) => void;
  children?: ReactNode;
}) {
  const toast = useToast();
  return (
    <div>
      <button type='button' onClick={() => action(toast)}>
        Trigger
      </button>
      {children}
    </div>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it('returns fallback toast api when provider is missing', () => {
    let toastId = '';

    render(
      <ToastHarness
        action={(toastApi) => {
          toastId = toastApi.success('Saved');
          toastApi.error('Failed');
          toastApi.clearToasts();
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trigger' }));

    expect(toastId).toBe('toast-noop');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows and dismisses success toast manually', () => {
    render(
      <ToastProvider>
        <ToastHarness
          action={(toastApi) => {
            toastApi.success('Level created.', '"Sky Fortress" was added.');
          }}
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trigger' }));

    const toast = screen.getByRole('status');
    expect(toast).toHaveTextContent('Level created.');
    expect(toast).toHaveTextContent('"Sky Fortress" was added.');

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Dismiss notification: Level created.',
      }),
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders error toasts as alerts and auto-dismisses after normalized duration', async () => {
    render(
      <ToastProvider>
        <ToastHarness
          action={(toastApi) => {
            toastApi.error('Delete failed.', 'Please try again.', 10);
          }}
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trigger' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Delete failed.');

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps only the latest four toasts and supports clearToasts', () => {
    render(
      <ToastProvider>
        <ToastHarness
          action={(toastApi) => {
            toastApi.info('One');
            toastApi.warning('Two');
            toastApi.success('Three');
            toastApi.error('Four');
            toastApi.info('Five');
          }}
        >
          <ToastHarness
            action={(toastApi) => {
              toastApi.clearToasts();
            }}
          />
        </ToastHarness>
      </ToastProvider>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Trigger' })[0]);

    expect(screen.queryByText('One')).not.toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
    expect(screen.getByText('Three')).toBeInTheDocument();
    expect(screen.getByText('Four')).toBeInTheDocument();
    expect(screen.getByText('Five')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Trigger' })[1]);
    expect(screen.queryByText('Two')).not.toBeInTheDocument();
    expect(screen.queryByText('Five')).not.toBeInTheDocument();
  });

  it('uses info variant by default when showToast variant is omitted', () => {
    render(
      <ToastProvider>
        <ToastHarness
          action={(toastApi) => {
            toastApi.showToast({ title: 'Default info toast' });
          }}
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trigger' }));
    expect(screen.getByRole('status')).toHaveTextContent('Default info toast');
  });
});
