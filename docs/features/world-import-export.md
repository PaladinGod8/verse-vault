# World Import / Export

## Purpose

Let a user back up a single world and move it between installs of the app.
Pressing **Export World Data** on a world writes a self-contained `.zip` bundle to
a location of the user's choosing; pressing **Import World Data** on the Worlds
home page opens a file picker and restores the bundle as a brand-new world,
leaving all existing worlds untouched.

## Scope (Current Implementation)

- **Unit of transfer:** one world at a time.
- **Container:** a plain `.zip` (openable by any tool) with a `manifest.json`,
  a `data.json` of every world-scoped row, plus `media/` and `world-maps/`
  folders carrying the binary blobs referenced by the data.
- **Fidelity:** full — every table that cascades off `worlds` travels, codex
  (characters, factions, items, backgrounds, lore, abilities, levels, world map)
  and campaign play data (campaigns, arcs, acts, sessions, scenes, notes,
  battlemaps, tokens, statblocks, relationships). Excludes only app-wide
  `app_settings` and the legacy, non-world-scoped `verses` table.
- **Import mode:** always inserts a new world (new autoincrement id, every child
  row re-keyed). Never overwrites or merges. A name clash appends `" (imported)"`.
- **Version safety:** `manifest.json` carries `formatVersion`. Same major imports;
  a newer major than the app supports is refused; a missing/corrupt manifest or
  non-Verse-Vault zip is refused.

## User-Facing Behavior

- **Worlds home page** (`/`): an **Import World Data** button in the header, beside
  **Create**. It opens a native open dialog filtered to `*.zip`. On success a
  toast reports the imported world name and the user sees it appear in the grid.
- **Per-world** (`WorldCard` overflow menu and `WorldPage` header): an **Export
  World Data** action. It opens a native save dialog defaulting to
  `<world-name>.zip`. On success a toast confirms the written path.
- Cancelling either OS dialog is a no-op (no toast, no error).
- Import failures (bad zip, unsupported `formatVersion`, missing manifest) show an
  error toast with a specific message; no partial world is left behind (import is
  a single DB transaction).

## Architecture Notes

- **Format spec / registry:** `src/main/worldTransfer/tableRegistry.ts` — one
  declarative, FK-dependency-ordered list of the world-scoped tables. Each entry
  declares only how to _select_ a table's rows for a world (`root`, by `world_id`,
  or by a parent-table FK) and its FK columns to remap. Row columns themselves are
  handled generically via `SELECT *` + dynamic `INSERT`, so new columns added by
  future migrations travel automatically without touching this feature.
- **Export:** `src/main/worldTransfer/exportWorld.ts` walks the registry top-down,
  collects rows, gathers referenced media files + world-map snapshot, and builds
  the zip via `fflate.zipSync`.
- **Import:** `src/main/worldTransfer/importWorld.ts` parses + validates the zip,
  then in a single `better-sqlite3` transaction inserts rows in registry order,
  building an old→new id map per table and rewriting FK columns. Media files are
  written with fresh unique names and `image_src` / `storage_key` values rewritten
  to point at them.
- **Manifest:** `src/main/worldTransfer/manifest.ts` — build + validate manifest,
  `formatVersion` gate.
- **IPC:** channels `db:worlds:export` / `db:worlds:import` in
  `src/shared/ipcChannels.ts` (catalogued in `src/shared/ipcCatalog.ts`); handlers
  in `src/main/ipc/registerWorldTransferHandlers.ts` open the OS dialog and
  orchestrate. Preload bridge exposes `window.db.worlds.export(worldId)` and
  `window.db.worlds.import()`; typed in `src/shared/contracts/dbApiShape.ts`.
- **Renderer:** `WorldsHomePage` (import), `WorldCard` + `WorldPage` (export).

## Data Model

No new tables. The bundle is derived from existing world-scoped tables. Zip layout:

```text
<world-name>.zip
├ manifest.json     // { formatVersion, app, exportedAt, worldName, tableCounts }
├ data.json         // { tables: { worlds:[…], levels:[…], … } }
├ media/            // copied *-images files referenced by image_src / thumbnail
└ world-maps/       // copied *.map.gz snapshot(s) referenced by storage_key
```

### Registry order and FK remap notes

Insert order (parents before children): `worlds` → `levels`, `campaigns`,
`battlemaps`, `tokens`, `abilities`, `characters`, `faction_types`, `factions`,
`backgrounds`, `items`, `lore_notes`, `lore_note_tags`, `campaign_notes`,
`campaign_note_tags`, `world_maps`, `statblocks` → `ability_children`, `arcs`,
`acts`, `sessions`, `scenes`, `faction_members`, `character_relationships`,
`faction_relationships`, `statblock_token_links`, `statblock_ability_assignments`.

Three FK cases beyond simple parent-before-child remap:

1. **Self-referential FK** — `factions.parent_faction_id` points within the same
   table, so a child row can precede its parent. Handled by a deferred second
   `UPDATE` pass after all factions are inserted.
2. **FK embedded in JSON** — `scenes.payload.runtime.battlemap_id` is remapped
   inside the JSON blob (battlemaps import before scenes, so the id map is ready).
3. **Media / snapshot references** — `image_src` / `thumbnail` (`vv-media://…`) and
   `world_maps.storage_key` are rewritten to freshly written files on import.

## Validation and Error Rules

- Export rejects a non-integer / non-positive / unknown world id.
- Import refuses a zip with no `manifest.json`, invalid JSON, missing
  `formatVersion`, or a `formatVersion` major newer than the app supports, each
  with a distinct message.
- Import runs as one transaction: any failure rolls back with no partial world and
  no orphaned media files committed to the DB.

## Tests

- `tests/unit/main/worldTransfer/tableRegistry.test.ts` — registry lists every
  world-scoped table exactly once, in valid FK-dependency order, and excludes
  `app_settings` / `verses`.
- `tests/unit/main/worldTransfer/manifest.test.ts` — build + validate,
  `formatVersion` gate (accept same major, refuse newer, refuse missing/corrupt).
- `tests/unit/main/worldTransfer/idRemap.test.ts` — old→new id map, FK rewrite,
  deferred self-FK pass, scene-payload `battlemap_id` remap.
- `tests/e2e/world-import-export.test.ts` — full round-trip: seed a world with
  media + world map + campaign tree → export → import → assert a new world exists
  with an intact FK graph, media files present, and per-table counts matching.

## Known Limits and Non-Goals

- **v1 is single-world only.** A whole-vault backup and a "codex-only" export
  toggle are deferred.
- **No overwrite / merge on import.** Import always creates a new world; re-syncing
  onto an existing world (which would need a stable cross-install world UUID) is a
  non-goal for v1.
- **No CSV.** CSV cannot represent nested config JSON, relationships, or media, so
  it is not offered even as a secondary export.
- **Format version:** `formatVersion` starts at `1`. Additive changes bump the
  minor and stay importable; breaking changes bump the major and gate old apps out.
