import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CharacterQuoteCard from '../../../../../src/renderer/components/characters/CharacterQuoteCard';

describe('CharacterQuoteCard', () => {
  it('renders the quote text, context, and speaker', () => {
    render(
      <CharacterQuoteCard
        context='(To Vox):'
        text="I'll carve you until you're no different a frenzied mess than I am."
        speaker='Ledros Igni'
      />,
    );

    expect(screen.getByText('(To Vox):')).toBeInTheDocument();
    expect(
      screen.getByText(`"I'll carve you until you're no different a frenzied mess than I am."`),
    ).toBeInTheDocument();
    expect(screen.getByText('~ Ledros Igni')).toBeInTheDocument();
  });

  it('omits context and speaker when not given', () => {
    render(<CharacterQuoteCard text='Just a quote.' />);

    expect(screen.getByText('"Just a quote."')).toBeInTheDocument();
    expect(screen.queryByText(/^~/)).not.toBeInTheDocument();
  });
});
