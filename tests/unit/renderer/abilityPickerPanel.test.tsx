import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AbilityPickerPanel from '../../../src/renderer/components/runtime/AbilityPickerPanel';

function buildAbility(overrides: Partial<Ability> = {}): Ability {
  return {
    id: 1,
    world_id: 1,
    name: 'Arc Bolt',
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
    aoe_shape: 'line',
    aoe_size_cells: 1,
    target_type: 'tile',
    created_at: '2026-03-05 00:00:00',
    updated_at: '2026-03-05 00:00:00',
    ...overrides,
  };
}

function buildStatBlock(overrides: Partial<StatBlock> = {}): StatBlock {
  return {
    id: 11,
    world_id: 1,
    campaign_id: null,
    character_id: null,
    default_token_id: null,
    name: 'Linked Caster',
    description: 'runtime link',
    config: '{}',
    created_at: '2026-03-05 00:00:00',
    updated_at: '2026-03-05 00:00:00',
    ...overrides,
  };
}

describe('AbilityPickerPanel', () => {
  const onAbilitySelect = vi.fn();
  const getLinkedStatblockMock = vi.fn();
  const listAbilitiesMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    window.db = {
      statblocks: {
        getLinkedStatblock: getLinkedStatblockMock,
        listAbilities: listAbilitiesMock,
      },
    } as unknown as DbApi;
  });

  it('shows loading while linked statblock lookup is pending', async () => {
    getLinkedStatblockMock.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );

    render(
      <AbilityPickerPanel
        sourceTokenId={99}
        tokenName='Scout'
        castingAbility={null}
        onAbilitySelect={onAbilitySelect}
      />,
    );

    expect(screen.getByText('Loading abilities...')).toBeInTheDocument();
  });

  it('loads active abilities from token-linked statblock', async () => {
    getLinkedStatblockMock.mockResolvedValue(buildStatBlock({ id: 44 }));
    listAbilitiesMock.mockResolvedValue([
      buildAbility({ id: 101, name: 'Firebolt', type: 'active' }),
      buildAbility({ id: 102, name: 'Aura', type: 'passive' }),
      buildAbility({ id: 103, name: 'Ice Lance', type: 'active' }),
    ]);

    render(
      <AbilityPickerPanel
        sourceTokenId={12}
        tokenName='Mage'
        castingAbility={null}
        onAbilitySelect={onAbilitySelect}
      />,
    );

    await waitFor(() => {
      expect(getLinkedStatblockMock).toHaveBeenCalledWith(12);
      expect(listAbilitiesMock).toHaveBeenCalledWith(44);
    });

    expect(screen.getByText('Firebolt')).toBeInTheDocument();
    expect(screen.getByText('Ice Lance')).toBeInTheDocument();
    expect(screen.queryByText('Aura')).not.toBeInTheDocument();
  });

  it('shows fallback when token has no linked statblock', async () => {
    getLinkedStatblockMock.mockResolvedValue(null);

    render(
      <AbilityPickerPanel
        sourceTokenId={66}
        tokenName='Rogue'
        castingAbility={null}
        onAbilitySelect={onAbilitySelect}
      />,
    );

    expect(
      await screen.findByText('No linked statblock for this token.'),
    ).toBeInTheDocument();
    expect(onAbilitySelect).toHaveBeenCalledWith(null);
    expect(listAbilitiesMock).not.toHaveBeenCalled();
  });

  it('shows safe fallback when source token is missing', async () => {
    render(
      <AbilityPickerPanel
        sourceTokenId={null}
        tokenName='Ghost'
        castingAbility={buildAbility({ id: 333 })}
        onAbilitySelect={onAbilitySelect}
      />,
    );

    expect(
      await screen.findByText('Selected token has no source link.'),
    ).toBeInTheDocument();
    expect(onAbilitySelect).toHaveBeenCalledWith(null);
    expect(getLinkedStatblockMock).not.toHaveBeenCalled();
  });

  it('shows load error when linked statblock fetch fails', async () => {
    getLinkedStatblockMock.mockRejectedValue(new Error('db down'));

    render(
      <AbilityPickerPanel
        sourceTokenId={7}
        tokenName='Mage'
        castingAbility={null}
        onAbilitySelect={onAbilitySelect}
      />,
    );

    expect(
      await screen.findByText('Unable to load linked statblock abilities.'),
    ).toBeInTheDocument();
    expect(onAbilitySelect).toHaveBeenCalledWith(null);
  });

  it('toggles a castable ability and clears selection via close button', async () => {
    const user = userEvent.setup();
    const ability = buildAbility({ id: 501, name: 'Spear Rain', range_cells: 5 });
    getLinkedStatblockMock.mockResolvedValue(buildStatBlock({ id: 21 }));
    listAbilitiesMock.mockResolvedValue([ability]);

    render(
      <AbilityPickerPanel
        sourceTokenId={8}
        tokenName='Archer'
        castingAbility={null}
        onAbilitySelect={onAbilitySelect}
      />,
    );

    await screen.findByText('Spear Rain');
    await user.click(screen.getByRole('button', { name: /Spear Rain/i }));
    expect(onAbilitySelect).toHaveBeenCalledWith(ability);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onAbilitySelect).toHaveBeenCalledWith(null);
  });

  it('clears casting when selected ability is no longer linked to token statblock', async () => {
    const selected = buildAbility({ id: 777, name: 'Old Cast' });
    getLinkedStatblockMock.mockResolvedValue(buildStatBlock({ id: 77 }));
    listAbilitiesMock.mockResolvedValue([buildAbility({ id: 701, name: 'New Cast' })]);

    render(
      <AbilityPickerPanel
        sourceTokenId={17}
        tokenName='Wizard'
        castingAbility={selected}
        onAbilitySelect={onAbilitySelect}
      />,
    );

    await screen.findByText('New Cast');
    expect(onAbilitySelect).toHaveBeenCalledWith(null);
  });

  it('does not keep null-range ability selected', async () => {
    const user = userEvent.setup();
    const melee = buildAbility({ id: 901, name: 'Punch', range_cells: null });
    getLinkedStatblockMock.mockResolvedValue(buildStatBlock({ id: 91 }));
    listAbilitiesMock.mockResolvedValue([melee]);

    render(
      <AbilityPickerPanel
        sourceTokenId={2}
        tokenName='Brawler'
        castingAbility={null}
        onAbilitySelect={onAbilitySelect}
      />,
    );

    await screen.findByText('Punch');
    await user.click(screen.getByRole('button', { name: /Punch/i }));
    expect(onAbilitySelect).toHaveBeenCalledWith(null);
  });
});
