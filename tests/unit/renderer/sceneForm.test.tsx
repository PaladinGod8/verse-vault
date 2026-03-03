import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SceneForm from '../../../src/renderer/components/scenes/SceneForm';

describe('SceneForm', () => {
  it('shows validation errors for missing name and invalid payload JSON', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<SceneForm sessionId={1} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), '   ');
    await user.click(screen.getByRole('button', { name: 'Create scene' }));
    expect(screen.getByText('Scene name is required.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Opening');
    fireEvent.change(screen.getByLabelText('Payload JSON (optional)'), {
      target: { value: '{oops' },
    });
    await user.click(screen.getByRole('button', { name: 'Create scene' }));
    expect(screen.getByText('Payload must be valid JSON.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed values and defaults empty payload to {}', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<SceneForm sessionId={4} onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText('Name'), '  The Reveal  ');
    await user.type(screen.getByLabelText('Notes (optional)'), '  dramatic  ');
    await user.click(screen.getByRole('button', { name: 'Create scene' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        session_id: 4,
        name: 'The Reveal',
        notes: 'dramatic',
        payload: '{}',
      });
    });
  });

  it('shows Error and non-Error submit fallbacks', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error('save failed'));
    const { rerender } = render(
      <SceneForm sessionId={1} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );

    await user.type(screen.getByLabelText('Name'), 'Act opener');
    await user.click(screen.getByRole('button', { name: 'Create scene' }));
    expect(await screen.findByText('save failed')).toBeInTheDocument();

    const onSubmitEdit = vi.fn().mockRejectedValueOnce({ reason: 'unknown' });
    rerender(
      <SceneForm
        mode="edit"
        sessionId={1}
        initialValues={{ name: 'Act opener', notes: null, payload: '{}' }}
        onSubmit={onSubmitEdit}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      await screen.findByText('Failed to save scene changes.'),
    ).toBeInTheDocument();

    const onSubmitCreate = vi.fn().mockRejectedValueOnce({ reason: 'unknown' });
    rerender(
      <SceneForm sessionId={1} onSubmit={onSubmitCreate} onCancel={vi.fn()} />,
    );
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Act closer');
    await user.click(screen.getByRole('button', { name: 'Create scene' }));
    expect(
      await screen.findByText('Failed to create scene.'),
    ).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(<SceneForm sessionId={1} onSubmit={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
