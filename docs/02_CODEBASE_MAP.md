# Codebase Map (Living)

> **Update this file every time you add or change a feature.**
> Keep entries short and concrete. See [CHECKLIST.md](CHECKLIST.md) for the workflow.

## Landmarks

| Path                                                                   | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/main.ts`                                                          | App bootstrap, BrowserWindow creation, IPC handler registration (`verses` CRUD + `worlds` read/create/update/delete/markViewed/import-image + `levels` read + `levels` create/update/delete + `campaigns` read/create/update/delete + `battlemaps` read/create/update/delete + `tokens` read-by-world/read-by-campaign/get-by-id/import-image/create/update/delete/moveToWorld/moveToCampaign + `arcs` read/create/update/delete + `acts` read/create/update/delete/moveTo + `sessions` read/create/update/delete/moveTo + `scenes` read-by-campaign/read-by-session/create/update/delete/moveTo + `abilities` read + `abilities` add/update/delete/addChild/removeChild + `statblocks` read/create/update/delete); registers `vv-media://` protocol serving both `token-images` and `world-images` hosts for secure local image serving                                              |
| `src/preload.ts`                                                       | contextBridge - exposes `window.db` (`verses` CRUD + `worlds` read/create/update/delete/markViewed/import-image + `levels` read/add/update/delete + `abilities` read/add/update/delete/addChild/removeChild + `campaigns` read/add/update/delete + `battlemaps` read/add/update/delete + `tokens` read-by-world/read-by-campaign/get-by-id/import-image/add/update/delete/moveToWorld/moveToCampaign + `arcs` read/add/update/delete + `acts` read/add/update/delete/moveTo + `sessions` read/add/update/delete/moveTo + `scenes` read-by-campaign/read-by-session/add/update/delete/moveTo) to renderer                                                                                                                                                                                                                                     |
| `src/database/db.ts`                                                   | SQLite singleton, schema init (`verses`, `worlds`, `levels`, `campaigns`, `battlemaps`, `tokens`, `arcs`, `acts`, `sessions`, `scenes`, `abilities`, `ability_children`), token additive migrations (`runTokenWorldIdMigration`, `runTokenCampaignNullableMigration`, `runTokenGridTypeMigration`), `runArcActMigration` (auto-migrates `sessions.campaign_id` -> `act_id`), token move transactional helpers (`db.tokens.moveToWorld`, `db.tokens.moveToCampaign`), shared token config JSON validation/normalization helper (`ensureTokenConfigJsonText`) for footprint/framing metadata, open/close                                                                                                                                                                                                                                       |
| `src/shared/ipcChannels.ts`                                            | All IPC channel name constants (single source of truth) for verses, worlds (including world image import), levels, abilities, campaigns, battlemaps, tokens (including token image import and token move channels), arcs, acts, sessions, and scenes contracts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `src/renderer/index.tsx`                                               | React root, HashRouter wrapper                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `src/renderer/App.tsx`                                                 | Route definitions and app shell (`/`, `/world/:id`, `/world/:id/levels`, `/world/:id/abilities`, `/world/:id/campaigns`, `/world/:id/battlemaps`, `/world/:id/battlemaps/:battleMapId/runtime`, `/world/:id/tokens`, `/world/:id/campaign/:campaignId/scenes`, `/world/:id/campaign/:campaignId/arcs`, `/world/:id/campaign/:campaignId/arc/:arcId/acts`, `/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/sessions`, `/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/session/:sessionId/scenes`) and global renderer toast provider mount                                                                                                                                                                                                                                                                                      |
| `src/renderer/pages/WorldsHomePage.tsx`                                | Worlds landing page (`/`): list fetch + create/edit actions rendered via shared `ModalShell` + delete confirm via shared `ConfirmDialog` + toast-first mutation feedback for create/update/delete success/failure + loading/empty/load-error states                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/renderer/pages/WorldPage.tsx`                                     | World workspace page (`/world/:id`): validates id, marks world viewed on entry, two-column layout with sidebar + overview                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/renderer/pages/LevelsPage.tsx`                                    | Levels list page (`/world/:id/levels`): table of levels with create/edit actions rendered via shared `ModalShell`, delete confirm via shared `ConfirmDialog`, toast-first mutation feedback for create/update/delete success/failure, and loading/empty/error states                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `src/renderer/pages/AbilitiesPage.tsx`                                 | Abilities list page (`/world/:id/abilities`): table with create/edit/delete actions (delete confirm via shared `ConfirmDialog`), create/edit/child-manager dialogs rendered via shared `ModalShell` (including viewport-bounded create/edit sizing), toast-first mutation feedback for create/update/delete success/failure, and loading/empty/error states                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `src/renderer/pages/CampaignsPage.tsx`                                 | Campaigns list page (`/world/:id/campaigns`): table of campaigns with create/edit actions rendered via shared `ModalShell`, delete confirm via shared `ConfirmDialog`, Arcs link per row (`/world/:id/campaign/:campaignId/arcs`), Scenes index link per row (`/world/:id/campaign/:campaignId/scenes`), toast-first mutation feedback for create/update/delete success/failure, and loading/empty/error states                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `src/renderer/pages/BattleMapsPage.tsx`                                | BattleMaps list page (`/world/:id/battlemaps`): world-scoped table with row-level `Play` route entry (`/world/:id/battlemaps/:battleMapId/runtime`), create/edit actions rendered via shared `ModalShell`, delete confirm via shared `ConfirmDialog`, `created_at` + `updated_at` timestamp columns, toast-first mutation feedback for create/update/delete success/failure, and loading/empty/error states                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `src/renderer/pages/TokensPage.tsx`                                    | World-level token list page (`/world/:id/tokens`): table of world + campaign-scoped tokens with scope label, thumbnail, and grid-type badge; create/edit/delete actions via shared `ModalShell` + `ConfirmDialog`; create/edit image-upload handoff (`window.db.tokens.importImage`) before `tokens.add`/`tokens.update` with deterministic replace > clear > preserve semantics; create/edit save payloads persist `grid_type`; context-aware move actions (world tokens: move-to-campaign; campaign tokens: move-to-world + move-to-campaign) via `MoveTokenDialog`; copy-to-campaign action for world-scoped rows via `CopyTokenToCampaignDialog`; toast-first mutation feedback; and loading/empty/error states                                                                                                                          |
| `src/renderer/pages/BattleMapRuntimePage.tsx`                          | BattleMap runtime page (`/world/:id/battlemaps/:battleMapId/runtime`): validates world/battlemap route params, loads normalized runtime config JSON, debounces + persists runtime grid/camera/map config updates via `window.db.battlemaps.update`, loads world-scoped tokens plus selected-campaign tokens for placement, filters tokens by grid_type matching active grid mode (square/hex), tracks runtime token instances (select/remove/position), blocks mismatched grid-type token placement when grid mode is not 'none', blocks in-app navigation when unsaved runtime config changes are pending until save/confirm resolves, mounts `BattleMapRuntimeCanvas`, and keeps a mandatory `Exit Runtime` button visible to return to battlemaps list context                                                                            |
| `src/renderer/pages/CampaignScenesPage.tsx`                            | Campaign scenes index page (`/world/:id/campaign/:campaignId/scenes`): validates worldId + campaignId, loads campaign metadata + campaign-wide scenes via `window.db.scenes.getAllByCampaign`, renders scene/session/act/arc context columns, links each row to session-scoped scenes route, and includes loading/empty/error states                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `src/renderer/pages/ArcsPage.tsx`                                      | Arcs list page (`/world/:id/campaign/:campaignId/arcs`): validates worldId + campaignId, loads campaign header + arcs ordered by `sort_order`, supports create/edit via shared `ModalShell` + delete confirm via shared `ConfirmDialog`, supports dnd-kit row reorder with persisted `sort_order`, and uses toast-first mutation feedback for create/update/delete success/failure                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `src/renderer/pages/ActsPage.tsx`                                      | Acts list page (`/world/:id/campaign/:campaignId/arc/:arcId/acts`): validates worldId + campaignId + arcId, loads arc header + acts ordered by `sort_order`, supports create/edit via shared `ModalShell` + delete confirm via shared `ConfirmDialog`, supports row-level Move via `MoveActDialog`, supports dnd-kit row reorder with persisted `sort_order`, and uses toast-first mutation feedback for create/update/delete/move success/failure                                                                                                                                                                                                                                                                                                                                                                                           |
| `src/renderer/pages/SessionsPage.tsx`                                  | Sessions list page (`/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/sessions`): validates worldId + campaignId + arcId + actId, loads act header + sessions ordered by `sort_order`, supports create/edit via shared `ModalShell` + delete confirm via shared `ConfirmDialog`, supports dnd-kit row reorder with persisted `sort_order`, shows visible sequence numbers, shows `planned_at` in a formatted Planned column with `-` fallback, exposes Scenes link per row, supports "Move to Act" via `MoveSessionDialog` (removes moved session from local state immediately), and uses toast-first mutation feedback for create/update/delete/move success/failure                                                                                                                                                                   |
| `src/renderer/pages/ScenesPage.tsx`                                    | Scenes list page (`/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/session/:sessionId/scenes`): validates worldId + campaignId + sessionId, loads session header + scenes ordered by `sort_order`, supports create/edit via shared `ModalShell` + delete confirm via shared `ConfirmDialog`, supports dnd-kit row reorder with persisted `sort_order`, shows visible sequence numbers, exposes a row-level Move action via `MoveSceneDialog`, and uses toast-first mutation feedback for create/update/delete/move success/failure                                                                                                                                                                                                                                                                                                     |
| `src/renderer/components/scenes/SceneForm.tsx`                         | Reusable scenes form for create/edit (name required, optional notes, optional payload JSON text defaulting to `'{}'`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `src/renderer/components/scenes/MoveSceneDialog.tsx`                   | `ModalShell`-backed dialog for reparenting a scene to a different Session in the same Campaign; fetches arcs + acts + sessions, excludes the current session, and calls `window.db.scenes.moveTo` on confirm                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/renderer/components/sessions/SessionForm.tsx`                     | Reusable sessions form for create/edit (name required, optional notes, optional planned date-time mapped to `planned_at`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/renderer/components/sessions/MoveSessionDialog.tsx`               | `ModalShell`-backed dialog for reparenting a session to a different Act; fetches all arcs/acts for the campaign, groups acts by arc, excludes current act, calls `window.db.sessions.moveTo` on confirm                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/renderer/components/acts/MoveActDialog.tsx`                       | `ModalShell`-backed dialog for reparenting an act to a different Arc; fetches all arcs for the campaign, renders flat radio list excluding current arc, calls `window.db.acts.moveTo` on confirm                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `src/renderer/components/campaigns/CampaignForm.tsx`                   | Reusable campaigns form for create/edit (name required, optional summary)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/renderer/components/battlemaps/BattleMapForm.tsx`                 | Reusable BattleMap form for create/edit (name required, optional config JSON text defaulting to `'{}'`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/renderer/components/runtime/AbilityPickerPanel.tsx`               | Floating ability picker panel: loads active abilities for a world, lists them with range/AoE metadata, highlights the selected casting ability, and calls `onAbilitySelect` to enter/exit cast mode; shown above the runtime canvas when a token is selected                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/renderer/components/runtime/BattleMapRuntimeCanvas.tsx`           | PixiJS runtime canvas: mounts/unmounts `Application`, initializes runtime stage graph containers (`world/background/map/image/grid/rangeOverlay/token/ui`), renders square/hex/none grid overlays from runtime config, renders token sprites/fallback token markers in token layer, supports token select + pointer drag with square/hex/none snap-on-drop, supports drag-to-pan on vacant background, smoothly centers camera on selected tokens, cancels focus animation when manual pan begins, applies camera transform, renders a black fallback background whenever map image is absent, loads optional runtime map image without recreating stage objects on React re-render, and renders a casting range overlay (range ring, AoE shape fill, tile highlights) when `castingState` is set; tracks pointer angle for cone/line shapes |
| `src/renderer/components/runtime/RuntimeGridControls.tsx`              | Runtime HUD controls for grid mode (`square`/`hex`/`none`), cell size, origin offsets, half-cell origin toggles, reset action, and save status/error messaging for persisted grid config updates                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `src/renderer/components/runtime/RuntimeTokenPalette.tsx`              | Runtime HUD token palette: world token section + campaign selector/token section with shared invisible-token toggle and add-to-runtime actions, filters source token lists by active grid mode (square/hex only when mode is not 'none'), displays compatibility notice when grid mode is 'none', fixed-position hover image preview for token rows, and placed runtime token list with select/remove controls and source-missing status                                                                                                                                                                                                                                                                                                                                                                                                     |
| `src/renderer/lib/battlemapRuntimeState.ts`                            | Runtime config state helpers: parse/validate BattleMap config JSON, normalize runtime/grid fields, merge runtime writes without dropping unrelated keys, and build stable runtime serialization keys for dirty-state detection                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `src/renderer/lib/castingRangeMath.ts`                                 | Casting-range math using PixiJS math primitives (`PointData`, `Polygon`, `Rectangle`): `getShapePolygon` returns a PixiJS `Polygon` for circle/rectangle/cone/line AoE shapes; `getHighlightedSquareTiles` finds square tiles ≥50% covered (Sutherland-Hodgman + shoelace, PixiJS `Rectangle` for tile bounds); `getHighlightedHexTiles` finds pointy-top hex tiles ≥50% covered; exports `AoeShape`, `CastingShapeParams`, `HighlightedSquareTile`, `HighlightedHexTile`                                                                                                                                                                                                                                                                                                                                                                    |
| `src/renderer/lib/runtimeMath.ts`                                      | Pure runtime math helpers for grid/camera rendering (`clampGridCellSize`, zoom-safe camera helpers, `MIN_CAMERA_ZOOM`/`MAX_CAMERA_ZOOM` bounds constants, `RuntimeSceneBounds` type, `getRuntimeSceneBounds` (viewport-sized scene contract), `getMinZoomForScene` (fit-to-viewport minimum zoom), `clampCameraZoom` (bounded zoom clamp), deterministic camera focus interpolation, world viewport bounds, square line indexing, pointy-hex center/vertex math, and hex axial range calculation for visible bounds)                                                                                                                                                                                                                                                                                                                         |
| `src/renderer/lib/tokenFootprintGeometry.ts`                           | Pure token footprint helpers: deterministic square/hex occupied-cell normalization (dedupe + canonical sort), framing center/extents derivation from occupied bounds, and stable token config serialization builders for `footprint` + `framing` metadata                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/renderer/lib/tokenImageSrc.ts`                                    | Token image URL normalization for renderer surfaces: keeps http(s)/`vv-media://` URLs intact and remaps legacy `file://.../token-images/...` values to `vv-media://token-images/...`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `src/renderer/components/abilities/AbilityChildrenManager.tsx`         | Ability child-link manager UI: loads linked children, supports in-world search, and adds/removes child links for supported passive subtypes (`linchpin`, `keystone`, `rostering`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `src/renderer/components/abilities/AbilityForm.tsx`                    | Reusable abilities form for create/edit with conditional type/subtype groups, JSON fields (`effects`/`conditions`/`cast_cost`), and subtype-specific fields (`level_id`, rostering config)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `src/renderer/components/levels/LevelForm.tsx`                         | Reusable levels form for create/edit (name + category required, optional description)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `src/renderer/components/tokens/TokenForm.tsx`                         | Reusable token form for create/edit (name required, grid type, optional image upload via `TokenImageDropzone` + FootprintPainterModal, edit-mode current image preview with clear action, visibility toggle); applies default 1×1 (square) or 1-hex (hex) footprint in create mode when no painter result is set                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `src/renderer/components/tokens/FootprintPainterModal.tsx`             | Lightweight footprint painter modal: displays image with square/hex grid overlay based on token grid type, provides brush/eraser tools for marking occupied cells, shows upper-right overview/navigator panel, blocks save when no cells are painted, calculates and returns deterministic footprint (square_cells/hex_cells arrays + width/height/radius dimensions) and framing metadata (center/extent coordinates) on confirm                                                                                                                                                                                                                                                                                                                                                                                                            |
| `src/renderer/components/tokens/TokenImageDropzone.tsx`                | Reusable token image upload dropzone with `dnd-kit` droppable active state, native desktop file drop extraction, hidden file-input fallback, and selected-file metadata display                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `src/renderer/components/tokens/CopyTokenToCampaignDialog.tsx`         | `ModalShell`-backed dialog for copying a world-scoped token to a campaign; renders campaign select and calls `window.db.tokens.add` with `campaign_id` on confirm                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `src/renderer/components/tokens/MoveTokenDialog.tsx`                   | `ModalShell`-backed dialog for token scope transitions (`toWorld`/`toCampaign`); renders confirmation copy, optional campaign select, pending/error states, and delegates async move confirmation to parent callback                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `src/renderer/components/ui/ConfirmDialog.tsx`                         | Shared DaisyUI confirm dialog primitive for explicit confirm/cancel flows (title, message, intent, and pending state)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `src/renderer/components/ui/ModalShell.tsx`                            | Shared DaisyUI modal shell primitive used by renderer create/edit/move dialogs and confirm flows, with backdrop close, Escape close, focus handoff, and body scroll lock                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `src/renderer/components/ui/ToastProvider.tsx`                         | Shared renderer toast context + provider + hook (`useToast`) with typed variants, bounded toast queue, auto-dismiss, and manual dismiss                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/renderer/components/worlds/WorldSidebar.tsx`                      | World workspace sidebar: Level + Ability + Campaigns + BattleMaps + Tokens nav items linking to `/world/:id/levels`, `/world/:id/abilities`, `/world/:id/campaigns`, `/world/:id/battlemaps`, and `/world/:id/tokens`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `src/renderer/components/worlds/WorldCard.tsx`                         | World card UI (thumbnail fallback + metadata display + card-open navigation + edit/delete actions)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `src/renderer/components/worlds/WorldImageDropzone.tsx`                | Reusable world thumbnail upload dropzone with `dnd-kit` droppable active state, native desktop file drop extraction, hidden file-input fallback, and selected-file metadata display                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/renderer/components/worlds/WorldForm.tsx`                         | Reusable worlds form for create/edit (name required, optional thumbnail upload via `WorldImageDropzone` + `window.db.worlds.importImage`, edit-mode current thumbnail preview with clear action, optional short description)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/renderer/index.css`                                               | Tailwind v4 import, DaisyUI plugin/theme registration (`versevault`), and global renderer styles                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `src/store/`                                                           | Zustand stores - one file per feature domain                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `forge.env.d.ts`                                                       | Global TS types: `Verse`, `World`, `Level`, `Ability`, `AbilityChild`, `Campaign`, `BattleMap`, token contracts (`Token`, `TokenGridType`, `TokenSquareFootprintCell`, `TokenHexFootprintCell`, `TokenFootprintConfig`, `TokenFramingConfig`, `TokenConfigShape`, `TokenImageImportPayload`, `TokenImageImportResult`), `Arc`, `Act`, `Session`, `Scene`, `CampaignSceneListItem`, `DbApi` (including token move signatures), Vite constants                                                                                                                                                                                                                                                                                                                                                                                                 |
| `forge.ignore.ts`                                                      | Asar packaging ignore filter: exports `PACKAGE_INCLUDE` (list of runtime-required paths) and `isIgnoredFromPackage` (filter predicate); provides defensive scoping to prevent accidental devDependency inflation in the packaged app                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `forge.config.ts`                                                      | Electron Forge packaging, makers, plugins (uses `isIgnoredFromPackage` from `forge.ignore.ts` for asar filtering)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `vite.*.config.ts`                                                     | Vite build configs (base, main, preload, renderer)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `tests/unit/database/db.test.ts`                                       | Unit coverage for DB bootstrap/migrations and token config JSON validation normalization (`ensureTokenConfigJsonText`) including footprint schema constraints                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `tests/unit/renderer/runtimeTokenPalette.test.tsx`                     | Unit coverage for runtime palette behavior, including world/campaign token filtering by active grid mode (`square`/`hex`/`none`) and visibility gating                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `tests/unit/renderer/lib/tokenFootprintGeometry.test.ts`               | Unit coverage for deterministic footprint geometry helpers: square/hex occupancy normalization, dedupe/sort guarantees, framing derivation, and serialization output shape                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `tests/unit/renderer/components/tokens/FootprintPainterModal.test.tsx` | Unit coverage for footprint painter interactions: brush/eraser behavior, save blocking with empty occupancy, and square/hex confirm payload contracts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Product Scope Map

### Platform Direction (target domains)

- **Campaign Management**: campaigns, parties, characters, session prep, journals, GM screen
- **Worldbuilding**: lore entries, factions, locations, timelines/calendars, maps, linking graph
- **Creative Writing**: manuscripts, chapter assets, plot lines/arcs, research vault
- **Cross-cutting**: offline-first storage, universal search, versioning, local backup/export

## Feature Map

> Format per entry: UI file | store | IPC channels | main handler | storage

### Content Records CRUD (current scaffold)

- **Purpose**: foundational local CRUD path currently named `verses`; will evolve into richer campaign/world/manuscript entities
- **UI**: none yet
- **Store**: none yet (add Zustand store when UI is built)
- **IPC**: `IPC.VERSES_GET_ALL`, `IPC.VERSES_ADD`, `IPC.VERSES_UPDATE`, `IPC.VERSES_DELETE`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()`
- **Storage**: `verse-vault.db` -> `verses` table (`id`, `text`, `reference`, `tags`, `created_at`, `updated_at`)

### Worlds Shared Contract (Step 01)

- **Purpose**: define shared types and IPC constant names for upcoming Worlds CRUD and viewed-state flows
- **Status**: step-level contract sync updated on 2026-02-26 for hook-required docs parity
- **UI**: none yet
- **Store**: none yet (add Zustand store when UI is built)
- **IPC**: `IPC.WORLDS_GET_ALL`, `IPC.WORLDS_GET_BY_ID`, `IPC.WORLDS_ADD`, `IPC.WORLDS_UPDATE`, `IPC.WORLDS_DELETE`, `IPC.WORLDS_MARK_VIEWED`
- **Main handler**: not wired in this step
- **Storage**: schema/queries not added in this step

### Worlds Schema Bootstrap (Step 02)

- **Purpose**: ensure `worlds` table exists during DB initialization without impacting existing `verses` behavior
- **Status**: added on 2026-02-26 as migration-safe `CREATE TABLE IF NOT EXISTS`
- **UI**: none yet
- **Store**: none yet
- **IPC**: contract exists from Step 01; runtime handlers still not wired in this step
- **Main handler**: not wired in this step
- **Storage**: `verse-vault.db` -> `worlds` table (`id`, `name`, `thumbnail`, `short_description`, `last_viewed_at`, `created_at`, `updated_at`)

### Worlds Main Read Handlers (Step 03)

- **Purpose**: provide read-only worlds retrieval in main process while preserving existing verses behavior
- **Status**: added on 2026-02-26
- **UI**: none yet
- **Store**: none yet
- **IPC**: `IPC.WORLDS_GET_ALL`, `IPC.WORLDS_GET_BY_ID`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()`
- **Storage**: `SELECT * FROM worlds ORDER BY updated_at DESC`; `SELECT * FROM worlds WHERE id = ?` (returns `null` when missing)

### Worlds Preload Read Bridge (Step 04)

- **Purpose**: expose typed worlds read methods to renderer through `window.db` without exposing `ipcRenderer`
- **Status**: added on 2026-02-26
- **UI**: none yet
- **Store**: none yet
- **IPC**: `IPC.WORLDS_GET_ALL`, `IPC.WORLDS_GET_BY_ID`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()` (from Step 03)
- **Preload bridge**: `src/preload.ts` -> `window.db.worlds.getAll/getById`
- **Storage**: unchanged in this step

### Worlds Home Read-Only UI (Step 05)

- **Purpose**: replace the temporary home route with a read-only worlds landing page backed by `window.db.worlds.getAll()`
- **Status**: added on 2026-02-26
- **UI**: `src/renderer/pages/WorldsHomePage.tsx`, `src/renderer/components/worlds/WorldCard.tsx`, route update in `src/renderer/App.tsx`
- **Store**: none yet
- **IPC**: uses existing `IPC.WORLDS_GET_ALL` via preload bridge (`window.db.worlds.getAll`)
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()` (from Step 03)
- **Storage**: reads from `worlds` table; no write behavior added in this step

### Worlds Main Create Handler (Step 06)

- **Purpose**: add world creation in main process with basic name validation while keeping update/delete/viewed flows out of scope
- **Status**: added on 2026-02-26
- **UI**: none in this step
- **Store**: none yet
- **IPC**: `IPC.WORLDS_ADD`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()`
- **Storage**: inserts into `worlds` (`name`, `thumbnail`, `short_description`), validates `name.trim()` is non-empty, then returns `SELECT * FROM worlds WHERE id = ?`

### Worlds Preload Create + UI Form (Step 07)

- **Purpose**: enable world creation from renderer via typed preload bridge and a minimal UI modal form
- **Status**: added on 2026-02-26
- **UI**: `src/renderer/pages/WorldsHomePage.tsx`, `src/renderer/components/worlds/WorldForm.tsx`
- **Store**: none yet
- **IPC**: uses existing `IPC.WORLDS_ADD` via `window.db.worlds.add`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()` (from Step 06)
- **Preload bridge**: `src/preload.ts` -> `window.db.worlds.add(data)`
- **Storage**: creates a `worlds` row and prepends returned record into UI state so cards update immediately

### Worlds Main Update/Delete/Mark Viewed (Step 08)

- **Purpose**: add remaining worlds mutation handlers in main process while keeping preload/renderer mutation wiring out of scope for this step
- **Status**: added on 2026-02-26
- **UI**: none in this step
- **Store**: none yet
- **IPC**: `IPC.WORLDS_UPDATE`, `IPC.WORLDS_DELETE`, `IPC.WORLDS_MARK_VIEWED`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()`
- **Storage**: `WORLDS_UPDATE` mutates only provided fields (`name`, `thumbnail`, `short_description`) and sets `updated_at = datetime('now')`; `WORLDS_DELETE` removes by id and returns `{ id }`; `WORLDS_MARK_VIEWED` sets `last_viewed_at = datetime('now')` and returns the updated row or `null` if missing

### Worlds Renderer CRUD Actions (Step 09)

- **Purpose**: expose worlds mutation bridges in preload and complete renderer-side edit/delete actions on the worlds home page
- **Status**: added on 2026-02-26
- **UI**: `src/renderer/pages/WorldsHomePage.tsx`, `src/renderer/components/worlds/WorldCard.tsx`, `src/renderer/components/worlds/WorldForm.tsx`
- **Store**: none yet
- **IPC**: uses existing `IPC.WORLDS_UPDATE`, `IPC.WORLDS_DELETE`, `IPC.WORLDS_MARK_VIEWED` via `window.db.worlds.update/delete/markViewed`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()` (from Step 08)
- **Preload bridge**: `src/preload.ts` -> `window.db.worlds.update/delete/markViewed`
- **Storage**: edit flow updates world row and returns refreshed record; delete flow removes row by id; renderer updates local list immediately and requires confirmation before delete

### Worlds Route Placeholder + Mark Viewed (Step 10)

- **Purpose**: enable opening a single world route from card view and update `last_viewed_at` when entering that route
- **Status**: added on 2026-02-26
- **UI**: `src/renderer/App.tsx`, `src/renderer/pages/WorldsHomePage.tsx`, `src/renderer/components/worlds/WorldCard.tsx`, `src/renderer/pages/WorldPagePlaceholder.tsx`
- **Store**: none yet
- **IPC**: uses existing `IPC.WORLDS_GET_BY_ID` and `IPC.WORLDS_MARK_VIEWED` via `window.db.worlds.getById/markViewed`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()` (from Steps 03 and 08)
- **Preload bridge**: `src/preload.ts` -> `window.db.worlds.getById/markViewed` (from Steps 04 and 09)
- **Storage**: opening `/world/:id` validates param, resolves not-found safely, and persists viewed timestamp through `UPDATE worlds SET last_viewed_at = datetime('now') WHERE id = ?`

### Level Shared Contract (Step 01)

- **Purpose**: define shared types and IPC constant names for the Level CRUD feature
- **Status**: added on 2026-02-27
- **UI**: none yet
- **Store**: none yet
- **IPC**: `IPC.LEVELS_GET_ALL_BY_WORLD`, `IPC.LEVELS_GET_BY_ID`, `IPC.LEVELS_ADD`, `IPC.LEVELS_UPDATE`, `IPC.LEVELS_DELETE`
- **Main handler**: not wired in this step
- **Storage**: schema/queries not added in this step

### Level Schema Bootstrap (Step 02)

- **Purpose**: ensure levels table exists during DB initialization without impacting existing behavior
- **Status**: added on 2026-02-27 as migration-safe `CREATE TABLE IF NOT EXISTS`
- **UI**: none yet
- **Store**: none yet
- **IPC**: contract exists from Step 01; runtime handlers not wired in this step
- **Main handler**: not wired in this step
- **Storage**: `verse-vault.db` -> `levels` table (`id`, `world_id`, `name`, `category`, `description`, `created_at`, `updated_at`)

### Level Main Read Handlers (Step 03)

- **Purpose**: provide read-only levels retrieval in main process scoped to a world
- **Status**: added on 2026-02-27
- **UI**: none yet
- **Store**: none yet
- **IPC**: `IPC.LEVELS_GET_ALL_BY_WORLD`, `IPC.LEVELS_GET_BY_ID`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()`
- **Storage**: `SELECT * FROM levels WHERE world_id = ? ORDER BY updated_at DESC`; `SELECT * FROM levels WHERE id = ?` (returns `null` when missing)

### Level Preload Read Bridge (Step 04)

- **Purpose**: expose typed levels read methods to renderer through `window.db` without exposing `ipcRenderer`
- **Status**: added on 2026-02-27
- **UI**: none yet
- **Store**: none yet
- **IPC**: `IPC.LEVELS_GET_ALL_BY_WORLD`, `IPC.LEVELS_GET_BY_ID`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()` (from Step 03)
- **Preload bridge**: `src/preload.ts` -> `window.db.levels.getAllByWorld/getById`
- **Storage**: unchanged in this step

### Level Main Mutation Handlers (Step 05)

- **Purpose**: add level create/update/delete in main process with validation
- **Status**: added on 2026-02-27
- **UI**: none in this step
- **Store**: none yet
- **IPC**: `IPC.LEVELS_ADD`, `IPC.LEVELS_UPDATE`, `IPC.LEVELS_DELETE`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()`
- **Storage**: `LEVELS_ADD` inserts a levels row and returns it; `LEVELS_UPDATE` mutates only provided fields and sets `updated_at`; `LEVELS_DELETE` removes by id and returns `{ id }`

### World Workspace Shell + Sidebar (Step 07)

- **Purpose**: replace WorldPagePlaceholder with a real workspace layout and sidebar nav; Level is the first sidebar item
- **Status**: added on 2026-02-27
- **UI**: `src/renderer/pages/WorldPage.tsx`, `src/renderer/components/worlds/WorldSidebar.tsx`, route update in `src/renderer/App.tsx`
- **Store**: none yet
- **IPC**: uses existing `IPC.WORLDS_GET_BY_ID` and `IPC.WORLDS_MARK_VIEWED` via preload bridge
- **Main handler**: `src/main.ts` (from existing Worlds feature)
- **Storage**: no changes

### Levels List Read UI (Step 08)

- **Purpose**: provide a read-only levels table at `/world/:id/levels` backed by `window.db.levels.getAllByWorld`
- **Status**: added on 2026-02-27
- **UI**: `src/renderer/pages/LevelsPage.tsx`, route update in `src/renderer/App.tsx`
- **Store**: none yet
- **IPC**: uses existing `IPC.LEVELS_GET_ALL_BY_WORLD` via `window.db.levels.getAllByWorld`; also `IPC.WORLDS_GET_BY_ID` for world name header
- **Main handler**: `src/main.ts` (from Steps 03 and 05)
- **Storage**: reads from `levels` table; no write behavior in this step

### Levels CRUD UI (Step 09)

- **Purpose**: add create/edit/delete actions and LevelForm to the levels list page; completes the Level CRUD feature
- **Status**: added on 2026-02-27
- **UI**: `src/renderer/pages/LevelsPage.tsx`, `src/renderer/components/levels/LevelForm.tsx`
- **Store**: none yet
- **IPC**: uses `IPC.LEVELS_ADD`, `IPC.LEVELS_UPDATE`, `IPC.LEVELS_DELETE` via `window.db.levels.add/update/delete`
- **Main handler**: `src/main.ts` (from Step 05)
- **Preload bridge**: `src/preload.ts` (from Step 06)
- **Storage**: create inserts and returns new row; edit updates and returns refreshed row; delete removes by id

### Level Preload Mutation Bridge (Step 06)

- **Purpose**: expose level create/update/delete to renderer through window.db.levels
- **Status**: added on 2026-02-27
- **UI**: none in this step
- **Store**: none yet
- **IPC**: `IPC.LEVELS_ADD`, `IPC.LEVELS_UPDATE`, `IPC.LEVELS_DELETE`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()` (from Step 05)
- **Preload bridge**: `src/preload.ts` -> `window.db.levels.add/update/delete`
- **Storage**: unchanged in this step

### Token Move Preload Bridge (Step 02)

- **Purpose**: expose token move-to-world and move-to-campaign methods to renderer through `window.db.tokens`.
- **Status**: added on 2026-03-05.
- **UI**: none in this step.
- **Store**: none yet.
- **IPC**: `IPC.TOKENS_MOVE_TO_WORLD`, `IPC.TOKENS_MOVE_TO_CAMPAIGN`.
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()` (from Token Move Step 01).
- **Preload bridge**: `src/preload.ts` -> `window.db.tokens.moveToWorld/moveToCampaign`.
- **Storage**: unchanged in this step (uses existing transactional move helpers in `src/database/db.ts`).

### Token Move Dialog Component (Step 03)

- **Purpose**: add a reusable renderer dialog for token scope transitions, covering move-to-world and move-to-campaign UX.
- **Status**: added on 2026-03-05.
- **UI**: `src/renderer/components/tokens/MoveTokenDialog.tsx`.
- **Store**: none yet.
- **IPC**: none directly in this step (parent integration uses existing token move IPC from Steps 01-02).
- **Main handler**: unchanged in this step.
- **Preload bridge**: unchanged in this step.
- **Storage**: unchanged in this step.

### Token Move TokensPage Integration (Step 04)

- **Purpose**: integrate `MoveTokenDialog` into `TokensPage.tsx` with context-aware move action buttons (move-to-campaign for world tokens, move-to-world and move-to-campaign for campaign tokens), state management, and confirm handlers; world-scoped tokens now correctly open `CopyTokenToCampaignDialog` via button.
- **Status**: added on 2026-03-05; bugfix on 2026-03-05 (corrected copy-to-campaign button handler).
- **UI**: `src/renderer/pages/TokensPage.tsx` (refactored actions column with conditional move buttons and dialog mounting).
- **Store**: none yet.
- **IPC**: uses existing `IPC.TOKENS_MOVE_TO_WORLD`, `IPC.TOKENS_MOVE_TO_CAMPAIGN` via `window.db.tokens.moveToWorld/moveToCampaign` (from Steps 01-02).
- **Main handler**: unchanged in this step.
- **Preload bridge**: unchanged in this step.
- **Storage**: unchanged in this step (uses existing transactional move helpers in `src/database/db.ts`).

### Ability Shared Contract (Step 01)

- **Purpose**: define shared IPC constant names for upcoming abilities CRUD and parent-child operations
- **Status**: added on 2026-02-27
- **UI**: none yet
- **Store**: none yet
- **IPC**: `IPC.ABILITIES_GET_ALL_BY_WORLD`, `IPC.ABILITIES_GET_BY_ID`, `IPC.ABILITIES_ADD`, `IPC.ABILITIES_UPDATE`, `IPC.ABILITIES_DELETE`, `IPC.ABILITIES_ADD_CHILD`, `IPC.ABILITIES_REMOVE_CHILD`, `IPC.ABILITIES_GET_CHILDREN`
- **Main handler**: not wired in this step
- **Preload bridge**: not wired in this step
- **Storage**: schema/queries not added in this step

### Ability Schema Bootstrap (Step 02)

- **Purpose**: ensure `abilities` and `ability_children` tables exist during DB initialization with required constraints for subtype, timing, and parent-child uniqueness
- **Status**: added on 2026-02-27 as migration-safe `CREATE TABLE IF NOT EXISTS`
- **UI**: none yet
- **Store**: none yet
- **IPC**: contracts exist from Step 01; runtime handlers still not wired in this step
- **Main handler**: not wired in this step
- **Preload bridge**: not wired in this step
- **Storage**: `verse-vault.db` -> `abilities` table (`id`, `world_id`, `name`, `description`, `type`, `passive_subtype`, `level_id`, `effects`, `conditions`, `cast_cost`, `trigger`, `pick_count`, `pick_timing`, `pick_is_permanent`, `created_at`, `updated_at`; extended in Casting Range Overlay Step 01 (2026-03-05) with nullable `range_cells INTEGER`, `aoe_shape TEXT CHECK IN (circle|rectangle|cone|line)`, `aoe_size_cells INTEGER`, `target_type TEXT CHECK IN (tile|token)`) and `ability_children` (`id`, `parent_id`, `child_id`, `UNIQUE(parent_id, child_id)`)

### Ability Main Read Handlers (Step 03)

- **Purpose**: provide read-only abilities retrieval in main process, including parent-child lookups
- **Status**: added on 2026-02-27
- **UI**: none yet
- **Store**: none yet
- **IPC**: `IPC.ABILITIES_GET_ALL_BY_WORLD`, `IPC.ABILITIES_GET_BY_ID`, `IPC.ABILITIES_GET_CHILDREN`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()`
- **Preload bridge**: not wired in this step
- **Storage**: `SELECT * FROM abilities WHERE world_id = ? ORDER BY updated_at DESC`; `SELECT * FROM abilities WHERE id = ?` (returns `null` when missing); children query joins `ability_children.parent_id` to `abilities.child_id` and returns child rows ordered by `updated_at DESC`

### Ability Main Mutation Handlers (Step 04)

- **Purpose**: add ability add/update/delete in main process with required trimmed-field validation and explicit partial update behavior
- **Status**: added on 2026-02-27
- **UI**: none in this step
- **Store**: none yet
- **IPC**: `IPC.ABILITIES_ADD`, `IPC.ABILITIES_UPDATE`, `IPC.ABILITIES_DELETE`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()`
- **Preload bridge**: not wired in this step
- **Storage**: `ABILITIES_ADD` validates required trimmed `name` + `type`, inserts, then returns refreshed row; `ABILITIES_UPDATE` mutates only explicitly provided fields using `hasOwnProperty` checks (including nullable fields), always sets `updated_at = datetime('now')`, then returns refreshed row; `ABILITIES_DELETE` removes by id and returns `{ id }`

### Ability Main Child Mutation Handlers (Step 05)

- **Purpose**: add parent-child link mutations in main process with explicit relationship validation and idempotent unlink behavior
- **Status**: added on 2026-02-27
- **UI**: none in this step
- **Store**: none yet
- **IPC**: `IPC.ABILITIES_ADD_CHILD`, `IPC.ABILITIES_REMOVE_CHILD`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()`
- **Preload bridge**: not wired in this step
- **Storage**: `ABILITIES_ADD_CHILD` rejects self-links, ensures both abilities exist, enforces same-world parent-child linking, inserts into `ability_children`, and maps unique-constraint duplicates to a clear domain error; `ABILITIES_REMOVE_CHILD` deletes by `(parent_id, child_id)` and returns `{ parent_id, child_id }` even when no row exists (safe idempotent no-op)

### Ability Preload Read Bridge (Step 06)

- **Purpose**: expose ability read methods in preload and align shared global types for renderer-safe usage
- **Status**: added on 2026-02-27
- **UI**: none in this step
- **Store**: none yet
- **IPC**: `IPC.ABILITIES_GET_ALL_BY_WORLD`, `IPC.ABILITIES_GET_BY_ID`, `IPC.ABILITIES_GET_CHILDREN`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()` (from Step 03)
- **Preload bridge**: `src/preload.ts` -> `window.db.abilities.getAllByWorld/getById/getChildren`
- **Storage**: unchanged in this step (read-only bridge and type alignment only)

### Ability Preload Mutation Bridge (Step 07)

- **Purpose**: expose ability mutation methods in preload and extend shared global `DbApi.abilities` signatures for renderer-safe writes
- **Status**: added on 2026-02-27
- **UI**: none in this step
- **Store**: none yet
- **IPC**: `IPC.ABILITIES_ADD`, `IPC.ABILITIES_UPDATE`, `IPC.ABILITIES_DELETE`, `IPC.ABILITIES_ADD_CHILD`, `IPC.ABILITIES_REMOVE_CHILD`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()` (from Steps 04-05)
- **Preload bridge**: `src/preload.ts` -> `window.db.abilities.add/update/delete/addChild/removeChild`
- **Storage**: unchanged in this step (bridge and type alignment only)

### Ability Route, Sidebar Link, and Read UI (Step 08)

- **Purpose**: register the abilities workspace route and sidebar navigation, and render a read-only abilities list
- **Status**: added on 2026-02-27
- **UI**: `src/renderer/App.tsx`, `src/renderer/components/worlds/WorldSidebar.tsx`, `src/renderer/pages/AbilitiesPage.tsx`
- **Store**: none yet
- **IPC**: uses existing `IPC.ABILITIES_GET_ALL_BY_WORLD` via `window.db.abilities.getAllByWorld`; also uses `IPC.WORLDS_GET_BY_ID` for world header and missing-world handling
- **Main handler**: `src/main.ts` (from Ability Step 03 and Worlds Step 03)
- **Preload bridge**: `src/preload.ts` (from Ability Step 06 and Worlds Step 04)
- **Storage**: reads from `abilities` table only; no create/update/delete UI in this step

### Ability Core CRUD UI (Step 09)

- **Purpose**: add create/edit/delete actions for core ability fields and introduce a reusable AbilityForm component
- **Status**: added on 2026-02-27
- **UI**: `src/renderer/pages/AbilitiesPage.tsx`, `src/renderer/components/abilities/AbilityForm.tsx`
- **Store**: none yet
- **IPC**: uses `IPC.ABILITIES_ADD`, `IPC.ABILITIES_UPDATE`, `IPC.ABILITIES_DELETE` via `window.db.abilities.add/update/delete`
- **Main handler**: `src/main.ts` (from Ability Step 04)
- **Preload bridge**: `src/preload.ts` (from Ability Step 07)
- **Storage**: create inserts and prepends returned row in local UI state; edit updates the matching row in place; delete removes by id after confirmation

### Ability Conditional Form Fields (Step 10)

- **Purpose**: extend AbilityForm with type/subtype-aware field visibility, JSON textarea validation/serialization, and subtype-specific payload normalization
- **Status**: added on 2026-02-27
- **UI**: `src/renderer/components/abilities/AbilityForm.tsx`, `src/renderer/pages/AbilitiesPage.tsx`
- **Store**: none yet
- **IPC**: uses existing `IPC.ABILITIES_ADD` and `IPC.ABILITIES_UPDATE` via `window.db.abilities.add/update`
- **Main handler**: `src/main.ts` (from Ability Step 04)
- **Preload bridge**: `src/preload.ts` (from Ability Step 07)
- **Storage**: form now normalizes hidden-field payload values (`passive_subtype`, `level_id`, `pick_*`, `conditions`, `cast_cost`) and blocks submit on invalid JSON shape/parse errors before sending data to IPC

### Ability Children Manager UI (Step 11)

- **Purpose**: let users manage ability parent-child links from the abilities page for supported passive subtype abilities only
- **Status**: added on 2026-02-27
- **UI**: `src/renderer/pages/AbilitiesPage.tsx`, `src/renderer/components/abilities/AbilityChildrenManager.tsx`
- **Store**: none yet
- **IPC**: uses `IPC.ABILITIES_GET_CHILDREN`, `IPC.ABILITIES_ADD_CHILD`, `IPC.ABILITIES_REMOVE_CHILD` via `window.db.abilities.getChildren/addChild/removeChild`
- **Main handler**: `src/main.ts` (from Ability Steps 03 and 05)
- **Preload bridge**: `src/preload.ts` (from Ability Steps 06 and 07)
- **Storage**: manager excludes invalid candidates (self and already-linked abilities), restricts operations to same-world ability rows, and updates linked children list after add/remove actions

### Ability Dialog Viewport Scroll Fix (Step 18)

- **Purpose**: keep ability create/edit submit actions reachable when conditional ability fields make the form taller than the app viewport
- **Status**: added on 2026-02-28
- **UI**: `src/renderer/pages/AbilitiesPage.tsx`
- **Store**: none yet
- **IPC**: unchanged (uses existing ability CRUD channels through `window.db.abilities.*`)
- **Main handler**: unchanged in this step
- **Preload bridge**: unchanged in this step
- **Storage**: unchanged in this step (renderer-only modal layout update with `max-h` + internal `overflow-y-auto`)

### Casting Range Overlay — Ability Form UI (Step 02)

- **Purpose**: surface `range_cells`, `aoe_shape`, `aoe_size_cells`, and `target_type` in the ability authoring form so GMs can set casting range and AoE metadata when creating or editing `type = active` abilities
- **Status**: added on 2026-03-05
- **UI**: `src/renderer/components/abilities/AbilityForm.tsx` — adds Range (cells) number input, AoE shape select (circle/rectangle/cone/line), AoE size (cells) number input (visible only when a shape is selected), and Target type select (tile/token) under the active-ability section; all four fields are cleared on type switch away from active; passive submit always sends all four as `null`
- **Store**: none yet
- **IPC**: unchanged (uses existing `IPC.ABILITIES_ADD` and `IPC.ABILITIES_UPDATE` via `window.db.abilities.add/update`; payload now includes `range_cells`, `aoe_shape`, `aoe_size_cells`, `target_type`)
- **Main handler**: unchanged in this step (fields were wired in Casting Range Overlay Step 01)
- **Preload bridge**: unchanged in this step
- **Storage**: no schema change; fields were added in Casting Range Overlay Step 01; form now populates and submits them

### Casting Range Overlay — Runtime Overlay and Ability Picker Panel (Step 04)

- **Purpose**: wire the casting range math library into the battlemap runtime — adds `AbilityPickerPanel` to let the GM select an active ability per selected token, and adds a `rangeOverlayContainer` layer in `BattleMapRuntimeCanvas` that draws the range ring, AoE shape fill, and tile highlights using `castingRangeMath`; pointer angle tracking drives cone/line rotation
- **Status**: added on 2026-03-05
- **UI**: `src/renderer/components/runtime/AbilityPickerPanel.tsx` (new), `src/renderer/components/runtime/BattleMapRuntimeCanvas.tsx` (overlay layer + `castingState`/`onCastingAngleChange` props), `src/renderer/pages/BattleMapRuntimePage.tsx` (`castingAbility`/`castingAngleRad` state, `selectedToken` derivation, panel render)
- **Store**: none yet
- **IPC**: unchanged (uses existing `window.db.abilities.getAllByWorld` for ability list)

### Campaign Shared Contract (Step 01)

- **Purpose**: define shared IPC constant names for upcoming campaigns CRUD scoped by world
- **Status**: added on 2026-02-27
- **UI**: none yet
- **Store**: none yet
- **IPC**: `IPC.CAMPAIGNS_GET_ALL_BY_WORLD`, `IPC.CAMPAIGNS_GET_BY_ID`, `IPC.CAMPAIGNS_ADD`, `IPC.CAMPAIGNS_UPDATE`, `IPC.CAMPAIGNS_DELETE`
- **Main handler**: not wired in this step
- **Preload bridge**: not wired in this step
- **Storage**: schema/queries not added in this step

### Campaign Schema Bootstrap (Step 04)

- **Purpose**: ensure `campaigns` table exists during DB initialization and cascades with world deletes
- **Status**: added on 2026-02-27 as migration-safe `CREATE TABLE IF NOT EXISTS`
- **UI**: none yet
- **Store**: none yet
- **IPC**: contract exists from Step 01; runtime handlers not wired in this step
- **Main handler**: not wired in this step
- **Preload bridge**: not wired in this step
- **Storage**: `verse-vault.db` -> `campaigns` table (`id`, `world_id`, `name`, `summary`, `config`, `created_at`, `updated_at`) with `world_id` FK -> `worlds(id)` `ON DELETE CASCADE`

### BattleMap Schema + Shared Contract (Step 01)

- **Purpose**: bootstrap BattleMap backend contracts by adding a world-scoped `battlemaps` table and shared IPC constants (no runtime wiring yet)
- **Status**: added on 2026-03-03
- **UI**: none in this step
- **Store**: none yet
- **IPC**: `IPC.BATTLEMAPS_GET_ALL_BY_WORLD`, `IPC.BATTLEMAPS_GET_BY_ID`, `IPC.BATTLEMAPS_ADD`, `IPC.BATTLEMAPS_UPDATE`, `IPC.BATTLEMAPS_DELETE`
- **Main handler**: not wired in this step
- **Preload bridge**: not wired in this step
- **Storage**: `verse-vault.db` -> `battlemaps` table (`id`, `world_id`, `name`, `config`, `created_at`, `updated_at`) with `world_id` FK -> `worlds(id)` `ON DELETE CASCADE`

### BattleMap Main CRUD Handlers (Step 02)

- **Purpose**: add BattleMap CRUD handlers in main process scoped by world with config JSON-text validation
- **Status**: added on 2026-03-03
- **UI**: none in this step
- **Store**: none yet
- **IPC**: `IPC.BATTLEMAPS_GET_ALL_BY_WORLD`, `IPC.BATTLEMAPS_GET_BY_ID`, `IPC.BATTLEMAPS_ADD`, `IPC.BATTLEMAPS_UPDATE`, `IPC.BATTLEMAPS_DELETE`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()`
- **Preload bridge**: not wired in this step
- **Storage**: `BATTLEMAPS_GET_ALL_BY_WORLD` reads by `world_id` ordered by `updated_at DESC, id DESC`; `BATTLEMAPS_GET_BY_ID` returns row or `null`; `BATTLEMAPS_ADD` validates required trimmed `name`, defaults omitted `config` to `'{}'`, validates provided `config` as JSON text, inserts (`world_id`, `name`, `config`), and returns inserted row; `BATTLEMAPS_UPDATE` mutates only provided fields (`name`, `config`) using `hasOwnProperty`, validates trimmed `name` and JSON `config` when present, always sets `updated_at = datetime('now')`, returns refreshed row, and throws `'BattleMap not found'` if missing; `BATTLEMAPS_DELETE` removes by id and returns `{ id }`

### BattleMap Preload Bridge + Shared Types (Step 03)

- **Purpose**: expose BattleMap CRUD methods through `window.db` and align global `BattleMap`/`DbApi.battlemaps` type signatures with existing main handlers
- **Status**: added on 2026-03-03
- **UI**: none in this step
- **Store**: none yet
- **IPC**: `IPC.BATTLEMAPS_GET_ALL_BY_WORLD`, `IPC.BATTLEMAPS_GET_BY_ID`, `IPC.BATTLEMAPS_ADD`, `IPC.BATTLEMAPS_UPDATE`, `IPC.BATTLEMAPS_DELETE`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()` (from Step 02)
- **Preload bridge**: `src/preload.ts` -> `window.db.battlemaps.getAllByWorld/getById/add/update/delete`
- **Storage**: unchanged in this step (wiring + shared typing only)

### Token + Runtime Backend Foundation (Step 01)

- **Purpose**: add campaign-scoped token CRUD contracts and harden runtime-ready BattleMap/Scene JSON contract validation in main process.
- **Status**: added on 2026-03-04
- **UI**: none in this step
- **Store**: none yet
- **IPC**: `IPC.TOKENS_GET_ALL_BY_CAMPAIGN`, `IPC.TOKENS_GET_BY_ID`, `IPC.TOKENS_ADD`, `IPC.TOKENS_UPDATE`, `IPC.TOKENS_DELETE`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()`
- **Preload bridge**: `src/preload.ts` -> `window.db.tokens.getAllByCampaign/getById/add/update/delete`
- **Storage**: adds `tokens` table (`id`, `campaign_id`, `name`, `image_src`, `config`, `is_visible`, `created_at`, `updated_at`) with `campaign_id` FK -> `campaigns(id)` `ON DELETE CASCADE` and `idx_tokens_campaign_id`; `TOKENS_GET_ALL_BY_CAMPAIGN` reads by `campaign_id` ordered by `updated_at DESC, id DESC`; add/update enforce trimmed `name`, JSON-object `config`, and `is_visible` as 0/1; `BATTLEMAPS_ADD/UPDATE` now validate object JSON and normalize `config.runtime.grid/map/camera` defaults for runtime use; scene payload validation remains backward-compatible (`'{}'`) while validating optional `payload.runtime.battlemap_id`.

### Tokens World-Scope Migration + getAllByWorld (Step 01)

- **Purpose**: extend tokens schema from campaign-only to world-first (world-scoped with optional campaign link) and add a world-scoped read channel.
- **Status**: added on 2026-03-04
- **UI**: none in this step
- **Store**: none yet
- **IPC**: adds `IPC.TOKENS_GET_ALL_BY_WORLD`; updates `IPC.TOKENS_ADD` to require `world_id` and accept optional `campaign_id`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()`
- **Preload bridge**: adds `window.db.tokens.getAllByWorld(worldId)` to `src/preload.ts`; updates `add` bridge signature
- **Storage**: `tokens` table extended — `world_id INTEGER NOT NULL` (FK -> worlds, `ON DELETE CASCADE`) added; `campaign_id` made nullable; `idx_tokens_world_id` added; additive migration `runTokenWorldIdMigration()` in `db.ts` adds column when missing, backfills `world_id` from parent campaign, creates index; `TOKENS_GET_ALL_BY_WORLD` returns all tokens for a world ordered by `name ASC`; `TOKENS_ADD` now inserts `(world_id, campaign_id, name, image_src, config, is_visible)` where `campaign_id` defaults to `null`; `Token` interface updated: `world_id: number`, `campaign_id: number | null`.

### Token Grid Variants + Footprint Contracts (Step 01)

- **Purpose**: establish additive token grid-type persistence and shared footprint/framing type contracts without changing renderer behavior.
- **Status**: added on 2026-03-05
- **UI**: none in this step
- **Store**: none yet
- **IPC**: unchanged in this step
- **Main handler**: unchanged in this step
- **Preload bridge**: unchanged in this step
- **Storage**: `tokens` schema now includes `grid_type TEXT NOT NULL DEFAULT 'square' CHECK (grid_type IN ('square', 'hex'))`; additive migration `runTokenGridTypeMigration()` adds the column when missing and backfills/normalizes legacy values to `'square'`; nullable-campaign rebuild path (`runTokenCampaignNullableMigration`) also preserves the new grid column with default `'square'`.
- **Types**: `forge.env.d.ts` adds `TokenGridType` plus additive `TokenFootprintConfig`, `TokenFramingConfig`, and `TokenConfigShape` contracts for future grid-specific token metadata.

### Token Grid Variants IPC & Main/Preload Wiring (Step 02)

- **Purpose**: wire `grid_type` field through token add/update IPC contracts, main-process handlers, and preload bridge to enable grid-aware token creation and editing.
- **Status**: added on 2026-03-05
- **UI**: none in this step
- **Store**: none yet
- **IPC**: `TOKENS_ADD` payload updated to accept optional `grid_type?: TokenGridType`, defaulting to `'square'` when omitted; `TOKENS_UPDATE` payload updated to accept optional `grid_type?: TokenGridType` for selective grid-type updates.
- **Main handler**: `TOKENS_ADD` handler adds `ensureTokenGridType()` validation function and includes `grid_type` field in INSERT SQL; `TOKENS_UPDATE` handler adds `hasGridType` check and conditional update clause for `grid_type` when present.
- **Preload bridge**: `window.db.tokens.add()` and `window.db.tokens.update()` method signatures updated to accept optional `grid_type: TokenGridType` parameter.
- **Storage**: no schema change; existing `grid_type` column used with validation logic.
- **Types**: `forge.env.d.ts` requires `grid_type: TokenGridType` on returned `Token` interface; add and update payload types in `DbApi.tokens` accept optional `grid_type?: TokenGridType`.
- **Helpers**: `TOKEN_GRID_TYPES` constant (`new Set(['square', 'hex'])`) defines valid values; `ensureTokenGridType(value, fieldName)` validates and returns type-safe grid type or throws.

### Token Grid Variants Tokens CRUD UI (Step 03)

- **Purpose**: add renderer-side grid-type selection and display so token create/edit flows persist `grid_type` and token rows visibly indicate grid shape.
- **Status**: added on 2026-03-05
- **UI**: `src/renderer/components/tokens/TokenForm.tsx`, `src/renderer/pages/TokensPage.tsx`
- **Store**: none yet
- **IPC**: unchanged in this step (uses existing `IPC.TOKENS_ADD` and `IPC.TOKENS_UPDATE` wiring from Step 02)
- **Main handler**: unchanged in this step
- **Preload bridge**: unchanged in this step
- **Storage**: no schema change; create/update payloads now include `grid_type` from renderer form state (`square` default, `hex` selectable), edit flow seeds form `grid_type` from existing token row, and token table renders a grid badge per row (`Square`/`Hex`) for at-a-glance differentiation.

### Token Grid Variants Runtime Grid Filtering (Step 04)

- **Purpose**: enforce runtime token compatibility by active BattleMap grid mode so token variants presented/added in runtime match grid geometry.
- **Status**: added on 2026-03-05
- **UI**: `src/renderer/pages/BattleMapRuntimePage.tsx`, `src/renderer/components/runtime/RuntimeTokenPalette.tsx`
- **Store**: none yet
- **IPC**: unchanged in this step (uses existing world/campaign token reads)
- **Main handler**: unchanged in this step
- **Preload bridge**: unchanged in this step
- **Storage**: no schema change; runtime palette filters both world and selected-campaign token lists by `token.grid_type` when grid mode is `square`/`hex`, shows all variants when mode is `none`, and add-token handler guards against mismatched grid/token combinations.

### Token Grid Variants Footprint Geometry + Config Serialization (Step 05)

- **Purpose**: add deterministic square/hex footprint geometry helpers and enforce persisted token config shape for additive footprint/framing metadata.
- **Status**: added on 2026-03-05
- **UI**: none in this step
- **Store**: none yet
- **IPC**: unchanged channels; existing `TOKENS_ADD` and `TOKENS_UPDATE` payload `config` field now accepts validated/normalized footprint + framing metadata.
- **Main handler**: `src/main.ts` now delegates token config validation to shared `ensureTokenConfigJsonText` exported from `src/database/db.ts`.
- **Preload bridge**: unchanged in this step
- **Storage**: no schema change; token config JSON validation now accepts legacy object configs and validates/normalizes optional `footprint` (`version`, `grid_type`, canonicalized `square_cells`/`hex_cells`, extents) plus optional `framing` (`center_*`, `extent_*`, `max_extent_*`, plus legacy anchor/offset fields).
- **Types**: `forge.env.d.ts` token contracts expanded with cell-coordinate interfaces and finalized footprint/framing fields for deterministic serialization.
- **Helpers**: `src/renderer/lib/tokenFootprintGeometry.ts` adds pure helpers for occupancy normalization, framing derivation, and stable config JSON serialization.

### Token Grid Variants Footprint Painter UX (Step 06)

- **Purpose**: capture token occupancy/framing during image selection using a modal painter and persist additive footprint metadata in token config JSON.
- **Status**: added on 2026-03-05
- **UI**: `src/renderer/components/tokens/TokenForm.tsx`, `src/renderer/components/tokens/FootprintPainterModal.tsx`, `src/renderer/pages/TokensPage.tsx`
- **Store**: none yet
- **IPC**: unchanged channels; create/edit continue using existing token image import and token add/update contracts, now with optional `config` payload carrying painter output.
- **Main handler**: unchanged in this step (continues validating `config` through shared db helper)
- **Preload bridge**: unchanged in this step
- **Storage**: no schema change; painter emits square/hex occupied-cell sets and derived framing extents, `TokenForm` serializes to `TokenConfigShape`, and token add/update persist normalized additive `footprint`/`framing` config JSON.

### Tokens Image Import IPC Pipeline (Step 01)

- **Purpose**: add a safe main-process image import pipeline so renderer can upload dropped desktop image files through IPC without direct filesystem access.
- **Status**: added on 2026-03-04
- **UI**: none in this step
- **Store**: none yet
- **IPC**: adds `IPC.TOKENS_IMPORT_IMAGE` (`db:tokens:importImage`)
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()` validates payload (`fileName`, `mimeType`, `bytes`), enforces supported mime (`image/png`, `image/jpeg`, `image/webp`, `image/gif`), rejects empty/oversized payloads (5 MB limit), writes a uniquely named file under `path.join(app.getPath('userData'), 'token-images')`, and returns `{ image_src: vv-media://token-images/... }` via app-owned media protocol
- **Preload bridge**: adds `window.db.tokens.importImage(payload)` to `src/preload.ts` with `Uint8Array` shape enforcement before invoke
- **Storage**: filesystem ownership is main-process only; token image files are stored in the app-managed `userData/token-images` directory and referenced by `image_src` file URL

### Tokens Create dnd-kit Image Dropzone + Upload Handoff (Step 02)

- **Purpose**: add create-flow desktop image drag-and-drop/file-picker upload UX and route selected image bytes through the existing token image import IPC before token insert.
- **Status**: added on 2026-03-04
- **UI**: `src/renderer/components/tokens/TokenImageDropzone.tsx`, `src/renderer/components/tokens/TokenForm.tsx`, `src/renderer/pages/TokensPage.tsx`
- **Store**: none yet
- **IPC**: uses existing `IPC.TOKENS_IMPORT_IMAGE` via `window.db.tokens.importImage` and existing `IPC.TOKENS_ADD` via `window.db.tokens.add`
- **Main handler**: unchanged in this step (uses token image import handler from Step 01)
- **Preload bridge**: unchanged in this step (uses existing `window.db.tokens.importImage` + `window.db.tokens.add`)
- **Storage**: renderer validates selected file mime (`image/png`, `image/jpeg`, `image/webp`, `image/gif`) and 5 MB max before submit, surfaces inline errors for invalid/unreadable files, sends `image_upload` payload (`fileName`, `mimeType`, `bytes`) in create form submissions, imports selected image first to resolve `image_src`, and preserves manual `image_src` create behavior when no upload is selected

### Tokens Edit Image Replace + Clear Flow (Step 03)

- **Purpose**: extend token edit UX so existing images can be previewed, replaced via drag/drop or picker upload, explicitly cleared, or left unchanged without accidental overwrite.
- **Status**: added on 2026-03-04
- **UI**: `src/renderer/components/tokens/TokenForm.tsx`, `src/renderer/pages/TokensPage.tsx`
- **Store**: none yet
- **IPC**: uses existing `IPC.TOKENS_IMPORT_IMAGE` via `window.db.tokens.importImage` and existing `IPC.TOKENS_UPDATE` via `window.db.tokens.update`
- **Main handler**: unchanged in this step (uses token update and image import handlers from Step 01)
- **Preload bridge**: unchanged in this step (uses existing `window.db.tokens.importImage` + `window.db.tokens.update`)
- **Storage**: edit form now exposes current image preview when `initialValues.image_src` exists, emits explicit `clear_image` signal for remove-on-save intent, allows dropzone replacement upload in edit mode, and preserves no-change image edits by omitting `image_src` from update payload unless manual image URL/path edits were made; update flow applies deterministic precedence `image_upload` (replace) > `clear_image` (set `image_src: null`) > manual/unchanged `image_src`

### BattleMap Renderer Route + CRUD Page (Step 04)

- **Purpose**: add world-level BattleMaps navigation and renderer CRUD UX with table timestamps for created/updated dates
- **Status**: added on 2026-03-03
- **UI**: `src/renderer/App.tsx`, `src/renderer/components/worlds/WorldSidebar.tsx`, `src/renderer/pages/BattleMapsPage.tsx`, `src/renderer/components/battlemaps/BattleMapForm.tsx`
- **Store**: none yet
- **IPC**: uses existing `IPC.WORLDS_GET_BY_ID`, `IPC.BATTLEMAPS_GET_ALL_BY_WORLD`, `IPC.BATTLEMAPS_ADD`, `IPC.BATTLEMAPS_UPDATE`, and `IPC.BATTLEMAPS_DELETE` via `window.db.worlds.getById` and `window.db.battlemaps.*`
- **Main handler**: unchanged in this step (uses BattleMap Step 02 handlers in `src/main.ts`)
- **Preload bridge**: unchanged in this step (uses BattleMap Step 03 bridge methods in `src/preload.ts`)
- **Storage**: renderer-only state flow; validates positive world id, loads world then battlemaps list, renders `created_at`/`updated_at` columns with localized formatting, supports create/edit modal form + delete confirmation, and updates local table state on success

### BattleMap Play Runtime Route + Shell (Step 02)

- **Purpose**: add row-level Play navigation from BattleMaps list into a dedicated runtime shell route with mandatory exit affordance.
- **Status**: added on 2026-03-04
- **UI**: `src/renderer/pages/BattleMapsPage.tsx`, `src/renderer/App.tsx`, `src/renderer/pages/BattleMapRuntimePage.tsx`
- **Store**: none yet
- **IPC**: uses existing `IPC.BATTLEMAPS_GET_BY_ID` via `window.db.battlemaps.getById` to load runtime target battlemap
- **Main handler**: unchanged in this step (uses BattleMap Step 02 handlers in `src/main.ts`)
- **Preload bridge**: unchanged in this step (uses BattleMap Step 03 bridge methods in `src/preload.ts`)
- **Storage**: renderer-only runtime-entry flow; each BattleMap row now links to `/world/:id/battlemaps/:battleMapId/runtime`, runtime page validates ids + world ownership, guards invalid/non-object config JSON with recovery messaging, and always exposes `Exit Runtime` back to `/world/:id/battlemaps`

### PixiJS Runtime Bootstrap (Step 03)

- **Purpose**: mount a PixiJS runtime canvas in the BattleMap runtime route with a stable stage graph and base background/map rendering.
- **Status**: added on 2026-03-04
- **UI**: `src/renderer/pages/BattleMapRuntimePage.tsx`, `src/renderer/components/runtime/BattleMapRuntimeCanvas.tsx`
- **Store**: none yet
- **IPC**: unchanged in this step (uses existing `IPC.BATTLEMAPS_GET_BY_ID` via `window.db.battlemaps.getById`)
- **Main handler**: unchanged in this step
- **Preload bridge**: unchanged in this step
- **Storage**: renderer-only runtime rendering bootstrap; installs `pixi.js`, normalizes runtime defaults in page load flow, initializes `Application` + stage graph containers once on mount (`world/background/map/image/grid/token/ui`), renders background + map border layers plus optional map image sprite, applies camera transform updates, and cleans up Pixi resources/listeners on unmount.

### Runtime Grid Rendering + Controls (Step 04)

- **Purpose**: add runtime grid rendering modes (`square`, `hex`, `none`) plus runtime HUD controls for grid mode/cell size/origin with persisted config updates.
- **Status**: added on 2026-03-04
- **UI**: `src/renderer/pages/BattleMapRuntimePage.tsx`, `src/renderer/components/runtime/BattleMapRuntimeCanvas.tsx`, `src/renderer/components/runtime/RuntimeGridControls.tsx`
- **Store**: none yet
- **IPC**: uses existing `IPC.BATTLEMAPS_GET_BY_ID` + `IPC.BATTLEMAPS_UPDATE` via `window.db.battlemaps.getById/update`
- **Main handler**: unchanged in this step (uses BattleMap config validation/normalization in `src/main.ts`)
- **Preload bridge**: unchanged in this step
- **Storage**: renderer persists debounced `runtime.grid` updates by merging into parsed `battlemaps.config` and writing via `window.db.battlemaps.update`, preserving unrelated root/runtime keys while keeping runtime map/camera fields intact; Pixi runtime now draws square and pointy-hex grid overlays from runtime config, supports `none` mode, and fills map background black whenever no map image is present.

### Runtime Persistence + Exit Flow Hardening (Step 05)

- **Purpose**: harden runtime persistence reads/writes and make runtime exit deterministic when pending runtime saves exist.
- **Status**: added on 2026-03-04
- **UI**: `src/renderer/pages/BattleMapRuntimePage.tsx`, `src/renderer/lib/battlemapRuntimeState.ts`
- **Store**: none yet
- **IPC**: uses existing `IPC.BATTLEMAPS_GET_BY_ID` + `IPC.BATTLEMAPS_UPDATE` via `window.db.battlemaps.getById/update`
- **Main handler**: unchanged in this step
- **Preload bridge**: unchanged in this step
- **Storage**: runtime page now uses shared runtime-state helpers to parse/normalize/merge config writes, tracks runtime dirty state via stable serialized runtime keys, flushes queued/in-flight runtime saves before route transitions, blocks in-app navigations while pending changes exist, and prompts for explicit discard confirmation when pending changes cannot be persisted.

### Runtime Token Placement + Movement (Step 06)

- **Purpose**: place campaign tokens into the Pixi runtime scene and support token selection/drag movement with grid-aware snap behavior.
- **Status**: added on 2026-03-04
- **UI**: `src/renderer/pages/BattleMapRuntimePage.tsx`, `src/renderer/components/runtime/BattleMapRuntimeCanvas.tsx`, `src/renderer/components/runtime/RuntimeTokenPalette.tsx`
- **Store**: none yet
- **IPC**: uses existing token and campaign reads via `window.db.campaigns.getAllByWorld`, `window.db.tokens.getAllByWorld`, and `window.db.tokens.getAllByCampaign`
- **Main handler**: unchanged in this step
- **Preload bridge**: unchanged in this step
- **Storage**: runtime page now loads world-scoped and campaign-scoped token libraries, creates runtime token instances with camera-centered placement, keeps token references resilient when source tokens disappear, and tracks runtime token selection/removal state in renderer memory; the runtime palette now supports hover image previews for both world and campaign token rows; Pixi runtime renders token image sprites (or fallback markers), supports pointer drag, and snaps dropped tokens according to active grid mode (`square`, `hex`, `none`), including support for invisible tokens in runtime logic.

### Runtime Camera Pan + Smooth Token Focus (Step 07)

- **Purpose**: add camera drag-pan interactions on vacant runtime background and smooth camera centering on selected runtime tokens.
- **Status**: added on 2026-03-04
- **UI**: `src/renderer/components/runtime/BattleMapRuntimeCanvas.tsx`
- **Store**: none yet
- **IPC**: unchanged in this step
- **Main handler**: unchanged in this step
- **Preload bridge**: unchanged in this step
- **Storage**: renderer-only interaction update; runtime canvas now keeps local camera state for pan/focus, converts pointer screen deltas to world-space camera shifts, blocks camera pan while token drag is active, interpolates camera center toward selected tokens, and immediately cancels focus animation when manual pan begins.

### Runtime Wheel Zoom (Step 02)

- **Purpose**: add pointer-centered mouse wheel zoom on the runtime Pixi canvas, clamped to fit-to-edges minimum and configured maximum.
- **Status**: added on 2026-03-05
- **UI**: `src/renderer/components/runtime/BattleMapRuntimeCanvas.tsx`
- **Store**: none yet
- **IPC**: unchanged in this step
- **Main handler**: unchanged in this step
- **Preload bridge**: unchanged in this step
- **Storage**: renderer-only; native `wheel` DOM listener (non-passive) on the Pixi canvas normalises `deltaY` across DOM delta modes (pixel/line/page), scales zoom by `1.001^delta`, adjusts camera position to keep the world point under the cursor fixed, clamps via `clampCameraZoom`/`getEffectiveMinZoom`, cancels any active camera focus animation, and blocks zoom during active token drag.

### Token Image Rendering Fix (Runtime Step 07)

- **Purpose**: fix token images not rendering in the BattleMap runtime canvas — PixiJS blob workers can't access the `vv-media://` Electron custom protocol, so `Assets.load()` was silently falling back to the placeholder circle; CSP also blocked blob worker creation.
- **Status**: fixed on 2026-03-05
- **UI**: `src/renderer/components/runtime/BattleMapRuntimeCanvas.tsx` — `Assets.setPreferences({ preferWorkers: false, preferCreateImageBitmap: false })` called at `initializePixi` start so textures load via `new Image()` in the renderer main thread; `index.html` — added `worker-src blob:` to CSP.
- **Store**: none
- **IPC**: unchanged
- **Main handler**: unchanged
- **Preload bridge**: unchanged
- **Storage**: renderer-only; no data model changes.

### Campaign Main CRUD Handlers (Step 07)

- **Purpose**: add campaign CRUD handlers in main process scoped by world with explicit partial-update behavior
- **Status**: added on 2026-02-27
- **UI**: none in this step
- **Store**: none yet
- **IPC**: `IPC.CAMPAIGNS_GET_ALL_BY_WORLD`, `IPC.CAMPAIGNS_GET_BY_ID`, `IPC.CAMPAIGNS_ADD`, `IPC.CAMPAIGNS_UPDATE`, `IPC.CAMPAIGNS_DELETE`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()`
- **Preload bridge**: not wired in this step
- **Storage**: `CAMPAIGNS_GET_ALL_BY_WORLD` reads by `world_id` ordered by `updated_at DESC`; `CAMPAIGNS_GET_BY_ID` returns row or `null`; `CAMPAIGNS_ADD` validates required trimmed `name`, inserts (`world_id`, `name`, `summary`, `config`) and returns the inserted row; `CAMPAIGNS_UPDATE` mutates only provided fields (`name`, `summary`, `config`) using `hasOwnProperty`, always sets `updated_at = datetime('now')`, and returns refreshed row; `CAMPAIGNS_DELETE` removes by id and returns `{ id }`

### Arc + Act Schema, IPC, and Migration (Arc/Act Step 01)

- **Purpose**: introduce `arcs` and `acts` tables between Campaign and Session; migrate existing `sessions.campaign_id` FK to `sessions.act_id`; add full CRUD + reparenting IPC channels for arcs and acts; update session channels to scope by `act_id`
- **Status**: added on 2026-02-28
- **UI**: none in this step
- **Store**: none yet
- **IPC**: `IPC.ARCS_GET_ALL_BY_CAMPAIGN`, `IPC.ARCS_GET_BY_ID`, `IPC.ARCS_ADD`, `IPC.ARCS_UPDATE`, `IPC.ARCS_DELETE`; `IPC.ACTS_GET_ALL_BY_ARC`, `IPC.ACTS_GET_ALL_BY_CAMPAIGN`, `IPC.ACTS_GET_BY_ID`, `IPC.ACTS_ADD`, `IPC.ACTS_UPDATE`, `IPC.ACTS_DELETE`, `IPC.ACTS_MOVE_TO_ARC`; `IPC.SESSIONS_GET_ALL_BY_ACT`, `IPC.SESSIONS_MOVE_TO_ACT`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()`
- **Preload bridge**: `src/preload.ts` -> `window.db.arcs.*`, `window.db.acts.*`; `window.db.sessions.getAllByAct/moveTo` (replaces `getAllByCampaign`)
- **Storage**: `verse-vault.db` -> `arcs` table (`id`, `campaign_id` FK, `name`, `sort_order`, `created_at`, `updated_at`); `acts` table (`id`, `arc_id` FK, `name`, `sort_order`, `created_at`, `updated_at`); `sessions.act_id` FK -> `acts(id)` (migrated from `campaign_id`); `runArcActMigration` in `db.ts` auto-migrates existing databases on first launch

### Session Shared Contract (Step 02)

- **Purpose**: define shared IPC constant names for upcoming sessions CRUD scoped by campaign
- **Status**: added on 2026-02-27; updated Arc/Act Step 01 (2026-02-28) to add `SESSIONS_GET_ALL_BY_ACT` and `SESSIONS_MOVE_TO_ACT`
- **UI**: none yet
- **Store**: none yet
- **IPC**: `IPC.SESSIONS_GET_ALL_BY_CAMPAIGN` (deprecated, kept for renderer compat), `IPC.SESSIONS_GET_ALL_BY_ACT`, `IPC.SESSIONS_GET_BY_ID`, `IPC.SESSIONS_ADD`, `IPC.SESSIONS_UPDATE`, `IPC.SESSIONS_DELETE`, `IPC.SESSIONS_MOVE_TO_ACT`
- **Main handler**: not wired in this step
- **Preload bridge**: not wired in this step
- **Storage**: schema/queries not added in this step

### Session Schema Bootstrap (Step 05)

- **Purpose**: ensure `sessions` table exists during DB initialization and cascades deletes
- **Status**: added on 2026-02-27 as migration-safe `CREATE TABLE IF NOT EXISTS`; schema updated Arc/Act Step 01 (2026-02-28) — `campaign_id` FK replaced by `act_id` FK for fresh DBs; existing DBs auto-migrated by `runArcActMigration`; Session planned date-time Step 01 (2026-03-03) adds nullable `planned_at` with `runSessionPlannedAtMigration` for existing DBs.
- **UI**: none yet
- **Store**: none yet
- **IPC**: session contract exists from Step 02; runtime handlers are added later in Step 08
- **Main handler**: not wired in this step
- **Preload bridge**: not wired in this step
- **Storage**: `verse-vault.db` -> `sessions` table (`id`, `act_id` FK -> `acts(id)` `ON DELETE CASCADE`, `name`, `notes`, `planned_at` nullable `TEXT`, `sort_order`, `created_at`, `updated_at`)

### Session Main CRUD Handlers (Step 08)

- **Purpose**: add session CRUD handlers in main process; updated Arc/Act Step 01 to scope by `act_id`
- **Status**: added on 2026-02-27; updated Arc/Act Step 01 (2026-02-28)
- **UI**: none in this step
- **Store**: none yet
- **IPC**: `IPC.SESSIONS_GET_ALL_BY_ACT`, `IPC.SESSIONS_GET_BY_ID`, `IPC.SESSIONS_ADD`, `IPC.SESSIONS_UPDATE`, `IPC.SESSIONS_DELETE`, `IPC.SESSIONS_MOVE_TO_ACT`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()`
- **Preload bridge**: not wired in this step
- **Storage**: `SESSIONS_GET_ALL_BY_ACT` reads by `act_id` ordered by `sort_order ASC, id ASC`; `SESSIONS_GET_BY_ID` returns row or `null`; `SESSIONS_ADD` validates required trimmed `name`, appends to sibling tail when `sort_order` is omitted (`MAX(sort_order) + 1` within act), inserts (`act_id`, `name`, `notes`, `planned_at`, `sort_order`), and returns the inserted row; `SESSIONS_UPDATE` mutates only provided fields (`name`, `notes`, `planned_at`, `sort_order`) using `hasOwnProperty`, always sets `updated_at = datetime('now')`, and returns refreshed row; `SESSIONS_DELETE` removes by id, compacts remaining sibling `sort_order` values within `act_id`, and returns `{ id }`; `SESSIONS_MOVE_TO_ACT` moves session to a different act, appends at the tail of the new act, and resequences the old act

### Scene Shared Contract (Step 03)

- **Purpose**: define shared IPC constant names for upcoming scenes CRUD scoped by session
- **Status**: added on 2026-02-27
- **UI**: none yet
- **Store**: none yet
- **IPC**: `IPC.SCENES_GET_ALL_BY_SESSION`, `IPC.SCENES_GET_BY_ID`, `IPC.SCENES_ADD`, `IPC.SCENES_UPDATE`, `IPC.SCENES_DELETE`
- **Main handler**: not wired in this step
- **Preload bridge**: not wired in this step
- **Storage**: schema/queries not added in this step

### Scene Schema Bootstrap (Step 06)

- **Purpose**: ensure `scenes` table exists during DB initialization as a lightweight scene container, not a runtime scene engine
- **Status**: added on 2026-02-27 as migration-safe `CREATE TABLE IF NOT EXISTS`
- **UI**: none yet
- **Store**: none yet
- **IPC**: scene contract exists from Step 03; runtime handlers not wired in this step
- **Main handler**: not wired in this step
- **Preload bridge**: not wired in this step
- **Storage**: `verse-vault.db` -> `scenes` table (`id`, `session_id`, `name`, `notes`, `payload`, `sort_order`, `created_at`, `updated_at`) with `session_id` FK -> `sessions(id)` `ON DELETE CASCADE`; `payload` defaults to `'{}'` for future map/token/clock/rules scene state

### Scene Main Handlers (Step 09 + Move Step 01)

- **Purpose**: add scene handlers in main process scoped by session, including CRUD plus move-to-session reparenting, while keeping scene payload as a lightweight JSON-text skeleton
- **Status**: added on 2026-02-27; extended on 2026-03-03
- **UI**: none in this step
- **Store**: none yet
- **IPC**: `IPC.SCENES_GET_ALL_BY_CAMPAIGN`, `IPC.SCENES_GET_ALL_BY_SESSION`, `IPC.SCENES_GET_BY_ID`, `IPC.SCENES_ADD`, `IPC.SCENES_UPDATE`, `IPC.SCENES_DELETE`, `IPC.SCENES_MOVE_TO_SESSION`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()`
- **Preload bridge**: not wired in this step
- **Storage**: `SCENES_GET_ALL_BY_CAMPAIGN` joins `scenes -> sessions -> acts -> arcs`, filters by `arcs.campaign_id`, and returns deterministic hierarchy order (`arcs.sort_order/id`, `acts.sort_order/id`, `sessions.sort_order/id`, `scenes.sort_order/id`); `SCENES_GET_ALL_BY_SESSION` reads by `session_id` ordered by `sort_order ASC, id ASC`; `SCENES_GET_BY_ID` returns row or `null`; `SCENES_ADD` validates required trimmed `name`, validates optional `payload` as JSON text, defaults omitted `payload` to `'{}'`, appends to sibling tail when `sort_order` is omitted (`MAX(sort_order) + 1` within session), inserts (`session_id`, `name`, `notes`, `payload`, `sort_order`), and returns the inserted row; `SCENES_UPDATE` mutates only provided fields (`name`, `notes`, `payload`, `sort_order`) using `hasOwnProperty`, validates trimmed `name` and JSON `payload` when present, always sets `updated_at = datetime('now')`, and returns refreshed row; `SCENES_DELETE` removes by id, compacts remaining sibling `sort_order` values to contiguous numbering within `session_id`, and returns `{ id }`; `SCENES_MOVE_TO_SESSION` runs in a transaction, validates source scene and target session, no-ops when the session is unchanged, appends moved scene to the target tail, resequences the old session, and returns the refreshed moved row

### Campaign/Session/Scene Preload Bridges (Step 10)

- **Purpose**: expose all 15 campaign/session/scene CRUD channels as typed bridge methods in preload so the renderer can invoke them via `window.db`
- **Status**: added on 2026-02-28
- **UI**: none in this step
- **Store**: none yet
- **IPC**: `IPC.CAMPAIGNS_*` (5 channels) + `IPC.SESSIONS_*` (5 channels) + `IPC.SCENES_*` (5 channels)
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()` (from Campaign Step 07, Session Step 08, Scene Step 09)
- **Preload bridge**: `src/preload.ts` -> `window.db.campaigns.getAllByWorld/getById/add/update/delete`, `window.db.sessions.getAllByAct/getById/add/update/delete`, `window.db.scenes.getAllByCampaign/getAllBySession/getById/add/update/delete` (extended with `window.db.scenes.moveTo` in Scenes Move Step 01 on 2026-03-03)
- **Storage**: unchanged in this step (bridge wiring only)

### Campaigns Route, Sidebar Link, and Read UI (Step 12)

- **Purpose**: register the campaigns workspace route and sidebar navigation, and render a read-only campaigns list scoped to a world
- **Status**: added on 2026-02-28
- **UI**: `src/renderer/App.tsx`, `src/renderer/components/worlds/WorldSidebar.tsx`, `src/renderer/pages/CampaignsPage.tsx`
- **Store**: none yet
- **IPC**: uses existing `IPC.CAMPAIGNS_GET_ALL_BY_WORLD` via `window.db.campaigns.getAllByWorld`; also uses `IPC.WORLDS_GET_BY_ID` for world header and missing-world handling
- **Main handler**: `src/main.ts` (from Campaign Step 07 and Worlds Step 03)
- **Preload bridge**: `src/preload.ts` (from Campaign/Session/Scene Step 10 and Worlds Step 04)
- **Storage**: reads from `campaigns` table only; no create/update/delete UI in this step

### Campaign CRUD UI (Step 13)

- **Purpose**: add create/edit/delete campaign flows and a reusable CampaignForm to CampaignsPage; each row also exposes a Sessions link
- **Status**: added on 2026-02-28
- **UI**: `src/renderer/pages/CampaignsPage.tsx`, `src/renderer/components/campaigns/CampaignForm.tsx`
- **Store**: none yet
- **IPC**: uses `IPC.CAMPAIGNS_ADD`, `IPC.CAMPAIGNS_UPDATE`, `IPC.CAMPAIGNS_DELETE` via `window.db.campaigns.add/update/delete`
- **Main handler**: `src/main.ts` (from Campaign Step 07)
- **Preload bridge**: `src/preload.ts` (from Campaign/Session/Scene Step 10)
- **Storage**: create inserts and prepends returned row in local UI state; edit updates the matching row in place; delete removes by id after confirmation

### Session CRUD UI (Step 14)

- **Purpose**: add a sessions list page under a campaign with full create/edit/delete actions and a reusable SessionForm; each row exposes a Scenes link
- **Status**: added on 2026-02-28
- **UI**: `src/renderer/App.tsx`, `src/renderer/pages/SessionsPage.tsx`, `src/renderer/components/sessions/SessionForm.tsx`
- **Store**: none yet
- **IPC**: uses `IPC.CAMPAIGNS_GET_BY_ID` via `window.db.campaigns.getById` for campaign header; uses `IPC.SESSIONS_GET_ALL_BY_CAMPAIGN`, `IPC.SESSIONS_ADD`, `IPC.SESSIONS_UPDATE`, `IPC.SESSIONS_DELETE` via `window.db.sessions.*`
- **Main handler**: `src/main.ts` (from Campaign Step 07 and Session Step 08)
- **Preload bridge**: `src/preload.ts` (from Campaign/Session/Scene Step 10)
- **Storage**: create inserts and prepends returned row in local UI state; edit updates the matching row in place; delete removes by id after confirmation

### Session Table Sequence + dnd-kit Reorder (Step 16)

- **Purpose**: add visible `1..N` ordering in Sessions table and allow in-table drag-and-drop reordering persisted via existing session update calls
- **Status**: added on 2026-02-28
- **UI**: `src/renderer/pages/SessionsPage.tsx`
- **Store**: none yet
- **IPC**: uses existing `IPC.SESSIONS_UPDATE` and `IPC.SESSIONS_GET_ALL_BY_CAMPAIGN` via `window.db.sessions.update/getAllByCampaign`
- **Main handler**: `src/main.ts` (from Session Step 08)
- **Preload bridge**: `src/preload.ts` (from Campaign/Session/Scene Step 10)
- **Storage**: renderer now sorts sessions by `sort_order` for display, reassigns contiguous `sort_order` values on drag/drop, persists changed rows through `window.db.sessions.update(id, { sort_order })`, and on save failure restores canonical order by reloading from `SESSIONS_GET_ALL_BY_CAMPAIGN` (fallback to pre-drag snapshot if reload fails)

### Session Planned Date-Time Renderer UI (Step 02)

- **Purpose**: expose `planned_at` in session create/edit dialogs and in the sessions list table
- **Status**: added on 2026-03-03
- **UI**: `src/renderer/pages/SessionsPage.tsx`, `src/renderer/components/sessions/SessionForm.tsx`
- **Store**: none yet
- **IPC**: uses existing `IPC.SESSIONS_GET_ALL_BY_ACT`, `IPC.SESSIONS_ADD`, and `IPC.SESSIONS_UPDATE` via `window.db.sessions.*`
- **Main handler**: unchanged in this step (uses Session Step 08 handlers)
- **Preload bridge**: unchanged in this step (uses Session bridge from Campaign/Session/Scene Step 10)
- **Storage**: renderer-only behavior change; `SessionForm` submits `planned_at` as a `datetime-local` string or `null`, and SessionsPage formats valid values for display with `-` fallback for empty values

### Scene CRUD UI (Step 15)

- **Purpose**: add a scenes list page under a session with full create/edit/delete actions and a reusable SceneForm; payload stored as raw JSON text skeleton with no runtime scene engine behavior
- **Status**: added on 2026-02-28
- **UI**: `src/renderer/App.tsx`, `src/renderer/pages/ScenesPage.tsx`, `src/renderer/components/scenes/SceneForm.tsx`
- **Store**: none yet
- **IPC**: uses `IPC.SESSIONS_GET_BY_ID` via `window.db.sessions.getById` for session header; uses `IPC.SCENES_GET_ALL_BY_SESSION`, `IPC.SCENES_ADD`, `IPC.SCENES_UPDATE`, `IPC.SCENES_DELETE` via `window.db.scenes.*`
- **Main handler**: `src/main.ts` (from Scene Step 09)
- **Preload bridge**: `src/preload.ts` (from Campaign/Session/Scene Step 10)
- **Storage**: create inserts and prepends returned row in local UI state; edit updates the matching row in place; delete removes by id after confirmation

### Scene Table Sequence + dnd-kit Reorder (Step 17)

- **Purpose**: add visible `1..N` ordering in Scenes table and allow in-table drag-and-drop reordering persisted via existing scene update calls
- **Status**: added on 2026-02-28
- **UI**: `src/renderer/pages/ScenesPage.tsx`
- **Store**: none yet
- **IPC**: uses existing `IPC.SCENES_UPDATE` and `IPC.SCENES_GET_ALL_BY_SESSION` via `window.db.scenes.update/getAllBySession`
- **Main handler**: `src/main.ts` (from Scene Step 09)
- **Preload bridge**: `src/preload.ts` (from Campaign/Session/Scene Step 10)
- **Storage**: renderer now sorts scenes by `sort_order` for display, reassigns contiguous `sort_order` values on drag/drop, persists changed rows through `window.db.scenes.update(id, { sort_order })`, and on save failure restores canonical order by reloading from `SCENES_GET_ALL_BY_SESSION` (fallback to pre-drag snapshot if reload fails)

### Scene Move Between Sessions Renderer Action + Dialog (Step 02)

- **Purpose**: expose scene reparenting from the Scenes table using a row-level Move action and modal target-session picker
- **Status**: added on 2026-03-03
- **UI**: `src/renderer/pages/ScenesPage.tsx`, `src/renderer/components/scenes/MoveSceneDialog.tsx`
- **Store**: none yet
- **IPC**: uses `IPC.SCENES_MOVE_TO_SESSION` via `window.db.scenes.moveTo`; loads candidate target sessions via existing `window.db.arcs.getAllByCampaign`, `window.db.acts.getAllByCampaign`, and `window.db.sessions.getAllByAct`
- **Main handler**: unchanged in this step (uses Scene Move Step 01 handler from `src/main.ts`)
- **Preload bridge**: unchanged in this step (uses `window.db.scenes.moveTo` + existing arcs/acts/sessions read bridges)
- **Storage**: renderer-only behavior change; successful move removes the moved scene from current-session local state immediately, while failures keep list state unchanged and show an error toast

### Campaign Scenes Index Renderer Route + Page (Step 02)

- **Purpose**: expose a campaign-level scenes index route so users can browse all scenes in a campaign with session/act/arc context
- **Status**: added on 2026-03-03
- **UI**: `src/renderer/App.tsx`, `src/renderer/pages/CampaignsPage.tsx`, `src/renderer/pages/CampaignScenesPage.tsx`
- **Store**: none yet
- **IPC**: uses existing `IPC.CAMPAIGNS_GET_BY_ID` via `window.db.campaigns.getById` and `IPC.SCENES_GET_ALL_BY_CAMPAIGN` via `window.db.scenes.getAllByCampaign`
- **Main handler**: unchanged in this step (uses existing handlers from Campaign Step 07 and Scene Main Handlers Step 09 + Move Step 01)
- **Preload bridge**: unchanged in this step (uses existing `window.db.campaigns.getById` and `window.db.scenes.getAllByCampaign`)
- **Storage**: renderer-only read flow; no create/update/delete behavior in this step

### Arc + Act CRUD Pages (Step 02 — Arc/Act UI)

- **Purpose**: add ArcsPage and ActsPage to the hierarchy (World > Campaign > Arc > Act > Session > Scene); update SessionsPage and ScenesPage to the new 6-level route path; update CampaignsPage to link to Arcs instead of Sessions
- **Status**: added on 2026-02-28
- **UI**:
  - `src/renderer/pages/ArcsPage.tsx` — lists Arcs under a Campaign; dnd-kit reordering; create/edit/delete dialogs; links to ActsPage
  - `src/renderer/pages/ActsPage.tsx` — lists Acts under an Arc; dnd-kit reordering; create/edit/delete dialogs; links to SessionsPage
  - `src/renderer/components/arcs/ArcForm.tsx` — controlled form for Arc name
  - `src/renderer/components/acts/ActForm.tsx` — controlled form for Act name
  - `src/renderer/pages/SessionsPage.tsx` — updated: reads `actId` from route params; uses `window.db.sessions.getAllByAct`; full breadcrumb chain
  - `src/renderer/pages/ScenesPage.tsx` — updated: reads `arcId`/`actId` from route params for breadcrumb; data loading unchanged
  - `src/renderer/pages/CampaignsPage.tsx` — updated: campaign row action now links to Arcs
  - `src/renderer/components/sessions/SessionForm.tsx` — updated: uses `actId`/`act_id` instead of `campaignId`/`campaign_id`
  - `src/renderer/App.tsx` — updated: new routes for arcs, acts, sessions, scenes with full path
- **Store**: none
- **IPC**: `window.db.arcs.*` (getAllByCampaign, getById, add, update, delete); `window.db.acts.*` (getAllByArc, getById, add, update, delete); `window.db.sessions.getAllByAct`

### DaisyUI Renderer Delete Confirm Migration (Step 02)

- **Purpose**: replace native `window.confirm` delete prompts in renderer list pages with shared DaisyUI `ConfirmDialog`, while preserving existing delete mutation/error/loading behavior
- **Status**: added on 2026-03-03
- **UI**: `src/renderer/pages/WorldsHomePage.tsx`, `src/renderer/pages/LevelsPage.tsx`, `src/renderer/pages/AbilitiesPage.tsx`, `src/renderer/pages/CampaignsPage.tsx`, `src/renderer/pages/BattleMapsPage.tsx`, `src/renderer/pages/ArcsPage.tsx`, `src/renderer/pages/ActsPage.tsx`, `src/renderer/pages/SessionsPage.tsx`, `src/renderer/pages/ScenesPage.tsx`
- **Store**: none
- **IPC**: unchanged in this step (uses existing delete channels via `window.db.*.delete`)
- **Main handler**: unchanged in this step
- **Preload bridge**: unchanged in this step
- **Storage**: renderer-only interaction change; each page now stages pending delete entity in local state and executes deletion only from explicit dialog confirm

### DaisyUI Renderer Modal Shell Standardization (Step 03)

- **Purpose**: standardize renderer create/edit/move dialog containers on shared DaisyUI `ModalShell` and remove duplicated per-page overlay/dialog wrapper markup
- **Status**: added on 2026-03-04
- **UI**: `src/renderer/pages/WorldsHomePage.tsx`, `src/renderer/pages/LevelsPage.tsx`, `src/renderer/pages/AbilitiesPage.tsx`, `src/renderer/pages/CampaignsPage.tsx`, `src/renderer/pages/BattleMapsPage.tsx`, `src/renderer/pages/ArcsPage.tsx`, `src/renderer/pages/ActsPage.tsx`, `src/renderer/pages/SessionsPage.tsx`, `src/renderer/pages/ScenesPage.tsx`, `src/renderer/components/acts/MoveActDialog.tsx`, `src/renderer/components/sessions/MoveSessionDialog.tsx`, `src/renderer/components/scenes/MoveSceneDialog.tsx`, `src/renderer/components/ui/ModalShell.tsx`
- **Store**: none
- **IPC**: unchanged in this step (uses existing `window.db.*` CRUD/move calls)
- **Main handler**: unchanged in this step
- **Preload bridge**: unchanged in this step
- **Storage**: renderer-only presentation wiring change; form submit/cancel and move confirm/cancel handlers remain unchanged while dialog shell behavior (Escape/backdrop close, focus lock/restore, scroll lock) is centralized through `ModalShell`

### DaisyUI Toast Feedback for Renderer Mutations (Step 04)

- **Purpose**: make renderer mutation flows toast-first so create/update/delete/move success and failure feedback is surfaced consistently through the shared toast system
- **Status**: added on 2026-03-04
- **UI**: `src/renderer/pages/WorldsHomePage.tsx`, `src/renderer/pages/LevelsPage.tsx`, `src/renderer/pages/AbilitiesPage.tsx`, `src/renderer/pages/CampaignsPage.tsx`, `src/renderer/pages/BattleMapsPage.tsx`, `src/renderer/pages/ArcsPage.tsx`, `src/renderer/pages/ActsPage.tsx`, `src/renderer/pages/SessionsPage.tsx`, `src/renderer/pages/ScenesPage.tsx`, `src/renderer/components/ui/ToastProvider.tsx`
- **Store**: none
- **IPC**: unchanged in this step (uses existing `window.db.*` CRUD/move calls)
- **Main handler**: unchanged in this step
- **Preload bridge**: unchanged in this step
- **Storage**: renderer-only feedback wiring change; mutation payloads/state transitions remain unchanged while success/failure feedback now flows through `useToast` (with bounded queue + auto-dismiss/manual close), and mutation-only inline banners were removed where toast coverage exists

### Modal Light-Mode Fix

- **Purpose**: force all CRUD create/edit/move/confirm modal dialogs to render with the light theme background and text, pinning DaisyUI theme so OS dark mode cannot override modal-box colors
- **Status**: added on 2026-03-04
- **UI**: `src/renderer/components/ui/ModalShell.tsx`
- **Config**: `index.html` (added `data-theme="versevault"` on `<html>`)
- **Store**: none
- **IPC**: unchanged
- **Main handler**: unchanged
- **Preload bridge**: unchanged
- **Storage**: renderer-only presentation change; `bg-base-100 text-base-content` DaisyUI semantic classes added to `modal-box` div; `data-theme` pins the custom light theme on `<html>` so all 13+ modal surfaces inherit correct light-mode appearance without per-form changes

### App Shell / Routing

- **UI**: `src/renderer/App.tsx` (routes), `src/renderer/index.tsx` (HashRouter)
- **Store**: n/a
- **IPC**: none
- **Storage**: none

### StatBlock Shared Contract (Step 01)

- **Purpose**: define the complete type contract and IPC channel constants for the StatBlock feature; establishes the interface all downstream steps build on
- **Status**: added on 2026-03-06
- **UI**: none in this step
- **Store**: none yet
- **IPC**: `IPC.STATBLOCKS_GET_ALL_BY_WORLD`, `IPC.STATBLOCKS_GET_ALL_BY_CAMPAIGN`, `IPC.STATBLOCKS_GET_BY_ID`, `IPC.STATBLOCKS_ADD`, `IPC.STATBLOCKS_UPDATE`, `IPC.STATBLOCKS_DELETE` — constants only
- **Main handler**: none yet
- **Preload bridge**: none yet; `DbApi.statblocks` method signatures defined in `forge.env.d.ts` only
- **Storage**: no schema change in this step
- **Types**: `forge.env.d.ts` adds `StatBlock` interface (`id`, `world_id`, `campaign_id`, `character_id`, `name`, `default_token_id`, `description`, `config`, `created_at`, `updated_at`) and `DbApi.statblocks` with `getAllByWorld/getAllByCampaign/getById/add/update/delete` signatures

### StatBlock Schema & Migration (Step 02)

- **Purpose**: create the `statblocks` SQLite table and wire it into `initializeSchema()` so the persistent data layer is ready for future IPC handlers
- **Status**: added on 2026-03-06
- **UI**: none in this step
- **Store**: none yet
- **IPC**: none in this step
- **Main handler**: none yet
- **Preload bridge**: none yet
- **Storage**: `src/database/db.ts` adds `runStatBlocksSchemaMigration(db)` — creates `statblocks` table (`id`, `world_id` NOT NULL FK → worlds ON DELETE CASCADE, `campaign_id` nullable FK → campaigns ON DELETE CASCADE, `character_id` nullable FK → characters ON DELETE CASCADE, `name` NOT NULL, `default_token_id` nullable FK → tokens ON DELETE SET NULL, `description`, `config` NOT NULL DEFAULT '{}', `created_at`, `updated_at`) with indexes on `world_id`, `campaign_id`, `character_id`, and `default_token_id`; migration uses `CREATE TABLE IF NOT EXISTS` so it is safe and idempotent on existing databases; called as the last step in `initializeSchema()`
- **Tests**: `tests/unit/database/statblocks.test.ts` — 8 mock-based unit tests covering table creation SQL, all column constraints, all 4 indexes, idempotency, and migration ordering

### StatBlock Read Handlers (Step 03)

- **Purpose**: wire the 3 read-only IPC handlers for statblocks in the main process; no mutations or preload bridges in this step
- **Status**: added on 2026-03-06
- **UI**: none in this step
- **Store**: none yet
- **IPC**: `IPC.STATBLOCKS_GET_ALL_BY_WORLD`, `IPC.STATBLOCKS_GET_ALL_BY_CAMPAIGN`, `IPC.STATBLOCKS_GET_BY_ID`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()` — 3 read handlers added after `ABILITIES_GET_CHILDREN`; world/campaign-scoped lists ordered by `updated_at DESC`; `getById` returns row or `null`
- **Preload bridge**: none yet (Steps 04-05)
- **Storage**: no schema change in this step (uses `statblocks` table from Step 02)
- **Types**: no new types; uses `StatBlock` interface from Step 01
- **Tests**: `tests/unit/main.test.ts` — 4 assertions added: `getAllByWorld` returns array, `getAllByCampaign` returns array, `getById` returns matching row, `getById` returns `null` for missing id; handler count updated from 68 → 71

### StatBlock Mutation Handlers (Step 04)

- **Purpose**: wire the 3 mutation IPC handlers for statblocks in the main process; preload bridges follow in Step 05
- **Status**: added on 2026-03-06
- **UI**: none in this step
- **Store**: none yet
- **IPC**: `IPC.STATBLOCKS_ADD`, `IPC.STATBLOCKS_UPDATE`, `IPC.STATBLOCKS_DELETE`
- **Main handler**: `src/main.ts` -> `registerIpcHandlers()` — `STATBLOCKS_ADD` validates required trimmed `name`, inserts row and returns it via post-insert `SELECT`; `STATBLOCKS_UPDATE` uses `hasOwnProperty` partial updates for `name`/`description`/`config`, always refreshes `updated_at`, throws `'StatBlock not found'` if row missing; `STATBLOCKS_DELETE` deletes by id and returns `{ id }` (idempotent)
- **Preload bridge**: none yet (Step 05)
- **Storage**: no schema change in this step (uses `statblocks` table from Step 02)
- **Types**: no new types; uses `StatBlock` interface from Step 01

### StatBlock Preload Bridges (Step 05)

- **Purpose**: wire all 6 statblock bridge methods in `src/preload.ts`, exposing the full statblock API to the renderer via `window.db.statblocks.*`
- **Status**: added on 2026-03-06
- **UI**: none in this step; renderer integration in Step 08
- **Store**: none yet
- **IPC**: all 6 channels — `IPC.STATBLOCKS_GET_ALL_BY_WORLD`, `IPC.STATBLOCKS_GET_ALL_BY_CAMPAIGN`, `IPC.STATBLOCKS_GET_BY_ID`, `IPC.STATBLOCKS_ADD`, `IPC.STATBLOCKS_UPDATE`, `IPC.STATBLOCKS_DELETE`
- **Main handler**: `src/main.ts` (from Steps 03-04)
- **Preload bridge**: `src/preload.ts` — `window.db.statblocks.getAllByWorld(worldId)`, `window.db.statblocks.getAllByCampaign(campaignId)`, `window.db.statblocks.getById(id)`, `window.db.statblocks.add(data)`, `window.db.statblocks.update(id, data)`, `window.db.statblocks.delete(id)`
- **Storage**: no schema change in this step
- **Types**: no new types; uses `StatBlock` interface and `DbApi.statblocks` signatures from Step 01
- **Tests**: `tests/unit/preload/statblocks.test.ts` — 12 tests covering all 6 bridge methods: correct IPC channel invocation, return value shapes, null/empty cases, and error propagation

---

## Where Do I Change X?

| Task                       | Where                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Add a new page/route       | `src/renderer/App.tsx` -> add `<Route>`                                                                      |
| Add a new IPC channel      | 1) `src/shared/ipcChannels.ts` 2) `src/main.ts` handler 3) `src/preload.ts` bridge 4) `forge.env.d.ts` types |
| Change the DB schema       | `src/database/db.ts` -> `initializeSchema()`                                                                 |
| Add a global TS type       | `forge.env.d.ts`                                                                                             |
| Add client-side state      | new `src/store/<feature>Store.ts`                                                                            |
| Change packaging/installer | `forge.config.ts`                                                                                            |
| Change styles / Tailwind   | `src/renderer/index.css` + component class names                                                             |
| Add a new dependency       | `yarn add <pkg>` then check whether native rebuild is needed                                                 |
