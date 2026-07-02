import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ItemCard from '../../../src/renderer/components/items/ItemCard';

const routerMockState = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => routerMockState.navigate,
  };
});

function buildItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 1,
    world_id: 1,
    name: 'Sunblade',
    description: 'Ancient radiant sword.',
    image_src: null,
    last_viewed_at: null,
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  };
}

function renderCard(props: Partial<React.ComponentProps<typeof ItemCard>> = {}) {
  return render(
    <MemoryRouter>
      <ItemCard
        item={buildItem()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('ItemCard', () => {
  beforeEach(() => {
    routerMockState.navigate.mockReset();
  });

  it('renders name, description, and No image placeholder', () => {
    renderCard();
    expect(screen.getByText('Sunblade')).toBeInTheDocument();
    expect(screen.getByText('Ancient radiant sword.')).toBeInTheDocument();
    expect(screen.getByText('No image')).toBeInTheDocument();
  });

  it('renders image when image_src set', () => {
    renderCard({
      item: buildItem({ image_src: 'vv-media://item-images/sunblade.png' }),
    });
    expect(screen.getByRole('img', { name: 'Sunblade' })).toBeInTheDocument();
  });

  it('falls back to No image when item image fails to load', () => {
    renderCard({
      item: buildItem({ image_src: 'vv-media://item-images/broken.png' }),
    });

    fireEvent.error(screen.getByRole('img', { name: 'Sunblade' }));

    expect(screen.getByText('No image')).toBeInTheDocument();
  });

  it('card body click is navigation-safe', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Open Sunblade' }));

    expect(routerMockState.navigate).toHaveBeenCalledWith('/world/1/items/1');
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

  it('navigates on Enter key from card root and ignores nested key events', () => {
    renderCard();

    fireEvent.keyDown(screen.getByRole('button', { name: 'Open Sunblade' }), {
      key: 'Enter',
    });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Edit' }), {
      key: 'Enter',
    });

    expect(routerMockState.navigate).toHaveBeenCalledTimes(1);
    expect(routerMockState.navigate).toHaveBeenCalledWith('/world/1/items/1');
  });

  it('applies caller-provided dimensions', () => {
    renderCard({ displayDimensions: { width: 340, height: 180 } });

    expect(screen.getByRole('button', { name: 'Open Sunblade' })).toHaveStyle({
      maxWidth: '340px',
    });
    expect(screen.getByTestId('item-card-media-frame')).toHaveStyle({
      height: '180px',
    });
  });
});
