# IPC Contract (Living)

> **Update this file whenever you add, change, or remove an IPC channel.**
> Channel constants live in `src/shared/ipcChannels.ts`.

## Scope Note

Current channels cover an initial local content-record scaffold (`verses`) plus Worlds read/create/update/delete/mark-viewed handlers in main process (`worlds`). This is the foundation for the broader offline-first domain model (campaign, worldbuilding, manuscript, and session entities).

Worlds channel constants and `World`/`DbApi.worlds` types are aligned at the shared contract layer, with handlers in `main` and bridge methods exposed in `preload` for read/create/update/delete/markViewed access from renderer through `window.db.worlds`.

Abilities Step 07 (2026-02-27) exposes ability mutation bridges in preload (`window.db.abilities.add/update/delete/addChild/removeChild`) on top of Step 06 read bridges (`getAllByWorld/getById/getChildren`), with shared `Ability` + `AbilityChild` interfaces and full `DbApi.abilities` signatures aligned to all 8 channels.

## Channels

| Constant                         | String Value                 | Direction        | Request Payload                                                                                                                                                                                                                                                                                                             | Response                                  | Handler                           |
| -------------------------------- | ---------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------- |
| `IPC.VERSES_GET_ALL`             | `db:verses:getAll`           | renderer -> main | _(none)_                                                                                                                                                                                                                                                                                                                    | `Verse[]`                                 | `src/main.ts:registerIpcHandlers` |
| `IPC.VERSES_ADD`                 | `db:verses:add`              | renderer -> main | `{ text: string; reference?: string; tags?: string }`                                                                                                                                                                                                                                                                       | `Verse`                                   | `src/main.ts:registerIpcHandlers` |
| `IPC.VERSES_UPDATE`              | `db:verses:update`           | renderer -> main | `id: number, data: { text?: string; reference?: string; tags?: string }`                                                                                                                                                                                                                                                    | `Verse`                                   | `src/main.ts:registerIpcHandlers` |
| `IPC.VERSES_DELETE`              | `db:verses:delete`           | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `{ id: number }`                          | `src/main.ts:registerIpcHandlers` |
| `IPC.WORLDS_GET_ALL`             | `db:worlds:getAll`           | renderer -> main | _(none)_                                                                                                                                                                                                                                                                                                                    | `World[]`                                 | `src/main.ts:registerIpcHandlers` |
| `IPC.WORLDS_GET_BY_ID`           | `db:worlds:getById`          | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `World \| null`                           | `src/main.ts:registerIpcHandlers` |
| `IPC.WORLDS_ADD`                 | `db:worlds:add`              | renderer -> main | `{ name: string; thumbnail?: string \| null; short_description?: string \| null }`                                                                                                                                                                                                                                          | `World`                                   | `src/main.ts:registerIpcHandlers` |
| `IPC.WORLDS_UPDATE`              | `db:worlds:update`           | renderer -> main | `id: number, data: { name?: string; thumbnail?: string \| null; short_description?: string \| null }`                                                                                                                                                                                                                       | `World`                                   | `src/main.ts:registerIpcHandlers` |
| `IPC.WORLDS_DELETE`              | `db:worlds:delete`           | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `{ id: number }`                          | `src/main.ts:registerIpcHandlers` |
| `IPC.WORLDS_MARK_VIEWED`         | `db:worlds:markViewed`       | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `World \| null`                           | `src/main.ts:registerIpcHandlers` |
| `IPC.LEVELS_GET_ALL_BY_WORLD`    | `db:levels:getAllByWorld`    | renderer -> main | `worldId: number`                                                                                                                                                                                                                                                                                                           | `Level[]`                                 | `src/main.ts:registerIpcHandlers` |
| `IPC.LEVELS_GET_BY_ID`           | `db:levels:getById`          | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `Level \| null`                           | `src/main.ts:registerIpcHandlers` |
| `IPC.LEVELS_ADD`                 | `db:levels:add`              | renderer -> main | `{ world_id: number; name: string; category: string; description?: string \| null }`                                                                                                                                                                                                                                        | `Level`                                   | `src/main.ts:registerIpcHandlers` |
| `IPC.LEVELS_UPDATE`              | `db:levels:update`           | renderer -> main | `id: number, data: { name?: string; category?: string; description?: string \| null }`                                                                                                                                                                                                                                      | `Level`                                   | `src/main.ts:registerIpcHandlers` |
| `IPC.LEVELS_DELETE`              | `db:levels:delete`           | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `{ id: number }`                          | `src/main.ts:registerIpcHandlers` |
| `IPC.ABILITIES_GET_ALL_BY_WORLD` | `db:abilities:getAllByWorld` | renderer -> main | `worldId: number`                                                                                                                                                                                                                                                                                                           | `Ability[]`                               | `src/main.ts:registerIpcHandlers` |
| `IPC.ABILITIES_GET_BY_ID`        | `db:abilities:getById`       | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `Ability \| null`                         | `src/main.ts:registerIpcHandlers` |
| `IPC.ABILITIES_ADD`              | `db:abilities:add`           | renderer -> main | `{ world_id: number; name: string; description?: string \| null; type: string; passive_subtype?: string \| null; level_id?: number \| null; effects?: string; conditions?: string; cast_cost?: string; trigger?: string \| null; pick_count?: number \| null; pick_timing?: string \| null; pick_is_permanent?: number }`   | `Ability`                                 | `src/main.ts:registerIpcHandlers` |
| `IPC.ABILITIES_UPDATE`           | `db:abilities:update`        | renderer -> main | `id: number, data: { name?: string; description?: string \| null; type?: string; passive_subtype?: string \| null; level_id?: number \| null; effects?: string; conditions?: string; cast_cost?: string; trigger?: string \| null; pick_count?: number \| null; pick_timing?: string \| null; pick_is_permanent?: number }` | `Ability`                                 | `src/main.ts:registerIpcHandlers` |
| `IPC.ABILITIES_DELETE`           | `db:abilities:delete`        | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `{ id: number }`                          | `src/main.ts:registerIpcHandlers` |
| `IPC.ABILITIES_ADD_CHILD`        | `db:abilities:addChild`      | renderer -> main | `{ parent_id: number; child_id: number }`                                                                                                                                                                                                                                                                                   | `{ parent_id: number; child_id: number }` | `src/main.ts:registerIpcHandlers` |
| `IPC.ABILITIES_REMOVE_CHILD`     | `db:abilities:removeChild`   | renderer -> main | `{ parent_id: number; child_id: number }`                                                                                                                                                                                                                                                                                   | `{ parent_id: number; child_id: number }` | `src/main.ts:registerIpcHandlers` |
| `IPC.ABILITIES_GET_CHILDREN`     | `db:abilities:getChildren`   | renderer -> main | `abilityId: number`                                                                                                                                                                                                                                                                                                         | `Ability[]`                               | `src/main.ts:registerIpcHandlers` |

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

interface Ability {
  id: number;
  world_id: number;
  name: string;
  description: string | null;
  type: string;
  passive_subtype: string | null;
  level_id: number | null;
  effects: string;
  conditions: string;
  cast_cost: string;
  trigger: string | null;
  pick_count: number | null;
  pick_timing: string | null;
  pick_is_permanent: number;
  created_at: string; // ISO datetime string from SQLite
  updated_at: string; // ISO datetime string from SQLite
}

interface AbilityChild {
  parent_id: number;
  child_id: number;
}

interface DbApi {
  abilities: {
    getAllByWorld(worldId: number): Promise<Ability[]>;
    getById(id: number): Promise<Ability | null>;
    add(data: {
      world_id: number;
      name: string;
      description?: string | null;
      type: string;
      passive_subtype?: string | null;
      level_id?: number | null;
      effects?: string;
      conditions?: string;
      cast_cost?: string;
      trigger?: string | null;
      pick_count?: number | null;
      pick_timing?: string | null;
      pick_is_permanent?: number;
    }): Promise<Ability>;
    update(
      id: number,
      data: {
        name?: string;
        description?: string | null;
        type?: string;
        passive_subtype?: string | null;
        level_id?: number | null;
        effects?: string;
        conditions?: string;
        cast_cost?: string;
        trigger?: string | null;
        pick_count?: number | null;
        pick_timing?: string | null;
        pick_is_permanent?: number;
      },
    ): Promise<Ability>;
    delete(id: number): Promise<{ id: number }>;
    addChild(data: AbilityChild): Promise<AbilityChild>;
    removeChild(data: AbilityChild): Promise<AbilityChild>;
    getChildren(abilityId: number): Promise<Ability[]>;
  };
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
- `ABILITIES_ADD` validates required trimmed `name` and `type`, inserts an ability row, and returns the inserted row via a post-insert `SELECT`.
- `ABILITIES_UPDATE` uses explicit `hasOwnProperty` checks for partial updates (including nullable fields), validates trimmed `name`/`type` when present, always sets `updated_at = datetime('now')`, and returns a refreshed row.
- `ABILITIES_DELETE` deletes by id and returns `{ id }`.
- `ABILITIES_ADD_CHILD` validates parent/child ids as non-self links, ensures both abilities exist, enforces same-world linking (`parent.world_id === child.world_id`), inserts into `ability_children`, and converts duplicate-link unique constraint failures into a clear `'Child ability link already exists'` error.
- `ABILITIES_REMOVE_CHILD` deletes by `(parent_id, child_id)` and returns `{ parent_id, child_id }` even when no row existed (idempotent no-op behavior).
- Ability read channels are wired end-to-end for `ABILITIES_GET_ALL_BY_WORLD`, `ABILITIES_GET_BY_ID`, and `ABILITIES_GET_CHILDREN` (`main` handlers + `window.db.abilities.getAllByWorld/getById/getChildren` preload bridge methods).
- Ability mutation channels are now also wired end-to-end in Step 07 via preload: `window.db.abilities.add/update/delete/addChild/removeChild` invoke `ABILITIES_ADD`, `ABILITIES_UPDATE`, `ABILITIES_DELETE`, `ABILITIES_ADD_CHILD`, and `ABILITIES_REMOVE_CHILD`.
- Never hardcode channel strings; always import from `src/shared/ipcChannels.ts`.
