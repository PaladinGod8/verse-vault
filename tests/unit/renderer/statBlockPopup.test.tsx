import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StatBlockPopup from '../../../src/renderer/components/runtime/StatBlockPopup';

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
    aoe_size_cells: 2,
    target_type: 'tile',
    created_at: '2026-03-05 00:00:00',
    updated_at: '2026-03-05 00:00:00',
    ...overrides,
  };
}

function buildStatBlock(overrides: Partial<StatBlock> = {}): StatBlock {
  return {
    id: 12,
    world_id: 1,
    campaign_id: null,
    character_id: null,
    default_token_id: null,
    name: 'Linked Caster',
    description: 'Runtime block',
    config: '{}',
    created_at: '2026-03-05 00:00:00',
    updated_at: '2026-03-05 00:00:00',
    ...overrides,
  };
}

describe('StatBlockPopup', () => {
  const getLinkedStatblockMock = vi.fn();
  const listAbilitiesMock = vi.fn();
  const onAbilitySelect = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.db = {
      statblocks: {
        getLinkedStatblock: getLinkedStatblockMock,
        listAbilities: listAbilitiesMock,
      },
    } as unknown as DbApi;
  });

  it('renders nothing when closed', () => {
    render(
      <StatBlockPopup
        isOpen={false}
        tokenName='Scout'
        sourceTokenId={10}
        castingAbility={null}
        onAbilitySelect={onAbilitySelect}
        onClose={onClose}
      />,
    );

    expect(screen.queryByText('Scout StatBlock')).not.toBeInTheDocument();
    expect(getLinkedStatblockMock).not.toHaveBeenCalled();
  });

  it('shows source-link error when source token id is missing', async () => {
    render(
      <StatBlockPopup
        isOpen
        tokenName='Scout'
        sourceTokenId={null}
        castingAbility={null}
        onAbilitySelect={onAbilitySelect}
        onClose={onClose}
      />,
    );

    expect(
      await screen.findByText('Selected token has no source link.'),
    ).toBeInTheDocument();
    expect(getLinkedStatblockMock).not.toHaveBeenCalled();
  });

  it('shows loading state while linked statblock fetch is pending', () => {
    getLinkedStatblockMock.mockImplementation(
      () =>
        new Promise(() => {
          // Keep pending to assert loading UI.
        }),
    );

    render(
      <StatBlockPopup
        isOpen
        tokenName='Scout'
        sourceTokenId={9}
        castingAbility={null}
        onAbilitySelect={onAbilitySelect}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Loading statblock...')).toBeInTheDocument();
  });

  it('shows fallback when token has no linked statblock', async () => {
    getLinkedStatblockMock.mockResolvedValue(null);

    render(
      <StatBlockPopup
        isOpen
        tokenName='Scout'
        sourceTokenId={7}
        castingAbility={null}
        onAbilitySelect={onAbilitySelect}
        onClose={onClose}
      />,
    );

    expect(
      await screen.findByText('No linked statblock for this token.'),
    ).toBeInTheDocument();
    expect(listAbilitiesMock).not.toHaveBeenCalled();
  });

  it('shows load error when linked statblock fetch fails', async () => {
    getLinkedStatblockMock.mockRejectedValue(new Error('db down'));

    render(
      <StatBlockPopup
        isOpen
        tokenName='Scout'
        sourceTokenId={7}
        castingAbility={null}
        onAbilitySelect={onAbilitySelect}
        onClose={onClose}
      />,
    );

    expect(
      await screen.findByText('Unable to load linked statblock.'),
    ).toBeInTheDocument();
    expect(listAbilitiesMock).not.toHaveBeenCalled();
  });

  it('renders statblock details, resources, passives, and skills from config', async () => {
    getLinkedStatblockMock.mockResolvedValue(
      buildStatBlock({
        id: 55,
        name: 'Battle Mage',
        config: JSON.stringify({
          statistics: {
            resources: {
              hp: { current: 21, maximum: 30 },
              invalid: { current: 'bad', maximum: 5 },
            },
            passiveScores: {
              ac: { baseValue: 16 },
              invalid: { baseValue: 'bad' },
            },
          },
          skills: [
            { key: 'arcana', rank: 4 },
            { key: 'perception', rank: 2 },
          ],
        }),
      }),
    );
    listAbilitiesMock.mockResolvedValue([]);

    render(
      <StatBlockPopup
        isOpen
        tokenName='Scout'
        sourceTokenId={5}
        castingAbility={null}
        onAbilitySelect={onAbilitySelect}
        onClose={onClose}
      />,
    );

    expect(await screen.findByText('Battle Mage')).toBeInTheDocument();
    expect(screen.getByText('Runtime block')).toBeInTheDocument();
    expect(screen.getByText('No abilities assigned.')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Resources' })).toBeInTheDocument();
    expect(screen.getByText('hp')).toBeInTheDocument();
    expect(screen.getByText('21/30')).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { name: 'Passive Scores' }),
    ).toBeInTheDocument();
    expect(screen.getByText('ac')).toBeInTheDocument();
    expect(screen.getByText('16')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Skills' })).toBeInTheDocument();
    expect(screen.getByText('arcana')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('shows no-description fallback when linked statblock description is empty', async () => {
    getLinkedStatblockMock.mockResolvedValue(
      buildStatBlock({
        id: 99,
        description: '',
      }),
    );
    listAbilitiesMock.mockResolvedValue([]);

    render(
      <StatBlockPopup
        isOpen
        tokenName='Scout'
        sourceTokenId={8}
        castingAbility={null}
        onAbilitySelect={onAbilitySelect}
        onClose={onClose}
      />,
    );

    expect(await screen.findByText('No description.')).toBeInTheDocument();
  });

  it('handles ability selection toggles and close action', async () => {
    const user = userEvent.setup();
    const selected = buildAbility({ id: 201, name: 'Frost Cone' });
    const other = buildAbility({ id: 202, name: 'Shock Line' });
    const melee = buildAbility({
      id: 203,
      name: 'Sword Slash',
      range_cells: null,
      aoe_shape: null,
    });

    getLinkedStatblockMock.mockResolvedValue(buildStatBlock({ id: 14 }));
    listAbilitiesMock.mockResolvedValue([selected, other, melee]);

    render(
      <StatBlockPopup
        isOpen
        tokenName='Scout'
        sourceTokenId={14}
        castingAbility={selected}
        onAbilitySelect={onAbilitySelect}
        onClose={onClose}
      />,
    );

    await screen.findByText('Frost Cone');
    await user.click(screen.getByRole('button', { name: /Frost Cone/i }));
    await user.click(screen.getByRole('button', { name: /Shock Line/i }));
    await user.click(screen.getByRole('button', { name: /Sword Slash/i }));
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onAbilitySelect).toHaveBeenNthCalledWith(1, null);
    expect(onAbilitySelect).toHaveBeenNthCalledWith(2, other);
    expect(onAbilitySelect).toHaveBeenNthCalledWith(3, null);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clears loading flag even when abilities lookup fails after statblock is loaded', async () => {
    getLinkedStatblockMock.mockResolvedValue(buildStatBlock({ id: 45 }));
    listAbilitiesMock.mockRejectedValue(new Error('ability load failed'));

    render(
      <StatBlockPopup
        isOpen
        tokenName='Scout'
        sourceTokenId={45}
        castingAbility={null}
        onAbilitySelect={onAbilitySelect}
        onClose={onClose}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading statblock...')).not.toBeInTheDocument();
    });
    expect(await screen.findByText('Unable to load linked statblock.')).toBeInTheDocument();
  });
});
