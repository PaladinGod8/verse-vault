# Codebase Map (Living)

> **Update this file every time you add or change a feature.**
> Keep entries short and concrete. See [CHECKLIST.md](CHECKLIST.md) for the workflow.

## Landmarks

| Path                                                           | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/main.ts`                                                  | App bootstrap, BrowserWindow creation, IPC handler registration (`verses` CRUD + `worlds` read/create/update/delete/markViewed + `levels` read + `levels` create/update/delete + `campaigns` read/create/update/delete + `battlemaps` read/create/update/delete + `arcs` read/create/update/delete + `acts` read/create/update/delete/moveTo + `sessions` read/create/update/delete/moveTo + `scenes` read-by-campaign/read-by-session/create/update/delete/moveTo + `abilities` read + `abilities` add/update/delete/addChild/removeChild)                                                                                                                                |
| `src/preload.ts`                                               | contextBridge - exposes `window.db` (`verses` CRUD + `worlds` read/create/update/delete/markViewed + `levels` read/add/update/delete + `abilities` read/add/update/delete/addChild/removeChild + `campaigns` read/add/update/delete + `battlemaps` read/add/update/delete + `arcs` read/add/update/delete + `acts` read/add/update/delete/moveTo + `sessions` read/add/update/delete/moveTo + `scenes` read-by-campaign/read-by-session/add/update/delete/moveTo) to renderer                                                                                                                                                                                              |
| `src/database/db.ts`                                           | SQLite singleton, schema init (`verses`, `worlds`, `levels`, `campaigns`, `battlemaps`, `arcs`, `acts`, `sessions`, `scenes`, `abilities`, `ability_children`), `runArcActMigration` (auto-migrates `sessions.campaign_id` → `act_id`), open/close                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `src/shared/ipcChannels.ts`                                    | All IPC channel name constants (single source of truth) for verses, worlds, levels, abilities, campaigns, battlemaps, arcs, acts, sessions, and scenes contracts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `src/renderer/index.tsx`                                       | React root, HashRouter wrapper                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `src/renderer/App.tsx`                                         | Route definitions and app shell (`/`, `/world/:id`, `/world/:id/levels`, `/world/:id/abilities`, `/world/:id/campaigns`, `/world/:id/battlemaps`, `/world/:id/campaign/:campaignId/scenes`, `/world/:id/campaign/:campaignId/arcs`, `/world/:id/campaign/:campaignId/arc/:arcId/acts`, `/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/sessions`, `/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/session/:sessionId/scenes`) and global renderer toast provider mount                                                                                                                                                                                       |
| `src/renderer/pages/WorldsHomePage.tsx`                        | Worlds landing page (`/`): list fetch + create/edit actions rendered via shared `ModalShell` + delete confirm via shared `ConfirmDialog` + toast-first mutation feedback for create/update/delete success/failure + loading/empty/load-error states                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `src/renderer/pages/WorldPage.tsx`                             | World workspace page (`/world/:id`): validates id, marks world viewed on entry, two-column layout with sidebar + overview                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `src/renderer/pages/LevelsPage.tsx`                            | Levels list page (`/world/:id/levels`): table of levels with create/edit actions rendered via shared `ModalShell`, delete confirm via shared `ConfirmDialog`, toast-first mutation feedback for create/update/delete success/failure, and loading/empty/error states                                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/renderer/pages/AbilitiesPage.tsx`                         | Abilities list page (`/world/:id/abilities`): table with create/edit/delete actions (delete confirm via shared `ConfirmDialog`), create/edit/child-manager dialogs rendered via shared `ModalShell` (including viewport-bounded create/edit sizing), toast-first mutation feedback for create/update/delete success/failure, and loading/empty/error states                                                                                                                                                                                                                                                                                                                |
| `src/renderer/pages/CampaignsPage.tsx`                         | Campaigns list page (`/world/:id/campaigns`): table of campaigns with create/edit actions rendered via shared `ModalShell`, delete confirm via shared `ConfirmDialog`, Arcs link per row (`/world/:id/campaign/:campaignId/arcs`), Scenes index link per row (`/world/:id/campaign/:campaignId/scenes`), toast-first mutation feedback for create/update/delete success/failure, and loading/empty/error states                                                                                                                                                                                                                                                            |
| `src/renderer/pages/BattleMapsPage.tsx`                        | BattleMaps list page (`/world/:id/battlemaps`): world-scoped table with create/edit actions rendered via shared `ModalShell`, delete confirm via shared `ConfirmDialog`, `created_at` + `updated_at` timestamp columns, toast-first mutation feedback for create/update/delete success/failure, and loading/empty/error states                                                                                                                                                                                                                                                                                                                                             |
| `src/renderer/pages/CampaignScenesPage.tsx`                    | Campaign scenes index page (`/world/:id/campaign/:campaignId/scenes`): validates worldId + campaignId, loads campaign metadata + campaign-wide scenes via `window.db.scenes.getAllByCampaign`, renders scene/session/act/arc context columns, links each row to session-scoped scenes route, and includes loading/empty/error states                                                                                                                                                                                                                                                                                                                                       |
| `src/renderer/pages/ArcsPage.tsx`                              | Arcs list page (`/world/:id/campaign/:campaignId/arcs`): validates worldId + campaignId, loads campaign header + arcs ordered by `sort_order`, supports create/edit via shared `ModalShell` + delete confirm via shared `ConfirmDialog`, supports dnd-kit row reorder with persisted `sort_order`, and uses toast-first mutation feedback for create/update/delete success/failure                                                                                                                                                                                                                                                                                         |
| `src/renderer/pages/ActsPage.tsx`                              | Acts list page (`/world/:id/campaign/:campaignId/arc/:arcId/acts`): validates worldId + campaignId + arcId, loads arc header + acts ordered by `sort_order`, supports create/edit via shared `ModalShell` + delete confirm via shared `ConfirmDialog`, supports row-level Move via `MoveActDialog`, supports dnd-kit row reorder with persisted `sort_order`, and uses toast-first mutation feedback for create/update/delete/move success/failure                                                                                                                                                                                                                         |
| `src/renderer/pages/SessionsPage.tsx`                          | Sessions list page (`/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/sessions`): validates worldId + campaignId + arcId + actId, loads act header + sessions ordered by `sort_order`, supports create/edit via shared `ModalShell` + delete confirm via shared `ConfirmDialog`, supports dnd-kit row reorder with persisted `sort_order`, shows visible sequence numbers, shows `planned_at` in a formatted Planned column with `-` fallback, exposes Scenes link per row, supports "Move to Act" via `MoveSessionDialog` (removes moved session from local state immediately), and uses toast-first mutation feedback for create/update/delete/move success/failure |
| `src/renderer/pages/ScenesPage.tsx`                            | Scenes list page (`/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/session/:sessionId/scenes`): validates worldId + campaignId + sessionId, loads session header + scenes ordered by `sort_order`, supports create/edit via shared `ModalShell` + delete confirm via shared `ConfirmDialog`, supports dnd-kit row reorder with persisted `sort_order`, shows visible sequence numbers, exposes a row-level Move action via `MoveSceneDialog`, and uses toast-first mutation feedback for create/update/delete/move success/failure                                                                                                                                   |
| `src/renderer/components/scenes/SceneForm.tsx`                 | Reusable scenes form for create/edit (name required, optional notes, optional payload JSON text defaulting to `'{}'`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/renderer/components/scenes/MoveSceneDialog.tsx`           | `ModalShell`-backed dialog for reparenting a scene to a different Session in the same Campaign; fetches arcs + acts + sessions, excludes the current session, and calls `window.db.scenes.moveTo` on confirm                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `src/renderer/components/sessions/SessionForm.tsx`             | Reusable sessions form for create/edit (name required, optional notes, optional planned date-time mapped to `planned_at`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `src/renderer/components/sessions/MoveSessionDialog.tsx`       | `ModalShell`-backed dialog for reparenting a session to a different Act; fetches all arcs/acts for the campaign, groups acts by arc, excludes current act, calls `window.db.sessions.moveTo` on confirm                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/renderer/components/acts/MoveActDialog.tsx`               | `ModalShell`-backed dialog for reparenting an act to a different Arc; fetches all arcs for the campaign, renders flat radio list excluding current arc, calls `window.db.acts.moveTo` on confirm                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `src/renderer/components/campaigns/CampaignForm.tsx`           | Reusable campaigns form for create/edit (name required, optional summary)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `src/renderer/components/battlemaps/BattleMapForm.tsx`         | Reusable BattleMap form for create/edit (name required, optional config JSON text defaulting to `'{}'`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/renderer/components/abilities/AbilityChildrenManager.tsx` | Ability child-link manager UI: loads linked children, supports in-world search, and adds/removes child links for supported passive subtypes (`linchpin`, `keystone`, `rostering`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/renderer/components/abilities/AbilityForm.tsx`            | Reusable abilities form for create/edit with conditional type/subtype groups, JSON fields (`effects`/`conditions`/`cast_cost`), and subtype-specific fields (`level_id`, rostering config)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/renderer/components/levels/LevelForm.tsx`                 | Reusable levels form for create/edit (name + category required, optional description)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/renderer/components/ui/ConfirmDialog.tsx`                 | Shared DaisyUI confirm dialog primitive for explicit confirm/cancel flows (title, message, intent, and pending state)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/renderer/components/ui/ModalShell.tsx`                    | Shared DaisyUI modal shell primitive used by renderer create/edit/move dialogs and confirm flows, with backdrop close, Escape close, focus handoff, and body scroll lock                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `src/renderer/components/ui/ToastProvider.tsx`                 | Shared renderer toast context + provider + hook (`useToast`) with typed variants, bounded toast queue, auto-dismiss, and manual dismiss                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/renderer/components/worlds/WorldSidebar.tsx`              | World workspace sidebar: Level + Ability + Campaigns + BattleMaps nav items linking to `/world/:id/levels`, `/world/:id/abilities`, `/world/:id/campaigns`, and `/world/:id/battlemaps`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/renderer/components/worlds/WorldCard.tsx`                 | World card UI (thumbnail fallback + metadata display + card-open navigation + edit/delete actions)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `src/renderer/components/worlds/WorldForm.tsx`                 | Reusable worlds form for create/edit (name required, optional thumbnail and short description)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `src/renderer/index.css`                                       | Tailwind v4 import, DaisyUI plugin/theme registration (`versevault`), and global renderer styles                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `src/store/`                                                   | Zustand stores - one file per feature domain                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `forge.env.d.ts`                                               | Global TS types: `Verse`, `World`, `Level`, `Ability`, `AbilityChild`, `Campaign`, `BattleMap`, `Arc`, `Act`, `Session`, `Scene`, `CampaignSceneListItem`, `DbApi`, Vite constants                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `forge.config.ts`                                              | Electron Forge packaging, makers, plugins                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `vite.*.config.ts`                                             | Vite build configs (base, main, preload, renderer)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

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
- **Storage**: `verse-vault.db` -> `abilities` table (`id`, `world_id`, `name`, `description`, `type`, `passive_subtype`, `level_id`, `effects`, `conditions`, `cast_cost`, `trigger`, `pick_count`, `pick_timing`, `pick_is_permanent`, `created_at`, `updated_at`) and `ability_children` (`id`, `parent_id`, `child_id`, `UNIQUE(parent_id, child_id)`)

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

### BattleMap Renderer Route + CRUD Page (Step 04)

- **Purpose**: add world-level BattleMaps navigation and renderer CRUD UX with table timestamps for created/updated dates
- **Status**: added on 2026-03-03
- **UI**: `src/renderer/App.tsx`, `src/renderer/components/worlds/WorldSidebar.tsx`, `src/renderer/pages/BattleMapsPage.tsx`, `src/renderer/components/battlemaps/BattleMapForm.tsx`
- **Store**: none yet
- **IPC**: uses existing `IPC.WORLDS_GET_BY_ID`, `IPC.BATTLEMAPS_GET_ALL_BY_WORLD`, `IPC.BATTLEMAPS_ADD`, `IPC.BATTLEMAPS_UPDATE`, and `IPC.BATTLEMAPS_DELETE` via `window.db.worlds.getById` and `window.db.battlemaps.*`
- **Main handler**: unchanged in this step (uses BattleMap Step 02 handlers in `src/main.ts`)
- **Preload bridge**: unchanged in this step (uses BattleMap Step 03 bridge methods in `src/preload.ts`)
- **Storage**: renderer-only state flow; validates positive world id, loads world then battlemaps list, renders `created_at`/`updated_at` columns with localized formatting, supports create/edit modal form + delete confirmation, and updates local table state on success

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

### App Shell / Routing

- **UI**: `src/renderer/App.tsx` (routes), `src/renderer/index.tsx` (HashRouter)
- **Store**: n/a
- **IPC**: none
- **Storage**: none

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
