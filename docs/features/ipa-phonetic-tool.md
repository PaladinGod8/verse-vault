# IPA Phonetic Tool

## Purpose

Worldbuilders often want an IPA pronunciation for a name or phrase but cannot
type IPA symbols on a normal keyboard. This tool converts English to IPA,
lets the user click hard-to-type symbols into an editable staging box, and
copies the finished string to the clipboard for pasting into any entity's
pronunciation field.

## Scope (Current Implementation)

Included: a global drawer opened from the world sidebar, English-to-IPA
conversion, a curated click-to-insert symbol palette, an editable staging box,
a British/American accent toggle, and copy-to-clipboard.

Non-goals: it does not write into any entity field directly, does not persist
across app restarts, and does not aim for phonetic accuracy on invented names
(the user refines those by hand).

## User-Facing Behavior

- The sidebar has an **IPA** button (present on every world screen). Clicking it
  opens a left-pinned drawer that floats above any open entity form without
  closing or altering that form.
- **English text** box plus **Convert →**: the converted IPA is inserted into the
  staging box at the cursor (default: end), keeping existing staging text. A
  separating space is added when needed.
- **Accent** toggle: British (en-GB, non-rhotic — the default) or American
  (en-US, rhotic).
- **Symbol palette**: grouped chips (Vowels, Diphthongs, Consonants, Marks).
  Clicking a chip inserts that glyph at the staging cursor. Hovering shows an
  example word.
- **IPA staging** box: freely editable text — the assembly/scratch area.
- **Copy to clipboard**: copies the whole staging box and shows a
  "Copied to clipboard" toast. Disabled while the box is empty.
- **Clear**: empties the English and staging boxes.
- Staging contents survive closing and reopening the drawer (session only);
  they reset when the app restarts.

## Architecture Notes

Renderer-only — no IPC, no database, no main-process code.

- `src/renderer/hooks/useIpaTool.tsx` — `IpaToolProvider` holds the open state
  and mounts the always-present drawer; `useIpaTool()` exposes
  `open/close/toggle` (no-op fallback outside the provider). Mounted once in
  `src/renderer/App.tsx` inside `ToastProvider`.
- `src/renderer/components/ipa/IpaToolDrawer.tsx` — the drawer UI and staging
  state; a `createPortal` panel at `z-[1000]` so it sits above the daisyUI modal.
- `src/renderer/components/ipa/IpaSymbolPalette.tsx` — renders the grouped chips.
- `src/renderer/lib/ipa/englishToIpa.ts` — the single wrapper around the
  `phonemize` library (`convertToIpa(text, accent)`).
- `src/renderer/lib/ipa/insertAtCursor.ts` — pure cursor-splice helper used by
  both Convert and palette insertion.
- `src/renderer/lib/ipa/ipaSymbols.ts` — the curated palette data.
- `src/renderer/components/worlds/WorldSidebar.tsx` — the IPA trigger button.

Clipboard uses `navigator.clipboard.writeText` (Electron's main-process
`clipboard` module is not used from the sandboxed renderer).

## Data Model

None. The tool holds transient renderer state only and persists nothing.

## Validation and Error Rules

- Empty or whitespace-only English input converts to an empty string (no-op).
- Copy is disabled when the staging box is empty.
- If `navigator.clipboard.writeText` rejects, a "Copy failed" error toast is
  shown with the description "Clipboard is not available.".

## Tests

- `tests/unit/renderer/insertAtCursor.test.ts` — cursor splice: collapsed caret,
  append at end, selection replace, out-of-range clamping, null selection.
- `tests/unit/renderer/englishToIpa.test.ts` — real `phonemize` integration:
  en-GB default vs en-US rhotic output, empty/whitespace handling, trimming.
- `tests/unit/renderer/ipaSymbolPalette.test.tsx` — palette data invariants and
  click-to-insert wiring.
- `tests/unit/renderer/ipaToolDrawer.test.tsx` — convert appends at cursor,
  palette insert, copy-to-clipboard + toast, clear, session persistence.
- `tests/unit/renderer/useIpaTool.test.tsx` — provider open/close/toggle and the
  no-op fallback outside the provider.
- `tests/unit/renderer/worldSidebarIpaTrigger.test.tsx` — the sidebar button
  opens the drawer.

## Known Limits and Non-Goals

- Invented/non-dictionary words get `phonemize`'s best-effort guess only; the
  user corrects them in the staging box.
- No direct write-back into entity fields; the workflow is copy then paste.
- No persistence across app restarts.
- Palette is a curated English-relevant set, not the full IPA chart.
