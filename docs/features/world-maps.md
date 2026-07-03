# World Map (Azgaar Fantasy Map Generator)

## Purpose

Give each world one persistent, editable fantasy world map. Verse Vault owns the
map record lifecycle and snapshot storage; Azgaar's Fantasy Map Generator (FMG)
is treated as a read-only upstream editor. The map opens in a dedicated editor
window rather than a route inside the main app.

## Scope (Current Implementation)

Delivered in TDD slices. Current state:

- **Persistence + command spine (done):** `world_maps` table (one row per world),
  `window.db.worldMaps.{getByWorld, openEditor}`, `WorldSidebar` trigger, editor
  window manager (one window per world, focus reuse).
- **Snapshot storage (done):** atomic gzip `.map.gz` snapshot store, repo write
  methods, and a save orchestrator that lazily creates the row on first real save
  and rolls it back if the snapshot write fails.
- **Dedicated editor bridge (done):** `window.worldMapHost` contract, its
  channel set, `preloadWorldMap.ts`, and the host IPC registrar.
- **Vendored bundle + protocol (done):** `vendor/azgaar-fmg/1.99/` is committed,
  `vv-fmg://` serves wrapper HTML + FMG assets + saved snapshots, and packaging
  now includes both the vendored bundle and `preloadWorldMap.js`.
- **Wrapper controls (done):** editor window loads a Verse Vault host page with
  `Save`, `Regenerate`, `Export Copy`, and `Close`, plus save-on-close behavior.

## User-Facing Behavior

- `WorldSidebar` shows a `World Map` button beneath `BattleMaps`, disabled when
  there is no valid world id.
- Clicking it calls `window.db.worldMaps.openEditor(worldId)`; a dedicated editor
  window opens (or the existing one for that world is focused). No route change.
- First open generates a fresh FMG map in that window without creating a DB row.
- `Save` creates or updates the canonical `.map.gz` snapshot under
  `app.getPath('userData')/world-maps/`.
- `Regenerate` reloads FMG with a fresh seed, then immediately replaces the bound
  snapshot for that same world.
- `Export Copy` writes a separate `.map` or `.map.gz` file via native save dialog
  without changing the bound snapshot.
- The editor toolbar states that Verse Vault `Save` is canonical. Wrapper-side
  suppression hides FMG save/load buttons, forces autosave off, resets FMG
  `onloadBehavior` to `random`, and blocks built-in save/load entry points so
  Dropbox/browser storage/upstream machine-save are never required for the bound
  world workflow.
- `Close` tries a final save when dirty; if save fails the main process shows a
  discard/cancel confirm.
- If opening fails, an error toast ("Could not open World Map") is shown.

## Architecture Notes

- Renderer: `src/renderer/components/worlds/WorldSidebar.tsx`.
- Main-app bridge: `src/preload.ts` -> `window.db.worldMaps.{getByWorld, openEditor}`;
  channels `db:worldMaps:*` in `src/shared/ipcChannels.ts`, catalogued in
  `src/shared/ipcCatalog.ts`; handlers `src/main/ipc/registerWorldMapHandlers.ts`.
- Editor window manager: `src/main/worldMapEditorManager.ts` (one window per
  world; session lookup; export/save/regenerate host commands; close interception).
- Privileged protocol: `src/main/worldMapProtocol.ts` registers `vv-fmg://app`
  and serves:
  - `index.html` host wrapper
  - `vendor/...` vendored FMG bundle assets
  - `maps/<storage_key>` saved snapshot files
- Persistence: `src/database/repos/worldMapsRepo.ts` (reads + `createForWorld` /
  `updateSnapshotMeta` / `delete`), `src/main/worldMapSnapshotStore.ts` (atomic
  gzip fs), `src/main/worldMapPersistence.ts` (save orchestration). Schema in
  `src/database/schema.ts`; legacy migration `src/database/worldMapMigrations.ts`.
- Dedicated editor bridge (FMG window only): `src/preloadWorldMap.ts` exposes
  `window.worldMapHost`; channels in `src/shared/worldMapHostChannels.ts`
  (`worldMapHost:*`, deliberately outside the `window.db`/DbApi contract);
  contract type `src/shared/contracts/worldMapHost.ts`; handlers
  `src/main/ipc/registerWorldMapHostHandlers.ts` (resolves the world from the
  calling window's webContents id, never from a renderer argument).

## Data Model

Table `world_maps` (one row per world):

| column              | type    | notes                                                   |
| ------------------- | ------- | ------------------------------------------------------- |
| `id`                | INTEGER | PK AUTOINCREMENT                                        |
| `world_id`          | INTEGER | NOT NULL **UNIQUE** REFERENCES worlds ON DELETE CASCADE |
| `map_name`          | TEXT    | nullable                                                |
| `storage_key`       | TEXT    | NOT NULL - snapshot filename only, never a path         |
| `generator_version` | TEXT    | nullable - upstream FMG version                         |
| `created_at`        | TEXT    | default `datetime('now')`                               |
| `updated_at`        | TEXT    | default `datetime('now')`                               |

Snapshot files live at `app.getPath('userData')/world-maps/world-map-<id>.map.gz`
(gzip of FMG map text). `storage_key` holds the filename only; the store
whitelists it to the base directory. Shared types (`WorldMap`,
`WorldMapSaveMeta`, `WorldMapEditorSession`, `WorldMapOpenEditorResult`) in
`src/shared/contracts/domainTypes.ts`; `WorldMapHost` in `contracts/worldMapHost.ts`.

## Validation and Error Rules

- `openEditor` rejects a non-integer / non-positive world id:
  `"World map editor requires a valid world id"`.
- Host `saveCurrent` / `exportCopy` reject empty map data:
  `"World map save requires non-empty map data"` / `"...export requires..."`.
- Any host call from a window with no bound editor session throws
  `"World map editor session not found"`.

## Tests

- `tests/unit/database/worldMaps.test.ts` - schema DDL, legacy migration, repo
  reads + `createForWorld` (storage-key-from-id) + `updateSnapshotMeta`.
- `tests/unit/main/worldMapSnapshotStore.test.ts` - gzip round-trip, overwrite,
  atomic (no temp leftovers), delete idempotency, path-traversal rejection.
- `tests/unit/main/worldMapPersistence.test.ts` - first save creates row + file,
  second save reuses row + overwrites, rollback on snapshot-write failure.
- `tests/unit/main/worldMapEditorManager.test.ts` - one window per world, focus
  reuse, session URL building, host export/save delegation, close interception.
- `tests/unit/main/worldMapProtocol.test.ts` - wrapper HTML, vendored asset
  serving, snapshot serving, traversal rejection.
- `tests/unit/ipc/registerWorldMapHandlers.test.ts` - `getByWorld`, `openEditor`
  delegation + invalid-world-id rejection.
- `tests/unit/ipc/registerWorldMapHostHandlers.test.ts` - all host channels,
  world resolution from the calling window, delegation, empty-data + unknown-window
  rejection.
- `tests/unit/preload/worldMapHost.test.ts` - dedicated editor preload bridge.
- `tests/unit/renderer/worldSidebar.test.tsx` - trigger visible/enabled/disabled,
  dispatch, error toast.
- `tests/unit/ipc/registerWorldHandlers.test.ts` +
  `tests/unit/main/worldMapPersistence.test.ts` - world delete cleanup hook removes
  bound snapshot file before deleting world row.
- `tests/e2e/world-maps.test.ts` - critical smoke only: sidebar command opens
  dedicated editor window, canonical host copy renders, and first open does not
  precreate a `world_maps` row. Deeper save/regenerate lifecycle stays covered in
  main-process tests because packaged multi-window FMG lifecycle is heavier than
  first-slice smoke.

## Known Limits and Non-Goals

- **FMG startup detail:** pinned upstream `v1.99` hard-validates startup
  `?maplink=` URLs to `http(s)` only, so Verse Vault loads saved snapshots by
  calling FMG's runtime `loadMapFromURL(...)` after boot instead of relying on
  initial query-param loading.
- **Upstream persistence scope:** FMG still uses browser storage internally for
  its own settings/runtime, but Verse Vault suppresses FMG save/load/browser-
  storage entry points and treats the on-disk Verse Vault snapshot as the only
  canonical world binding.
- **Snapshot file cleanup:** deleting a world now runs a main-process cleanup hook
  first, removing bound `.map.gz` snapshot from `userData/world-maps/`, then
  deletes world row. DB still enforces `world_maps` row cleanup with
  `ON DELETE CASCADE` (foreign keys enabled in `src/database/db.ts`).
- Non-goals (v1): embedding FMG in a React route, live entity sync, map preview
  thumbnails, collaborative editing, importing arbitrary third-party `.map` files,
  autosave-every-edit, and modifying the Azgaar upstream source.
