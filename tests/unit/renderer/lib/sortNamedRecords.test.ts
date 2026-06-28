import { describe, expect, it } from 'vitest';
import { sortNamedRecords } from '../../../../src/renderer/lib/sortNamedRecords';

describe('sortNamedRecords', () => {
  it('sorts by name alphabetically without mutating input', () => {
    const records = [
      { id: 3, name: 'Zeta' },
      { id: 1, name: 'alpha' },
      { id: 2, name: 'Beta' },
    ];

    const sorted = sortNamedRecords(records);

    expect(sorted.map((record) => record.name)).toEqual(['alpha', 'Beta', 'Zeta']);
    expect(records.map((record) => record.name)).toEqual(['Zeta', 'alpha', 'Beta']);
  });

  it('uses id as tie-breaker for equal names', () => {
    const sorted = sortNamedRecords([
      { id: 9, name: 'Alpha' },
      { id: 2, name: 'alpha' },
      { id: 5, name: 'Bravo' },
    ]);

    expect(sorted.map((record) => record.id)).toEqual([2, 9, 5]);
  });
});
