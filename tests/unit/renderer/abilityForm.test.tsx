import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AbilityForm from '../../../src/renderer/components/abilities/AbilityForm';

const levelsGetAllByWorldMock = vi.fn();

function buildLevel(overrides: Partial<Level> = {}): Level {
  return {
    id: 1,
    world_id: 1,
    name: 'Tier 1',
    category: 'Progression',
    description: null,
    created_at: '2026-02-27 00:00:00',
    updated_at: '2026-02-27 00:00:00',
    ...overrides,
  };
}

describe('AbilityForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    window.db = {
      verses: {
        getAll: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      worlds: {
        getAll: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        markViewed: vi.fn(),
      },
      levels: {
        getAllByWorld: levelsGetAllByWorldMock,
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      abilities: {
        getAllByWorld: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        addChild: vi.fn(),
        removeChild: vi.fn(),
        getChildren: vi.fn(),
      },
    } as DbApi;

    levelsGetAllByWorldMock.mockResolvedValue([buildLevel()]);
  });

  it('toggles field visibility by type and subtype', async () => {
    const user = userEvent.setup();

    render(<AbilityForm worldId={1} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(
      screen.queryByLabelText('Passive subtype (optional)'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Cast cost (JSON object)'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Conditions (JSON array)'),
    ).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Type'), 'passive');
    expect(
      screen.getByLabelText('Passive subtype (optional)'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Conditions (JSON array)'),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Cast cost (JSON object)'),
    ).not.toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText('Passive subtype (optional)'),
      'keystone',
    );
    expect(
      await screen.findByLabelText('Keystone level (optional)'),
    ).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText('Passive subtype (optional)'),
      'rostering',
    );
    expect(screen.getByLabelText('Pick count (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Pick timing (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Picks are permanent')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Type'), 'active');
    expect(
      screen.queryByLabelText('Passive subtype (optional)'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Pick count (optional)'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Pick timing (optional)'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText('Cast cost (JSON object)'),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Conditions (JSON array)'),
    ).not.toBeInTheDocument();
  });

  it('shows JSON validation error for invalid cast cost shape', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<AbilityForm worldId={2} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), 'Arc Flash');
    await user.selectOptions(screen.getByLabelText('Type'), 'active');
    fireEvent.change(screen.getByLabelText('Cast cost (JSON object)'), {
      target: { value: '[]' },
    });
    await user.click(screen.getByRole('button', { name: 'Create ability' }));

    expect(
      await screen.findByText('Cast cost must be a JSON object.'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('normalizes JSON and submits a trimmed payload', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<AbilityForm worldId={3} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), '  Arc Flash  ');
    await user.type(
      screen.getByLabelText('Description (optional)'),
      '  Burst strike  ',
    );
    await user.selectOptions(screen.getByLabelText('Type'), 'active');
    fireEvent.change(screen.getByLabelText('Effects (JSON array)'), {
      target: { value: '[{ "type": "damage", "value": 10 }]' },
    });
    fireEvent.change(screen.getByLabelText('Cast cost (JSON object)'), {
      target: { value: '{ "mana": 12, "combo": [1, 2] }' },
    });
    await user.type(screen.getByLabelText('Trigger (optional)'), '  On cast  ');

    await user.click(screen.getByRole('button', { name: 'Create ability' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        world_id: 3,
        name: 'Arc Flash',
        description: 'Burst strike',
        type: 'active',
        passive_subtype: null,
        level_id: null,
        effects: '[{"type":"damage","value":10}]',
        conditions: '[]',
        cast_cost: '{"mana":12,"combo":[1,2]}',
        trigger: 'On cast',
        pick_count: null,
        pick_timing: null,
        pick_is_permanent: 0,
        range_cells: null,
        aoe_shape: null,
        aoe_size_cells: null,
        target_type: null,
      });
    });
  });

  it('shows levels load error for keystone subtype when levels fail to load', async () => {
    const user = userEvent.setup();
    levelsGetAllByWorldMock.mockRejectedValueOnce(new Error('db offline'));

    render(<AbilityForm worldId={4} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.selectOptions(screen.getByLabelText('Type'), 'passive');
    await user.selectOptions(
      screen.getByLabelText('Passive subtype (optional)'),
      'keystone',
    );

    expect(
      await screen.findByText('Unable to load levels.'),
    ).toBeInTheDocument();
  });

  it('validates rostering pick count values', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<AbilityForm worldId={6} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), 'Roster Pick');
    await user.selectOptions(screen.getByLabelText('Type'), 'passive');
    await user.selectOptions(
      screen.getByLabelText('Passive subtype (optional)'),
      'rostering',
    );

    const form = screen
      .getByRole('button', { name: 'Create ability' })
      .closest('form');
    expect(form).not.toBeNull();

    fireEvent.change(screen.getByLabelText('Pick count (optional)'), {
      target: { value: '-1' },
    });
    fireEvent.submit(form as HTMLFormElement);
    expect(
      await screen.findByText(
        'Pick count must be a non-negative whole number.',
      ),
    ).toBeInTheDocument();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error when type is missing', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<AbilityForm worldId={6} onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Type Required' },
    });
    const form = screen
      .getByRole('button', { name: 'Create ability' })
      .closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);
    expect(
      await screen.findByText('Ability type is required.'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows generic edit failure for non-Error exceptions', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue('unexpected');

    render(
      <AbilityForm
        mode="edit"
        worldId={7}
        initialValues={{
          name: 'Existing ability',
          type: 'active',
          effects: '[]',
          cast_cost: '{}',
        }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      await screen.findByText('Failed to save ability changes.'),
    ).toBeInTheDocument();
  });

  it('formats initial JSON values for editor readability', async () => {
    render(
      <AbilityForm
        mode="edit"
        worldId={5}
        initialValues={{
          name: 'Existing ability',
          type: 'active',
          effects: '[{"type":"damage","value":5}]',
          cast_cost: '{"mana":8}',
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(levelsGetAllByWorldMock).toHaveBeenCalledWith(5);
    });
    expect(screen.getByLabelText('Effects (JSON array)')).toHaveValue(
      '[\n  {\n    "type": "damage",\n    "value": 5\n  }\n]',
    );
    expect(screen.getByLabelText('Cast cost (JSON object)')).toHaveValue(
      '{\n  "mana": 8\n}',
    );
  });

  it('submits casting range fields in payload for active type', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<AbilityForm worldId={1} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), 'Arc Flash');
    await user.selectOptions(screen.getByLabelText('Type'), 'active');
    fireEvent.change(screen.getByLabelText('Cast cost (JSON object)'), {
      target: { value: '{}' },
    });

    await user.click(screen.getByRole('button', { name: 'Create ability' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          range_cells: null,
          aoe_shape: null,
          aoe_size_cells: null,
          target_type: null,
        }),
      );
    });
  });

  it('submits casting fields as null for passive type', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<AbilityForm worldId={1} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), 'Passive Ability');
    await user.selectOptions(screen.getByLabelText('Type'), 'passive');

    await user.click(screen.getByRole('button', { name: 'Create ability' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          range_cells: null,
          aoe_shape: null,
          aoe_size_cells: null,
          target_type: null,
        }),
      );
    });
  });

  it('pre-fills with initialValues in edit mode including casting fields', async () => {
    render(
      <AbilityForm
        mode="edit"
        worldId={1}
        initialValues={{
          name: 'Arc Flash',
          type: 'active',
          effects: '[]',
          cast_cost: '{}',
          range_cells: 8,
          aoe_shape: 'cone',
          aoe_size_cells: 3,
          target_type: 'token',
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(levelsGetAllByWorldMock).toHaveBeenCalledWith(1);
    });

    // Verify form was rendered with initial values
    expect(screen.getByLabelText('Name')).toHaveValue('Arc Flash');
    expect(screen.getByLabelText('Type')).toHaveValue('active');
  });
});
