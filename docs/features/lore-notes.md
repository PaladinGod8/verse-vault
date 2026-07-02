# Lore Notes Feature

## Purpose

Lore Notes are a world-scoped freeform wiki entity for worldbuilding details that don't
fit Items, Characters, or Factions — myths, customs, terminology, or background context —
with a lightweight tag vocabulary so related notes can be found by topic instead of only
by name.

## Scope (Current Implementation)

- World-scoped lore note CRUD (`world_id` required on create).
- Fields: required `name`, optional `content` (plain textarea), optional `image_src`,
  optional list of `tags`.
- Optional image upload via shared `vv-media://` media protocol.
- Per-world tag vocabulary, derived entirely from tags currently attached to at least one
  lore note in that world (no separate tag master table, no manual cleanup needed).
- Client-side search: plain tokens substring-match name/content; `#tag` tokens exact-match
  (case-insensitive) against a note's tags; a query can mix both kinds, all tokens AND'd.
- Card-grid list page with shared count badge, sort toggle, page-size selector, and
  pagination.
- Detail page with image, name, content, tags, and the same edit modal used by the list
  page.
- Out of scope: SQLite FTS, structured sections, relationships, and a dedicated tag
  management/rename UI.

## User-Facing Behavior

### Lore Notes page (`/world/:id/lore-notes`)

- Loads world and lore notes via `window.db.worlds.getById(worldId)` and
  `window.db.loreNotes.getAllByWorld(worldId)`; also loads the world's tag vocabulary via
  `window.db.loreNotes.getAllTagsByWorld(worldId)` for the tag-input autocomplete.
- Shows explicit states for loading, load failure, and empty list (`No lore notes yet.`).
- Search input placeholder: `Search lore notes by name, content, or #tag...`. Typing
  `castle #Economics` requires both: the note's name/content contains "castle" AND the
  note has a tag exactly matching "Economics" (case-insensitive). When lore notes exist
  but none match, shows `No lore notes match your search.`.
- Total world lore note count is shown via `EntityCountBadge`.
- Uses shared `CardSortToggle`, `PageSizeSelect`, and `PaginationBar`. Sort supports
  alphabetical and recently viewed, using `last_viewed_at`.
- `New Lore Note` opens modal form. Name required. Content, image, and tags optional.
- Clicking card body navigates to detail page (`/world/:id/lore-notes/:loreNoteId`). Edit
  opens same modal directly. Delete requires confirmation.
- Cards show image or `No image`, name, short content preview, and tag chips.

### Lore note detail page (`/world/:id/lore-notes/:loreNoteId`)

- Loads row via `window.db.loreNotes.getById(loreNoteId)`.
- Calls `window.db.loreNotes.markViewed(loreNoteId)` after successful load so
  `Recently viewed` sort can surface it on the list page.
- Shows back link, name, optional image, optional content, tag chips, and `Edit` button.
- Edit button opens same `LoreNoteForm` modal used by list page, pre-filled.

### Tags

- The `Tags` field is a chip input (`TagInput`): type text and press `Enter` or `,` to add
  a chip; `Backspace` on an empty input removes the last chip; duplicate tags (case
  -insensitive) are silently ignored.
- Below the input, an autocomplete dropdown lists tags from the world's existing tag
  vocabulary that aren't already added to the note and match the current input text;
  clicking a suggestion adds it as a chip.
- On save, the full current tag list is sent — the main-process handler replaces the
  note's tag set atomically rather than diffing.
- A tag with no remaining lore notes referencing it in a world simply stops appearing in
  that world's vocabulary; there's no separate delete/cleanup step.

### Lore note image upload

- Powered by `LoreNoteImageDropzone`, using the same drag/drop + hidden file-input
  pattern as the other entity image forms.
- On file selection, `LoreNoteForm` calls
  `window.db.loreNotes.importImage({ fileName, mimeType, bytes })`, which writes the file
  under `userData/lore-note-images/` and returns a
  `vv-media://lore-note-images/<encoded-filename>` URL stored in `lore_notes.image_src`.
- Main process validates mime type (PNG/JPEG/WEBP/GIF) and size (<= 5 MB).
- Shared `vv-media://` protocol handler in `src/main.ts` serves lore note images from
  `userData/lore-note-images/` alongside the other entity image hosts.

## Architecture Notes

- IPC channels (`src/shared/ipcChannels.ts`): `LORE_NOTES_GET_ALL_BY_WORLD`,
  `LORE_NOTES_GET_BY_ID`, `LORE_NOTES_ADD`, `LORE_NOTES_UPDATE`, `LORE_NOTES_DELETE`,
  `LORE_NOTES_IMPORT_IMAGE`, `LORE_NOTES_MARK_VIEWED`,
  `LORE_NOTE_TAGS_GET_ALL_BY_WORLD`.
- Main handler: `src/main/ipc/registerLoreNoteHandlers.ts`, registered in `src/main.ts`.
- Preload bridge: `window.db.loreNotes` in `src/preload.ts`, typed via `DbApi.loreNotes`
  in `src/shared/contracts/dbApiShape.ts`.
- Renderer:
  - `src/renderer/pages/LoreNotesPage.tsx` and `src/renderer/pages/LoreNoteDetailPage.tsx`.
  - `src/renderer/hooks/useWorldLoreNotesData.ts` (also loads tag vocabulary),
    `useLoreNoteCrud.ts`.
  - `src/renderer/components/loreNotes/LoreNoteCard.tsx`, `LoreNoteForm.tsx`,
    `LoreNoteImageDropzone.tsx`, `TagInput.tsx`.
  - `src/renderer/lib/loreNoteSearch.ts` (`loreNoteMatchesQuery`).
  - `src/renderer/components/worlds/WorldSidebar.tsx` adds the `Lore Notes` nav entry.

## Data Model

### Lore note row

```ts
interface LoreNote {
  id: number;
  world_id: number;
  name: string;
  content: string | null;
  image_src: string | null;
  tags: string[];
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
}
```

`LoreNoteUpsertPayload` carries `name`, `content`, `image_src`, and `tags`. Main-process
handler requires `world_id` on create, trims `name`, normalizes blank content/image to
`NULL`, and updates `last_viewed_at` through a dedicated `markViewed` mutation.

### Tables

- `lore_notes` — one row per note; created in `src/database/schema.ts` and additively
  migrated in `src/database/loreNoteMigrations.ts`. Indexed on `world_id`.
- `lore_note_tags` — junction table, one row per `(lore_note_id, tag_name)` pair, with
  `world_id` denormalized onto the row so tag-vocabulary and `#tag` search queries don't
  need a join. Unique index on `(lore_note_id, tag_name COLLATE NOCASE)` prevents
  duplicate tags on the same note; index on `(world_id, tag_name COLLATE NOCASE)` powers
  the vocabulary query. There is no separate tag master table — a tag "exists" in a world
  purely by having at least one `lore_note_tags` row.
- This app never sets `PRAGMA foreign_keys = ON`, so the `DELETE`/tag-replace handlers
  explicitly delete `lore_note_tags` rows themselves rather than relying on
  `ON DELETE CASCADE`.

## Validation and Error Rules

Main-process rules (`registerLoreNoteHandlers.ts`):

- `world_id` required on create (`Lore note world_id is required`).
- `name` required and trimmed on create/update (`Lore note name is required`).
- `content` optional; whitespace-only values normalize to `NULL`.
- `image_src` optional; blank values normalize to `NULL`.
- `tags` optional array; entries are trimmed, empty entries dropped, duplicates removed
  case-insensitively (first-seen casing wins). On update, tags are only replaced when the
  payload includes a `tags` key — otherwise existing tags are left untouched.
- Image import rejects unsupported mime types, empty byte arrays, oversized files, and
  non-`Uint8Array` payloads.

Renderer-side: `LoreNoteForm` requires non-empty name before save (`Name is required.`).
Content, image, and tags are optional in both create and edit flows. `TagInput` rejects
blank and case-insensitive-duplicate tag entries client-side too.

## Tests

- `tests/unit/database/loreNotes.test.ts` - schema creation, migration idempotence, and
  index coverage for both tables.
- `tests/unit/ipc/registerLoreNoteHandlers.test.ts` - CRUD, validation, mark-viewed, tag
  replace-on-update semantics, tag vocabulary query, and image import behavior.
- `tests/unit/main.bootstrap.test.ts` - registrar wiring and `lore-note-images` protocol
  host.
- `tests/unit/preload.loreNotes.test.ts` - `window.db.loreNotes` bridge forwarding.
- `tests/unit/shared/ipcChannels.test.ts`, `tests/unit/ipc/registrars.test.ts` - channel
  constant coverage and exactly-once registration.
- `tests/unit/renderer/lib/loreNoteSearch.test.ts` - text/tag token parsing and AND
  matching.
- `tests/unit/renderer/tagInput.test.tsx` - chip add/remove, dedupe, autocomplete
  filtering.
- `tests/unit/renderer/loreNoteForm.test.tsx`, `loreNoteCard.test.tsx`,
  `loreNoteImageDropzone.test.tsx` - component behavior and image fallback.
- `tests/unit/renderer/loreNotesPage.test.tsx` - load, plain/#tag/mixed search, create,
  edit, delete, pagination, count badge, and sort behavior.
- `tests/unit/renderer/loreNoteDetailPage.test.tsx` - load, mark-viewed, render, and edit
  flow.
- `tests/unit/renderer/hooks/useLoreNoteCrud.test.ts`,
  `useWorldLoreNotesData.test.ts` - mutation and loading hooks, including tag vocabulary
  reload.
- `tests/e2e/loreNotes.test.ts` - real app create-with-tags, `#tag` search, tag
  autocomplete reuse across notes, detail edit, and delete journey.

## Known Limits and Non-Goals

- Search is simple case-insensitive substring/exact match over in-memory data, not SQLite
  FTS.
- Detail page is intentionally narrow: no relationships or structured wiki sections beyond
  image/name/content/tags.
- No bulk tag rename or merge tooling — renaming a tag means editing it on every note that
  uses it.
- Orphaned uploaded images are not cleaned up automatically if a form is cancelled or an
  image is later cleared.
- Lore Notes are world-scoped only.
