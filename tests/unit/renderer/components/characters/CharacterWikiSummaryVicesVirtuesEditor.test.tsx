import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CharacterWikiSummaryVicesVirtuesEditor from '../../../../../src/renderer/components/characters/CharacterWikiSummaryVicesVirtuesEditor';

describe('CharacterWikiSummaryVicesVirtuesEditor', () => {
  it('renders the legend, summary textarea, and both lists', () => {
    render(
      <CharacterWikiSummaryVicesVirtuesEditor
        summary='A sliver of heroism remains.'
        vices={['Alcoholism']}
        virtues={['Outgoing']}
        onSummaryChange={vi.fn()}
        onVicesChange={vi.fn()}
        onVirtuesChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Vices & Virtues')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A sliver of heroism remains.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Alcoholism')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Outgoing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Vices' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Virtues' })).toBeInTheDocument();
  });

  it('calls onVicesChange without disturbing virtues', async () => {
    const user = userEvent.setup();
    const onVicesChange = vi.fn();
    render(
      <CharacterWikiSummaryVicesVirtuesEditor
        summary=''
        vices={['Alcoholism']}
        virtues={['Outgoing']}
        onSummaryChange={vi.fn()}
        onVicesChange={onVicesChange}
        onVirtuesChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add Vices' }));

    expect(onVicesChange).toHaveBeenCalledWith(['Alcoholism', '']);
  });

  it('calls onVirtuesChange without disturbing vices', async () => {
    const user = userEvent.setup();
    const onVirtuesChange = vi.fn();
    render(
      <CharacterWikiSummaryVicesVirtuesEditor
        summary=''
        vices={['Alcoholism']}
        virtues={['Outgoing']}
        onSummaryChange={vi.fn()}
        onVicesChange={vi.fn()}
        onVirtuesChange={onVirtuesChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add Virtues' }));

    expect(onVirtuesChange).toHaveBeenCalledWith(['Outgoing', '']);
  });
});
