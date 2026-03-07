import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StatBlockCard from '../../../../src/renderer/components/statblocks/StatBlockCard';
import StatBlockForm from '../../../../src/renderer/components/statblocks/StatBlockForm';

const worldsGetByIdMock = vi.fn();

const worldStatisticsConfig = JSON.stringify({
  statistics: {
    resources: [
      {
        id: 'hp',
        name: 'Hit Points',
        abbreviation: 'HP',
        isDefault: true,
      },
      {
        id: 'mp',
        name: 'Mana Points',
        abbreviation: 'MP',
        isDefault: false,
      },
    ],
    passiveScores: [
      {
        id: 'str',
        name: 'Strength',
        abbreviation: 'STR',
        type: 'ability_score',
        isDefault: true,
      },
    ],
  },
});

function buildAbility(
  id: number,
  worldId: number,
  name: string,
  type = 'active',
): Ability {
  return {
    id,
    world_id: worldId,
    name,
    description: null,
    type,
    passive_subtype: null,
    level_id: null,
    effects: '[]',
    conditions: '[]',
    cast_cost: '{}',
    trigger: null,
    pick_count: null,
    pick_timing: null,
    pick_is_permanent: 0,
    range_cells: null,
    aoe_shape: null,
    aoe_size_cells: null,
    target_type: null,
    created_at: '2026-03-05T00:00:00Z',
    updated_at: '2026-03-05T00:00:00Z',
  };
}

describe('StatBlockForm', () => {
  const mockOnSubmit = vi.fn(async () => {
    /* noop */
  });
  const mockOnCancel = vi.fn();
  const worldOneAbilities = [
    buildAbility(1, 1, 'Arrow Storm'),
    buildAbility(2, 1, 'Tracking Sense', 'passive'),
    buildAbility(99, 2, 'Other World Ability'),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    worldsGetByIdMock.mockResolvedValue({
      id: 1,
      name: 'Aeloria',
      config: worldStatisticsConfig,
    });

    window.db = {
      worlds: {
        getById: worldsGetByIdMock,
      },
    } as unknown as DbApi;
  });

  it('renders unified editor sections for statistics, abilities, and skills', async () => {
    render(
      <StatBlockForm
        mode='create'
        worldId={1}
        availableAbilities={worldOneAbilities}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(
      await screen.findByRole('heading', { name: 'Resources' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Passive Scores' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Abilities' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Skills' })).toBeInTheDocument();
    expect(screen.getByText('No skills added.')).toBeInTheDocument();

    expect(screen.getByText('Arrow Storm')).toBeInTheDocument();
    expect(screen.getByText('Tracking Sense')).toBeInTheDocument();
    expect(screen.queryByText('Other World Ability')).not.toBeInTheDocument();
  });

  it('submits create payload with selected abilities and skill config', async () => {
    render(
      <StatBlockForm
        mode='create'
        worldId={1}
        availableAbilities={worldOneAbilities}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    await screen.findByRole('heading', { name: 'Resources' });

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: '  Ranger  ' },
    });
    fireEvent.change(screen.getByLabelText('Description (optional)'), {
      target: { value: '  Scout  ' },
    });

    fireEvent.change(screen.getByLabelText('Current Hit Points'), {
      target: { value: '9' },
    });
    fireEvent.change(screen.getByLabelText('Maximum Hit Points'), {
      target: { value: '11' },
    });

    fireEvent.click(screen.getByLabelText(/Arrow Storm/i));
    fireEvent.click(screen.getByRole('button', { name: 'Add skill' }));
    fireEvent.change(screen.getByPlaceholderText('skill_key'), {
      target: { value: 'stealth' },
    });
    fireEvent.change(screen.getByDisplayValue('0'), {
      target: { value: '3' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create statblock' }));

    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledTimes(1));

    const payload = mockOnSubmit.mock.calls[0]?.[0] as {
      statblock: { world_id: number; name: string; description?: string; config: string; };
      abilityIds: number[];
    };
    expect(payload.statblock.world_id).toBe(1);
    expect(payload.statblock.name).toBe('Ranger');
    expect(payload.statblock.description).toBe('Scout');
    expect(payload.abilityIds).toEqual([1]);

    const parsedConfig = JSON.parse(payload.statblock.config) as {
      statistics?: {
        resources?: Record<string, { current: number; maximum: number; }>;
      };
      skills?: Array<{ key: string; rank: number; }>;
    };

    expect(parsedConfig.statistics?.resources?.hp).toEqual({
      current: 9,
      maximum: 11,
    });
    expect(parsedConfig.skills).toEqual([{ key: 'stealth', rank: 3 }]);
  });

  it('supports edit mode with legacy config and ability re-assignment', async () => {
    const statBlock: StatBlock = {
      id: 7,
      world_id: 1,
      campaign_id: null,
      character_id: null,
      name: 'Legacy',
      default_token_id: null,
      description: 'Legacy block',
      config: JSON.stringify({
        notes: 'keep',
        statistics: {
          resources: {
            hp: { current: 5, maximum: 5 },
          },
          passiveScores: {
            str: { baseValue: 12 },
          },
        },
        skills: [{ key: 'arcana', rank: 2 }],
      }),
      created_at: '2026-03-05T00:00:00Z',
      updated_at: '2026-03-05T00:00:00Z',
    };

    render(
      <StatBlockForm
        mode='edit'
        worldId={1}
        initialData={statBlock}
        availableAbilities={worldOneAbilities}
        initialAbilityIds={[2]}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    await screen.findByRole('heading', { name: 'Resources' });
    expect(screen.getByDisplayValue('arcana')).toBeInTheDocument();
    expect(screen.getByLabelText(/Tracking Sense/i)).toBeChecked();

    fireEvent.click(screen.getByLabelText(/Tracking Sense/i));
    fireEvent.click(screen.getByLabelText(/Arrow Storm/i));
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledTimes(1));
    const payload = mockOnSubmit.mock.calls[0]?.[0] as {
      statblock: { config: string; };
      abilityIds: number[];
    };
    expect(payload.abilityIds).toEqual([1]);

    const parsedConfig = JSON.parse(payload.statblock.config) as Record<
      string,
      unknown
    >;
    expect(parsedConfig.notes).toBe('keep');
    expect(parsedConfig).not.toHaveProperty('skills');
  });

  it('shows guardrail error when a skill key is missing', async () => {
    render(
      <StatBlockForm
        mode='create'
        worldId={1}
        availableAbilities={worldOneAbilities}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    await screen.findByRole('heading', { name: 'Resources' });
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Mage' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add skill' }));
    fireEvent.change(screen.getByDisplayValue('0'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create statblock' }));

    expect(await screen.findByText('Each skill must have a key.')).toBeVisible();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows generic create error when onSubmit throws a non-Error value', async () => {
    mockOnSubmit.mockRejectedValueOnce('unknown');
    render(
      <StatBlockForm
        mode='create'
        worldId={1}
        availableAbilities={worldOneAbilities}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    await screen.findByRole('heading', { name: 'Resources' });
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Cleric' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create statblock' }));

    expect(
      await screen.findByText('Failed to create statblock.'),
    ).toBeInTheDocument();
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
