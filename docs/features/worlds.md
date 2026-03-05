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
    WEBP, or GIF; max 5 MB). The image is uploaded immediately on selection via
    `window.db.worlds.importImage()` and stored locally. The returned `vv-media://` URL is
    submitted with the form. No URL text input is present — file upload is the sole mechanism.
  - Short description is optional.
  - Successful create inserts or moves the returned world to the top of local state.
- Supports world editing from a modal form with prefilled values:
  - Same validation as create. In edit mode, the current thumbnail is shown as a preview image
    above the dropzone; the user can clear it (sets `thumbnail` to `null`) or upload a new
    file (replaces the stored URL). If no action is taken the existing URL is preserved.
  - Successful edit inserts or moves the returned world to the top of local state.
- Supports world deletion from each card:
  - Requires confirmation (`Delete "<name>"? This cannot be undone.`).
  - Shows `Deleting...` state on the active card action.
  - Removes the world from local state after successful delete.
- Opening a card navigates to `/world/:id`.

### Thumbnail Upload

- Powered by `WorldImageDropzone` (dnd-kit `useDroppable` + native drag events + hidden
  `<input type="file">` fallback) inside `WorldForm`.
- On file selection the form calls `window.db.worlds.importImage({ fileName, mimeType, bytes })`
  which writes the file to `userData/world-images/<timestamp>-<uuid>.<ext>`.
- The main process validates mime type (PNG/JPEG/WEBP/GIF) and size (≤ 5 MB) before writing.
- Returns a `vv-media://world-images/<encoded-filename>` URL stored in `worlds.thumbnail`.
- The `vv-media://` Electron protocol handler serves world image files from `userData/world-images/`
  alongside token images from `userData/token-images/` — both are secured by basename-only path
  checks against their respective directories.
- Upload errors (bad mime type, oversized file) are displayed inline in the dropzone error slot.
- The submit button is disabled while an upload is in progress (`isImportingImage`).
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

## Data Shape

`World` records include:

- `id`
- `name`
- `thumbnail`
- `short_description`
- `last_viewed_at`
- `created_at`
- `updated_at`

## Validation and Error Rules

- `name` is trimmed and required on create and on update when `name` is provided.
- Create throws when the inserted row cannot be read back.
- Update throws `World not found` when the row does not exist after update.
- Renderer forms surface thrown `Error.message` values and fallback generic messages for non-Error throws.

## Current Limits

- `/world/:id` is intentionally a placeholder page, not the full world workspace.
- Delete handler returns `{ id }` even if the row did not exist prior to delete.
- Renderer ordering after create/update is based on local upsert behavior (newly touched world moves to top).
- World image files are never cleaned up automatically. Deleting a world leaves its thumbnail
  image on disk in `userData/world-images/`.
- Worlds that previously stored an external URL in `thumbnail` will now have a broken
  thumbnail display (the URL field no longer exists in the form). These worlds must be edited
  and a local file re-uploaded to restore a thumbnail.
