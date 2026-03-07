import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SessionForm from '../../../src/renderer/components/sessions/SessionForm';

describe('SessionForm', () => {
  it('shows validation error when submitted without a session name', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<SessionForm actId={1} onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText('Name'), '   ');
    await user.click(screen.getByRole('button', { name: 'Create session' }));

    expect(screen.getByText('Session name is required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed values and maps empty optional fields to null', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<SessionForm actId={2} onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText('Name'), '  Session Alpha  ');
    await user.click(screen.getByRole('button', { name: 'Create session' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        act_id: 2,
        name: 'Session Alpha',
        notes: null,
        planned_at: null,
      });
    });
  });

  it('normalizes initial planned_at values for edit mode', () => {
    const { unmount } = render(
      <SessionForm
        mode='edit'
        actId={1}
        initialValues={{
          name: 'Session One',
          notes: null,
          planned_at: '2026-03-20 14:30:45',
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Planned date-time (optional)')).toHaveValue(
      '2026-03-20T14:30',
    );

    unmount();
    render(
      <SessionForm
        mode='edit'
        actId={1}
        initialValues={{
          name: 'Session One',
          notes: null,
          planned_at: 'bad-date',
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Planned date-time (optional)')).toHaveValue(
      '',
    );

    unmount();
    render(
      <SessionForm
        mode='edit'
        actId={1}
        initialValues={{
          name: 'Session One',
          notes: null,
          planned_at: '   ',
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Planned date-time (optional)')).toHaveValue(
      '',
    );
  });

  it('shows Error and non-Error submit fallbacks', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error('db down'));
    const { rerender } = render(
      <SessionForm actId={1} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );

    await user.type(screen.getByLabelText('Name'), 'Session One');
    await user.click(screen.getByRole('button', { name: 'Create session' }));
    expect(await screen.findByText('db down')).toBeInTheDocument();

    const onSubmitEdit = vi.fn().mockRejectedValueOnce({ reason: 'unknown' });
    rerender(
      <SessionForm
        mode='edit'
        actId={1}
        initialValues={{ name: 'Session One', notes: null, planned_at: null }}
        onSubmit={onSubmitEdit}
        onCancel={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      await screen.findByText('Failed to save session changes.'),
    ).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(<SessionForm actId={1} onSubmit={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
