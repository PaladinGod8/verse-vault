import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import LevelForm from '../../../src/renderer/components/levels/LevelForm';

describe('LevelForm', () => {
  it('shows validation error when submitted without a level name', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<LevelForm worldId={1} onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText('Name'), '   ');
    await user.type(screen.getByLabelText('Category'), 'Quest');
    await user.click(screen.getByRole('button', { name: 'Create level' }));

    expect(screen.getByText('Level name is required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error when submitted without a category', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<LevelForm worldId={1} onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText('Name'), 'Level One');
    await user.type(screen.getByLabelText('Category'), '   ');
    await user.click(screen.getByRole('button', { name: 'Create level' }));

    expect(screen.getByText('Category is required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows thrown Error message when create submit fails', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('Save failed'));

    render(<LevelForm worldId={1} onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText('Name'), 'Level One');
    await user.type(screen.getByLabelText('Category'), 'Quest');
    await user.click(screen.getByRole('button', { name: 'Create level' }));

    expect(await screen.findByText('Save failed')).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Create level' }),
      ).toBeEnabled();
    });
  });

  it('shows generic create failure for non-Error exceptions', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue('unknown failure');

    render(<LevelForm worldId={1} onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText('Name'), 'Level One');
    await user.type(screen.getByLabelText('Category'), 'Quest');
    await user.click(screen.getByRole('button', { name: 'Create level' }));

    expect(
      await screen.findByText('Failed to create level.'),
    ).toBeInTheDocument();
  });

  it('shows generic edit failure for non-Error exceptions', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue({ reason: 'unknown' });

    render(
      <LevelForm
        mode='edit'
        worldId={1}
        initialValues={{
          name: 'Level One',
          category: 'Quest',
          description: null,
        }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByText('Failed to save level changes.'),
    ).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(<LevelForm worldId={1} onSubmit={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('submits trimmed values and passes description as null when empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<LevelForm worldId={2} onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText('Name'), '  Level Two  ');
    await user.type(screen.getByLabelText('Category'), '  Race  ');
    await user.click(screen.getByRole('button', { name: 'Create level' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        world_id: 2,
        name: 'Level Two',
        category: 'Race',
        description: null,
      });
    });
  });

  it('populates initial values in edit mode', () => {
    render(
      <LevelForm
        mode='edit'
        worldId={1}
        initialValues={{
          name: 'Existing Level',
          category: 'Class',
          description: 'Some notes',
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Name')).toHaveValue('Existing Level');
    expect(screen.getByLabelText('Category')).toHaveValue('Class');
    expect(screen.getByLabelText('Description (optional)')).toHaveValue(
      'Some notes',
    );
    expect(
      screen.getByRole('button', { name: 'Save changes' }),
    ).toBeInTheDocument();
  });
});
