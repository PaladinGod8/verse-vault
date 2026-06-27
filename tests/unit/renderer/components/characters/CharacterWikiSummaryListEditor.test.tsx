import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CharacterWikiSummaryListEditor from '../../../../../src/renderer/components/characters/CharacterWikiSummaryListEditor';

describe('CharacterWikiSummaryListEditor', () => {
  it('renders an input per existing item plus an Add button', () => {
    render(
      <CharacterWikiSummaryListEditor
        legend='Conditions'
        items={['Perfect Primal', 'Amputee (Right Hand)']}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('Perfect Primal')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Amputee (Right Hand)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Conditions' })).toBeInTheDocument();
  });

  it('appends a new empty item when Add is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CharacterWikiSummaryListEditor legend='Conditions' items={['A']} onChange={onChange} />,
    );

    await user.click(screen.getByRole('button', { name: 'Add Conditions' }));

    expect(onChange).toHaveBeenCalledWith(['A', '']);
  });

  it('removes an item when its Remove button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CharacterWikiSummaryListEditor
        legend='Conditions'
        items={['A', 'B']}
        onChange={onChange}
      />,
    );

    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0]);

    expect(onChange).toHaveBeenCalledWith(['B']);
  });

  it('updates an item value when edited', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CharacterWikiSummaryListEditor legend='Conditions' items={['A']} onChange={onChange} />,
    );

    await user.type(screen.getByDisplayValue('A'), 'X');

    expect(onChange).toHaveBeenCalledWith(['AX']);
  });
});
