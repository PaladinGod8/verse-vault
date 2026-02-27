# Levels Feature

## Purpose

The Levels feature provides a local-first workflow to create, view, edit, and delete level records scoped to a world. It is accessed from inside a world's workspace and serves as the foundation for organizing categorized content (classes, races, backgrounds, etc.) within a world.

## User-Facing Behavior

### Levels Page (`/world/:id/levels`)

- Validates the route `:id` as a positive integer; otherwise shows `Invalid world id.`.
- Loads the parent world via `window.db.worlds.getById(worldId)`.
- If the world is missing, shows `World not found.`.
- Loads levels via `window.db.levels.getAllByWorld(worldId)` after the world is confirmed.
- Shows explicit states for loading, load failure, empty list, and mutation failure.
- Renders levels in a table with columns: Name, Category, Description, and Actions.
- Description cell falls back to `—` when null.
- Supports level creation from a modal form:
  - Name and Category are required.
  - Description is optional.
  - Successful create prepends the returned level to local state (or moves it to top if already present).
- Supports level editing from a modal form with prefilled values:
  - Same validation as create.
  - Successful edit replaces the matching level in local state in-place.
- Supports level deletion from each table row:
  - Requires confirmation (`Delete "<name>"? This cannot be undone.`).
  - Shows `Deleting...` state on the active row's delete button.
  - Edit button on the deleting row is disabled.
  - Removes the level from local state after successful delete.
- Opening the edit modal closes the create modal, and vice versa.
- Includes a `Back to world` link to `/world/:id`.
- Renders `WorldSidebar` for navigation context.

## Architecture Notes

- Renderer uses `window.db.levels` and `window.db.worlds` only (no direct `ipcRenderer` access).
- Preload bridge methods on `window.db.levels`:
  - `getAllByWorld`
  - `getById`
  - `add`
  - `update`
  - `delete`
- Main IPC handlers execute SQLite operations on `levels`:
  - `SELECT` all by `world_id`
  - `SELECT` by `id`
  - `INSERT`
  - `UPDATE` (partial — only fields explicitly provided)
  - `DELETE`

## Data Shape

`Level` records include:

- `id`
- `world_id`
- `name`
- `category`
- `description`
- `created_at`
- `updated_at`

## Validation and Error Rules

- `name` is trimmed and required on create and on update when `name` is provided.
- `category` is trimmed and required on create and on update when `category` is provided.
- `description` is optional; an empty or whitespace-only value is coerced to `null`.
- Create throws when the inserted row cannot be read back.
- Update throws `Level not found` when the row does not exist after update.
- Delete returns `{ id }` even if the row did not exist prior to delete.
- Renderer form surfaces thrown `Error.message` values and falls back to generic messages (`Failed to create level.` / `Failed to save level changes.`) for non-Error throws.

## Current Limits

- Levels are displayed in insertion order from the backend (`getAllByWorld` does not specify an explicit sort order beyond backend defaults).
- After create, the new level is moved to the top of local state; after edit, the level stays in its current position.
- There is no level detail route; the table row has no navigation action.
