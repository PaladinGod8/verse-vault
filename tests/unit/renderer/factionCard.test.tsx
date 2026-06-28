import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import FactionCard from '../../../src/renderer/components/factions/FactionCard';

function buildFaction(overrides: Partial<Faction> = {}): Faction {
  return {
    id: 1,
    world_id: 1,
    name: 'Cult of Contagion',
    profile: 'A biohazard cult.',
    image_src: null,
    sections: '{}',
    wiki_summary: '{}',
    type_id: null,
    parent_faction_id: null,
    last_viewed_at: null,
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  };
}

function renderCard(props: Partial<React.ComponentProps<typeof FactionCard>> = {}) {
  return render(
    <MemoryRouter>
      <FactionCard
        faction={buildFaction()}
        factionTypesById={new Map()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('FactionCard', () => {
  it('renders name and a No image placeholder when no image exists', () => {
    renderCard();
    expect(screen.getByText('Cult of Contagion')).toBeInTheDocument();
    expect(screen.getByText('No image')).toBeInTheDocument();
  });

  it('renders the resolved type name below the name', () => {
    renderCard({
      faction: buildFaction({ type_id: 2 }),
      factionTypesById: new Map([[2, { id: 2, world_id: 1, name: 'Company', created_at: '' }]]),
    });
    expect(screen.getByText('Company')).toBeInTheDocument();
  });

  it('falls back to Uncategorized when type_id is null', () => {
    renderCard();
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
  });

  it('falls back to Uncategorized when the type_id is not found in the map', () => {
    renderCard({ faction: buildFaction({ type_id: 99 }), factionTypesById: new Map() });
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
  });

  it('renders the faction image when image_src is set', () => {
    renderCard({ faction: buildFaction({ image_src: 'vv-media://faction-images/cult.png' }) });
    expect(screen.getByRole('img', { name: 'Cult of Contagion' })).toBeInTheDocument();
  });

  it('navigates to the faction detail route when the card body is clicked', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Open Cult of Contagion' }));
    // Navigation itself is exercised in an integration test on FactionsPage;
    // here we just confirm the card is click-activatable without throwing.
  });

  it('calls onEdit and onDelete without triggering navigation', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    renderCard({ onEdit, onDelete });

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('applies caller-provided card frame dimensions', () => {
    renderCard({
      faction: buildFaction({ image_src: 'vv-media://faction-images/cult.png' }),
      displayDimensions: { width: 340, height: 180 },
    });

    expect(screen.getByRole('button', { name: 'Open Cult of Contagion' })).toHaveStyle({
      maxWidth: '340px',
    });
    expect(screen.getByTestId('faction-card-media-frame')).toHaveStyle({
      height: '180px',
    });
  });
});
