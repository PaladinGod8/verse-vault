import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorldForm from '../../../src/renderer/components/worlds/WorldForm';

describe('WorldForm', () => {
  it('shows validation error when submitted without a world name', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<WorldForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText('Name'), '   ');
    await user.click(screen.getByRole('button', { name: 'Create world' }));

    expect(screen.getByText('World name is required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows thrown Error message when create submit fails', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('Save failed'));

    render(<WorldForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText('Name'), '  Alpha  ');
    await user.click(screen.getByRole('button', { name: 'Create world' }));

    expect(await screen.findByText('Save failed')).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Create world' }),
      ).toBeEnabled();
    });
  });

  it('shows generic create failure for non-Error exceptions', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue('unknown failure');

    render(<WorldForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText('Name'), 'Alpha');
    await user.click(screen.getByRole('button', { name: 'Create world' }));

    expect(
      await screen.findByText('Failed to create world.'),
    ).toBeInTheDocument();
  });

  it('shows generic edit failure for non-Error exceptions', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue({ reason: 'unknown' });

    render(
      <WorldForm
        mode="edit"
        initialValues={{
          name: 'Alpha',
          thumbnail: null,
          short_description: null,
        }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByText('Failed to save world changes.'),
    ).toBeInTheDocument();
  });
});
