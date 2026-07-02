import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoreNoteCard from '../../../src/renderer/components/loreNotes/LoreNoteCard';

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

function buildLoreNote(overrides: Partial<LoreNote> = {}): LoreNote {
  return {
    id: 1,
    world_id: 1,
    name: 'Founding Myth',
    content: 'Long ago the city was founded.',
    image_src: null,
    tags: ['Economics', 'History'],
    last_viewed_at: null,
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  };
}

function renderCard(props: Partial<React.ComponentProps<typeof LoreNoteCard>> = {}) {
  return render(
    <MemoryRouter>
      <LoreNoteCard
        loreNote={buildLoreNote()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('LoreNoteCard', () => {
  beforeEach(() => {
    routerMockState.navigate.mockReset();
  });

  it('renders name, content preview, tags, and No image placeholder', () => {
    renderCard();
    expect(screen.getByText('Founding Myth')).toBeInTheDocument();
    expect(screen.getByText('Long ago the city was founded.')).toBeInTheDocument();
    expect(screen.getByText('Economics')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('No image')).toBeInTheDocument();
  });

  it('renders image when image_src set', () => {
    renderCard({
      loreNote: buildLoreNote({ image_src: 'vv-media://lore-note-images/myth.png' }),
    });
    expect(screen.getByRole('img', { name: 'Founding Myth' })).toBeInTheDocument();
  });

  it('card body click navigates to detail page', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Open Founding Myth' }));

    expect(routerMockState.navigate).toHaveBeenCalledWith('/world/1/lore-notes/1');
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

  it('falls back to No image when lore note image fails to load', () => {
    renderCard({
      loreNote: buildLoreNote({ image_src: 'vv-media://lore-note-images/broken.png' }),
    });

    fireEvent.error(screen.getByRole('img', { name: 'Founding Myth' }));

    expect(screen.getByText('No image')).toBeInTheDocument();
  });

  it('navigates on Enter key from card root and ignores nested key events', () => {
    renderCard();

    fireEvent.keyDown(screen.getByRole('button', { name: 'Open Founding Myth' }), {
      key: 'Enter',
    });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Edit' }), {
      key: 'Enter',
    });

    expect(routerMockState.navigate).toHaveBeenCalledTimes(1);
    expect(routerMockState.navigate).toHaveBeenCalledWith('/world/1/lore-notes/1');
  });

  it('shows Deleting... and disables actions while isDeleting is true', () => {
    renderCard({ isDeleting: true });

    expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
  });

  it('renders without a content preview when content is null', () => {
    renderCard({ loreNote: buildLoreNote({ content: null }) });

    expect(screen.getByText('Founding Myth')).toBeInTheDocument();
  });

  it('applies caller-provided dimensions', () => {
    renderCard({ displayDimensions: { width: 340, height: 180 } });

    expect(screen.getByRole('button', { name: 'Open Founding Myth' })).toHaveStyle({
      maxWidth: '340px',
    });
    expect(screen.getByTestId('lore-note-card-media-frame')).toHaveStyle({
      height: '180px',
    });
  });
});
