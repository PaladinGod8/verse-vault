# BattleMaps Feature

## Purpose

The BattleMaps feature provides a local-first workflow to create, view, edit, delete, and play world-scoped BattleMaps. BattleMaps are persisted as metadata records (`name` + JSON `config`) and can be launched into a PixiJS runtime view for grid, token, and camera interactions.

## Scope (Current Implementation)

- World-scoped CRUD for BattleMaps.
- Route entry from world workspace sidebar.
- SQLite persistence with shared IPC + preload bridge contracts.
- Renderer list view with timestamps and modal create/edit flows.
- Row-level `Play` action that opens a runtime route per BattleMap.
- PixiJS runtime renderer with map/background, grid overlay, runtime token palette, and camera movement.
- Runtime exit flow with save-before-leave behavior for pending runtime grid changes.

Explicit non-goals:

- Combat encounter rules.
- Initiative tracking.

Also not in scope:

- Fog of war, lighting, line-of-sight, multiplayer sync.
- Full map authoring/editor toolchain.

## User-Facing Behavior

### Route and Renderer Flow

- Route: `/world/:id/battlemaps`.
- Runtime route: `/world/:id/battlemaps/:battleMapId/runtime`.
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

### World-Level List, Actions, and Timestamps

- Table columns: `Name`, `Created`, `Last Updated`, `Actions`.
- Backend list order is deterministic: `updated_at DESC, id DESC`.
- Timestamps are rendered using `Intl.DateTimeFormat` after normalizing SQLite datetime text.
- Timestamp fallback behavior:
  - null/empty -> `-`
  - unparseable value -> raw stored text
- Every BattleMap row includes `Play`, `Edit`, and `Delete` actions.
- `Play` navigates directly to the BattleMap runtime route for that row.

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

### Runtime Entry, Rendering, and Exit

- Runtime is entered from the row-level `Play` action.
- Runtime header includes:
  - `Back to BattleMaps` link.
  - always-available `Exit Runtime` button.
- Runtime states:
  - Loading: `Loading runtime...`
  - Error panel (`Runtime unavailable`) with explicit `Exit Runtime` recovery action.
- Runtime load validation/error messages:
  - `Invalid world or BattleMap id.`
  - `BattleMap not found.`
  - `Invalid runtime config JSON. Update this BattleMap config before entering runtime.`
  - `Unable to load BattleMap runtime right now.`
- Exit behavior:
  - Exit navigates back to `/world/:id/battlemaps`.
  - If runtime grid settings have pending saves, runtime attempts to flush saves before leaving.
  - If save flush fails and changes remain pending, user is prompted:
    `Some runtime changes are still unsaved. Exit runtime and discard those changes?`
  - Browser unload with pending runtime grid changes triggers native before-unload confirmation.

### PixiJS Runtime Renderer

- Runtime canvas uses a PixiJS `Application` mounted in the renderer route.
- Stage/layer structure includes world-space layers for:
  - background
  - map
  - grid
  - tokens
- Map rendering behavior:
  - runtime map image uses `runtime.map.imageSrc` when provided.
  - if no map image is available, fallback background remains black.
- Runtime teardown on unmount destroys Pixi resources/listeners and removes sprite/token displays.

### Runtime Grid Modes and Controls

- Supported runtime grid modes:
  - `square`
  - `hex`
  - `none`
- Grid controls include:
  - mode selector
  - cell size (`12` to `240` px; clamped)
  - origin `X` and `Y`
  - half-cell origin toggles
  - origin reset
- Grid changes are normalized and auto-persisted to `battlemaps.config.runtime.grid`.
- Save state indicator shows `Saving...`, `Saved`, or `Save failed`.
- Persisted grid settings are visible on subsequent runtime launches of the same BattleMap.

### Runtime Token and Camera Capabilities

- Runtime token palette supports:
  - campaign selection for token source
  - optional filtering of invisible source tokens (`Show invisible tokens`)
  - add/remove runtime token instances (single placed instance per source token)
  - placed-token selection list with source status (`Visible`, `Invisible`, `Source missing`)
- Runtime token behavior:
  - tokens can be dragged on the Pixi canvas.
  - token positions snap to active grid mode (`square`/`hex`) and stay freeform in `none`.
  - token placement/movement is runtime-only for the current session (not persisted to BattleMap config).
- Runtime camera behavior:
  - drag on empty canvas pans camera.
  - selecting a placed token focuses camera toward that token.
  - camera movement in runtime is session interaction; there is no dedicated runtime zoom control UI.

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

Runtime uses existing preload contracts and does not bypass security boundaries:

- `window.db.battlemaps.getById` to load runtime source record.
- `window.db.battlemaps.update` to persist normalized runtime grid config.
- `window.db.campaigns.getAllByWorld` and `window.db.tokens.getAllByCampaign` for runtime token palette source data.

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

### Runtime Config Shape (`BattleMap.config` JSON)

`config.runtime` is normalized/validated as:

- `runtime.grid`
  - `mode: 'square' | 'hex' | 'none'`
  - `cellSize: number` (`> 0`; renderer clamps to `12..240`)
  - `originX: number`
  - `originY: number`
- `runtime.map`
  - `imageSrc: string | null`
  - `backgroundColor: string` (non-empty)
- `runtime.camera`
  - `x: number`
  - `y: number`
  - `zoom: number` (`> 0`)

Default runtime config when omitted:

- `grid.mode = 'square'`
- `grid.cellSize = 50`
- `grid.originX = 0`
- `grid.originY = 0`
- `map.imageSrc = null`
- `map.backgroundColor = '#000000'`
- `camera.x = 0`
- `camera.y = 0`
- `camera.zoom = 1`

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
  - Validates provided `config` as JSON text and normalizes `config.runtime`.
  - Inserts row and returns inserted record; throws `Failed to create BattleMap` if readback fails.
- `BATTLEMAPS_UPDATE`
  - Partial update using explicit key checks (`name`, `config`).
  - Validates trimmed `name` when provided (`BattleMap name cannot be empty`).
  - Validates `config` JSON text and normalizes `config.runtime` when provided.
  - Always updates `updated_at` (including timestamp-only update when no mutable fields are provided).
  - Throws `BattleMap not found` if row does not exist after update.
- `BATTLEMAPS_DELETE`
  - Deletes by id and returns `{ id }` even if row did not exist.

### Runtime Config Validation (Main Process)

- `config` must parse to a JSON object (`BattleMap config must be a JSON object`).
- `runtime` must be a JSON object when present.
- `runtime.grid.mode` must be one of `square | hex | none`.
- `runtime.grid.cellSize` must be a finite number greater than `0`.
- `runtime.grid.originX` and `runtime.grid.originY` must be finite numbers.
- `runtime.map.imageSrc` must be `string | null`.
- `runtime.map.backgroundColor` must be a non-empty string.
- `runtime.camera.x` and `runtime.camera.y` must be finite numbers.
- `runtime.camera.zoom` must be a finite number greater than `0`.

## Known Limits

- BattleMaps are currently managed only as world-level records; there is no dedicated detail/editor route.
- `config` is stored as JSON text; runtime keys are validated, but non-runtime keys have no domain-specific schema validation.
- There is no search, filtering, pagination, or reordering UI for BattleMaps.
- Runtime token placement, runtime token movement, and runtime camera movement are not persisted as scene state.
- Combat and initiative systems are not implemented in BattleMap runtime.
