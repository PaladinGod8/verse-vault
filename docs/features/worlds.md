# Worlds Feature

## Purpose

The Worlds feature provides a local-first workflow to create, view, edit, and delete world records in Verse Vault. It is the current primary renderer experience and the foundation for a fuller world workspace.

## User-Facing Behavior

### Worlds Home (`/`)

- Loads worlds through `window.db.worlds.getAll()` and renders cards sorted by backend `updated_at DESC`.
- Shows explicit states for loading, load failure, empty list, and mutation failure.
- Supports world creation from a modal form:
  - Name is required.
  - Thumbnail URL and short description are optional.
  - Successful create inserts or moves the returned world to the top of local state.
- Supports world editing from a modal form with prefilled values:
  - Same validation as create.
  - Successful edit inserts or moves the returned world to the top of local state.
- Supports world deletion from each card:
  - Requires confirmation (`Delete "<name>"? This cannot be undone.`).
  - Shows `Deleting...` state on the active card action.
  - Removes the world from local state after successful delete.
- Opening a card navigates to `/world/:id`.

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
- Main IPC handlers execute SQLite operations on `worlds`:
  - `SELECT` by list and id
  - `INSERT`
  - `UPDATE` (including touch-only `updated_at` updates)
  - `DELETE`
  - `UPDATE last_viewed_at`

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
