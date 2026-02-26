# IPC Contract (Living)

> **Update this file whenever you add, change, or remove an IPC channel.**
> Channel constants live in `src/shared/ipcChannels.ts`.

## Scope Note

Current channels cover an initial local content-record scaffold (`verses`) plus Worlds read/create handlers in main process (`worlds`). This is the foundation for the broader offline-first domain model (campaign, worldbuilding, manuscript, and session entities).

Worlds channel constants and `World`/`DbApi.worlds` types are aligned at the shared contract layer, with read/create handlers registered in `main` and read/create methods exposed in `preload`.

## Channels

| Constant | String Value | Direction | Request Payload | Response | Handler |
|----------|--------------|-----------|-----------------|----------|---------|
| `IPC.VERSES_GET_ALL` | `db:verses:getAll` | renderer -> main | _(none)_ | `Verse[]` | `src/main.ts:registerIpcHandlers` |
| `IPC.VERSES_ADD` | `db:verses:add` | renderer -> main | `{ text: string; reference?: string; tags?: string }` | `Verse` | `src/main.ts:registerIpcHandlers` |
| `IPC.VERSES_UPDATE` | `db:verses:update` | renderer -> main | `id: number, data: { text?: string; reference?: string; tags?: string }` | `Verse` | `src/main.ts:registerIpcHandlers` |
| `IPC.VERSES_DELETE` | `db:verses:delete` | renderer -> main | `id: number` | `{ id: number }` | `src/main.ts:registerIpcHandlers` |
| `IPC.WORLDS_GET_ALL` | `db:worlds:getAll` | renderer -> main | _(none)_ | `World[]` | `src/main.ts:registerIpcHandlers` |
| `IPC.WORLDS_GET_BY_ID` | `db:worlds:getById` | renderer -> main | `id: number` | `World \| null` | `src/main.ts:registerIpcHandlers` |
| `IPC.WORLDS_ADD` | `db:worlds:add` | renderer -> main | `{ name: string; thumbnail?: string \| null; short_description?: string \| null }` | `World` | `src/main.ts:registerIpcHandlers` |
| `IPC.WORLDS_UPDATE` | `db:worlds:update` | renderer -> main | `id: number, data: { name?: string; thumbnail?: string \| null; short_description?: string \| null }` | `World` | _(contract-only; handler pending)_ |
| `IPC.WORLDS_DELETE` | `db:worlds:delete` | renderer -> main | `id: number` | `{ id: number }` | _(contract-only; handler pending)_ |
| `IPC.WORLDS_MARK_VIEWED` | `db:worlds:markViewed` | renderer -> main | `id: number` | `World` | _(contract-only; handler pending)_ |

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
```

## Notes

- All channels use `ipcMain.handle` / `ipcRenderer.invoke` (Promise-based).
- `tags` is stored as a raw string; format is not yet enforced.
- `VERSES_UPDATE` uses SQL `COALESCE`; passing `undefined`/`null` keeps that field unchanged.
- Worlds read path is wired end-to-end for `WORLDS_GET_ALL` and `WORLDS_GET_BY_ID` (`main` handlers + `window.db.worlds.getAll/getById` in preload).
- Worlds create path is wired end-to-end for `WORLDS_ADD` (`main` handler + `window.db.worlds.add` in preload), with required trimmed-name validation in `main`.
- Worlds write channels still pending beyond create (`WORLDS_UPDATE`, `WORLDS_DELETE`, `WORLDS_MARK_VIEWED`).
- Never hardcode channel strings; always import from `src/shared/ipcChannels.ts`.
