import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WikiDetailSummaryListSection } from '../../../../../src/renderer/components/wiki/WikiDetailSections';

describe('WikiDetailSummaryListSection', () => {
  it('renders the title, summary, and list items', () => {
    render(
      <WikiDetailSummaryListSection
        title='Personality'
        summary='Brooding and cunning.'
        items={['Brooding', 'Cunning']}
      />,
    );

    expect(screen.getByText('Personality')).toBeInTheDocument();
    expect(screen.getByText('Brooding and cunning.')).toBeInTheDocument();
    expect(screen.getByText('Brooding')).toBeInTheDocument();
    expect(screen.getByText('Cunning')).toBeInTheDocument();
  });

  it('omits the summary paragraph when no summary is given', () => {
    render(<WikiDetailSummaryListSection title='Personality' items={['Brooding']} />);

    expect(screen.queryByText('Brooding and cunning.')).not.toBeInTheDocument();
    expect(screen.getByText('Brooding')).toBeInTheDocument();
  });

  it('still renders the section with a placeholder when there is no summary or items', () => {
    render(<WikiDetailSummaryListSection title='Personality' items={[]} />);

    expect(screen.getByText('Personality')).toBeInTheDocument();
  });
});
