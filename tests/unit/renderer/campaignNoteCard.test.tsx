import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CampaignNoteCard from '../../../src/renderer/components/campaignNotes/CampaignNoteCard';

describe('CampaignNoteCard', () => {
  it('renders blank fallback, unknown date, and deleting state without bubbling open', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onDelete = vi.fn();

    render(
      <CampaignNoteCard
        note={{
          id: 7,
          world_id: 1,
          campaign_id: 2,
          name: 'Boss Arena',
          tags: [],
          canvas_scene: null,
          canvas_preview_image: null,
          created_at: '2026-01-01 00:00:00',
          updated_at: 'not-a-date',
        }}
        onOpen={onOpen}
        onDelete={onDelete}
        isDeleting
      />,
    );

    expect(screen.getByText('Blank canvas')).toBeInTheDocument();
    expect(screen.getByText('Updated Unknown')).toBeInTheDocument();
    expect(screen.queryByText('Encounter')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Boss Arena' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete Boss Arena' })).toHaveTextContent(
      'Deleting...',
    );

    await user.click(screen.getByRole('button', { name: 'Open Boss Arena' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('renders preview image, tags, and delete action', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onDelete = vi.fn();

    render(
      <CampaignNoteCard
        note={{
          id: 8,
          world_id: 1,
          campaign_id: 2,
          name: 'Travel Routes',
          tags: ['Logistics'],
          canvas_scene: null,
          canvas_preview_image: 'data:image/png;base64,preview',
          created_at: '2026-01-01 00:00:00',
          updated_at: '2026-01-02 00:00:00',
        }}
        onOpen={onOpen}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByRole('img', { name: 'Travel Routes' })).toBeInTheDocument();
    expect(screen.getByText('Logistics')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete Travel Routes' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });
});
