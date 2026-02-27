# Codebase Map (Living)

> **Update this file every time you add or change a feature.**
> Keep entries short and concrete. See [CHECKLIST.md](CHECKLIST.md) for the workflow.

## Landmarks

| Path                                           | Responsibility                                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/main.ts`                                  | App bootstrap, BrowserWindow creation, IPC handler registration (`verses` CRUD + `worlds` read/create/update/delete/markViewed) |
| `src/preload.ts`                               | contextBridge - exposes `window.db` (`verses` CRUD + `worlds` read/create/update/delete/markViewed) to renderer                 |
| `src/database/db.ts`                           | SQLite singleton, schema init (`verses`, `worlds`, `levels`), open/close                                                        |
| `src/shared/ipcChannels.ts`                    | All IPC channel name constants (single source of truth)                                                                         |
| `src/renderer/index.tsx`                       | React root, HashRouter wrapper                                                                                                  |
| `src/renderer/App.tsx`                         | Route definitions and app shell                                                                                                 |
| `src/renderer/pages/WorldsHomePage.tsx`        | Worlds landing page (`/`): list fetch + create/edit modals + edit/delete actions + loading/empty/error states                   |
| `src/renderer/pages/WorldPagePlaceholder.tsx`  | World route placeholder page (`/world/:id`): validates id, marks world viewed on entry, shows basic world context               |
| `src/renderer/components/worlds/WorldCard.tsx` | World card UI (thumbnail fallback + metadata display + card-open navigation + edit/delete actions)                              |
| `src/renderer/components/worlds/WorldForm.tsx` | Reusable worlds form for create/edit (name required, optional thumbnail and short description)                                  |
| `src/renderer/index.css`                       | Tailwind v4 import + global styles                                                                                              |
| `src/store/`                                   | Zustand stores - one file per feature domain                                                                                    |
| `forge.env.d.ts`                               | Global TS types: current scaffolds `Verse` + `World`, `DbApi`, Vite constants                                                   |
| `forge.config.ts`                              | Electron Forge packaging, makers, plugins                                                                                       |
| `vite.*.config.ts`                             | Vite build configs (base, main, preload, renderer)                                                                              |

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
