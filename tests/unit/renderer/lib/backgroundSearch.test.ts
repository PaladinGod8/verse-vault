import { describe, expect, it } from 'vitest';
import {
  backgroundMatchesQuery,
  flattenBackgroundForSearch,
} from '../../../../src/renderer/lib/backgroundSearch';

function buildBackground(overrides?: Partial<Background>): Background {
  return {
    id: 1,
    world_id: 1,
    name: 'Royal Guard',
    description: 'Elite soldiers protecting city and crown.',
    image_src: null,
    last_viewed_at: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('flattenBackgroundForSearch', () => {
  it('includes name and description in lowercase search blob', () => {
    const flattened = flattenBackgroundForSearch(buildBackground());

    expect(flattened).toContain('royal guard');
    expect(flattened).toContain('elite soldiers protecting city and crown.');
  });

  it('handles null description gracefully', () => {
    expect(() => flattenBackgroundForSearch(buildBackground({ description: null }))).not.toThrow();
  });
});

describe('backgroundMatchesQuery', () => {
  it('matches name substrings case-insensitively', () => {
    expect(backgroundMatchesQuery(buildBackground(), 'royal')).toBe(true);
    expect(backgroundMatchesQuery(buildBackground(), 'ROYAL')).toBe(true);
  });

  it('matches description substrings', () => {
    expect(backgroundMatchesQuery(buildBackground(), 'crown')).toBe(true);
    expect(backgroundMatchesQuery(buildBackground(), 'wizard')).toBe(false);
  });

  it('returns true for blank query', () => {
    expect(backgroundMatchesQuery(buildBackground(), '')).toBe(true);
    expect(backgroundMatchesQuery(buildBackground(), '   ')).toBe(true);
  });
});
