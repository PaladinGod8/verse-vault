# Codebase Map (Living)

> **Update this file every time you add or change a feature.**
> Keep entries short and concrete. See [CHECKLIST.md](CHECKLIST.md) for the workflow.

## Landmarks

| Path                                              | Responsibility                                                                                                                                                                                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/main.ts`                                     | App bootstrap, BrowserWindow creation, IPC handler registration (`verses` CRUD + `worlds` read/create/update/delete/markViewed + `levels` read + `levels` create/update/delete + `abilities` read + `abilities` add/update/delete/addChild/removeChild) |
| `src/preload.ts`                                  | contextBridge - exposes `window.db` (`verses` CRUD + `worlds` read/create/update/delete/markViewed + `levels` read/add/update/delete) to renderer                                                                                                       |
| `src/database/db.ts`                              | SQLite singleton, schema init (`verses`, `worlds`, `levels`, `abilities`, `ability_children`), open/close                                                                                                                                               |
| `src/shared/ipcChannels.ts`                       | All IPC channel name constants (single source of truth) for verses, worlds, levels, and abilities contracts                                                                                                                                             |
| `src/renderer/index.tsx`                          | React root, HashRouter wrapper                                                                                                                                                                                                                          |
| `src/renderer/App.tsx`                            | Route definitions and app shell (`/`, `/world/:id`, `/world/:id/levels`)                                                                                                                                                                                |
| `src/renderer/pages/WorldsHomePage.tsx`           | Worlds landing page (`/`): list fetch + create/edit modals + edit/delete actions + loading/empty/error states                                                                                                                                           |
| `src/renderer/pages/WorldPage.tsx`                | World workspace page (`/world/:id`): validates id, marks world viewed on entry, two-column layout with sidebar + overview                                                                                                                               |
| `src/renderer/pages/LevelsPage.tsx`               | Levels list page (`/world/:id/levels`): table of levels with create/edit/delete actions + loading/empty/error states                                                                                                                                    |
| `src/renderer/components/levels/LevelForm.tsx`    | Reusable levels form for create/edit (name + category required, optional description)                                                                                                                                                                   |
| `src/renderer/components/worlds/WorldSidebar.tsx` | World workspace sidebar: Level nav item linking to `/world/:id/levels`                                                                                                                                                                                  |
| `src/renderer/components/worlds/WorldCard.tsx`    | World card UI (thumbnail fallback + metadata display + card-open navigation + edit/delete actions)                                                                                                                                                      |
| `src/renderer/components/worlds/WorldForm.tsx`    | Reusable worlds form for create/edit (name required, optional thumbnail and short description)                                                                                                                                                          |
| `src/renderer/index.css`                          | Tailwind v4 import + global styles                                                                                                                                                                                                                      |
| `src/store/`                                      | Zustand stores - one file per feature domain                                                                                                                                                                                                            |
| `forge.env.d.ts`                                  | Global TS types: current scaffolds `Verse` + `World`, `DbApi`, Vite constants                                                                                                                                                                           |
| `forge.config.ts`                                 | Electron Forge packaging, makers, plugins                                                                                                                                                                                                               |
| `vite.*.config.ts`                                | Vite build configs (base, main, preload, renderer)                                                                                                                                                                                                      |

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
