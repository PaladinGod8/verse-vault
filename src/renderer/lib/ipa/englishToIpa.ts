/**
 * @role English-to-IPA conversion wrapper
 * @owns The single import boundary around the `phonemize` library, so callers
 *       and tests depend on one small pure function instead of the lib API
 * @seam Swap point if the phonemizer is ever replaced or moved to the main process
 */
import { toIPA } from 'phonemize';

export type IpaAccent = 'en-GB' | 'en-US';

/** Non-rhotic British English matches the user's staging examples (e.g. "bʌs ˈdɹaɪvə"). */
export const DEFAULT_ACCENT: IpaAccent = 'en-GB';

/**
 * Convert English `text` into an IPA string. Empty or whitespace-only input
 * returns an empty string. Fantasy/non-dictionary words fall back to
 * phonemize's rule-based best guess — the caller refines by hand.
 */
export function convertToIpa(text: string, accent: IpaAccent = DEFAULT_ACCENT): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }
  return toIPA(trimmed, accent);
}
