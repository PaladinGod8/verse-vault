# BattleMaps Feature

## Purpose

The BattleMaps feature provides a local-first workflow to create, view, edit, and delete world-scoped BattleMap records. In the current implementation, BattleMaps are metadata records (`name` + JSON `config`) managed from a world-level list page.

## Scope (Current Implementation)

- World-scoped CRUD for BattleMaps.
- Route entry from world workspace sidebar.
- SQLite persistence with shared IPC + preload bridge contracts.
- Renderer list view with timestamps and modal create/edit flows.

Not in scope yet:

- Campaign instance integration.
- Scene saved-state integration.
- Map runtime/canvas/token/combat systems.

## User-Facing Behavior

### Route and Renderer Flow

- Route: `/world/:id/battlemaps`.
- Sidebar entry: `WorldSidebar` links to BattleMaps for the active world id.
- Route id validation:
  - Non-integer or non-positive `:id` shows `Invalid world id.`.
  - Valid id loads world first via `window.db.worlds.getById(worldId)`.
  - Missing world shows `World not found.`.
- After world lookup succeeds, page loads BattleMaps via `window.db.battlemaps.getAllByWorld(worldId)`.
- Loading/error/empty states are explicit:
  - `Loading BattleMaps...`
  - `Unable to load BattleMaps right now.`
  - `No BattleMaps yet.`

### World-Level List and Timestamps

- Table columns: `Name`, `Created`, `Last Updated`, `Actions`.
- Backend list order is deterministic: `updated_at DESC, id DESC`.
- Timestamps are rendered using `Intl.DateTimeFormat` after normalizing SQLite datetime text.
- Timestamp fallback behavior:
  - null/empty -> `-`
  - unparseable value -> raw stored text

### CRUD Interactions

- Create:
  - `New BattleMap` opens modal with `BattleMapForm`.
  - On success, inserted/returned row is moved to top of local list.
- Edit:
  - `Edit` opens modal with prefilled values.
  - On success, matching row is replaced in place.
- Delete:
  - Confirmation: `Delete "<name>"? This cannot be undone.`
  - Active row shows `Deleting...` while request is in flight.
  - On success, row is removed from local list.

## IPC and Preload Contract

### IPC Channels (`src/shared/ipcChannels.ts`)

- `IPC.BATTLEMAPS_GET_ALL_BY_WORLD` -> `db:battlemaps:getAllByWorld`
- `IPC.BATTLEMAPS_GET_BY_ID` -> `db:battlemaps:getById`
- `IPC.BATTLEMAPS_ADD` -> `db:battlemaps:add`
- `IPC.BATTLEMAPS_UPDATE` -> `db:battlemaps:update`
- `IPC.BATTLEMAPS_DELETE` -> `db:battlemaps:delete`

### Preload Bridge (`window.db.battlemaps`)

- `getAllByWorld(worldId)`
- `getById(id)`
- `add(data)`
- `update(id, data)`
- `delete(id)`

Renderer code uses `window.db` only and does not directly call `ipcRenderer`.

## Data Model

### Schema (`src/database/db.ts`)

`battlemaps` table columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `world_id INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE`
- `name TEXT NOT NULL`
- `config TEXT NOT NULL DEFAULT '{}'`
- `created_at TEXT NOT NULL DEFAULT (datetime('now'))`
- `updated_at TEXT NOT NULL DEFAULT (datetime('now'))`

### Shared Type (`forge.env.d.ts`)

`BattleMap`:

- `id: number`
- `world_id: number`
- `name: string`
- `config: string`
- `created_at: string`
- `updated_at: string`

## Validation and Handler Semantics

### Renderer Form Validation

- Name is required after trim (`BattleMap name is required.`).
- Config is optional, but when present it must parse as JSON (`Config must be valid JSON.`).
- Empty config input is normalized to `'{}'` before submit.

### Main-Process Handler Rules (`src/main.ts`)

- `BATTLEMAPS_GET_ALL_BY_WORLD`
  - Returns rows by `world_id`, ordered `updated_at DESC, id DESC`.
- `BATTLEMAPS_GET_BY_ID`
  - Returns matching row or `null`.
- `BATTLEMAPS_ADD`
  - Requires trimmed non-empty `name` (`BattleMap name is required`).
  - Uses `'{}'` when `config` is omitted.
  - Validates provided `config` as JSON text.
  - Inserts row and returns inserted record; throws `Failed to create BattleMap` if readback fails.
- `BATTLEMAPS_UPDATE`
  - Partial update using explicit key checks (`name`, `config`).
  - Validates trimmed `name` when provided (`BattleMap name cannot be empty`).
  - Validates `config` JSON text when provided.
  - Always updates `updated_at` (including timestamp-only update when no mutable fields are provided).
  - Throws `BattleMap not found` if row does not exist after update.
- `BATTLEMAPS_DELETE`
  - Deletes by id and returns `{ id }` even if row did not exist.

## Known Limits

- BattleMaps are currently managed only as world-level records; there is no dedicated detail/editor route.
- `config` is stored as JSON text but has no domain-specific schema validation.
- There is no search, filtering, pagination, or reordering UI for BattleMaps.

## Future Roadmap (Not Implemented Yet)

The following are intentionally not implemented in Steps 01-05 and are future work:

- Campaign-instance usage of BattleMaps.
- Scene saved-state behavior tied to BattleMaps.
