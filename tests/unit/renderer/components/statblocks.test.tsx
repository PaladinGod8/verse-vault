import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StatBlockForm from '../../../../src/renderer/components/statblocks/StatBlockForm';
import StatBlockCard from '../../../../src/renderer/components/statblocks/StatBlockCard';

describe('StatBlockForm', () => {
  const mockOnSubmit = vi.fn(async () => {
    /* noop */
  });
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
  });

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

  it('renders edit form button with "Save changes" text', () => {
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

    expect(
      screen.getByRole('button', { name: /Save changes/i }),
    ).toBeInTheDocument();
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

  it('clears config error when valid JSON is provided', async () => {
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

    fireEvent.change(configInput, { target: { value: '{"key": "value"}' } });

    await waitFor(() => {
      expect(screen.queryByText(/Invalid JSON/)).not.toBeInTheDocument();
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

  it('disables submit button when only whitespace name is provided', async () => {
    render(
      <StatBlockForm
        mode="create"
        worldId={1}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: '   ' } });

    const submitButton = screen.getByRole('button', { name: /Create/i });
    expect(submitButton).toBeDisabled();
  });

  it('calls onCancel when Cancel button is clicked', async () => {
    render(
      <StatBlockForm
        mode="create"
        worldId={1}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('calls onSubmit with correct data when form is submitted', async () => {
    render(
      <StatBlockForm
        mode="create"
        worldId={1}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const nameInput = screen.getByLabelText(/Name/i);
    const descriptionInput = screen.getByLabelText(/Description/i);
    fireEvent.change(nameInput, { target: { value: 'Cleric' } });
    fireEvent.change(descriptionInput, { target: { value: 'Holy warrior' } });

    const submitButton = screen.getByRole('button', {
      name: /Create statblock/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        world_id: 1,
        name: 'Cleric',
        description: 'Holy warrior',
        config: '{}',
      });
    });
  });

  it('includes campaignId in onSubmit data when provided', async () => {
    render(
      <StatBlockForm
        mode="create"
        worldId={1}
        campaignId={42}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: 'Sorcerer' } });

    const submitButton = screen.getByRole('button', {
      name: /Create statblock/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          campaign_id: 42,
        }),
      );
    });
  });

  it('excludes campaignId when null', async () => {
    render(
      <StatBlockForm
        mode="create"
        worldId={1}
        campaignId={null}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: 'Sorcerer' } });

    const submitButton = screen.getByRole('button', {
      name: /Create statblock/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const call = (mockOnSubmit.mock.calls[0] as unknown[])[0];
      expect(call).not.toHaveProperty('campaign_id');
    });
  });

  it('trims description and removes undefined empty descriptions', async () => {
    render(
      <StatBlockForm
        mode="create"
        worldId={1}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: 'Monk' } });

    const submitButton = screen.getByRole('button', {
      name: /Create statblock/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: undefined,
        }),
      );
    });
  });

  it('normalizes JSON config on initialization', () => {
    const statBlock: StatBlock = {
      id: 1,
      world_id: 1,
      campaign_id: null,
      character_id: null,
      name: 'Test',
      default_token_id: null,
      description: '',
      config: '{"hp":10,"str":15}',
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

    const configInput = screen.getByPlaceholderText(
      '{}',
    ) as HTMLTextAreaElement;
    expect(configInput.value).toContain('"hp": 10');
  });

  it('shows error when empty name is submitted', async () => {
    const user = userEvent.setup();
    render(
      <StatBlockForm
        mode="create"
        worldId={1}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const nameInput = screen.getByLabelText(/Name/i);
    // Type then clear the name field to trigger the path
    await user.type(nameInput, 'Test');
    await user.clear(nameInput);
    await user.type(nameInput, '   '); // empty/whitespace

    const form = screen
      .getByRole('button', { name: /Create statblock/i })
      .closest('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText(/StatBlock name is required/),
      ).toBeInTheDocument();
    });
  });

  it('shows error when invalid JSON is submitted', async () => {
    render(
      <StatBlockForm
        mode="create"
        worldId={1}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const nameInput = screen.getByLabelText(/Name/i);
    const configInput = screen.getByPlaceholderText('{}');
    fireEvent.change(nameInput, { target: { value: 'Valid' } });
    fireEvent.change(configInput, { target: { value: 'invalid' } });

    const submitButton = screen.getByRole('button', {
      name: /Create statblock/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Config must be valid JSON/)).toBeInTheDocument();
    });
  });

  it('shows error from onSubmit throw', async () => {
    mockOnSubmit.mockRejectedValue(new Error('Submit failed'));
    render(
      <StatBlockForm
        mode="create"
        worldId={1}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: 'Bard' } });

    const submitButton = screen.getByRole('button', {
      name: /Create statblock/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Submit failed')).toBeInTheDocument();
    });
  });

  it('shows generic error message on non-Error throw in create mode', async () => {
    mockOnSubmit.mockRejectedValue('unknown error');
    render(
      <StatBlockForm
        mode="create"
        worldId={1}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: 'Bard' } });

    const submitButton = screen.getByRole('button', {
      name: /Create statblock/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to create statblock/),
      ).toBeInTheDocument();
    });
  });

  it('shows edit mode error message on non-Error throw in edit mode', async () => {
    const statBlock: StatBlock = {
      id: 1,
      world_id: 1,
      campaign_id: null,
      character_id: null,
      name: 'Test',
      default_token_id: null,
      description: '',
      config: '{}',
      created_at: '2026-03-05T00:00:00Z',
      updated_at: '2026-03-05T00:00:00Z',
    };
    mockOnSubmit.mockRejectedValue('unknown error');

    render(
      <StatBlockForm
        mode="edit"
        initialData={statBlock}
        worldId={1}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const submitButton = screen.getByRole('button', { name: /Save changes/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to save statblock changes/),
      ).toBeInTheDocument();
    });
  });

  it('disables inputs while submitting', async () => {
    mockOnSubmit.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    render(
      <StatBlockForm
        mode="create"
        worldId={1}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: 'Paladin' } });

    const submitButton = screen.getByRole('button', {
      name: /Create statblock/i,
    });
    fireEvent.click(submitButton);

    // Check that inputs are disabled while submitting
    await waitFor(() => {
      expect(screen.getByLabelText(/Name/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
    });

    // Wait for submission to complete
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Create statblock/i }),
      ).not.toBeDisabled();
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

  it('does not render description when not provided', () => {
    const statBlockWithoutDescription: StatBlock = {
      ...mockStatBlock,
      description: '',
    };
    render(
      <StatBlockCard
        statBlock={statBlockWithoutDescription}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText('Rogue')).toBeInTheDocument();
    expect(screen.queryByText('A sneaky character')).not.toBeInTheDocument();
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

  it('does not display token id when null', () => {
    const statBlockWithoutToken: StatBlock = {
      ...mockStatBlock,
      default_token_id: null,
    };
    render(
      <StatBlockCard
        statBlock={statBlockWithoutToken}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText('Rogue')).toBeInTheDocument();
    expect(screen.queryByText(/Token ID/)).not.toBeInTheDocument();
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

  it('renders card with proper styling classes', () => {
    const { container } = render(
      <StatBlockCard
        statBlock={mockStatBlock}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    const cardDiv = container.querySelector('.rounded-xl');
    expect(cardDiv).toBeInTheDocument();
    expect(cardDiv).toHaveClass('bg-white');
  });

  it('renders edit button with proper styling', () => {
    render(
      <StatBlockCard
        statBlock={mockStatBlock}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    const editButton = screen.getByRole('button', { name: /Edit/i });
    expect(editButton).toHaveClass('text-slate-600');
  });

  it('renders delete button with proper styling', () => {
    render(
      <StatBlockCard
        statBlock={mockStatBlock}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    expect(deleteButton).toHaveClass('text-rose-600');
  });
});
