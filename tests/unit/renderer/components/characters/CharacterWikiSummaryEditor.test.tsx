import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CharacterWikiSummaryEditor from '../../../../../src/renderer/components/characters/CharacterWikiSummaryEditor';
import type { CharacterWikiSummary } from '../../../../../src/shared/contracts/characterTypes';

describe('CharacterWikiSummaryEditor', () => {
  it('renders all group legends and list editor legends', () => {
    render(<CharacterWikiSummaryEditor wikiSummary={{}} onChange={vi.fn()} />);

    expect(screen.getByText('Biographic Information')).toBeInTheDocument();
    expect(screen.getByText('Personal Description')).toBeInTheDocument();
    expect(screen.getByText('Status & Demographics')).toBeInTheDocument();
    expect(screen.getByText('Trivia')).toBeInTheDocument();
    expect(screen.getByText('Aliases')).toBeInTheDocument();
    expect(screen.getByText('Titles')).toBeInTheDocument();
    expect(screen.getByText('Ages & Timeline')).toBeInTheDocument();
    expect(screen.getByText('Conditions')).toBeInTheDocument();
    expect(screen.getByText('Educational History')).toBeInTheDocument();
    expect(screen.getByText('Occupational History')).toBeInTheDocument();
  });

  it('patches the biographic group without disturbing other groups', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const wikiSummary: CharacterWikiSummary = {
      personalDescription: { weight: '90kg' },
    };
    render(<CharacterWikiSummaryEditor wikiSummary={wikiSummary} onChange={onChange} />);

    await user.type(screen.getByLabelText('Main Epithet'), 'X');

    expect(onChange).toHaveBeenCalledWith({
      personalDescription: { weight: '90kg' },
      biographic: { mainEpithet: 'X' },
    });
  });

  it('patches the conditions list independently', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CharacterWikiSummaryEditor
        wikiSummary={{ conditions: ['Perfect Primal'] }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add Conditions' }));

    expect(onChange).toHaveBeenCalledWith({
      conditions: ['Perfect Primal', ''],
    });
  });
});
