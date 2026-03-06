import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorldCard from '../../../src/renderer/components/worlds/WorldCard';

function buildWorld(overrides: Partial<World> = {}): World {
  return {
    id: 1,
    name: 'Alpha',
    thumbnail: null,
    short_description: 'First world',
    last_viewed_at: null,
    config: '{}',
    created_at: '2026-02-26 00:00:00',
    updated_at: '2026-02-26 00:00:00',
    ...overrides,
  };
}

describe('WorldCard', () => {
  it('renders fallback values for missing thumbnail and description', () => {
    render(
      <WorldCard
        world={buildWorld({
          thumbnail: '   ',
          short_description: '   ',
          updated_at: 'not-a-timestamp',
        })}
        onOpen={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('No thumbnail')).toBeInTheDocument();
    expect(screen.getByText('No description yet.')).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
    expect(screen.getByText('not-a-timestamp')).toBeInTheDocument();
  });

  it('opens from card keyboard events but ignores child keydown events', () => {
    const onOpen = vi.fn();

    render(
      <WorldCard
        world={buildWorld()}
        onOpen={onOpen}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const card = screen.getByRole('button', { name: 'Open Alpha' });
    fireEvent.keyDown(card, { key: 'a' });
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Edit' }), {
      key: 'Enter',
    });

    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it('stops propagation for edit and delete button clicks', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <WorldCard
        world={buildWorld()}
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

  it('shows deleting state and falls back when image load fails', () => {
    render(
      <WorldCard
        world={buildWorld({
          thumbnail: 'https://example.com/alpha.png',
          updated_at: '2026-02-26T10:00:00Z',
        })}
        onOpen={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        isDeleting
      />,
    );

    const image = screen.getByRole('img', { name: 'Alpha thumbnail' });
    const editButton = screen.getByRole('button', { name: 'Edit' });
    const deleteButton = screen.getByRole('button', { name: 'Deleting...' });

    expect(editButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();

    fireEvent.error(image);

    expect(screen.getByText('No thumbnail')).toBeInTheDocument();
  });
});
