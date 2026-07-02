import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CharacterWikiSummaryQuoteListEditor from '../../../../../src/renderer/components/characters/CharacterWikiSummaryQuoteListEditor';

describe('CharacterWikiSummaryQuoteListEditor', () => {
  it('renders context, text, and speaker inputs per existing item', () => {
    render(
      <CharacterWikiSummaryQuoteListEditor
        items={[{ context: '(To Vox):', text: 'I will carve you.', speaker: 'Ledros Igni' }]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Quotes')).toBeInTheDocument();
    expect(screen.getByDisplayValue('(To Vox):')).toBeInTheDocument();
    expect(screen.getByDisplayValue('I will carve you.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ledros Igni')).toBeInTheDocument();
  });

  it('appends a blank quote row when Add Quote is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CharacterWikiSummaryQuoteListEditor items={[]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Add Quote' }));

    expect(onChange).toHaveBeenCalledWith([{ context: '', text: '', speaker: '' }]);
  });

  it('removes a quote row when its Remove button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CharacterWikiSummaryQuoteListEditor
        items={[
          { context: '', text: 'A', speaker: '' },
          { context: '', text: 'B', speaker: '' },
        ]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0]);

    expect(onChange).toHaveBeenCalledWith([{ context: '', text: 'B', speaker: '' }]);
  });

  it('updates the speaker field independently of context and text', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CharacterWikiSummaryQuoteListEditor
        items={[{ context: 'C', text: 'T', speaker: 'S' }]}
        onChange={onChange}
      />,
    );

    await user.type(screen.getByDisplayValue('S'), 'X');

    expect(onChange).toHaveBeenCalledWith([{ context: 'C', text: 'T', speaker: 'SX' }]);
  });
});
