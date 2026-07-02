import { describe, expect, it } from 'vitest';
import { campaignNoteMatchesQuery } from '../../../../src/renderer/lib/campaignNoteSearch';

const note = {
  id: 7,
  world_id: 1,
  campaign_id: 2,
  name: 'Boss Arena Sketch',
  tags: ['Encounter', 'Map'],
  canvas_scene: null,
  canvas_preview_image: null,
  created_at: '2026-01-01 00:00:00',
  updated_at: '2026-01-01 00:00:00',
} as CampaignNote;

describe('campaignNoteMatchesQuery', () => {
  it('returns true for blank queries', () => {
    expect(campaignNoteMatchesQuery(note, '   ')).toBe(true);
  });

  it('matches case-insensitive name and tag tokens together', () => {
    expect(campaignNoteMatchesQuery(note, 'boss #map')).toBe(true);
  });

  it('returns false when a required tag token is missing', () => {
    expect(campaignNoteMatchesQuery(note, '#travel')).toBe(false);
  });

  it('ignores empty hash tokens and keeps matching text tokens', () => {
    expect(campaignNoteMatchesQuery(note, '# boss')).toBe(true);
  });
});
