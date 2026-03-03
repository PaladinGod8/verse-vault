import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BattleMapForm from '../../../src/renderer/components/battlemaps/BattleMapForm';

describe('BattleMapForm', () => {
  it('shows validation errors for missing name and invalid JSON config', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <BattleMapForm worldId={1} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );

    await user.type(screen.getByLabelText('Name'), '   ');
    await user.click(screen.getByRole('button', { name: 'Create BattleMap' }));
    expect(screen.getByText('BattleMap name is required.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Dungeon Grid');
    await user.clear(screen.getByLabelText('Config JSON (optional)'));
    fireEvent.change(screen.getByLabelText('Config JSON (optional)'), {
      target: { value: '{invalid' },
    });
    await user.click(screen.getByRole('button', { name: 'Create BattleMap' }));
    expect(screen.getByText('Config must be valid JSON.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed values and defaults empty config to {}', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <BattleMapForm worldId={2} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );

    await user.type(screen.getByLabelText('Name'), '  Sky Keep  ');
    await user.clear(screen.getByLabelText('Config JSON (optional)'));
    await user.click(screen.getByRole('button', { name: 'Create BattleMap' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        world_id: 2,
        name: 'Sky Keep',
        config: '{}',
      });
    });
  });

  it('shows Error and non-Error submit fallbacks', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error('db fail'));
    const { rerender } = render(
      <BattleMapForm worldId={1} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );

    await user.type(screen.getByLabelText('Name'), 'Arena');
    await user.click(screen.getByRole('button', { name: 'Create BattleMap' }));
    expect(await screen.findByText('db fail')).toBeInTheDocument();

    const onSubmitEdit = vi.fn().mockRejectedValueOnce({ reason: 'unknown' });
    rerender(
      <BattleMapForm
        mode="edit"
        worldId={1}
        initialValues={{ name: 'Arena', config: '{}' }}
        onSubmit={onSubmitEdit}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      await screen.findByText('Failed to save BattleMap changes.'),
    ).toBeInTheDocument();

    const onSubmitCreate = vi.fn().mockRejectedValueOnce({ reason: 'unknown' });
    rerender(
      <BattleMapForm
        worldId={1}
        onSubmit={onSubmitCreate}
        onCancel={vi.fn()}
      />,
    );
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Arena Two');
    await user.click(screen.getByRole('button', { name: 'Create BattleMap' }));
    expect(
      await screen.findByText('Failed to create BattleMap.'),
    ).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <BattleMapForm worldId={1} onSubmit={vi.fn()} onCancel={onCancel} />,
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
