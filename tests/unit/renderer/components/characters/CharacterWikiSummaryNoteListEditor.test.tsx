import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CharacterWikiSummaryNoteListEditor from '../../../../../src/renderer/components/characters/CharacterWikiSummaryNoteListEditor';

describe('CharacterWikiSummaryNoteListEditor', () => {
  it('renders text and note inputs per existing item', () => {
    render(
      <CharacterWikiSummaryNoteListEditor
        legend='Aliases'
        items={[{ text: 'Leddy', note: 'by Cag & Annette' }]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('Leddy')).toBeInTheDocument();
    expect(screen.getByDisplayValue('by Cag & Annette')).toBeInTheDocument();
  });

  it('appends a new empty item when Add is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CharacterWikiSummaryNoteListEditor legend='Aliases' items={[]} onChange={onChange} />,
    );

    await user.click(screen.getByRole('button', { name: 'Add Aliases' }));

    expect(onChange).toHaveBeenCalledWith([{ text: '', note: '' }]);
  });

  it('removes an item when its Remove button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CharacterWikiSummaryNoteListEditor
        legend='Aliases'
        items={[{ text: 'A', note: '' }, { text: 'B', note: '' }]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0]);

    expect(onChange).toHaveBeenCalledWith([{ text: 'B', note: '' }]);
  });

  it('updates the text field independently of the note field', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CharacterWikiSummaryNoteListEditor
        legend='Aliases'
        items={[{ text: 'A', note: 'N' }]}
        onChange={onChange}
      />,
    );

    await user.type(screen.getByDisplayValue('A'), 'X');

    expect(onChange).toHaveBeenCalledWith([{ text: 'AX', note: 'N' }]);
  });
});
