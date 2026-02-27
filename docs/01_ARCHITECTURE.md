# Architecture

## Product Context

Verse Vault targets a centralized, offline-first desktop workflow for TTRPG campaigns plus creative writing/worldbuilding. The architecture keeps all core data and behavior local, then layers domain modules (campaigns, worlds, manuscripts, sessions) on top of the same process boundaries.

## Process Model

```mermaid
flowchart LR
    subgraph Main["Main Process (Node.js / Electron)"]
        M[src/main.ts\nbootstrap + IPC handlers]
        DB[src/database/db.ts\nSQLite singleton]
        CH[src/shared/ipcChannels.ts\nchannel constants]
        M --> DB
        M --> CH
    end

    subgraph Preload["Preload Script (Isolated Bridge)"]
        P[src/preload.ts]
        P --> CH
    end

    subgraph Renderer["Renderer Process (Browser / React)"]
        I[src/renderer/index.tsx\nHashRouter root]
        App[src/renderer/App.tsx\nRoutes + Pages]
        Store[src/store/*.ts\nZustand client state]
        I --> App
        App --> Store
    end

    M <-->|ipcMain.handle / ipcRenderer.invoke| P
    P -->|contextBridge -> window.db| App
    DB --> SQLite[(verse-vault.db\nlocal userData path)]
```

## Rules of the Road

1. **No Node.js in Renderer.** `contextIsolation: true`, `nodeIntegration: false`. All Node/Electron APIs go through preload only.

2. **IPC only through `window.db`.** Never call `ipcRenderer` directly in renderer code. Use the typed API exposed by preload.

3. **DB runs in Main only.** `better-sqlite3` is synchronous and may only be imported in the main process.

4. **Channel names are constants.** All IPC channel strings live in `src/shared/ipcChannels.ts`. No magic strings in `main.ts` or `preload.ts`. Abilities Step 05 (2026-02-27) wires main-process handlers for read + core mutations + child-link mutations (`ABILITIES_GET_ALL_BY_WORLD`, `ABILITIES_GET_BY_ID`, `ABILITIES_ADD`, `ABILITIES_UPDATE`, `ABILITIES_DELETE`, `ABILITIES_ADD_CHILD`, `ABILITIES_REMOVE_CHILD`, `ABILITIES_GET_CHILDREN`); Step 06 wires preload read bridges (`getAllByWorld/getById/getChildren`); Step 07 wires preload mutation bridges (`add/update/delete/addChild/removeChild`). Campaign Step 01 (2026-02-27) adds constants only for upcoming campaign flows (`CAMPAIGNS_GET_ALL_BY_WORLD`, `CAMPAIGNS_GET_BY_ID`, `CAMPAIGNS_ADD`, `CAMPAIGNS_UPDATE`, `CAMPAIGNS_DELETE`) and intentionally does not wire handlers or preload bridges yet. Session Step 02 (2026-02-27) adds constants only for upcoming session flows (`SESSIONS_GET_ALL_BY_CAMPAIGN`, `SESSIONS_GET_BY_ID`, `SESSIONS_ADD`, `SESSIONS_UPDATE`, `SESSIONS_DELETE`) and intentionally does not wire handlers or preload bridges yet. Scene Step 03 (2026-02-27) adds constants only for upcoming scene flows (`SCENES_GET_ALL_BY_SESSION`, `SCENES_GET_BY_ID`, `SCENES_ADD`, `SCENES_UPDATE`, `SCENES_DELETE`) and intentionally does not wire handlers or preload bridges yet.

5. **Shared types live in `forge.env.d.ts`.** Current shared contracts are `Verse`, `World`, `Level`, `Ability`, and `AbilityChild`; `DbApi` exposes renderer-safe bridges for verses/worlds/levels and all ability reads/mutations (`window.db.abilities.getAllByWorld/getById/add/update/delete/addChild/removeChild/getChildren`). Step 03 wires worlds read handlers in `main`, Step 04 exposes worlds read in preload (`window.db.worlds.getAll/getById`), Step 06 adds worlds create in `main`, Step 07 exposes worlds create in preload/UI (`window.db.worlds.add`), Step 08 adds worlds update/delete/mark-viewed handlers in `main`, and Step 09 exposes worlds mutation bridges in preload with renderer edit/delete actions on the worlds home page.

6. **Zustand for client state.** DB/server state flows via `window.db`. Transient UI state goes in feature-focused stores under `src/store/`.

7. **One store per feature domain.** Name files `<feature>Store.ts` and keep them focused.

8. **SQLite is sync; IPC is async.** DB calls in main are synchronous. Renderer calls are Promise-based via `ipcRenderer.invoke`.

9. **Never relax context isolation.** Do not set `contextIsolation: false` or `nodeIntegration: true`.

10. **Fuses are compile-time.** Security fuses in `forge.config.ts` are baked at `yarn make`, not `yarn start`.

11. **Offline-first is a hard requirement.** New domain features must work without network access and persist locally first.

## Current Data Bootstrap Notes

- `src/database/db.ts -> initializeSchema()` currently creates `verses`, `worlds`, `levels`, `abilities`, and `ability_children` via `CREATE TABLE IF NOT EXISTS` for migration-safe startup on existing user databases.
- `worlds` schema baseline (Step 02, 2026-02-26): `id`, `name`, `thumbnail`, `short_description`, `last_viewed_at`, `created_at`, `updated_at`.
- `levels` schema baseline (Step 02, 2026-02-27): `id`, `world_id` (FK -> worlds), `name`, `category`, `description`, `created_at`, `updated_at`.
- `abilities` schema baseline (Step 02, 2026-02-27): `id`, `world_id` (FK -> worlds, `ON DELETE CASCADE`), `name`, `description`, `type` (`CHECK` in `active|passive`), `passive_subtype` (`NULL` or `linchpin|keystone|rostering`), `level_id` (FK -> levels, `ON DELETE SET NULL`), `effects` (default '[]'), `conditions` (default '[]'), `cast_cost` (default '{}'), `trigger`, `pick_count`, `pick_timing` (`CHECK` in `obtain|rest`), `pick_is_permanent` (default `0`), `created_at`, `updated_at`.
- `ability_children` schema baseline (Step 02, 2026-02-27): `id`, `parent_id` (FK -> abilities, `ON DELETE CASCADE`), `child_id` (FK -> abilities, `ON DELETE CASCADE`), `UNIQUE(parent_id, child_id)`.
- `src/main.ts -> registerIpcHandlers()` currently includes worlds read handlers (`WORLDS_GET_ALL`, `WORLDS_GET_BY_ID`), create handler (`WORLDS_ADD` with required trimmed-name validation), and mutation handlers (`WORLDS_UPDATE`, `WORLDS_DELETE`, `WORLDS_MARK_VIEWED`); plus levels read handlers (`LEVELS_GET_ALL_BY_WORLD`, `LEVELS_GET_BY_ID`) added in Level Step 03 (2026-02-27); plus levels mutation handlers (`LEVELS_ADD`, `LEVELS_UPDATE`, `LEVELS_DELETE`) added in Level Step 05 (2026-02-27) - `LEVELS_ADD` validates name + category, inserts and returns the row; `LEVELS_UPDATE` does partial field updates via `hasOwnProperty` checks and always sets `updated_at`; `LEVELS_DELETE` removes by id and returns `{ id }`; plus abilities read handlers (`ABILITIES_GET_ALL_BY_WORLD`, `ABILITIES_GET_BY_ID`, `ABILITIES_GET_CHILDREN`) added in Ability Step 03 (2026-02-27), with list reads ordered by `updated_at DESC`; plus abilities core mutation handlers (`ABILITIES_ADD`, `ABILITIES_UPDATE`, `ABILITIES_DELETE`) added in Ability Step 04 (2026-02-27), where add/update validate trimmed required fields (`name`, `type`), update uses explicit `hasOwnProperty` checks for partial/null-safe field updates, and delete returns `{ id }`; plus abilities child-link handlers (`ABILITIES_ADD_CHILD`, `ABILITIES_REMOVE_CHILD`) added in Ability Step 05 (2026-02-27), where add-child rejects self-links/cross-world links and converts duplicate unique-constraint errors into a clear domain error, while remove-child remains idempotent.
- `src/preload.ts` currently exposes worlds read/create/mutation bridge methods `window.db.worlds.getAll()`, `window.db.worlds.getById(id)`, `window.db.worlds.add(data)`, `window.db.worlds.update(id, data)`, `window.db.worlds.delete(id)`, and `window.db.worlds.markViewed(id)`; plus levels read bridge methods `window.db.levels.getAllByWorld(worldId)` and `window.db.levels.getById(id)` added in Level Step 04 (2026-02-27); plus levels mutation bridge methods `window.db.levels.add(data)`, `window.db.levels.update(id, data)`, and `window.db.levels.delete(id)` added in Level Step 06 (2026-02-27); plus abilities read bridge methods `window.db.abilities.getAllByWorld(worldId)`, `window.db.abilities.getById(id)`, and `window.db.abilities.getChildren(abilityId)` added in Ability Step 06 (2026-02-27); plus abilities mutation bridge methods `window.db.abilities.add(data)`, `window.db.abilities.update(id, data)`, `window.db.abilities.delete(id)`, `window.db.abilities.addChild(data)`, and `window.db.abilities.removeChild(data)` added in Ability Step 07 (2026-02-27).
- `src/shared/ipcChannels.ts` includes abilities channel constants for Step 01 (`ABILITIES_GET_ALL_BY_WORLD`, `ABILITIES_GET_BY_ID`, `ABILITIES_ADD`, `ABILITIES_UPDATE`, `ABILITIES_DELETE`, `ABILITIES_ADD_CHILD`, `ABILITIES_REMOVE_CHILD`, `ABILITIES_GET_CHILDREN`); Ability Step 03 wires read channels in `main`, Step 04 wires core mutation channels in `main`, Step 05 wires child-link mutation channels in `main`, Step 06 wires read bridges in preload (`window.db.abilities.getAllByWorld/getById/getChildren`), and Step 07 wires mutation bridges in preload (`window.db.abilities.add/update/delete/addChild/removeChild`).
- `src/shared/ipcChannels.ts` includes campaign channel constants added in Campaign Step 01 (2026-02-27): `CAMPAIGNS_GET_ALL_BY_WORLD`, `CAMPAIGNS_GET_BY_ID`, `CAMPAIGNS_ADD`, `CAMPAIGNS_UPDATE`, and `CAMPAIGNS_DELETE`; these are contract-only in this step (no `main` handlers or `preload` bridge methods yet).
- `src/shared/ipcChannels.ts` includes session channel constants added in Session Step 02 (2026-02-27): `SESSIONS_GET_ALL_BY_CAMPAIGN`, `SESSIONS_GET_BY_ID`, `SESSIONS_ADD`, `SESSIONS_UPDATE`, and `SESSIONS_DELETE`; these are contract-only in this step (no `main` handlers or `preload` bridge methods yet).
- `src/shared/ipcChannels.ts` includes scene channel constants added in Scene Step 03 (2026-02-27): `SCENES_GET_ALL_BY_SESSION`, `SCENES_GET_BY_ID`, `SCENES_ADD`, `SCENES_UPDATE`, and `SCENES_DELETE`; these are contract-only in this step (no `main` handlers or `preload` bridge methods yet).
- `src/renderer/pages/WorldsHomePage.tsx` now includes create and edit modal flows plus delete actions from world cards; successful create/update operations upsert the returned world in local page state, and delete removes it immediately after confirmation.
