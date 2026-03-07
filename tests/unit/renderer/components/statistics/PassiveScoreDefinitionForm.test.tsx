import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PassiveScoreDefinitionForm from '../../../../../src/renderer/components/statistics/PassiveScoreDefinitionForm';

describe('PassiveScoreDefinitionForm', () => {
  it('validates required fields in create mode', async () => {
    const onSubmit = vi.fn();

    render(
      <PassiveScoreDefinitionForm
        mode='create'
        existingIds={[]}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.submit(
      screen
        .getByRole('button', { name: 'Create' })
        .closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText('ID is required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks duplicate ids in create mode', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <PassiveScoreDefinitionForm
        mode='create'
        existingIds={['pb']}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/id/i), 'PB');
    await user.type(screen.getByLabelText(/name/i), 'Proficiency Bonus');
    await user.type(screen.getByLabelText(/abbreviation/i), 'PB');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByText('A passive score with this ID already exists.'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits normalized payload including selected type', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <PassiveScoreDefinitionForm
        mode='create'
        existingIds={[]}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/id/i), '  ins  ');
    await user.type(screen.getByLabelText(/name/i), '  Insight  ');
    await user.type(screen.getByLabelText(/abbreviation/i), '  INS  ');
    await user.selectOptions(screen.getByLabelText(/type/i), 'ability_score');
    await user.type(
      screen.getByLabelText(/description/i),
      '  perception check  ',
    );
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        id: 'ins',
        name: 'Insight',
        abbreviation: 'INS',
        description: 'perception check',
        type: 'ability_score',
        isDefault: true,
      });
    });
  });

  it('allows unchanged id in edit mode and keeps id disabled', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <PassiveScoreDefinitionForm
        mode='edit'
        initialValues={{
          id: 'pb',
          name: 'Proficiency Bonus',
          abbreviation: 'PB',
          type: 'proficiency_bonus',
          isDefault: true,
        }}
        existingIds={['pb']}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/id/i)).toBeDisabled();

    await user.clear(screen.getByLabelText(/name/i));
    await user.type(
      screen.getByLabelText(/name/i),
      'Proficiency Bonus Updated',
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        id: 'pb',
        name: 'Proficiency Bonus Updated',
        abbreviation: 'PB',
        description: undefined,
        type: 'proficiency_bonus',
        isDefault: true,
      });
    });
  });

  it('shows thrown Error message when submit rejects', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('save failed'));

    render(
      <PassiveScoreDefinitionForm
        mode='create'
        existingIds={[]}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/id/i), 'wis');
    await user.type(screen.getByLabelText(/name/i), 'Wisdom');
    await user.type(screen.getByLabelText(/abbreviation/i), 'WIS');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('save failed')).toBeInTheDocument();
  });
});
