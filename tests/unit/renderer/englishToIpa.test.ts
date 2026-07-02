import { describe, expect, it } from 'vitest';
import { convertToIpa } from '../../../src/renderer/lib/ipa/englishToIpa';

// Integration test against the real `phonemize` library. Also proves the
// library (and its bundled JSON dictionaries) resolves under the Vite/Vitest
// transform pipeline the renderer uses.
describe('convertToIpa', () => {
  it('converts an English phrase to IPA using the en-GB (non-rhotic) default', () => {
    const result = convertToIpa('bus driver');
    // en-GB "driver" ends in a schwa, not a rhotic vowel.
    expect(result).toContain('bʌs');
    expect(result.endsWith('ə')).toBe(true);
  });

  it('produces rhotic output when asked for en-US', () => {
    const result = convertToIpa('driver', 'en-US');
    // General American keeps the r-colored vowel.
    expect(result).toContain('ɝ');
  });

  it('returns an empty string for empty or whitespace-only input', () => {
    expect(convertToIpa('')).toBe('');
    expect(convertToIpa('   ')).toBe('');
  });

  it('trims surrounding whitespace before converting', () => {
    expect(convertToIpa('  bus  ')).toBe(convertToIpa('bus'));
  });
});
