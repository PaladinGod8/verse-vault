# Worlds Feature

## Purpose

The Worlds feature provides a local-first workflow to create, view, edit, and delete world records in Verse Vault. It is the current primary renderer experience and the foundation for a fuller world workspace.

## User-Facing Behavior

### Worlds Home (`/`)

- Loads worlds through `window.db.worlds.getAll()` and renders cards sorted by backend `updated_at DESC`.
- Shows explicit states for loading, load failure, empty list, and mutation failure.
- Supports world creation from a modal form:
  - Name is required.
  - Thumbnail (optional): drag-and-drop or click-to-select a local image file (PNG, JPEG,
    WEBP, or GIF; max 5 MB). File select opens the shared crop modal immediately. Save
    persists both original source bytes and cropped display bytes through
    `window.db.worlds.importImage()`.
  - Rows keep both `worlds.thumbnail` and `worlds.original_thumbnail_src`, plus
    `worlds.thumbnail_crop` JSON so `Edit crop` can restore the previous framing.
  - Short description is optional.
  - Successful create inserts or moves the returned world to the top of local state.
- Supports world editing from a modal form with prefilled values:
  - Same validation as create. In edit mode, the current thumbnail preview shows `Edit crop`,
    `Replace image`, and `Clear image on save`. If no action is taken, existing display,
    original, and crop metadata fields are preserved.
  - Successful edit inserts or moves the returned world to the top of local state.
- Supports world deletion from each card:
  - Requires confirmation (`Delete "<name>"? This cannot be undone.`).
  - Shows `Deleting...` state on the active card action.
  - Removes the world from local state after successful delete.
- Opening a card navigates to `/world/:id`.

### Thumbnail Upload

- Powered by `WorldImageDropzone` (dnd-kit `useDroppable` + native drag events + hidden
  `<input type="file">` fallback) inside `WorldForm`.
- On file selection the form opens the shared `ImageCropModal` immediately.
- On save, the page resolves the form's `ImageEditDraft` through
  `window.db.worlds.importImage({ fileName, mimeType, bytes })`, which writes files to
  `userData/world-images/<timestamp>-<uuid>.<ext>`.
- The main process validates mime type (PNG/JPEG/WEBP/GIF) and size (≤ 5 MB) before writing.
- Cropped bytes are stored as `worlds.thumbnail`; original bytes are stored as
  `worlds.original_thumbnail_src`; crop metadata is stored as `worlds.thumbnail_crop`.
- The `vv-media://` Electron protocol handler serves world image files from `userData/world-images/`
  alongside token images from `userData/token-images/` — both are secured by basename-only path
  checks against their respective directories.
- Upload errors (bad mime type, oversized file) are displayed inline in the dropzone error slot.
- Shared crop details live in `docs/features/image-cropping.md`.
- Orphaned images (from cancelled forms or cleared thumbnails) are not cleaned up automatically.
  This is a known accepted limitation.

### World Route Placeholder (`/world/:id`)

- Validates route id as a positive integer; otherwise shows `Invalid world id.`.
- Loads world via `window.db.worlds.getById(id)`.
- If missing, shows `World not found.`.
- On successful lookup, calls `window.db.worlds.markViewed(id)` and renders returned world data.
- Shows world name, description fallback (`No description yet.`), id, last viewed, and updated timestamps.
- Includes a `Back to worlds` link to `/`.

## Architecture Notes

- Renderer uses `window.db.worlds` only (no direct `ipcRenderer` access).
- Preload bridge methods:
  - `getAll`
  - `getById`
  - `add`
  - `update`
  - `delete`
  - `markViewed`
  - `importImage` — uploads a local image file and returns a `vv-media://world-images/` URL
- Main IPC handlers execute SQLite operations on `worlds`:
  - `SELECT` by list and id
  - `INSERT`
  - `UPDATE` (including touch-only `updated_at` updates)
  - `DELETE`
  - `UPDATE last_viewed_at`
- The `vv-media://` protocol handler (`registerTokenImageProtocol` in `main.ts`) is shared
  between token images (`token-images` host) and world thumbnail images (`world-images` host).
  Each host resolves to its own `userData/` subdirectory.

## Data Model

`World` records include:

- `id`
- `name`
- `thumbnail`
- `original_thumbnail_src`
- `thumbnail_crop`
- `short_description`
- `last_viewed_at`
- `created_at`
- `updated_at`

## Validation and Error Rules

- `name` is trimmed and required on create and on update when `name` is provided.
- `original_thumbnail_src` is optional; blank values normalize to `NULL`.
- `thumbnail_crop` is optional; blank values normalize to `NULL`, otherwise must be valid JSON.
- Create throws when the inserted row cannot be read back.
- Update throws `World not found` when the row does not exist after update.
- Renderer forms surface thrown `Error.message` values and fallback generic messages for non-Error throws.

## Tests

- `tests/unit/renderer/worldCard.test.tsx` — card rendering and delete action.
- `tests/unit/renderer/worldForm.test.tsx` — create/edit validation and thumbnail upload payload.
- `tests/unit/renderer/worldImageDropzone.test.tsx` — drag-and-drop/file-picker upload, mime/size validation.
- `tests/unit/renderer/worldPage.test.tsx` — world placeholder route load states.
- `tests/unit/renderer/worldPagePlaceholder.test.tsx` — placeholder route fallback behavior.
- `tests/unit/renderer/worldsHomePage.test.tsx` — worlds home load states, create/edit/delete flows.

## Known Limits and Non-Goals

- `/world/:id` is intentionally a placeholder page, not the full world workspace.
- Delete handler returns `{ id }` even if the row did not exist prior to delete.
- Renderer ordering after create/update is based on local upsert behavior (newly touched world moves to top).
- World image files are never cleaned up automatically. Deleting a world leaves its thumbnail
  image on disk in `userData/world-images/`.
- Worlds that previously stored legacy `file://.../world-images/<file>` thumbnails are repaired
  automatically to canonical `vv-media://world-images/<file>` URLs during startup migration.
- Worlds that previously stored deprecated external thumbnail URLs are normalized to `null`
  during startup migration and on future saves. Restoring a thumbnail requires re-uploading a
  local file.
