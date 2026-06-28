import { describe, expect, it } from 'vitest';
import {
  sortByRecentlyViewed,
  sortCardRecords,
} from '../../../../src/renderer/lib/sortCardRecords';

describe('sortByRecentlyViewed', () => {
  it('sorts most recently viewed first, without mutating input', () => {
    const records = [
      { id: 1, name: 'Alpha', last_viewed_at: '2026-01-01 00:00:00' },
      { id: 2, name: 'Beta', last_viewed_at: '2026-03-01 00:00:00' },
      { id: 3, name: 'Gamma', last_viewed_at: '2026-02-01 00:00:00' },
    ];

    const sorted = sortByRecentlyViewed(records);

    expect(sorted.map((record) => record.name)).toEqual(['Beta', 'Gamma', 'Alpha']);
    expect(records.map((record) => record.name)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('places never-viewed records last, ordered alphabetically among themselves', () => {
    const sorted = sortByRecentlyViewed([
      { id: 1, name: 'Zed', last_viewed_at: null },
      { id: 2, name: 'Viewed', last_viewed_at: '2026-01-01 00:00:00' },
      { id: 3, name: 'Alpha', last_viewed_at: null },
    ]);

    expect(sorted.map((record) => record.name)).toEqual(['Viewed', 'Alpha', 'Zed']);
  });

  it('breaks ties on identical timestamps by name', () => {
    const sorted = sortByRecentlyViewed([
      { id: 1, name: 'Zeta', last_viewed_at: '2026-01-01 00:00:00' },
      { id: 2, name: 'Alpha', last_viewed_at: '2026-01-01 00:00:00' },
    ]);

    expect(sorted.map((record) => record.name)).toEqual(['Alpha', 'Zeta']);
  });
});

describe('sortCardRecords', () => {
  const records = [
    { id: 1, name: 'Zed', last_viewed_at: '2026-02-01 00:00:00' },
    { id: 2, name: 'Alpha', last_viewed_at: null },
  ];

  it('dispatches to alphabetical sort', () => {
    expect(sortCardRecords(records, 'alphabetical').map((r) => r.name)).toEqual([
      'Alpha',
      'Zed',
    ]);
  });

  it('dispatches to recently-viewed sort', () => {
    expect(sortCardRecords(records, 'recentlyViewed').map((r) => r.name)).toEqual([
      'Zed',
      'Alpha',
    ]);
  });
});
