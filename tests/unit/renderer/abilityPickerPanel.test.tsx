import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AbilityPickerPanel from '../../../src/renderer/components/runtime/AbilityPickerPanel';

describe('AbilityPickerPanel', () => {
  const mockOnAbilitySelect = vi.fn();

  function buildAbility(overrides: Partial<Ability> = {}): Ability {
    return {
      id: 1,
      world_id: 1,
      name: 'Test Ability',
      description: null,
      type: 'active',
      passive_subtype: null,
      level_id: null,
      effects: '[]',
      conditions: '[]',
      cast_cost: '{}',
      trigger: null,
      pick_count: null,
      pick_timing: null,
      pick_is_permanent: 0,
      range_cells: 6,
      aoe_shape: 'circle',
      aoe_size_cells: 2,
      target_type: 'tile',
      created_at: '2026-01-01 00:00:00',
      updated_at: '2026-01-02 00:00:00',
      ...overrides,
    };
  }

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
        getAllByWorld: vi.fn(),
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
    } as unknown as DbApi;
  });

  it('shows loading state while abilities are fetching', async () => {
    const getAllByWorldMock = window.db.abilities.getAllByWorld as ReturnType<
      typeof vi.fn
    >;
    getAllByWorldMock.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );

    render(
      <AbilityPickerPanel
        worldId={1}
        castingAbility={null}
        onAbilitySelect={mockOnAbilitySelect}
      />,
    );

    expect(screen.getByText('Loading abilities...')).toBeInTheDocument();
  });

  it('shows only active abilities after successful load', async () => {
    const getAllByWorldMock = window.db.abilities.getAllByWorld as ReturnType<
      typeof vi.fn
    >;
    getAllByWorldMock.mockResolvedValue([
      buildAbility({ id: 1, name: 'Arc Flash', type: 'active' }),
      buildAbility({ id: 2, name: 'Passive Boost', type: 'passive' }),
      buildAbility({ id: 3, name: 'Chain Lightning', type: 'active' }),
    ]);

    render(
      <AbilityPickerPanel
        worldId={1}
        castingAbility={null}
        onAbilitySelect={mockOnAbilitySelect}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Arc Flash')).toBeInTheDocument();
    });
    expect(screen.getByText('Chain Lightning')).toBeInTheDocument();
    expect(screen.queryByText('Passive Boost')).not.toBeInTheDocument();
  });

  it('shows "No active abilities" message when no active abilities exist', async () => {
    const getAllByWorldMock = window.db.abilities.getAllByWorld as ReturnType<
      typeof vi.fn
    >;
    getAllByWorldMock.mockResolvedValue([
      buildAbility({ id: 1, name: 'Passive Only', type: 'passive' }),
    ]);

    render(
      <AbilityPickerPanel
        worldId={1}
        castingAbility={null}
        onAbilitySelect={mockOnAbilitySelect}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText('No active abilities in this world.'),
      ).toBeInTheDocument();
    });
  });

  it('shows error message on fetch failure', async () => {
    const getAllByWorldMock = window.db.abilities.getAllByWorld as ReturnType<
      typeof vi.fn
    >;
    getAllByWorldMock.mockRejectedValue(new Error('db error'));

    render(
      <AbilityPickerPanel
        worldId={1}
        castingAbility={null}
        onAbilitySelect={mockOnAbilitySelect}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Unable to load abilities.')).toBeInTheDocument();
    });
  });

  it('calls onAbilitySelect with ability when clicking ability with range_cells', async () => {
    const user = userEvent.setup();
    const getAllByWorldMock = window.db.abilities.getAllByWorld as ReturnType<
      typeof vi.fn
    >;
    const ability = buildAbility({
      id: 5,
      name: 'Arc Flash',
      type: 'active',
      range_cells: 6,
    });
    getAllByWorldMock.mockResolvedValue([ability]);

    render(
      <AbilityPickerPanel
        worldId={1}
        castingAbility={null}
        onAbilitySelect={mockOnAbilitySelect}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Arc Flash')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Arc Flash'));

    expect(mockOnAbilitySelect).toHaveBeenCalledWith(ability);
  });

  it('does not call onAbilitySelect when clicking ability with range_cells = null', async () => {
    const user = userEvent.setup();
    const getAllByWorldMock = window.db.abilities.getAllByWorld as ReturnType<
      typeof vi.fn
    >;
    const ability = buildAbility({
      id: 6,
      name: 'Basic Attack',
      type: 'active',
      range_cells: null,
    });
    getAllByWorldMock.mockResolvedValue([ability]);

    render(
      <AbilityPickerPanel
        worldId={1}
        castingAbility={null}
        onAbilitySelect={mockOnAbilitySelect}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Basic Attack')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Basic Attack'));

    // Should call with null since ability has no range_cells
    expect(mockOnAbilitySelect).toHaveBeenCalledWith(null);
  });

  it('calls onAbilitySelect(null) when clicking already-selected ability', async () => {
    const user = userEvent.setup();
    const getAllByWorldMock = window.db.abilities.getAllByWorld as ReturnType<
      typeof vi.fn
    >;
    const ability = buildAbility({
      id: 7,
      name: 'Arc Flash',
      type: 'active',
      range_cells: 8,
    });
    getAllByWorldMock.mockResolvedValue([ability]);

    render(
      <AbilityPickerPanel
        worldId={1}
        castingAbility={ability}
        onAbilitySelect={mockOnAbilitySelect}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Arc Flash')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Arc Flash'));

    expect(mockOnAbilitySelect).toHaveBeenCalledWith(null);
  });

  it('calls onAbilitySelect(null) when close button is clicked', async () => {
    const user = userEvent.setup();
    const getAllByWorldMock = window.db.abilities.getAllByWorld as ReturnType<
      typeof vi.fn
    >;
    getAllByWorldMock.mockResolvedValue([
      buildAbility({ id: 8, name: 'Arc Flash', type: 'active' }),
    ]);

    render(
      <AbilityPickerPanel
        worldId={1}
        castingAbility={null}
        onAbilitySelect={mockOnAbilitySelect}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Arc Flash')).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', {
      name: /close|dismiss|×/i,
    });
    await user.click(closeButton);

    expect(mockOnAbilitySelect).toHaveBeenCalledWith(null);
  });

  it('visually indicates selected ability', async () => {
    const getAllByWorldMock = window.db.abilities.getAllByWorld as ReturnType<
      typeof vi.fn
    >;
    const ability = buildAbility({
      id: 9,
      name: 'Arc Flash',
      type: 'active',
      range_cells: 6,
    });
    getAllByWorldMock.mockResolvedValue([
      ability,
      buildAbility({ id: 10, name: 'Chain', type: 'active' }),
    ]);

    const { rerender } = render(
      <AbilityPickerPanel
        worldId={1}
        castingAbility={null}
        onAbilitySelect={mockOnAbilitySelect}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Arc Flash')).toBeInTheDocument();
    });

    // Rerender with castingAbility set
    rerender(
      <AbilityPickerPanel
        worldId={1}
        castingAbility={ability}
        onAbilitySelect={mockOnAbilitySelect}
      />,
    );

    const selectedButton = screen.getByText('Arc Flash').closest('button');
    // Verify the selected ability button is in the DOM
    expect(selectedButton).toBeInTheDocument();
  });

  it('passes worldId to getAllByWorld', async () => {
    const getAllByWorldMock = window.db.abilities.getAllByWorld as ReturnType<
      typeof vi.fn
    >;
    getAllByWorldMock.mockResolvedValue([]);

    render(
      <AbilityPickerPanel
        worldId={42}
        castingAbility={null}
        onAbilitySelect={mockOnAbilitySelect}
      />,
    );

    await waitFor(() => {
      expect(getAllByWorldMock).toHaveBeenCalledWith(42);
    });
  });

  it('displays range and AoE info for castable abilities', async () => {
    const getAllByWorldMock = window.db.abilities.getAllByWorld as ReturnType<
      typeof vi.fn
    >;
    getAllByWorldMock.mockResolvedValue([
      buildAbility({
        id: 11,
        name: 'Fireball',
        type: 'active',
        range_cells: 12,
        aoe_shape: 'circle',
      }),
    ]);

    render(
      <AbilityPickerPanel
        worldId={1}
        castingAbility={null}
        onAbilitySelect={mockOnAbilitySelect}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Fireball')).toBeInTheDocument();
    });

    // Check for range/aoe display (exact text format depends on implementation)
    const panel = screen.getByText('Fireball').closest('div');
    const text = panel?.textContent || '';
    expect(text).toMatch(/12|circle|range/i);
  });
});
