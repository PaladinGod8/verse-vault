import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StatBlockForm from '../../../../src/renderer/components/statblocks/StatBlockForm';
import StatBlockCard from '../../../../src/renderer/components/statblocks/StatBlockCard';

describe('StatBlockForm', () => {
  const mockOnSubmit = async (_data: unknown) => {
    /* noop */
  };
  const mockOnCancel = () => {
    /* noop */
  };

  it('renders create form with empty fields', () => {
    render(
      <StatBlockForm
        mode="create"
        worldId={1}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByLabelText(/Name/i)).toHaveValue('');
    expect(screen.getByLabelText(/Description/i)).toHaveValue('');
    expect(screen.getByPlaceholderText('{}')).toHaveValue('{}');
  });

  it('renders edit form with prefilled data', () => {
    const statBlock: StatBlock = {
      id: 1,
      world_id: 1,
      campaign_id: null,
      character_id: null,
      name: 'Barbarian',
      default_token_id: null,
      description: 'A strong character',
      config: '{}',
      created_at: '2026-03-05T00:00:00Z',
      updated_at: '2026-03-05T00:00:00Z',
    };

    render(
      <StatBlockForm
        mode="edit"
        initialData={statBlock}
        worldId={1}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByLabelText(/Name/i)).toHaveValue('Barbarian');
    expect(screen.getByLabelText(/Description/i)).toHaveValue(
      'A strong character',
    );
  });

  it('validates JSON config on change', async () => {
    render(
      <StatBlockForm
        mode="create"
        worldId={1}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const configInput = screen.getByPlaceholderText('{}');
    fireEvent.change(configInput, { target: { value: 'invalid json' } });

    await waitFor(() => {
      expect(screen.getByText(/Invalid JSON/)).toBeInTheDocument();
    });
  });

  it('disables submit button when name is empty', () => {
    render(
      <StatBlockForm
        mode="create"
        worldId={1}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const submitButton = screen.getByRole('button', { name: /Create/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when name is provided', async () => {
    render(
      <StatBlockForm
        mode="create"
        worldId={1}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: 'Wizard' } });

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /Create/i });
      expect(submitButton).not.toBeDisabled();
    });
  });
});

describe('StatBlockCard', () => {
  const mockStatBlock: StatBlock = {
    id: 1,
    world_id: 1,
    campaign_id: null,
    character_id: null,
    name: 'Rogue',
    default_token_id: 5,
    description: 'A sneaky character',
    config: '{}',
    created_at: '2026-03-05T00:00:00Z',
    updated_at: '2026-03-05T00:00:00Z',
  };

  const mockOnEdit = () => {
    /* noop */
  };
  const mockOnDelete = () => {
    /* noop */
  };

  it('renders statblock name and description', () => {
    render(
      <StatBlockCard
        statBlock={mockStatBlock}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText('Rogue')).toBeInTheDocument();
    expect(screen.getByText('A sneaky character')).toBeInTheDocument();
  });

  it('displays token id when present', () => {
    render(
      <StatBlockCard
        statBlock={mockStatBlock}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText(/Token ID: 5/)).toBeInTheDocument();
  });

  it('calls onEdit when Edit button clicked', () => {
    const onEdit = vi.fn();
    render(
      <StatBlockCard
        statBlock={mockStatBlock}
        onEdit={onEdit}
        onDelete={mockOnDelete}
      />,
    );

    const editButton = screen.getByRole('button', { name: /Edit/i });
    fireEvent.click(editButton);

    expect(onEdit).toHaveBeenCalledWith(mockStatBlock);
  });

  it('calls onDelete when Delete button clicked', () => {
    const onDelete = vi.fn();
    render(
      <StatBlockCard
        statBlock={mockStatBlock}
        onEdit={mockOnEdit}
        onDelete={onDelete}
      />,
    );

    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith(mockStatBlock.id);
  });
});
