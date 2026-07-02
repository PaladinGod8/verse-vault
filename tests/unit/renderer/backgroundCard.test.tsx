import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import BackgroundCard from '../../../src/renderer/components/backgrounds/BackgroundCard';

function buildBackground(overrides: Partial<Background> = {}): Background {
  return {
    id: 1,
    world_id: 1,
    name: 'Royal Guard',
    description: 'Elite city soldiers.',
    image_src: null,
    last_viewed_at: null,
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  };
}

function renderCard(props: Partial<React.ComponentProps<typeof BackgroundCard>> = {}) {
  return render(
    <MemoryRouter>
      <BackgroundCard
        background={buildBackground()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('BackgroundCard', () => {
  it('renders name, description, and No image placeholder', () => {
    renderCard();
    expect(screen.getByText('Royal Guard')).toBeInTheDocument();
    expect(screen.getByText('Elite city soldiers.')).toBeInTheDocument();
    expect(screen.getByText('No image')).toBeInTheDocument();
  });

  it('renders image when image_src set', () => {
    renderCard({
      background: buildBackground({ image_src: 'vv-media://background-images/guard.png' }),
    });
    expect(screen.getByRole('img', { name: 'Royal Guard' })).toBeInTheDocument();
  });

  it('card body click is navigation-safe', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Open Royal Guard' }));
  });

  it('calls onEdit and onDelete without navigation', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    renderCard({ onEdit, onDelete });

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('applies caller-provided dimensions', () => {
    renderCard({ displayDimensions: { width: 340, height: 180 } });

    expect(screen.getByRole('button', { name: 'Open Royal Guard' })).toHaveStyle({
      maxWidth: '340px',
    });
    expect(screen.getByTestId('background-card-media-frame')).toHaveStyle({
      height: '180px',
    });
  });
});
