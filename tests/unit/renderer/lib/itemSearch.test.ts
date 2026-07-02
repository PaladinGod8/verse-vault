import { describe, expect, it } from 'vitest';
import { flattenItemForSearch, itemMatchesQuery } from '../../../../src/renderer/lib/itemSearch';

function buildItem(overrides?: Partial<Item>): Item {
  return {
    id: 1,
    world_id: 1,
    name: 'Sunblade',
    description: 'Ancient radiant sword forged for kings.',
    image_src: null,
    last_viewed_at: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('flattenItemForSearch', () => {
  it('includes name and description in lowercase search blob', () => {
    const flattened = flattenItemForSearch(buildItem());

    expect(flattened).toContain('sunblade');
    expect(flattened).toContain('ancient radiant sword forged for kings.');
  });

  it('handles null description gracefully', () => {
    expect(() => flattenItemForSearch(buildItem({ description: null }))).not.toThrow();
  });
});

describe('itemMatchesQuery', () => {
  it('matches name substrings case-insensitively', () => {
    expect(itemMatchesQuery(buildItem(), 'sun')).toBe(true);
    expect(itemMatchesQuery(buildItem(), 'SUN')).toBe(true);
  });

  it('matches description substrings', () => {
    expect(itemMatchesQuery(buildItem(), 'radiant')).toBe(true);
    expect(itemMatchesQuery(buildItem(), 'wizard')).toBe(false);
  });

  it('returns true for blank query', () => {
    expect(itemMatchesQuery(buildItem(), '')).toBe(true);
    expect(itemMatchesQuery(buildItem(), '   ')).toBe(true);
  });
});
