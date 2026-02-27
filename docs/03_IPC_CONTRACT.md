# IPC Contract (Living)

> **Update this file whenever you add, change, or remove an IPC channel.**
> Channel constants live in `src/shared/ipcChannels.ts`.

## Scope Note

Current channels cover an initial local content-record scaffold (`verses`) plus Worlds read/create/update/delete/mark-viewed handlers in main process (`worlds`). This is the foundation for the broader offline-first domain model (campaign, worldbuilding, manuscript, and session entities).

Worlds channel constants and `World`/`DbApi.worlds` types are aligned at the shared contract layer, with handlers in `main` and bridge methods exposed in `preload` for read/create/update/delete/markViewed access from renderer through `window.db.worlds`.

Abilities Step 03 (2026-02-27) wires read handlers in main for `ABILITIES_GET_ALL_BY_WORLD`, `ABILITIES_GET_BY_ID`, and `ABILITIES_GET_CHILDREN`. Preload bridge methods and mutation handlers remain intentionally unwired in this step.

## Channels

| Constant                         | String Value                  | Direction        | Request Payload                                                                                       | Response          | Handler                           |
| -------------------------------- | ----------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------- | ----------------- | --------------------------------- |
| `IPC.VERSES_GET_ALL`             | `db:verses:getAll`            | renderer -> main | _(none)_                                                                                              | `Verse[]`         | `src/main.ts:registerIpcHandlers` |
| `IPC.VERSES_ADD`                 | `db:verses:add`               | renderer -> main | `{ text: string; reference?: string; tags?: string }`                                                 | `Verse`           | `src/main.ts:registerIpcHandlers` |
| `IPC.VERSES_UPDATE`              | `db:verses:update`            | renderer -> main | `id: number, data: { text?: string; reference?: string; tags?: string }`                              | `Verse`           | `src/main.ts:registerIpcHandlers` |
| `IPC.VERSES_DELETE`              | `db:verses:delete`            | renderer -> main | `id: number`                                                                                          | `{ id: number }`  | `src/main.ts:registerIpcHandlers` |
| `IPC.WORLDS_GET_ALL`             | `db:worlds:getAll`            | renderer -> main | _(none)_                                                                                              | `World[]`         | `src/main.ts:registerIpcHandlers` |
| `IPC.WORLDS_GET_BY_ID`           | `db:worlds:getById`           | renderer -> main | `id: number`                                                                                          | `World \| null`   | `src/main.ts:registerIpcHandlers` |
| `IPC.WORLDS_ADD`                 | `db:worlds:add`               | renderer -> main | `{ name: string; thumbnail?: string \| null; short_description?: string \| null }`                    | `World`           | `src/main.ts:registerIpcHandlers` |
| `IPC.WORLDS_UPDATE`              | `db:worlds:update`            | renderer -> main | `id: number, data: { name?: string; thumbnail?: string \| null; short_description?: string \| null }` | `World`           | `src/main.ts:registerIpcHandlers` |
| `IPC.WORLDS_DELETE`              | `db:worlds:delete`            | renderer -> main | `id: number`                                                                                          | `{ id: number }`  | `src/main.ts:registerIpcHandlers` |
| `IPC.WORLDS_MARK_VIEWED`         | `db:worlds:markViewed`        | renderer -> main | `id: number`                                                                                          | `World \| null`   | `src/main.ts:registerIpcHandlers` |
| `IPC.LEVELS_GET_ALL_BY_WORLD`    | `db:levels:getAllByWorld`     | renderer -> main | `worldId: number`                                                                                     | `Level[]`         | `src/main.ts:registerIpcHandlers` |
| `IPC.LEVELS_GET_BY_ID`           | `db:levels:getById`           | renderer -> main | `id: number`                                                                                          | `Level \| null`   | `src/main.ts:registerIpcHandlers` |
| `IPC.LEVELS_ADD`                 | `db:levels:add`               | renderer -> main | `{ world_id: number; name: string; category: string; description?: string \| null }`                  | `Level`           | `src/main.ts:registerIpcHandlers` |
| `IPC.LEVELS_UPDATE`              | `db:levels:update`            | renderer -> main | `id: number, data: { name?: string; category?: string; description?: string \| null }`                | `Level`           | `src/main.ts:registerIpcHandlers` |
| `IPC.LEVELS_DELETE`              | `db:levels:delete`            | renderer -> main | `id: number`                                                                                          | `{ id: number }`  | `src/main.ts:registerIpcHandlers` |
| `IPC.ABILITIES_GET_ALL_BY_WORLD` | `db:abilities:getAllByWorld`  | renderer -> main | `worldId: number`                                                                                     | `Ability[]`       | `src/main.ts:registerIpcHandlers` |
| `IPC.ABILITIES_GET_BY_ID`        | `db:abilities:getById`        | renderer -> main | `id: number`                                                                                          | `Ability \| null` | `src/main.ts:registerIpcHandlers` |
| `IPC.ABILITIES_ADD`              | _(defined in `IPC` constant)_ | renderer -> main | _TBD in Step 01 (constants only)_                                                                     | _TBD_             | _(not wired yet)_                 |
| `IPC.ABILITIES_UPDATE`           | _(defined in `IPC` constant)_ | renderer -> main | _TBD in Step 01 (constants only)_                                                                     | _TBD_             | _(not wired yet)_                 |
| `IPC.ABILITIES_DELETE`           | _(defined in `IPC` constant)_ | renderer -> main | `id: number`                                                                                          | `{ id: number }`  | _(not wired yet)_                 |
| `IPC.ABILITIES_ADD_CHILD`        | _(defined in `IPC` constant)_ | renderer -> main | _TBD in Step 01 (constants only)_                                                                     | _TBD_             | _(not wired yet)_                 |
| `IPC.ABILITIES_REMOVE_CHILD`     | _(defined in `IPC` constant)_ | renderer -> main | _TBD in Step 01 (constants only)_                                                                     | _TBD_             | _(not wired yet)_                 |
| `IPC.ABILITIES_GET_CHILDREN`     | `db:abilities:getChildren`    | renderer -> main | `abilityId: number`                                                                                   | `Ability[]`       | `src/main.ts:registerIpcHandlers` |

## Types Reference

```typescript
// forge.env.d.ts
interface Verse {
  id: number;
  text: string;
  reference: string | null;
  tags: string | null;
  created_at: string; // ISO datetime string from SQLite
  updated_at: string; // ISO datetime string from SQLite
}

interface World {
  id: number;
  name: string;
  thumbnail: string | null;
  short_description: string | null;
  last_viewed_at: string | null;
  created_at: string; // ISO datetime string from SQLite
  updated_at: string; // ISO datetime string from SQLite
}

interface Level {
  id: number;
  world_id: number;
  name: string;
  category: string;
  description: string | null;
  created_at: string; // ISO datetime string from SQLite
  updated_at: string; // ISO datetime string from SQLite
}
```

## Notes

- All channels use `ipcMain.handle` / `ipcRenderer.invoke` (Promise-based).
- `tags` is stored as a raw string; format is not yet enforced.
- `VERSES_UPDATE` uses SQL `COALESCE`; passing `undefined`/`null` keeps that field unchanged.
- Worlds read path is wired end-to-end for `WORLDS_GET_ALL` and `WORLDS_GET_BY_ID` (`main` handlers + `window.db.worlds.getAll/getById` in preload).
- Worlds create path is wired end-to-end for `WORLDS_ADD` (`main` handler + `window.db.worlds.add` in preload), with required trimmed-name validation in `main`.
- Worlds mutation paths are wired end-to-end for `WORLDS_UPDATE`, `WORLDS_DELETE`, and `WORLDS_MARK_VIEWED` (`main` handlers + `window.db.worlds.update/delete/markViewed` in preload).
- `WORLDS_UPDATE` updates only provided fields (`name`, `thumbnail`, `short_description`), validates `name` when present, and always refreshes `updated_at`.
- `WORLDS_MARK_VIEWED` updates `last_viewed_at` and returns the refreshed row or `null` when the id does not exist.
- Levels read path is wired end-to-end for `LEVELS_GET_ALL_BY_WORLD` and `LEVELS_GET_BY_ID` (`main` handlers + `window.db.levels.getAllByWorld/getById` in preload). All 5 levels channels are fully wired end-to-end: mutation channels (`LEVELS_ADD`, `LEVELS_UPDATE`, `LEVELS_DELETE`) have handlers in `registerIpcHandlers()` and are bridged via `window.db.levels.add/update/delete` in preload.
- `LEVELS_ADD` validates `name.trim()` and `category.trim()` as non-empty, inserts a levels row scoped to `world_id`, and returns the inserted row.
- `LEVELS_UPDATE` updates only the fields explicitly provided (`name`, `category`, `description`), validates trimmed values when present, always sets `updated_at = datetime('now')`, and throws `'Level not found'` if the row does not exist after update. Uses the same `hasOwnProperty`-based partial-update pattern as `WORLDS_UPDATE`, correctly handling intentional `null` sets for the nullable `description` field.
- `LEVELS_DELETE` deletes by id and returns `{ id }`; does not throw when the row did not exist.
- Ability read handlers are wired in `main` for `ABILITIES_GET_ALL_BY_WORLD`, `ABILITIES_GET_BY_ID`, and `ABILITIES_GET_CHILDREN`; all use deterministic ordering for list returns (`updated_at DESC`).
- Ability preload bridge methods are still not wired, so renderer access to ability channels remains out of scope in this step.
- Ability mutation handlers (`ABILITIES_ADD`, `ABILITIES_UPDATE`, `ABILITIES_DELETE`, `ABILITIES_ADD_CHILD`, `ABILITIES_REMOVE_CHILD`) remain intentionally unwired.
- Never hardcode channel strings; always import from `src/shared/ipcChannels.ts`.
