import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ResourceDefinitionForm from '../../../../../src/renderer/components/statistics/ResourceDefinitionForm';

describe('ResourceDefinitionForm', () => {
  it('validates required fields in create mode', async () => {
    const onSubmit = vi.fn();

    render(
      <ResourceDefinitionForm
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
      <ResourceDefinitionForm
        mode='create'
        existingIds={['hp']}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/id/i), 'HP');
    await user.type(screen.getByLabelText(/name/i), 'Hit Points');
    await user.type(screen.getByLabelText(/abbreviation/i), 'HP');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByText('A resource with this ID already exists.'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits normalized payload and omits empty description', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <ResourceDefinitionForm
        mode='create'
        existingIds={[]}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/id/i), '  ENERGY  ');
    await user.type(screen.getByLabelText(/name/i), '  Energy  ');
    await user.type(screen.getByLabelText(/abbreviation/i), '  EN  ');

    await user.click(
      screen.getByLabelText('Include in new statblocks by default'),
    );
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        id: 'energy',
        name: 'Energy',
        abbreviation: 'EN',
        description: undefined,
        isDefault: false,
      });
    });
  });

  it('allows unchanged id in edit mode and disables id input', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <ResourceDefinitionForm
        mode='edit'
        initialValues={{
          id: 'hp',
          name: 'Hit Points',
          abbreviation: 'HP',
          isDefault: true,
        }}
        existingIds={['hp']}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    const idInput = screen.getByLabelText(/id/i);
    expect(idInput).toBeDisabled();

    await user.clear(screen.getByLabelText(/name/i));
    await user.type(screen.getByLabelText(/name/i), 'Hit Points Updated');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        id: 'hp',
        name: 'Hit Points Updated',
        abbreviation: 'HP',
        description: undefined,
        isDefault: true,
      });
    });
  });

  it('shows fallback error when submit rejects with non-Error value', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue('boom');

    render(
      <ResourceDefinitionForm
        mode='create'
        existingIds={[]}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/id/i), 'mana');
    await user.type(screen.getByLabelText(/name/i), 'Mana');
    await user.type(screen.getByLabelText(/abbreviation/i), 'MP');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByText('Failed to save resource.'),
    ).toBeInTheDocument();
  });
});
