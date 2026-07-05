import { describe, expect, it } from 'vitest';
import { parsePositiveIntParam } from '../../../../src/renderer/lib/routeParams';

describe('parsePositiveIntParam', () => {
  it('returns null for missing values', () => {
    expect(parsePositiveIntParam(undefined)).toBeNull();
    expect(parsePositiveIntParam('')).toBeNull();
  });

  it('returns null for non-integer or non-positive values', () => {
    expect(parsePositiveIntParam('abc')).toBeNull();
    expect(parsePositiveIntParam('1.5')).toBeNull();
    expect(parsePositiveIntParam('0')).toBeNull();
    expect(parsePositiveIntParam('-3')).toBeNull();
  });

  it('parses a valid positive integer id', () => {
    expect(parsePositiveIntParam('42')).toBe(42);
  });
});
