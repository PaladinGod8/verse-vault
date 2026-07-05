import { describe, expect, it } from 'vitest';
import { normalizeTags } from '../../../src/main/ipc/noteTagUtils';

describe('normalizeTags', () => {
  it('returns an empty array for non-array input', () => {
    expect(normalizeTags(undefined)).toEqual([]);
    expect(normalizeTags(null)).toEqual([]);
    expect(normalizeTags('not-an-array')).toEqual([]);
  });

  it('drops non-string entries and blank/whitespace-only tags', () => {
    expect(normalizeTags(['Magic', 123, null, '   ', 'History'])).toEqual([
      'Magic',
      'History',
    ]);
  });

  it('dedupes case-insensitively, keeping the first-seen casing', () => {
    expect(normalizeTags(['Magic', 'magic', 'MAGIC', ' magic '])).toEqual(['Magic']);
  });
});
