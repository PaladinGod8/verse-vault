import { describe, expect, it } from 'vitest';
import { insertAtCursor } from '../../../src/renderer/lib/ipa/insertAtCursor';

describe('insertAtCursor', () => {
  it('inserts at a collapsed caret, keeping surrounding text', () => {
    const result = insertAtCursor('bs', 1, 1, 'ʌ');
    expect(result.text).toBe('bʌs');
    expect(result.caret).toBe(2);
  });

  it('appends when the caret sits at the end', () => {
    const result = insertAtCursor('bʌs ', 4, 4, 'ˈdɹaɪvə');
    expect(result.text).toBe('bʌs ˈdɹaɪvə');
    expect(result.caret).toBe('bʌs ˈdɹaɪvə'.length);
  });

  it('replaces a selection range with the inserted text', () => {
    // 'ˈdɹaɪvə' -> remove the "dɹ" at [1,3), keeping the leading stress mark
    const result = insertAtCursor('ˈdɹaɪvə', 1, 3, '');
    expect(result.text).toBe('ˈaɪvə');
    expect(result.caret).toBe(1);
  });

  it('clamps out-of-range or negative selection to the string bounds', () => {
    // start clamps to len (2), end clamps to 0; normalized range is [0, 2)
    const result = insertAtCursor('ab', 99, -3, 'X');
    expect(result.text).toBe('X');
    expect(result.caret).toBe(1);
  });

  it('treats a null/undefined selection as an append at the end', () => {
    const result = insertAtCursor('ab', null, null, 'X');
    expect(result.text).toBe('abX');
    expect(result.caret).toBe(3);
  });
});
