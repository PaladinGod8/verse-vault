import type { RichTextEditorProps } from '../../src/renderer/components/ui/RichTextEditor';

/**
 * Lightweight stand-in for {@link RichTextEditor} used by form unit tests.
 *
 * Renders a plain `<textarea>` that preserves `id`, `aria-label`, `value`, and
 * `onChange(string)`, so existing form assertions (`getByLabelText`, `user.type`,
 * `toHaveValue`) keep working without mounting the real ProseMirror engine. The
 * editor's own behavior is covered by `richTextEditor.test.tsx`.
 *
 * Usage in a form test (path is relative to the test file):
 *   vi.mock('../../../src/renderer/components/ui/RichTextEditor', () =>
 *     import('../../helpers/richTextEditorMock'));
 */
export default function RichTextEditorMock({
  value,
  onChange,
  id,
  placeholder,
  editable = true,
  'aria-label': ariaLabel,
}: RichTextEditorProps) {
  return (
    <textarea
      id={id}
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={value}
      disabled={!editable}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
