import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FactionForm from '../../../src/renderer/components/factions/FactionForm';

function buildFaction(overrides: Partial<Faction> = {}): Faction {
  return {
    id: 1,
    world_id: 1,
    name: 'Faction A',
    profile: null,
    image_src: null,
    sections: '{}',
    wiki_summary: '{}',
    type_id: null,
    parent_faction_id: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

function buildCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 1,
    world_id: 1,
    name: 'Ledros Igni',
    profile: null,
    is_player_character: 0,
    owner: null,
    author: null,
    image_src: null,
    sections: '{}',
    wiki_summary: '{}',
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('FactionForm', () => {
  it('requires a name before submitting', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <FactionForm
        allFactionsInWorld={[]}
        factionTypes={[]}
        charactersInWorld={[]}
        onManageTypes={vi.fn()}
        onSave={onSave}
        onClose={vi.fn()}
        isSaving={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submits name, profile, sections, type, and parent on create', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const parentFaction = buildFaction({ id: 5, name: 'Parent Co' });
    const factionType = { id: 2, world_id: 1, name: 'Company', created_at: '' };

    render(
      <FactionForm
        allFactionsInWorld={[parentFaction]}
        factionTypes={[factionType]}
        charactersInWorld={[]}
        onManageTypes={vi.fn()}
        onSave={onSave}
        onClose={vi.fn()}
        isSaving={false}
      />,
    );

    await user.type(screen.getByLabelText('Name *'), 'New Faction');
    await user.type(screen.getByLabelText('Profile'), 'A short profile');
    await user.selectOptions(screen.getByLabelText('Type'), '2');
    await user.selectOptions(screen.getByLabelText('Parent Organization'), '5');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Faction',
        profile: 'A short profile',
        type_id: 2,
        parent_faction_id: 5,
      }),
    );
  });

  it('rejects a parent assignment that would create a cycle, without calling onSave', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    // tree: 1 (this faction, editing) -> 2 (child) -> 3 (grandchild)
    const faction = buildFaction({ id: 1, name: 'Root' });
    const child = buildFaction({ id: 2, name: 'Child', parent_faction_id: 1 });
    const grandchild = buildFaction({ id: 3, name: 'Grandchild', parent_faction_id: 2 });

    render(
      <FactionForm
        initialValues={{
          name: 'Root',
          profile: null,
          sections: {},
          wiki_summary: {},
          type_id: null,
          parent_faction_id: null,
          members: [],
        }}
        factionId={1}
        allFactionsInWorld={[faction, child, grandchild]}
        factionTypes={[]}
        charactersInWorld={[]}
        onManageTypes={vi.fn()}
        onSave={onSave}
        onClose={vi.fn()}
        isSaving={false}
      />,
    );

    // Grandchild (id 3) should not even be selectable as root's parent since it's a descendant.
    const parentSelect = screen.getByLabelText('Parent Organization') as HTMLSelectElement;
    const optionValues = Array.from(parentSelect.options).map((option) => option.value);
    expect(optionValues).not.toContain('3');
    expect(optionValues).not.toContain('2');
    expect(optionValues).not.toContain('1');

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalled();
  });

  it('adds and removes member rows', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const character = buildCharacter({ id: 9, name: 'Ledros Igni' });

    render(
      <FactionForm
        allFactionsInWorld={[]}
        factionTypes={[]}
        charactersInWorld={[character]}
        onManageTypes={vi.fn()}
        onSave={onSave}
        onClose={vi.fn()}
        isSaving={false}
      />,
    );

    await user.type(screen.getByLabelText('Name *'), 'New Faction');
    await user.click(screen.getByRole('button', { name: 'Add Member' }));

    const characterSelects = screen.getAllByLabelText('Member character');
    await user.selectOptions(characterSelects[0], '9');
    const roleInputs = screen.getAllByLabelText('Member role');
    await user.clear(roleInputs[0]);
    await user.type(roleInputs[0], 'founder');

    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        members: [{ character_id: 9, role: 'founder' }],
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Remove member' }));
    expect(screen.queryAllByLabelText('Member character')).toHaveLength(0);
  });

  it('opens the manage types callback when clicked', async () => {
    const user = userEvent.setup();
    const onManageTypes = vi.fn();
    render(
      <FactionForm
        allFactionsInWorld={[]}
        factionTypes={[]}
        charactersInWorld={[]}
        onManageTypes={onManageTypes}
        onSave={vi.fn()}
        onClose={vi.fn()}
        isSaving={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Manage Types' }));
    expect(onManageTypes).toHaveBeenCalledTimes(1);
  });
});
