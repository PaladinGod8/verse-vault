import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CampaignNoteMetadataForm from '../../../src/renderer/components/campaignNotes/CampaignNoteMetadataForm';

describe('CampaignNoteMetadataForm', () => {
  it('shows validation error for blank name and clears it on input', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <CampaignNoteMetadataForm
        onSave={onSave}
        onClose={vi.fn()}
        isSaving={false}
        tagVocabulary={[]}
        submitLabel='Create note'
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Create note' }));

    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Name *'), 'Boss');

    expect(screen.queryByText('Name is required.')).not.toBeInTheDocument();
  });

  it('submits trimmed name and prefilled tags', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <CampaignNoteMetadataForm
        initialValues={{ name: '  Boss Arena  ', tags: ['Encounter'] }}
        onSave={onSave}
        onClose={vi.fn()}
        isSaving={false}
        tagVocabulary={['Encounter']}
        submitLabel='Save'
      />,
    );

    expect(screen.getByLabelText('Name *')).toHaveValue('  Boss Arena  ');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'Boss Arena',
      tags: ['Encounter'],
    });
  });

  it('disables actions while saving and triggers close from cancel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { rerender } = render(
      <CampaignNoteMetadataForm
        onSave={vi.fn()}
        onClose={onClose}
        isSaving={false}
        tagVocabulary={[]}
        submitLabel='Create note'
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <CampaignNoteMetadataForm
        onSave={vi.fn()}
        onClose={onClose}
        isSaving={true}
        tagVocabulary={[]}
        submitLabel='Create note'
      />,
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Create note' })).toBeDisabled();
    expect(document.querySelector('.loading-spinner')).not.toBeNull();
  });
});
