import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CharacterWikiSummaryAgesTimelineEditor from '../../../../../src/renderer/components/characters/CharacterWikiSummaryAgesTimelineEditor';

describe('CharacterWikiSummaryAgesTimelineEditor', () => {
  it('renders age and reference inputs per existing row', () => {
    render(
      <CharacterWikiSummaryAgesTimelineEditor
        items={[{ age: '10', reference: 'Tale of Three (Ch. 1)' }]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Tale of Three (Ch. 1)')).toBeInTheDocument();
  });

  it('appends a new empty row when Add is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CharacterWikiSummaryAgesTimelineEditor items={[]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Add Ages & Timeline' }));

    expect(onChange).toHaveBeenCalledWith([{ age: '', reference: '' }]);
  });

  it('removes a row when its Remove button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CharacterWikiSummaryAgesTimelineEditor
        items={[{ age: '10', reference: 'A' }, { age: '20', reference: 'B' }]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0]);

    expect(onChange).toHaveBeenCalledWith([{ age: '20', reference: 'B' }]);
  });
});
