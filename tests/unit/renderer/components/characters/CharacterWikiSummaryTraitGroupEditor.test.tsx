import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
vi.mock(
  '../../../../../src/renderer/components/ui/RichTextEditor',
  () => import('../../../../helpers/richTextEditorMock'),
);

import CharacterWikiSummaryTraitGroupEditor from '../../../../../src/renderer/components/characters/CharacterWikiSummaryTraitGroupEditor';

describe('CharacterWikiSummaryTraitGroupEditor', () => {
  it('renders the legend, summary textarea, and traits list', () => {
    render(
      <CharacterWikiSummaryTraitGroupEditor
        legend='Personality'
        summary='Brooding and cunning.'
        traits={['Brooding', 'Cunning']}
        onSummaryChange={vi.fn()}
        onTraitsChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Personality')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Brooding and cunning.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Brooding')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cunning')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Traits' })).toBeInTheDocument();
  });

  it('calls onSummaryChange when the summary is edited without touching traits', async () => {
    const user = userEvent.setup();
    const onSummaryChange = vi.fn();
    render(
      <CharacterWikiSummaryTraitGroupEditor
        legend='Personality'
        summary=''
        traits={['Brooding']}
        onSummaryChange={onSummaryChange}
        onTraitsChange={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText('Summary'), 'X');

    expect(onSummaryChange).toHaveBeenCalledWith('X');
  });

  it('calls onTraitsChange when a trait is added', async () => {
    const user = userEvent.setup();
    const onTraitsChange = vi.fn();
    render(
      <CharacterWikiSummaryTraitGroupEditor
        legend='Personality'
        summary=''
        traits={['Brooding']}
        onSummaryChange={vi.fn()}
        onTraitsChange={onTraitsChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add Traits' }));

    expect(onTraitsChange).toHaveBeenCalledWith(['Brooding', '']);
  });

  it('supports a custom traitsLegend label', () => {
    render(
      <CharacterWikiSummaryTraitGroupEditor
        legend='Tenets & Morals'
        traitsLegend='Tenets'
        summary=''
        traits={[]}
        onSummaryChange={vi.fn()}
        onTraitsChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Add Tenets' })).toBeInTheDocument();
  });
});
