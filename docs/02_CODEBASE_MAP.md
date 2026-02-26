# Codebase Map (Living)

> **Update this file every time you add or change a feature.**
> Keep entries short and concrete. See [CHECKLIST.md](CHECKLIST.md) for the workflow.

## Landmarks

| Path | Responsibility |
|------|----------------|
| `src/main.ts` | App bootstrap, BrowserWindow creation, IPC handler registration (`verses` CRUD + `worlds` read) |
| `src/preload.ts` | contextBridge - exposes `window.db` to renderer |
| `src/database/db.ts` | SQLite singleton, schema init (`verses`, `worlds`), open/close |
| `src/shared/ipcChannels.ts` | All IPC channel name constants (single source of truth) |
| `src/renderer/index.tsx` | React root, HashRouter wrapper |
| `src/renderer/App.tsx` | Route definitions and app shell |
| `src/renderer/index.css` | Tailwind v4 import + global styles |
| `src/store/` | Zustand stores - one file per feature domain |
| `forge.env.d.ts` | Global TS types: current scaffolds `Verse` + `World`, `DbApi`, Vite constants |
| `forge.config.ts` | Electron Forge packaging, makers, plugins |
| `vite.*.config.ts` | Vite build configs (base, main, preload, renderer) |

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

### App Shell / Routing

- **UI**: `src/renderer/App.tsx` (routes), `src/renderer/index.tsx` (HashRouter)
- **Store**: n/a
- **IPC**: none
- **Storage**: none

---

## Where Do I Change X?

| Task | Where |
|------|-------|
| Add a new page/route | `src/renderer/App.tsx` -> add `<Route>` |
| Add a new IPC channel | 1) `src/shared/ipcChannels.ts` 2) `src/main.ts` handler 3) `src/preload.ts` bridge 4) `forge.env.d.ts` types |
| Change the DB schema | `src/database/db.ts` -> `initializeSchema()` |
| Add a global TS type | `forge.env.d.ts` |
| Add client-side state | new `src/store/<feature>Store.ts` |
| Change packaging/installer | `forge.config.ts` |
| Change styles / Tailwind | `src/renderer/index.css` + component class names |
| Add a new dependency | `yarn add <pkg>` then check whether native rebuild is needed |
