import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CharacterRelationshipsPanel from '../../../src/renderer/components/characters/CharacterRelationshipsPanel';
import type { CharacterRelationshipView } from '../../../src/shared/contracts/dbApiPayloads';
import { resetWindowDb, setupWindowDb } from '../../helpers/ipcMock';

function buildCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 2,
    world_id: 1,
    name: 'Agnes',
    profile: null,
    is_player_character: 0,
    owner: null,
    author: null,
    image_src: null,
    sections: '{}',
    wiki_summary: '{}',
    last_viewed_at: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

function buildRelationshipView(
  overrides?: Partial<CharacterRelationshipView>,
): CharacterRelationshipView {
  return {
    id: 1,
    character_id: 1,
    related_character_id: 2,
    character_label: 'Mentor',
    related_label: 'Student',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    counterpart_id: 2,
    counterpart_name: 'Agnes',
    subject_label: 'Mentor',
    counterpart_label: 'Student',
    ...overrides,
  };
}

function renderPanel() {
  return render(
    <MemoryRouter>
      <CharacterRelationshipsPanel characterId={1} worldId={1} />
    </MemoryRouter>,
  );
}

describe('CharacterRelationshipsPanel', () => {
  beforeEach(() => {
    setupWindowDb();
    resetWindowDb();
    (window.db.characters.searchByWorld as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => undefined),
    );
  });

  it('shows the empty state when the character has no tracked relationships', async () => {
    (window.db.characterRelationships.getAllByCharacter as ReturnType<typeof vi.fn>)
      .mockResolvedValue([]);

    renderPanel();

    expect(await screen.findByText('No tracked relationships yet.')).toBeInTheDocument();
  });

  it("renders a relationship row with the counterpart name and this character's label for them", async () => {
    (window.db.characterRelationships.getAllByCharacter as ReturnType<typeof vi.fn>)
      .mockResolvedValue([buildRelationshipView()]);

    renderPanel();

    expect(await screen.findByRole('link', { name: 'Agnes' })).toHaveAttribute(
      'href',
      '/world/1/characters/2',
    );
    expect(screen.getByText('(Mentor)')).toBeInTheDocument();
  });

  it('adds a relationship by picking a counterpart and filling in both labels', async () => {
    const user = userEvent.setup();
    const getAllMock = window.db.characterRelationships.getAllByCharacter as ReturnType<
      typeof vi.fn
    >;
    getAllMock.mockResolvedValue([]);
    (window.db.characters.searchByWorld as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [buildCharacter()],
      hasMore: false,
    });
    (window.db.characterRelationships.add as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
    });

    renderPanel();
    await screen.findByText('No tracked relationships yet.');

    await user.click(screen.getByRole('button', { name: 'Add Relationship' }));
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText('Agnes'));
    await user.type(
      screen.getByLabelText('This character calls them'),
      'Mentor',
    );
    await user.type(
      screen.getByLabelText('They call this character'),
      'Student',
    );
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(window.db.characterRelationships.add).toHaveBeenCalledWith({
      character_id: 1,
      related_character_id: 2,
      character_label: 'Mentor',
      related_label: 'Student',
    });
  });

  it('removes a relationship after confirming', async () => {
    const user = userEvent.setup();
    (window.db.characterRelationships.getAllByCharacter as ReturnType<typeof vi.fn>)
      .mockResolvedValue([buildRelationshipView()]);
    (window.db.characterRelationships.delete as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
    });

    renderPanel();
    await screen.findByRole('link', { name: 'Agnes' });

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }));

    expect(window.db.characterRelationships.delete).toHaveBeenCalledWith(1);
  });

  it('edits a relationship where the viewed character is stored as related_character_id, writing labels to the correct DB columns', async () => {
    // DB row: character_id=1 (Myra), related_character_id=99 (Agnes). We view Agnes's page
    // (characterId=1 for this render is the OTHER character - here we render as character
    // id 1 but simulate the DB row where the viewed id is on the "related" side by giving
    // the row related_character_id equal to the panel's own characterId).
    const user = userEvent.setup();
    (window.db.characterRelationships.getAllByCharacter as ReturnType<typeof vi.fn>)
      .mockResolvedValue([
        buildRelationshipView({
          id: 5,
          character_id: 99,
          related_character_id: 1,
          character_label: 'Mentor',
          related_label: 'Student',
          counterpart_id: 99,
          counterpart_name: 'Myra',
          subject_label: 'Student',
          counterpart_label: 'Mentor',
        }),
      ]);
    (window.db.characterRelationships.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 5,
    });

    renderPanel();
    await screen.findByRole('link', { name: 'Myra' });

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const characterLabelInput = screen.getByLabelText('This character calls them');
    const relatedLabelInput = screen.getByLabelText('They call this character');
    expect(characterLabelInput).toHaveValue('Student');
    expect(relatedLabelInput).toHaveValue('Mentor');
    await user.clear(characterLabelInput);
    await user.type(characterLabelInput, 'Old Friend');
    await user.clear(relatedLabelInput);
    await user.type(relatedLabelInput, 'Confidant');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    // The viewed character (id 1) is stored as related_character_id on this row, so its
    // new label ("Old Friend") must land in the DB's related_label column, and the
    // counterpart's new label ("Confidant") must land in character_label - not a literal
    // pass-through of the form's field names.
    expect(window.db.characterRelationships.update).toHaveBeenCalledWith(5, {
      character_label: 'Confidant',
      related_label: 'Old Friend',
    });
  });
});
