import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CharacterWikiSummaryDetail from '../../../../../src/renderer/components/characters/CharacterWikiSummaryDetail';
import type { CharacterWikiSummary } from '../../../../../src/shared/contracts/characterTypes';

describe('CharacterWikiSummaryDetail', () => {
  it('renders character traits and quotes sections', () => {
    const wikiSummary: CharacterWikiSummary = {
      characterTraits: {
        personality: { summary: 'Brooding and cunning.', traits: ['Brooding', 'Cunning'] },
        vicesAndVirtues: {
          summary: 'A sliver of heroism remains.',
          vices: ['Alcoholism'],
          virtues: ['Outgoing'],
        },
      },
      quotes: [{ context: '(To Vox):', text: 'I will carve you.', speaker: 'Ledros Igni' }],
    };

    render(<CharacterWikiSummaryDetail wikiSummary={wikiSummary} />);

    expect(screen.getByText('Personality')).toBeInTheDocument();
    expect(screen.getByText('Brooding and cunning.')).toBeInTheDocument();
    expect(screen.getByText('Vices & Virtues')).toBeInTheDocument();
    expect(screen.getByText('Alcoholism')).toBeInTheDocument();
    expect(screen.getByText('"I will carve you."')).toBeInTheDocument();
    expect(screen.getByText('~ Ledros Igni')).toBeInTheDocument();
  });

  it('still renders the new sections with placeholders when empty', () => {
    render(<CharacterWikiSummaryDetail wikiSummary={{}} />);

    expect(screen.getByText('Physical')).toBeInTheDocument();
    expect(screen.getByText('No quotes yet.')).toBeInTheDocument();
  });
});
