import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WikiDetailVicesVirtuesSection } from '../../../../../src/renderer/components/wiki/WikiDetailSections';

describe('WikiDetailVicesVirtuesSection', () => {
  it('renders the summary and both lists', () => {
    render(
      <WikiDetailVicesVirtuesSection
        summary='A sliver of heroism remains.'
        vices={['Alcoholism']}
        virtues={['Outgoing']}
      />,
    );

    expect(screen.getByText('Vices & Virtues')).toBeInTheDocument();
    expect(screen.getByText('A sliver of heroism remains.')).toBeInTheDocument();
    expect(screen.getByText('Alcoholism')).toBeInTheDocument();
    expect(screen.getByText('Outgoing')).toBeInTheDocument();
  });

  it('still renders the section with placeholders when both lists are empty', () => {
    render(<WikiDetailVicesVirtuesSection vices={[]} virtues={[]} />);

    expect(screen.getByText('Vices & Virtues')).toBeInTheDocument();
  });
});
