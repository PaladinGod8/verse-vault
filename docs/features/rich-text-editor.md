# Rich Text Editor

## Purpose

Freeform prose fields across the app (lore-note content, entity descriptions, character/faction
profiles and sections, session/scene notes, etc.) use a shared TipTap-based rich-text editor
instead of plain `<textarea>`s, so users get formatting (bold/italic/lists/headings/links) with a
consistent, discoverable toolbar. Content is stored as **markdown** in the existing text columns
and JSON blobs — no schema or IPC change.

## User-Facing Behavior

- Prose fields render a `RichTextEditor`: a fixed toolbar above an editable surface.
  - `full` variant toolbar: bold, italic, strikethrough, inline code, H1–H3, bullet list,
    numbered list, quote, link (11 controls).
  - `compact` variant toolbar (short fields like world short-description, campaign summary,
    wiki-summary blurbs): bold, italic, bullet list, link (4 controls).
- Markdown input rules also work while typing (`**bold**`, `# heading`, `- item`).
- Links open a small inline URL popover; only `http(s)`/`mailto` URLs are accepted.
- Saving is unchanged: the editor is a controlled `value`/`onChange` string wired into each
  form's existing state and submit path (no autosave).
- Read-only detail/wiki pages render the saved markdown via `MarkdownView` (formatted HTML),
  replacing the previous `whitespace-pre-wrap` plain-text rendering.

## Architecture Notes

- Editor: `src/renderer/components/ui/RichTextEditor.tsx` — wraps `@tiptap/react` `useEditor`
  with `@tiptap/starter-kit` (headings limited to H1–H3; `codeBlock`, `horizontalRule`,
  `underline` disabled; `link` configured for safe protocols), `@tiptap/extension-placeholder`,
  and `tiptap-markdown` (`html: false`). `onUpdate` serializes via
  `editor.storage.markdown.getMarkdown()`. A controlled-sync effect only calls
  `setContent(value, { emitUpdate: false })` when the incoming markdown differs from what the
  editor already holds, avoiding cursor-reset feedback loops.
- Read view: `src/renderer/components/ui/MarkdownView.tsx` — `markdown-it` (`html: false`) →
  `DOMPurify.sanitize` (tag/attr allow-list) → `dangerouslySetInnerHTML`. A global DOMPurify
  `afterSanitizeAttributes` hook hardens anchors (`rel="noopener noreferrer nofollow"`,
  `target="_blank"`, strips any non-`http(s)`/`mailto` href). `renderMarkdownToSafeHtml` is
  exported for direct testing.
- Styling: shared `.rich-text-editor__content, .markdown-view` typography plus toolbar/link
  styles and light+dark overrides live in `src/renderer/index.css`.
- No IPC or SQLite schema change: prose stays in the same text columns / JSON-blob leaves,
  now holding markdown instead of plain text.

## Data Model

Unchanged. Existing prose columns (`lore_notes.content`, `items.description`, `worlds.short_description`,
`sessions.notes`, `scenes.notes`, etc.) and JSON-blob leaves (`characters.sections`/`profile`,
`factions.sections`/`profile`, `*.wiki_summary` summaries) store markdown strings. The relevant
TypeScript leaf types were already `string`.

## Validation and Error Rules

- Link URLs must match `^(https?:|mailto:)` (`isSafeLinkHref`); others are ignored by the editor
  and stripped by `MarkdownView`.
- Empty-value normalization is left to each form (e.g. lore note saves `content.trim() ? content
  : null`); an empty document serializes to an empty string.

## Migration Behavior (lazy)

No data migration is run. Existing plain-text rows load into the editor as markdown and are
re-serialized on the next save. Consequently, legacy text whose lines begin with markdown-significant
characters (`#`, `-`, `>`, `*` followed by a space) render as formatting on first load;
`MarkdownView` renders them the
same way, so edit and display stay consistent. This is expected and accepted.

## Tests

- `tests/unit/renderer/markdownView.test.tsx` — markdown→sanitized-HTML for each mark/node;
  anchor hardening; strips unsafe/relative hrefs; escapes raw HTML; empty handling.
- `tests/unit/renderer/richTextEditor.test.tsx` — toolbar variants, command dispatch, active
  state, disabled state, `onChange` markdown emission, controlled sync, id/aria wiring, link
  allow-list (mocked TipTap engine).
- `tests/unit/renderer/richTextEditor.realmount.test.tsx` — integration guard mounting the real
  TipTap stack to confirm extensions instantiate and markdown parses.
- `tests/e2e/rich-text-editor.test.ts` — end-to-end formatting, save, and sanitized round-trip.

## Known Limits and Non-Goals

- Markdown-expressible features only: no tables, code blocks, task lists, text color, or images.
- `tiptap-markdown` may normalize markdown on save (e.g. `*` bullets → `-`), so a no-op
  open-and-save can produce a small diff.
- Read-only views deliberately do not mount TipTap; only the small `MarkdownView` is used there.
