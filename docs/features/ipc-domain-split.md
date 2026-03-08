# IPC Domain Split

## Overview

The IPC layer is now split by domain into dedicated registrar modules under
`src/main/ipc/`. `src/main.ts` is bootstrap-only and orchestrates registrar
calls.

## Why This Split Was Done

- Maintainability: each domain's IPC registration is isolated in one file.
- Testability: handlers can be reasoned about and tested per domain module.
- Complexity budgets: keeps `src/main.ts` small and prevents a monolithic IPC
  registration block from regrowing.

## Registrar Pattern

Each domain exports a registrar function with this shape:

```ts
export function register<Domain>Handlers(db: Database.Database): void
```

`src/main.ts` obtains the singleton DB and calls each registrar once during app
startup (`registerIpcHandlers()`).

Some registrars may accept an additional options object when the domain needs
runtime context (for example token image import paths):

```ts
registerTokenHandlers(db, { userDataPath: app.getPath('userData') });
```

## Current Registrar Modules

- `src/main/ipc/registerVerseHandlers.ts`
- `src/main/ipc/registerWorldHandlers.ts`
- `src/main/ipc/registerLevelHandlers.ts`
- `src/main/ipc/registerCampaignHandlers.ts`
- `src/main/ipc/registerBattleMapHandlers.ts`
- `src/main/ipc/registerTokenHandlers.ts`
- `src/main/ipc/registerArcHandlers.ts`
- `src/main/ipc/registerActHandlers.ts`
- `src/main/ipc/registerSessionHandlers.ts`
- `src/main/ipc/registerSceneHandlers.ts`
- `src/main/ipc/registerAbilityHandlers.ts`
- `src/main/ipc/registerStatBlockHandlers.ts`
- Shared IPC validation helpers: `src/main/ipc/validation.ts`

## How To Add A New Domain Registrar

1. Create `src/main/ipc/register<Domain>Handlers.ts`.
2. Implement `ipcMain.handle(...)` registrations inside that module only.
3. Import channel constants from `src/shared/ipcChannels.ts` (never hardcode
   channel strings).
4. Import the new registrar into `src/main.ts` and call it from
   `registerIpcHandlers()`.
5. Keep process boundaries intact:
   - renderer uses `window.db` only
   - preload bridges renderer to IPC
   - DB access stays in main process
6. Update living docs in the same step:
   - `docs/03_IPC_CONTRACT.md` (channel rows + handler file paths)
   - `docs/02_CODEBASE_MAP.md` (feature map entries as needed)

## Related Files

- `src/main.ts`
- `src/main/ipc/`
- `src/shared/ipcChannels.ts`
- `src/preload.ts`
- `forge.env.d.ts`
- `docs/01_ARCHITECTURE.md`
- `docs/03_IPC_CONTRACT.md`
