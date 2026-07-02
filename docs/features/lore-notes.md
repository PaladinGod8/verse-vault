# Lore Notes Feature

## Purpose

Lore Notes are a world-scoped freeform wiki entity for worldbuilding details that do not
fit Items, Characters, or Factions - myths, customs, terminology, or background context -
with a lightweight tag vocabulary and an optional Excalidraw canvas for notes that need
freeform visual ideation.

## Scope (Current Implementation)

- World-scoped lore note CRUD (`world_id` required on create).
- Fields: required `name`, optional `content` (plain textarea), optional `image_src`,
  optional list of `tags`, optional `canvas_enabled`, optional saved Excalidraw scene, and
  optional saved canvas preview image.
- Optional image upload via shared `vv-media://` media protocol.
- Optional canvas route for enabled notes; disabling canvas hides canvas UI but preserves
  stored scene/preview so re-enable restores the prior drawing.
- Per-world tag vocabulary, derived entirely from tags currently attached to at least one
  lore note in that world (no separate tag master table, no manual cleanup needed).
- Client-side search: plain tokens substring-match name/content; `#tag` tokens exact-match
  (case-insensitive) against a note's tags; a query can mix both kinds, all tokens AND'd.
- Card-grid list page with shared count badge, sort toggle, page-size selector, and
  pagination.
- Detail page with image/preview, name, content, tags, canvas section, and the same edit
  modal used by the list page.
- Out of scope: SQLite FTS, structured sections, relationships, and a dedicated tag
  management/rename UI.

## User-Facing Behavior

### Lore Notes page (`/world/:id/lore-notes`)

- Loads world and lore notes via `window.db.worlds.getById(worldId)` and
  `window.db.loreNotes.getAllByWorld(worldId)`; also loads the world's tag vocabulary via
  `window.db.loreNotes.getAllTagsByWorld(worldId)` for tag-input autocomplete.
- Shows explicit states for loading, load failure, and empty list (`No lore notes yet.`).
- Search input placeholder: `Search lore notes by name, content, or #tag...`. Typing
  `castle #Economics` requires both: the note's name/content contains `castle` and the note
  has a tag exactly matching `Economics` case-insensitively.
- Total world lore note count is shown via `EntityCountBadge`.
- Uses shared `CardSortToggle`, `PageSizeSelect`, and `PaginationBar`. Sort supports
  alphabetical and recently viewed, using `last_viewed_at`.
- `New Lore Note` opens modal form. Name required. Content, image, tags, and canvas toggle
  optional. Canvas toggle defaults off.
- Clicking card body navigates to detail page (`/world/:id/lore-notes/:loreNoteId`). Edit
  opens same modal directly. Delete requires confirmation.
- Cards show canvas preview first when canvas enabled and preview exists; otherwise they
  fall back to uploaded image or `No image`. Canvas-enabled cards also show `Canvas` badge.

### Lore note detail page (`/world/:id/lore-notes/:loreNoteId`)

- Loads row via `window.db.loreNotes.getById(loreNoteId)`.
- Calls `window.db.loreNotes.markViewed(loreNoteId)` after successful load so
  `Recently viewed` sort can surface it on the list page.
- Shows back link, name, optional image/preview, optional content, tag chips, canvas status
  section, and `Edit` button.
- If canvas enabled, detail page exposes `Open Canvas` route
  (`/world/:id/lore-notes/:loreNoteId/canvas`) and shows preview image when one exists.
- Edit button opens same `LoreNoteForm` modal used by list page, pre-filled.

### Lore note canvas route (`/world/:id/lore-notes/:loreNoteId/canvas`)

- Paneled Excalidraw editor rendered inside the standard app layout (keeps `WorldSidebar`
  so users can always navigate away) with persistent `Back to lore note` and `Save` actions.
- Canvas panel always keeps an explicit way back to the lore-note detail page; `Escape`
  exits back to detail and `Ctrl/Cmd+S` saves.
- Header shows note title plus saved/unsaved status so users do not get trapped in a blank
  canvas state; the canvas occupies a bounded panel (`min-h-[70vh]`) rather than a
  full-screen overlay.
- `Save` persists current scene JSON plus PNG preview to the lore note row.
- Route focuses on canvas editing only; metadata stays on list/detail form flows.

### Tags

- The `Tags` field is a chip input (`TagInput`): type text and press `Enter` or `,` to add
  a chip; `Backspace` on an empty input removes the last chip; duplicate tags
  case-insensitively are ignored.
- Below the input, autocomplete suggestions list tags from the world's existing vocabulary
  that are not already added to the note and match the current input text.
- On save, the full current tag list is sent; the main-process handler replaces the note's
  tag set atomically rather than diffing.

### Lore note image and canvas behavior

- Image upload stays powered by `LoreNoteImageDropzone`, using the shared drag/drop + hidden
  file-input pattern.
- Canvas uses shared `ExcalidrawCanvasEditor`, with self-hosted Excalidraw font assets for
  offline packaging.
- Scene data is stored as JSON-safe `{ elements, appState, files }`, so embedded Excalidraw
  files persist with the note.
- Preview image is stored as PNG data URL and refreshed only on explicit save, not per
  pointer move.

## Architecture Notes

- IPC channels (`src/shared/ipcChannels.ts`): `LORE_NOTES_GET_ALL_BY_WORLD`,
  `LORE_NOTES_GET_BY_ID`, `LORE_NOTES_ADD`, `LORE_NOTES_UPDATE`, `LORE_NOTES_DELETE`,
  `LORE_NOTES_IMPORT_IMAGE`, `LORE_NOTES_MARK_VIEWED`, `LORE_NOTE_TAGS_GET_ALL_BY_WORLD`.
- Main handler: `src/main/ipc/registerLoreNoteHandlers.ts`, with shared note helpers in
  `noteTagUtils.ts` and `canvasPersistence.ts`.
- Preload bridge: `window.db.loreNotes` in `src/preload.ts`, typed via `DbApi.loreNotes`.
- Renderer:
  - `src/renderer/pages/LoreNotesPage.tsx`
  - `src/renderer/pages/LoreNoteDetailPage.tsx`
  - `src/renderer/pages/LoreNoteCanvasPage.tsx`
  - `src/renderer/hooks/useWorldLoreNotesData.ts`, `useLoreNoteCrud.ts`
  - `src/renderer/components/loreNotes/LoreNoteCard.tsx`, `LoreNoteForm.tsx`,
    `LoreNoteImageDropzone.tsx`, `TagInput.tsx`
  - `src/renderer/components/excalidraw/ExcalidrawCanvasEditor.tsx`
  - `src/renderer/lib/loreNoteSearch.ts`, `noteCanvasPreview.ts`

## Data Model

### Lore note row

```ts
interface LoreNote {
  id: number;
  world_id: number;
  name: string;
  content: string | null;
  image_src: string | null;
  canvas_enabled: boolean;
  canvas_scene: CanvasSceneData | null;
  canvas_preview_image: string | null;
  tags: string[];
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
}
```

`LoreNoteUpsertPayload` carries `name`, `content`, `image_src`, `tags`, and additive canvas
fields. Main-process handler requires `world_id` on create, trims `name`, normalizes blank
content/image to `NULL`, preserves stored canvas scene when canvas is toggled off, and
updates `last_viewed_at` through dedicated `markViewed` mutation.

### Tables

- `lore_notes` - one row per note; created in `src/database/schema.ts` and additively
  migrated in `src/database/loreNoteMigrations.ts`. Indexed on `world_id`. Includes
  `canvas_enabled`, `canvas_scene`, and `canvas_preview_image` additive columns.
- `lore_note_tags` - junction table, one row per `(lore_note_id, tag_name)` pair, with
  `world_id` denormalized onto the row so tag-vocabulary and `#tag` search queries do not
  need a join.

## Validation and Error Rules

- `world_id` required on create (`Lore note world_id is required`).
- `name` required and trimmed on create/update (`Lore note name is required`).
- `content` optional; whitespace-only values normalize to `NULL`.
- `image_src` optional; blank values normalize to `NULL`.
- `canvas_enabled` optional boolean; defaults false on fresh rows.
- `canvas_scene` optional JSON-safe payload; invalid or missing shapes normalize to `NULL`.
- `canvas_preview_image` optional string; blank values normalize to `NULL`.
- `tags` optional array; entries are trimmed, empty entries dropped, duplicates removed
  case-insensitively (first-seen casing wins).
- Renderer-side `LoreNoteForm` requires non-empty name before save (`Name is required.`).

## Tests

- `tests/unit/database/loreNotes.test.ts` - schema creation, migration idempotence, and
  index coverage for lore-note tables.
- `tests/unit/ipc/registerLoreNoteHandlers.test.ts` - CRUD, validation, mark-viewed,
  tag-replace semantics, canvas persistence, and image import behavior.
- `tests/unit/main.bootstrap.test.ts` - registrar wiring and `lore-note-images` protocol
  host.
- `tests/unit/preload.loreNotes.test.ts`, `tests/unit/shared/ipcChannels.test.ts`,
  `tests/unit/ipc/registrars.test.ts` - bridge, channel, and registrar coverage.
- `tests/unit/renderer/lib/loreNoteSearch.test.ts` - text/tag token parsing and AND
  matching.
- `tests/unit/renderer/loreNoteForm.test.tsx`, `loreNoteCard.test.tsx`,
  `loreNoteImageDropzone.test.tsx` - component behavior, canvas toggle, preview
  precedence, and image fallback.
- `tests/unit/renderer/loreNotesPage.test.tsx` - load, plain/#tag/mixed search, create,
  edit, delete, pagination, count badge, and sort behavior.
- `tests/unit/renderer/loreNoteDetailPage.test.tsx`, `loreNoteCanvasPage.test.tsx` - load,
  mark-viewed, canvas route launch, render, edit, and canvas-save flow.
- `tests/unit/renderer/hooks/useLoreNoteCrud.test.ts`, `useWorldLoreNotesData.test.ts` -
  mutation and loading hooks, including canvas flag wiring.
- `tests/unit/renderer/excalidrawCanvasEditor.test.tsx` - shared Excalidraw wrapper seam.
- `tests/e2e/loreNotes.test.ts` - packaged create/search/edit/delete journey for base lore
  note flows.

## Known Limits and Non-Goals

- Search is metadata-only; drawing contents are not searchable.
- No autosave; preview and scene persist only when user clicks `Save`.
- Detail page remains intentionally narrow: no relationships or structured wiki sections
  beyond image/name/content/tags/canvas.
- No bulk tag rename or merge tooling.
- Orphaned uploaded images are not cleaned up automatically if a form is cancelled or an
  image is later cleared.
- Dedicated packaged E2E canvas coverage is not added yet.
- Lore Notes remain world-scoped only.
