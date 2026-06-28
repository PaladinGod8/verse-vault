import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FactionForm from '../../../src/renderer/components/factions/FactionForm';
import { resetWindowDb, setupWindowDb } from '../../helpers/ipcMock';

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
  beforeEach(() => {
    setupWindowDb();
    resetWindowDb();
    (window.db.characters.searchByWorld as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [],
      hasMore: false,
    });
  });

  it('shows every existing member row when editing a faction with multiple members', async () => {
    const ledros = buildCharacter({ id: 9, name: 'Ledros Igni' });
    const borin = buildCharacter({ id: 10, name: 'Borin' });
    (window.db.characters.getById as ReturnType<typeof vi.fn>).mockImplementation((id: number) =>
      Promise.resolve(id === 9 ? ledros : id === 10 ? borin : null)
    );

    render(
      <FactionForm
        initialValues={{
          name: 'Cult of Contagion',
          profile: null,
          sections: {},
          wiki_summary: {},
          type_id: null,
          parent_faction_id: null,
          members: [
            { character_id: 9, role: 'founder' },
            { character_id: 10, role: 'member' },
          ],
        }}
        factionId={1}
        allFactionsInWorld={[]}
        factionTypes={[]}
        worldId={1}
        onManageTypes={vi.fn()}
        onSave={vi.fn()}
        onClose={vi.fn()}
        isSaving={false}
      />,
    );

    expect(screen.getAllByRole('combobox', { name: 'Member character' })).toHaveLength(2);
    await screen.findByDisplayValue('Ledros Igni');
    await screen.findByDisplayValue('Borin');
  });

  it('requires a name before submitting', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <FactionForm
        allFactionsInWorld={[]}
        factionTypes={[]}
        worldId={1}
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
        worldId={1}
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
        worldId={1}
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

  it('drops an incomplete member row (no character picked) from the save payload', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const ledros = buildCharacter({ id: 9, name: 'Ledros Igni' });
    (window.db.characters.searchByWorld as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [ledros],
      hasMore: false,
    });

    render(
      <FactionForm
        initialValues={{
          name: 'Cult of Contagion',
          profile: null,
          sections: {},
          wiki_summary: {},
          type_id: null,
          parent_faction_id: null,
          members: [{ character_id: 9, role: 'founder' }],
        }}
        factionId={1}
        allFactionsInWorld={[]}
        factionTypes={[]}
        worldId={1}
        onManageTypes={vi.fn()}
        onSave={onSave}
        onClose={vi.fn()}
        isSaving={false}
      />,
    );

    // Click "Add Member" but never pick a character for the new row - it stays at
    // the character_id 0 sentinel ("Select a character...").
    await user.click(screen.getByRole('button', { name: 'Add Member' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ members: [{ character_id: 9, role: 'founder' }] }),
    );
  });

  it('adds and removes member rows', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const character = buildCharacter({ id: 9, name: 'Ledros Igni' });
    (window.db.characters.searchByWorld as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [character],
      hasMore: false,
    });

    render(
      <FactionForm
        allFactionsInWorld={[]}
        factionTypes={[]}
        worldId={1}
        onManageTypes={vi.fn()}
        onSave={onSave}
        onClose={vi.fn()}
        isSaving={false}
      />,
    );

    await user.type(screen.getByLabelText('Name *'), 'New Faction');
    await user.click(screen.getByRole('button', { name: 'Add Member' }));

    const characterCombobox = screen.getByRole('combobox', { name: 'Member character' });
    await user.click(characterCombobox);
    await user.click(await screen.findByText('Ledros Igni'));
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

  it("excludes a row's already-selected character from other rows' search results", async () => {
    const user = userEvent.setup();
    const ledros = buildCharacter({ id: 9, name: 'Ledros Igni' });
    const borin = buildCharacter({ id: 10, name: 'Borin' });
    const searchMock = window.db.characters.searchByWorld as ReturnType<typeof vi.fn>;
    searchMock.mockResolvedValue({ items: [ledros, borin], hasMore: false });

    render(
      <FactionForm
        allFactionsInWorld={[]}
        factionTypes={[]}
        worldId={1}
        onManageTypes={vi.fn()}
        onSave={vi.fn()}
        onClose={vi.fn()}
        isSaving={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add Member' }));
    const firstCombobox = screen.getByRole('combobox', { name: 'Member character' });
    await user.click(firstCombobox);
    await user.click(await screen.findByText('Ledros Igni'));

    searchMock.mockClear();
    searchMock.mockResolvedValue({ items: [borin], hasMore: false });
    await user.click(screen.getByRole('button', { name: 'Add Member' }));
    const comboboxes = screen.getAllByRole('combobox', { name: 'Member character' });
    await user.click(comboboxes[1]);

    await waitFor(() =>
      expect(searchMock).toHaveBeenCalledWith(
        expect.objectContaining({ excludeCharacterIds: [9] }),
      )
    );
  });

  it('opens the manage types callback when clicked', async () => {
    const user = userEvent.setup();
    const onManageTypes = vi.fn();
    render(
      <FactionForm
        allFactionsInWorld={[]}
        factionTypes={[]}
        worldId={1}
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
