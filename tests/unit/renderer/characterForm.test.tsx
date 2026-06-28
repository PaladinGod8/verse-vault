import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CharacterForm from '../../../src/renderer/components/characters/CharacterForm';

describe('CharacterForm', () => {
  it('requires a name before submitting', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<CharacterForm onSave={onSave} onClose={vi.fn()} isSaving={false} />);

    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submits name, profile, author, sections, and an empty wiki summary on create', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<CharacterForm onSave={onSave} onClose={vi.fn()} isSaving={false} />);

    await user.type(screen.getByLabelText('Name *'), 'Ledros Igni');
    await user.type(screen.getByLabelText('Profile'), 'A bitter dragonborn.');
    await user.type(screen.getByLabelText('Author'), 'GamingGator');
    await user.type(screen.getByLabelText('Background'), 'Outcasted.');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ledros Igni',
        profile: 'A bitter dragonborn.',
        author: 'GamingGator',
        sections: expect.objectContaining({ background: 'Outcasted.' }),
        wiki_summary: {},
      }),
    );
  });

  it('includes edited wiki summary fields in the submitted payload', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<CharacterForm onSave={onSave} onClose={vi.fn()} isSaving={false} />);

    await user.type(screen.getByLabelText('Name *'), 'Ledros Igni');
    await user.type(screen.getByLabelText('Main Epithet'), 'The Brandslayer');
    await user.type(screen.getByLabelText('Status'), 'Active');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        wiki_summary: {
          biographic: { mainEpithet: 'The Brandslayer' },
          statusDemographics: { status: 'Active' },
        },
      }),
    );
  });

  it('prefills from initialValues and shows Save on edit', async () => {
    render(
      <CharacterForm
        initialValues={{
          name: 'Ledros Igni',
          profile: 'A bitter dragonborn.',
          author: 'GamingGator',
          sections: { background: 'Outcasted.' },
          wiki_summary: { biographic: { mainEpithet: 'The Brandslayer' } },
        }}
        onSave={vi.fn()}
        onClose={vi.fn()}
        isSaving={false}
      />,
    );

    expect(screen.getByLabelText('Name *')).toHaveValue('Ledros Igni');
    expect(screen.getByLabelText('Author')).toHaveValue('GamingGator');
    expect(screen.getByLabelText('Background')).toHaveValue('Outcasted.');
    expect(screen.getByLabelText('Main Epithet')).toHaveValue('The Brandslayer');
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByTestId('editor-action-bar')).toContainElement(
      screen.getByRole('button', { name: 'Save' }),
    );
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CharacterForm onSave={vi.fn()} onClose={onClose} isSaving={false} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
