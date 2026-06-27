import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CharacterCard from '../../../src/renderer/components/characters/CharacterCard';

function buildCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 1,
    world_id: 1,
    name: 'Ledros Igni',
    profile: 'A bitter dragonborn.',
    image_src: null,
    sections: '{}',
    wiki_summary: '{}',
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  };
}

describe('CharacterCard', () => {
  it('renders name as the primary attribute with a fallback when no image exists', () => {
    render(
      <CharacterCard
        character={buildCharacter()}
        onOpen={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Ledros Igni')).toBeInTheDocument();
    expect(screen.getByText('No image')).toBeInTheDocument();
  });

  it('renders main epithet and primary faction as smaller secondary attributes below the name', () => {
    render(
      <CharacterCard
        character={buildCharacter({
          wiki_summary: JSON.stringify({
            biographic: { mainEpithet: 'The Brandslayer' },
            statusDemographics: { primaryFaction: 'Constellation Company' },
          }),
        })}
        onOpen={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('The Brandslayer')).toBeInTheDocument();
    expect(screen.getByText('Constellation Company')).toBeInTheDocument();
  });

  it('renders the character image when image_src is set', () => {
    render(
      <CharacterCard
        character={buildCharacter({ image_src: 'vv-media://character-images/ledros.png' })}
        onOpen={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole('img', { name: 'Ledros Igni' })).toBeInTheDocument();
  });

  it('opens from card keyboard events but ignores child keydown events', () => {
    const onOpen = vi.fn();

    render(
      <CharacterCard
        character={buildCharacter()}
        onOpen={onOpen}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const card = screen.getByRole('button', { name: 'Open Ledros Igni' });
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Edit' }), { key: 'Enter' });

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('stops propagation for edit and delete button clicks', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <CharacterCard
        character={buildCharacter()}
        onOpen={onOpen}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('shows deleting state on the delete button', () => {
    render(
      <CharacterCard
        character={buildCharacter()}
        onOpen={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        isDeleting
      />,
    );

    expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
  });
});
