import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CharacterCard from '../../../src/renderer/components/characters/CharacterCard';

function buildCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 1,
    world_id: 1,
    name: 'Ledros Igni',
    profile: 'A bitter dragonborn.',
    is_player_character: 0,
    owner: null,
    author: null,
    image_src: null,
    sections: '{}',
    wiki_summary: '{}',
    last_viewed_at: null,
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  };
}

function renderCard(props: Partial<React.ComponentProps<typeof CharacterCard>> = {}) {
  return render(
    <MemoryRouter>
      <CharacterCard
        character={buildCharacter()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('CharacterCard', () => {
  it('renders name as the primary attribute with a fallback when no image exists', () => {
    renderCard();

    expect(screen.getByText('Ledros Igni')).toBeInTheDocument();
    expect(screen.getByText('No image')).toBeInTheDocument();
  });

  it('renders main epithet as a smaller secondary attribute below the name', () => {
    renderCard({
      character: buildCharacter({
        wiki_summary: JSON.stringify({
          biographic: { mainEpithet: 'The Brandslayer' },
        }),
      }),
    });

    expect(screen.getByText('The Brandslayer')).toBeInTheDocument();
  });

  it('renders the primary faction name below the epithet', () => {
    renderCard({
      character: buildCharacter({
        wiki_summary: JSON.stringify({
          biographic: { mainEpithet: 'The Brandslayer' },
        }),
      }),
      primaryFactionName: 'Cult of Contagion',
    });

    expect(screen.getByText('Cult of Contagion')).toBeInTheDocument();
  });

  it('renders no primary faction text when the character has no primary faction', () => {
    renderCard();

    expect(screen.queryByText('Cult of Contagion')).not.toBeInTheDocument();
  });

  it('renders the character image when image_src is set', () => {
    renderCard({
      character: buildCharacter({ image_src: 'vv-media://character-images/ledros.png' }),
    });

    expect(screen.getByRole('img', { name: 'Ledros Igni' })).toBeInTheDocument();
  });

  it('is keyboard-activatable on the card body but not via child keydown events', () => {
    renderCard();

    const card = screen.getByRole('button', { name: 'Open Ledros Igni' });
    expect(() => {
      fireEvent.keyDown(card, { key: 'Enter' });
      fireEvent.keyDown(screen.getByRole('button', { name: 'Edit' }), { key: 'Enter' });
    }).not.toThrow();
  });

  it('stops propagation for edit and delete button clicks', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    renderCard({ onEdit, onDelete });

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('shows deleting state on the delete button', () => {
    renderCard({ isDeleting: true });

    expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
  });

  it('applies caller-provided card frame dimensions', () => {
    renderCard({
      character: buildCharacter({ image_src: 'vv-media://character-images/ledros.png' }),
      displayDimensions: { width: 360, height: 220 },
    });

    expect(screen.getByRole('button', { name: 'Open Ledros Igni' })).toHaveStyle({
      maxWidth: '360px',
    });
    expect(screen.getByTestId('character-card-media-frame')).toHaveStyle({
      height: '220px',
    });
  });
});
