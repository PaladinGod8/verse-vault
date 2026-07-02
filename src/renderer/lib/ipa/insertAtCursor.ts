/**
 * @role Cursor-aware text insertion helper for the IPA staging box
 * @owns Splicing inserted text (converted IPA or a palette symbol) into a value
 *       at the current selection, returning the new value and caret position
 */

export type InsertAtCursorResult = {
  text: string;
  caret: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Replace the selection `[selectionStart, selectionEnd)` in `current` with
 * `insert`. A collapsed selection (start === end) is a plain caret insert.
 * A `null`/`undefined` selection appends at the end. Out-of-range indices are
 * clamped to the string bounds and normalized so start <= end.
 */
export function insertAtCursor(
  current: string,
  selectionStart: number | null | undefined,
  selectionEnd: number | null | undefined,
  insert: string,
): InsertAtCursorResult {
  const length = current.length;
  const rawStart = selectionStart ?? length;
  const rawEnd = selectionEnd ?? length;
  const start = clamp(rawStart, 0, length);
  const end = clamp(rawEnd, 0, length);
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);

  const text = current.slice(0, lo) + insert + current.slice(hi);
  return { text, caret: lo + insert.length };
}
