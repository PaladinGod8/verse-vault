import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CharacterQuotesSection from '../../../../../src/renderer/components/characters/CharacterQuotesSection';

describe('CharacterQuotesSection', () => {
  it('renders one quote card per quote', () => {
    render(
      <CharacterQuotesSection
        quotes={[
          { context: '(To Vox):', text: 'First quote.', speaker: 'Ledros Igni' },
          { text: 'Second quote.' },
        ]}
      />,
    );

    expect(screen.getByText('"First quote."')).toBeInTheDocument();
    expect(screen.getByText('"Second quote."')).toBeInTheDocument();
    expect(screen.getByText('~ Ledros Igni')).toBeInTheDocument();
  });

  it('shows a placeholder message when there are no quotes', () => {
    render(<CharacterQuotesSection quotes={[]} />);

    expect(screen.getByText('Quotes')).toBeInTheDocument();
    expect(screen.getByText('No quotes yet.')).toBeInTheDocument();
  });
});
