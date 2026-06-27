import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CharacterWikiSummaryGroupFields from '../../../../../src/renderer/components/characters/CharacterWikiSummaryGroupFields';

describe('CharacterWikiSummaryGroupFields', () => {
  it('renders an input per field def with its current value', () => {
    render(
      <CharacterWikiSummaryGroupFields
        legend='Biographic Information'
        fields={[{ key: 'birthName', label: 'Birth Name' }, {
          key: 'mainEpithet',
          label: 'Main Epithet',
        }]}
        values={{ birthName: 'Ledros Igni', mainEpithet: null }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Biographic Information')).toBeInTheDocument();
    expect(screen.getByLabelText('Birth Name')).toHaveValue('Ledros Igni');
    expect(screen.getByLabelText('Main Epithet')).toHaveValue('');
  });

  it('calls onChange with the field key and new value when edited', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CharacterWikiSummaryGroupFields
        legend='Biographic Information'
        fields={[{ key: 'birthName', label: 'Birth Name' }]}
        values={{}}
        onChange={onChange}
      />,
    );

    await user.type(screen.getByLabelText('Birth Name'), 'X');

    expect(onChange).toHaveBeenCalledWith('birthName', 'X');
  });
});
