# IPC Contract (Living)

> **Update this file whenever you add, change, or remove an IPC channel.**
> Channel constants live in `src/shared/ipcChannels.ts`.

## Scope Note

Current channels cover an initial local content-record scaffold (`verses`) plus worlds/levels/abilities handlers, campaign CRUD handlers, BattleMap CRUD handlers, world/campaign-scoped token CRUD + token image import handlers, session CRUD handlers, and scene CRUD handlers in the main process. This is the foundation for the broader offline-first domain model (campaign, worldbuilding, manuscript, and session entities).

Worlds channel constants and `World`/`DbApi.worlds` types are aligned at the shared contract layer, with handlers in `main` and bridge methods exposed in `preload` for read/create/update/delete/markViewed access from renderer through `window.db.worlds`.

Abilities Step 07 (2026-02-27) exposes ability mutation bridges in preload (`window.db.abilities.add/update/delete/addChild/removeChild`) on top of Step 06 read bridges (`getAllByWorld/getById/getChildren`), with shared `Ability` + `AbilityChild` interfaces and full `DbApi.abilities` signatures aligned to all 8 channels.

Campaign Step 07 (2026-02-27) wires campaign CRUD handlers in `main` for `CAMPAIGNS_GET_ALL_BY_WORLD`, `CAMPAIGNS_GET_BY_ID`, `CAMPAIGNS_ADD`, `CAMPAIGNS_UPDATE`, and `CAMPAIGNS_DELETE`. Preload bridge methods are wired in Step 10 (2026-02-28).

BattleMap Step 01 (2026-03-03) adds shared constants for planned battlemaps CRUD (`BATTLEMAPS_GET_ALL_BY_WORLD`, `BATTLEMAPS_GET_BY_ID`, `BATTLEMAPS_ADD`, `BATTLEMAPS_UPDATE`, `BATTLEMAPS_DELETE`) and schema bootstrap in `db.ts`; BattleMap Step 02 (2026-03-03) wires all 5 handlers in `main`; BattleMap Step 03 (2026-03-03) wires preload bridge methods and shared `BattleMap` + `DbApi.battlemaps` signatures.

Runtime Step 01 (2026-03-04) adds token CRUD constants (`TOKENS_GET_ALL_BY_CAMPAIGN`, `TOKENS_GET_BY_ID`, `TOKENS_ADD`, `TOKENS_UPDATE`, `TOKENS_DELETE`), wires all 5 token handlers in `main`, and exposes `window.db.tokens.getAllByCampaign/getById/add/update/delete` in preload with shared `Token` and `DbApi.tokens` signatures.

Tokens Step 01 (2026-03-04) adds `TOKENS_GET_ALL_BY_WORLD` constant; wires world-scoped read handler in `main`; updates `TOKENS_ADD` to require `world_id` and accept optional `campaign_id`; adds `window.db.tokens.getAllByWorld(worldId)` preload bridge; updates `Token` interface (`world_id: number`, `campaign_id: number | null`) and `DbApi.tokens.add` signature.

Tokens Image DnD Step 01 (2026-03-04) adds `TOKENS_IMPORT_IMAGE` (`db:tokens:importImage`), with main-process validation for payload shape/mime/size and app-owned persistence under `app.getPath('userData')/token-images`; preload exposes `window.db.tokens.importImage(payload)` with shared `TokenImageImportPayload`/`TokenImageImportResult` typing.

Tokens Image Protocol Step 02 (2026-03-05) keeps the same IPC channel and payload/response shapes, but changes `TOKENS_IMPORT_IMAGE` response semantics: `image_src` now uses app-local `vv-media://token-images/<encoded-file-name>` URLs instead of direct `file://` URLs. Main process registers a `vv-media` protocol handler that serves files from the app-owned `token-images` directory with path traversal guards.

Tokens Move Step 01 (2026-03-05) adds `TOKENS_MOVE_TO_WORLD` (`db:tokens:moveToWorld`) and `TOKENS_MOVE_TO_CAMPAIGN` (`db:tokens:moveToCampaign`) handlers for in-place token scope transitions; both require transactional validation that target campaign (if applicable) is in the same world as the token's parent world, and both return the updated `Token` row on success.

Token Move Step 01 (2026-03-05) adds token move channels `TOKENS_MOVE_TO_WORLD` and `TOKENS_MOVE_TO_CAMPAIGN`, wires main-process handlers, and extends `DbApi.tokens` signatures with `moveToWorld(tokenId)` and `moveToCampaign(tokenId, targetCampaignId)`. Token Move Step 02 (2026-03-05) wires both methods in preload via `window.db.tokens.moveToWorld(tokenId)` and `window.db.tokens.moveToCampaign(tokenId, targetCampaignId)`.

Runtime Step 01 (2026-03-04) also hardens BattleMap config validation in `main` so `config` is a JSON object with runtime-ready defaults at `runtime.grid`, `runtime.map`, and `runtime.camera`; scene payload validation remains backward-compatible while validating optional runtime linkage field `payload.runtime.battlemap_id`.

Session Step 08 (2026-02-27) wires session CRUD handlers in `main` for `SESSIONS_GET_ALL_BY_CAMPAIGN`, `SESSIONS_GET_BY_ID`, `SESSIONS_ADD`, `SESSIONS_UPDATE`, and `SESSIONS_DELETE`. Preload bridge methods are wired in Step 10 (2026-02-28).

Scene Step 09 (2026-02-27) wires scene CRUD handlers in `main` for `SCENES_GET_ALL_BY_SESSION`, `SCENES_GET_BY_ID`, `SCENES_ADD`, `SCENES_UPDATE`, and `SCENES_DELETE`. Preload bridge methods are wired in Step 10 (2026-02-28).

Scenes Move Step 01 (2026-03-03) adds `SCENES_MOVE_TO_SESSION` in main with transactional move/resequence semantics and exposes `window.db.scenes.moveTo(sceneId, newSessionId)` in preload and shared types.

Campaign Scenes Index Step 01 (2026-03-03) adds `SCENES_GET_ALL_BY_CAMPAIGN` in main as a read-only campaign query (`scenes -> sessions -> acts -> arcs`, filtered by `arcs.campaign_id`) and exposes `window.db.scenes.getAllByCampaign(campaignId)` in preload.

Campaign/Session/Scene Preload Step 10 (2026-02-28) exposes all 15 campaign/session/scene CRUD channels as typed bridge methods via `window.db.campaigns`, `window.db.sessions`, and `window.db.scenes`; Campaign Scenes Index Step 01 extends this with one additional read channel (16 total).

Campaign/Session/Scene Shared Types Step 11 (2026-02-28) adds `Campaign`, `Session`, and `Scene` global interfaces plus `DbApi.campaigns`, `DbApi.sessions`, and `DbApi.scenes` signatures to `forge.env.d.ts`; Campaign Scenes Index Step 01 adds `CampaignSceneListItem` and `DbApi.scenes.getAllByCampaign`; Runtime Step 01 adds `Token`, `DbApi.tokens`, and runtime config/payload support interfaces (`BattleMapRuntime*`, `BattleMapConfig`, `ScenePayload*`).

Arc/Act Step 01 (2026-02-28) adds `arcs` and `acts` tables, migrates `sessions.campaign_id` → `sessions.act_id`, adds full CRUD + reparenting channels for arcs and acts (`ARCS_*`, `ACTS_*`), replaces `SESSIONS_GET_ALL_BY_CAMPAIGN` handler with `SESSIONS_GET_ALL_BY_ACT`, adds `SESSIONS_MOVE_TO_ACT`, and exposes `window.db.arcs.*`, `window.db.acts.*`, and updated `window.db.sessions.getAllByAct/moveTo` bridge methods. `SESSIONS_GET_ALL_BY_CAMPAIGN` constant retained for renderer compatibility until Step 02.

## Channels

| Constant                          | String Value                  | Direction        | Request Payload                                                                                                                                                                                                                                                                                                             | Response                                                                                                         | Handler                           |
| --------------------------------- | ----------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `IPC.VERSES_GET_ALL`              | `db:verses:getAll`            | renderer -> main | _(none)_                                                                                                                                                                                                                                                                                                                    | `Verse[]`                                                                                                        | `src/main.ts:registerIpcHandlers` |
| `IPC.VERSES_ADD`                  | `db:verses:add`               | renderer -> main | `{ text: string; reference?: string; tags?: string }`                                                                                                                                                                                                                                                                       | `Verse`                                                                                                          | `src/main.ts:registerIpcHandlers` |
| `IPC.VERSES_UPDATE`               | `db:verses:update`            | renderer -> main | `id: number, data: { text?: string; reference?: string; tags?: string }`                                                                                                                                                                                                                                                    | `Verse`                                                                                                          | `src/main.ts:registerIpcHandlers` |
| `IPC.VERSES_DELETE`               | `db:verses:delete`            | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `{ id: number }`                                                                                                 | `src/main.ts:registerIpcHandlers` |
| `IPC.WORLDS_GET_ALL`              | `db:worlds:getAll`            | renderer -> main | _(none)_                                                                                                                                                                                                                                                                                                                    | `World[]`                                                                                                        | `src/main.ts:registerIpcHandlers` |
| `IPC.WORLDS_GET_BY_ID`            | `db:worlds:getById`           | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `World \| null`                                                                                                  | `src/main.ts:registerIpcHandlers` |
| `IPC.WORLDS_ADD`                  | `db:worlds:add`               | renderer -> main | `{ name: string; thumbnail?: string \| null; short_description?: string \| null }`                                                                                                                                                                                                                                          | `World`                                                                                                          | `src/main.ts:registerIpcHandlers` |
| `IPC.WORLDS_UPDATE`               | `db:worlds:update`            | renderer -> main | `id: number, data: { name?: string; thumbnail?: string \| null; short_description?: string \| null }`                                                                                                                                                                                                                       | `World`                                                                                                          | `src/main.ts:registerIpcHandlers` |
| `IPC.WORLDS_DELETE`               | `db:worlds:delete`            | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `{ id: number }`                                                                                                 | `src/main.ts:registerIpcHandlers` |
| `IPC.WORLDS_MARK_VIEWED`          | `db:worlds:markViewed`        | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `World \| null`                                                                                                  | `src/main.ts:registerIpcHandlers` |
| `IPC.LEVELS_GET_ALL_BY_WORLD`     | `db:levels:getAllByWorld`     | renderer -> main | `worldId: number`                                                                                                                                                                                                                                                                                                           | `Level[]`                                                                                                        | `src/main.ts:registerIpcHandlers` |
| `IPC.LEVELS_GET_BY_ID`            | `db:levels:getById`           | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `Level \| null`                                                                                                  | `src/main.ts:registerIpcHandlers` |
| `IPC.LEVELS_ADD`                  | `db:levels:add`               | renderer -> main | `{ world_id: number; name: string; category: string; description?: string \| null }`                                                                                                                                                                                                                                        | `Level`                                                                                                          | `src/main.ts:registerIpcHandlers` |
| `IPC.LEVELS_UPDATE`               | `db:levels:update`            | renderer -> main | `id: number, data: { name?: string; category?: string; description?: string \| null }`                                                                                                                                                                                                                                      | `Level`                                                                                                          | `src/main.ts:registerIpcHandlers` |
| `IPC.LEVELS_DELETE`               | `db:levels:delete`            | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `{ id: number }`                                                                                                 | `src/main.ts:registerIpcHandlers` |
| `IPC.ABILITIES_GET_ALL_BY_WORLD`  | `db:abilities:getAllByWorld`  | renderer -> main | `worldId: number`                                                                                                                                                                                                                                                                                                           | `Ability[]`                                                                                                      | `src/main.ts:registerIpcHandlers` |
| `IPC.ABILITIES_GET_BY_ID`         | `db:abilities:getById`        | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `Ability \| null`                                                                                                | `src/main.ts:registerIpcHandlers` |
| `IPC.ABILITIES_ADD`               | `db:abilities:add`            | renderer -> main | `{ world_id: number; name: string; description?: string \| null; type: string; passive_subtype?: string \| null; level_id?: number \| null; effects?: string; conditions?: string; cast_cost?: string; trigger?: string \| null; pick_count?: number \| null; pick_timing?: string \| null; pick_is_permanent?: number }`   | `Ability`                                                                                                        | `src/main.ts:registerIpcHandlers` |
| `IPC.ABILITIES_UPDATE`            | `db:abilities:update`         | renderer -> main | `id: number, data: { name?: string; description?: string \| null; type?: string; passive_subtype?: string \| null; level_id?: number \| null; effects?: string; conditions?: string; cast_cost?: string; trigger?: string \| null; pick_count?: number \| null; pick_timing?: string \| null; pick_is_permanent?: number }` | `Ability`                                                                                                        | `src/main.ts:registerIpcHandlers` |
| `IPC.ABILITIES_DELETE`            | `db:abilities:delete`         | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `{ id: number }`                                                                                                 | `src/main.ts:registerIpcHandlers` |
| `IPC.ABILITIES_ADD_CHILD`         | `db:abilities:addChild`       | renderer -> main | `{ parent_id: number; child_id: number }`                                                                                                                                                                                                                                                                                   | `{ parent_id: number; child_id: number }`                                                                        | `src/main.ts:registerIpcHandlers` |
| `IPC.ABILITIES_REMOVE_CHILD`      | `db:abilities:removeChild`    | renderer -> main | `{ parent_id: number; child_id: number }`                                                                                                                                                                                                                                                                                   | `{ parent_id: number; child_id: number }`                                                                        | `src/main.ts:registerIpcHandlers` |
| `IPC.ABILITIES_GET_CHILDREN`      | `db:abilities:getChildren`    | renderer -> main | `abilityId: number`                                                                                                                                                                                                                                                                                                         | `Ability[]`                                                                                                      | `src/main.ts:registerIpcHandlers` |
| `IPC.CAMPAIGNS_GET_ALL_BY_WORLD`  | `db:campaigns:getAllByWorld`  | renderer -> main | `worldId: number`                                                                                                                                                                                                                                                                                                           | `Campaign[]`                                                                                                     | `src/main.ts:registerIpcHandlers` |
| `IPC.CAMPAIGNS_GET_BY_ID`         | `db:campaigns:getById`        | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `Campaign \| null`                                                                                               | `src/main.ts:registerIpcHandlers` |
| `IPC.CAMPAIGNS_ADD`               | `db:campaigns:add`            | renderer -> main | `{ world_id: number; name: string; summary?: string \| null; config?: string }`                                                                                                                                                                                                                                             | `Campaign`                                                                                                       | `src/main.ts:registerIpcHandlers` |
| `IPC.CAMPAIGNS_UPDATE`            | `db:campaigns:update`         | renderer -> main | `id: number, data: { name?: string; summary?: string \| null; config?: string }`                                                                                                                                                                                                                                            | `Campaign`                                                                                                       | `src/main.ts:registerIpcHandlers` |
| `IPC.CAMPAIGNS_DELETE`            | `db:campaigns:delete`         | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `{ id: number }`                                                                                                 | `src/main.ts:registerIpcHandlers` |
| `IPC.BATTLEMAPS_GET_ALL_BY_WORLD` | `db:battlemaps:getAllByWorld` | renderer -> main | `worldId: number`                                                                                                                                                                                                                                                                                                           | `{ id: number; world_id: number; name: string; config: string; created_at: string; updated_at: string }[]`       | `src/main.ts:registerIpcHandlers` |
| `IPC.BATTLEMAPS_GET_BY_ID`        | `db:battlemaps:getById`       | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `{ id: number; world_id: number; name: string; config: string; created_at: string; updated_at: string } \| null` | `src/main.ts:registerIpcHandlers` |
| `IPC.BATTLEMAPS_ADD`              | `db:battlemaps:add`           | renderer -> main | `{ world_id: number; name: string; config?: string }`                                                                                                                                                                                                                                                                       | `{ id: number; world_id: number; name: string; config: string; created_at: string; updated_at: string }`         | `src/main.ts:registerIpcHandlers` |
| `IPC.BATTLEMAPS_UPDATE`           | `db:battlemaps:update`        | renderer -> main | `id: number, data: { name?: string; config?: string }`                                                                                                                                                                                                                                                                      | `{ id: number; world_id: number; name: string; config: string; created_at: string; updated_at: string }`         | `src/main.ts:registerIpcHandlers` |
| `IPC.BATTLEMAPS_DELETE`           | `db:battlemaps:delete`        | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `{ id: number }`                                                                                                 | `src/main.ts:registerIpcHandlers` |
| `IPC.TOKENS_GET_ALL_BY_WORLD`     | `db:tokens:getAllByWorld`     | renderer -> main | `worldId: number`                                                                                                                                                                                                                                                                                                           | `Token[]`                                                                                                        | `src/main.ts:registerIpcHandlers` |
| `IPC.TOKENS_GET_ALL_BY_CAMPAIGN`  | `db:tokens:getAllByCampaign`  | renderer -> main | `campaignId: number`                                                                                                                                                                                                                                                                                                        | `Token[]`                                                                                                        | `src/main.ts:registerIpcHandlers` |
| `IPC.TOKENS_GET_BY_ID`            | `db:tokens:getById`           | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `Token \| null`                                                                                                  | `src/main.ts:registerIpcHandlers` |
| `IPC.TOKENS_IMPORT_IMAGE`         | `db:tokens:importImage`       | renderer -> main | `{ fileName: string; mimeType: string; bytes: Uint8Array }`                                                                                                                                                                                                                                                                 | `{ image_src: string }`                                                                                          | `src/main.ts:registerIpcHandlers` |
| `IPC.TOKENS_ADD`                  | `db:tokens:add`               | renderer -> main | `{ world_id: number; campaign_id?: number \| null; name: string; image_src?: string \| null; config?: string; is_visible?: number }`                                                                                                                                                                                        | `Token`                                                                                                          | `src/main.ts:registerIpcHandlers` |
| `IPC.TOKENS_UPDATE`               | `db:tokens:update`            | renderer -> main | `id: number, data: { name?: string; image_src?: string \| null; config?: string; is_visible?: number }`                                                                                                                                                                                                                     | `Token`                                                                                                          | `src/main.ts:registerIpcHandlers` |
| `IPC.TOKENS_MOVE_TO_WORLD`        | `db:tokens:moveToWorld`       | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `Token`                                                                                                          | `src/main.ts:registerIpcHandlers` |
| `IPC.TOKENS_MOVE_TO_CAMPAIGN`     | `db:tokens:moveToCampaign`    | renderer -> main | `id: number, targetCampaignId: number`                                                                                                                                                                                                                                                                                      | `Token`                                                                                                          | `src/main.ts:registerIpcHandlers` |
| `IPC.TOKENS_DELETE`               | `db:tokens:delete`            | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `{ id: number }`                                                                                                 | `src/main.ts:registerIpcHandlers` |
| `IPC.ARCS_GET_ALL_BY_CAMPAIGN`    | `db:arcs:getAllByCampaign`    | renderer -> main | `campaignId: number`                                                                                                                                                                                                                                                                                                        | `Arc[]`                                                                                                          | `src/main.ts:registerIpcHandlers` |
| `IPC.ARCS_GET_BY_ID`              | `db:arcs:getById`             | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `Arc \| null`                                                                                                    | `src/main.ts:registerIpcHandlers` |
| `IPC.ARCS_ADD`                    | `db:arcs:add`                 | renderer -> main | `{ campaign_id: number; name: string; sort_order?: number }`                                                                                                                                                                                                                                                                | `Arc`                                                                                                            | `src/main.ts:registerIpcHandlers` |
| `IPC.ARCS_UPDATE`                 | `db:arcs:update`              | renderer -> main | `id: number, data: { name?: string; sort_order?: number }`                                                                                                                                                                                                                                                                  | `Arc`                                                                                                            | `src/main.ts:registerIpcHandlers` |
| `IPC.ARCS_DELETE`                 | `db:arcs:delete`              | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `{ id: number }`                                                                                                 | `src/main.ts:registerIpcHandlers` |
| `IPC.ACTS_GET_ALL_BY_ARC`         | `db:acts:getAllByArc`         | renderer -> main | `arcId: number`                                                                                                                                                                                                                                                                                                             | `Act[]`                                                                                                          | `src/main.ts:registerIpcHandlers` |
| `IPC.ACTS_GET_ALL_BY_CAMPAIGN`    | `db:acts:getAllByCampaign`    | renderer -> main | `campaignId: number`                                                                                                                                                                                                                                                                                                        | `Act[]`                                                                                                          | `src/main.ts:registerIpcHandlers` |
| `IPC.ACTS_GET_BY_ID`              | `db:acts:getById`             | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `Act \| null`                                                                                                    | `src/main.ts:registerIpcHandlers` |
| `IPC.ACTS_ADD`                    | `db:acts:add`                 | renderer -> main | `{ arc_id: number; name: string; sort_order?: number }`                                                                                                                                                                                                                                                                     | `Act`                                                                                                            | `src/main.ts:registerIpcHandlers` |
| `IPC.ACTS_UPDATE`                 | `db:acts:update`              | renderer -> main | `id: number, data: { name?: string; sort_order?: number }`                                                                                                                                                                                                                                                                  | `Act`                                                                                                            | `src/main.ts:registerIpcHandlers` |
| `IPC.ACTS_DELETE`                 | `db:acts:delete`              | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `{ id: number }`                                                                                                 | `src/main.ts:registerIpcHandlers` |
| `IPC.ACTS_MOVE_TO_ARC`            | `db:acts:moveToArc`           | renderer -> main | `actId: number, newArcId: number`                                                                                                                                                                                                                                                                                           | `Act`                                                                                                            | `src/main.ts:registerIpcHandlers` |
| `IPC.SESSIONS_GET_ALL_BY_ACT`     | `db:sessions:getAllByAct`     | renderer -> main | `actId: number`                                                                                                                                                                                                                                                                                                             | `Session[]`                                                                                                      | `src/main.ts:registerIpcHandlers` |
| `IPC.SESSIONS_GET_BY_ID`          | `db:sessions:getById`         | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `Session \| null`                                                                                                | `src/main.ts:registerIpcHandlers` |
| `IPC.SESSIONS_ADD`                | `db:sessions:add`             | renderer -> main | `{ act_id: number; name: string; notes?: string \| null; planned_at?: string \| null; sort_order?: number }`                                                                                                                                                                                                                | `Session`                                                                                                        | `src/main.ts:registerIpcHandlers` |
| `IPC.SESSIONS_UPDATE`             | `db:sessions:update`          | renderer -> main | `id: number, data: { name?: string; notes?: string \| null; planned_at?: string \| null; sort_order?: number }`                                                                                                                                                                                                             | `Session`                                                                                                        | `src/main.ts:registerIpcHandlers` |
| `IPC.SESSIONS_DELETE`             | `db:sessions:delete`          | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `{ id: number }`                                                                                                 | `src/main.ts:registerIpcHandlers` |
| `IPC.SESSIONS_MOVE_TO_ACT`        | `db:sessions:moveToAct`       | renderer -> main | `sessionId: number, newActId: number`                                                                                                                                                                                                                                                                                       | `Session`                                                                                                        | `src/main.ts:registerIpcHandlers` |
| `IPC.SCENES_GET_ALL_BY_CAMPAIGN`  | `db:scenes:getAllByCampaign`  | renderer -> main | `campaignId: number`                                                                                                                                                                                                                                                                                                        | `CampaignSceneListItem[]`                                                                                        | `src/main.ts:registerIpcHandlers` |
| `IPC.SCENES_GET_ALL_BY_SESSION`   | `db:scenes:getAllBySession`   | renderer -> main | `sessionId: number`                                                                                                                                                                                                                                                                                                         | `Scene[]`                                                                                                        | `src/main.ts:registerIpcHandlers` |
| `IPC.SCENES_GET_BY_ID`            | `db:scenes:getById`           | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `Scene \| null`                                                                                                  | `src/main.ts:registerIpcHandlers` |
| `IPC.SCENES_ADD`                  | `db:scenes:add`               | renderer -> main | `{ session_id: number; name: string; notes?: string \| null; payload?: string; sort_order?: number }`                                                                                                                                                                                                                       | `Scene`                                                                                                          | `src/main.ts:registerIpcHandlers` |
| `IPC.SCENES_UPDATE`               | `db:scenes:update`            | renderer -> main | `id: number, data: { name?: string; notes?: string \| null; payload?: string; sort_order?: number }`                                                                                                                                                                                                                        | `Scene`                                                                                                          | `src/main.ts:registerIpcHandlers` |
| `IPC.SCENES_DELETE`               | `db:scenes:delete`            | renderer -> main | `id: number`                                                                                                                                                                                                                                                                                                                | `{ id: number }`                                                                                                 | `src/main.ts:registerIpcHandlers` |
| `IPC.SCENES_MOVE_TO_SESSION`      | `db:scenes:moveToSession`     | renderer -> main | `sceneId: number, newSessionId: number`                                                                                                                                                                                                                                                                                     | `Scene`                                                                                                          | `src/main.ts:registerIpcHandlers` |

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

interface Campaign {
  id: number;
  world_id: number;
  name: string;
  summary: string | null;
  config: string;
  created_at: string; // ISO datetime string from SQLite
  updated_at: string; // ISO datetime string from SQLite
}

interface BattleMap {
  id: number;
  world_id: number;
  name: string;
  config: string;
  created_at: string; // ISO datetime string from SQLite
  updated_at: string; // ISO datetime string from SQLite
}

type BattleMapGridMode = 'square' | 'hex' | 'none';

interface BattleMapRuntimeGridConfig {
  mode: BattleMapGridMode;
  cellSize: number;
  originX: number;
  originY: number;
}

interface BattleMapRuntimeMapConfig {
  imageSrc: string | null;
  backgroundColor: string;
}

interface BattleMapRuntimeCameraConfig {
  x: number;
  y: number;
  zoom: number;
}

interface BattleMapRuntimeConfig {
  grid: BattleMapRuntimeGridConfig;
  map: BattleMapRuntimeMapConfig;
  camera: BattleMapRuntimeCameraConfig;
  [key: string]: unknown;
}

interface BattleMapConfig {
  runtime?: BattleMapRuntimeConfig;
  [key: string]: unknown;
}

interface ScenePayloadRuntime {
  battlemap_id?: number | null;
  [key: string]: unknown;
}

interface ScenePayload {
  runtime?: ScenePayloadRuntime;
  [key: string]: unknown;
}

interface TokenImageImportPayload {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}

interface TokenImageImportResult {
  image_src: string;
}

interface Token {
  id: number;
  world_id: number;
  campaign_id: number | null;
  name: string;
  image_src: string | null;
  config: string;
  is_visible: number;
  created_at: string; // ISO datetime string from SQLite
  updated_at: string; // ISO datetime string from SQLite
}

interface Arc {
  id: number;
  campaign_id: number;
  name: string;
  sort_order: number;
  created_at: string; // ISO datetime string from SQLite
  updated_at: string; // ISO datetime string from SQLite
}

interface Act {
  id: number;
  arc_id: number;
  name: string;
  sort_order: number;
  created_at: string; // ISO datetime string from SQLite
  updated_at: string; // ISO datetime string from SQLite
}

interface Session {
  id: number;
  act_id: number;
  name: string;
  notes: string | null;
  planned_at: string | null;
  sort_order: number;
  created_at: string; // ISO datetime string from SQLite
  updated_at: string; // ISO datetime string from SQLite
}

interface Scene {
  id: number;
  session_id: number;
  name: string;
  notes: string | null;
  payload: string;
  sort_order: number;
  created_at: string; // ISO datetime string from SQLite
  updated_at: string; // ISO datetime string from SQLite
}

interface CampaignSceneListItem extends Scene {
  session_name: string;
  act_id: number;
  act_name: string;
  arc_id: number;
  arc_name: string;
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
  campaigns: {
    getAllByWorld(worldId: number): Promise<Campaign[]>;
    getById(id: number): Promise<Campaign | null>;
    add(data: {
      world_id: number;
      name: string;
      summary?: string | null;
      config?: string;
    }): Promise<Campaign>;
    update(
      id: number,
      data: { name?: string; summary?: string | null; config?: string },
    ): Promise<Campaign>;
    delete(id: number): Promise<{ id: number }>;
  };
  battlemaps: {
    getAllByWorld(worldId: number): Promise<BattleMap[]>;
    getById(id: number): Promise<BattleMap | null>;
    add(data: {
      world_id: number;
      name: string;
      config?: string;
    }): Promise<BattleMap>;
    update(
      id: number,
      data: { name?: string; config?: string },
    ): Promise<BattleMap>;
    delete(id: number): Promise<{ id: number }>;
  };
  tokens: {
    getAllByWorld(worldId: number): Promise<Token[]>;
    getAllByCampaign(campaignId: number): Promise<Token[]>;
    getById(id: number): Promise<Token | null>;
    importImage(
      payload: TokenImageImportPayload,
    ): Promise<TokenImageImportResult>;
    add(data: {
      world_id: number;
      campaign_id?: number | null;
      name: string;
      image_src?: string | null;
      config?: string;
      is_visible?: number;
    }): Promise<Token>;
    update(
      id: number,
      data: {
        name?: string;
        image_src?: string | null;
        config?: string;
        is_visible?: number;
      },
    ): Promise<Token>;
    moveToWorld(tokenId: number): Promise<Token>;
    moveToCampaign(tokenId: number, targetCampaignId: number): Promise<Token>;
    delete(id: number): Promise<{ id: number }>;
  };
  arcs: {
    getAllByCampaign(campaignId: number): Promise<Arc[]>;
    getById(id: number): Promise<Arc | null>;
    add(data: {
      campaign_id: number;
      name: string;
      sort_order?: number;
    }): Promise<Arc>;
    update(
      id: number,
      data: { name?: string; sort_order?: number },
    ): Promise<Arc>;
    delete(id: number): Promise<{ id: number }>;
  };
  acts: {
    getAllByArc(arcId: number): Promise<Act[]>;
    getAllByCampaign(campaignId: number): Promise<Act[]>;
    getById(id: number): Promise<Act | null>;
    add(data: {
      arc_id: number;
      name: string;
      sort_order?: number;
    }): Promise<Act>;
    update(
      id: number,
      data: { name?: string; sort_order?: number },
    ): Promise<Act>;
    delete(id: number): Promise<{ id: number }>;
    moveTo(actId: number, newArcId: number): Promise<Act>;
  };
  sessions: {
    getAllByAct(actId: number): Promise<Session[]>;
    getById(id: number): Promise<Session | null>;
    add(data: {
      act_id: number;
      name: string;
      notes?: string | null;
      planned_at?: string | null;
      sort_order?: number;
    }): Promise<Session>;
    update(
      id: number,
      data: {
        name?: string;
        notes?: string | null;
        planned_at?: string | null;
        sort_order?: number;
      },
    ): Promise<Session>;
    delete(id: number): Promise<{ id: number }>;
    moveTo(sessionId: number, newActId: number): Promise<Session>;
  };
  scenes: {
    getAllByCampaign(campaignId: number): Promise<CampaignSceneListItem[]>;
    getAllBySession(sessionId: number): Promise<Scene[]>;
    getById(id: number): Promise<Scene | null>;
    add(data: {
      session_id: number;
      name: string;
      notes?: string | null;
      payload?: string;
      sort_order?: number;
    }): Promise<Scene>;
    update(
      id: number,
      data: {
        name?: string;
        notes?: string | null;
        payload?: string;
        sort_order?: number;
      },
    ): Promise<Scene>;
    delete(id: number): Promise<{ id: number }>;
    moveTo(sceneId: number, newSessionId: number): Promise<Scene>;
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
- Campaign main handlers are wired for `CAMPAIGNS_GET_ALL_BY_WORLD`, `CAMPAIGNS_GET_BY_ID`, `CAMPAIGNS_ADD`, `CAMPAIGNS_UPDATE`, and `CAMPAIGNS_DELETE`.
- `CAMPAIGNS_ADD` validates `name.trim()` as required, inserts a campaign row (`world_id`, `name`, `summary`, `config`), and returns the inserted row via a post-insert `SELECT`.
- `CAMPAIGNS_UPDATE` updates only explicitly provided fields (`name`, `summary`, `config`) using `hasOwnProperty` checks, validates trimmed `name` when present, always refreshes `updated_at`, and returns the refreshed row.
- `CAMPAIGNS_DELETE` deletes by id and returns `{ id }` even when no row existed (idempotent no-op behavior).
- Campaign preload bridge methods are wired end-to-end in Step 10 via `window.db.campaigns.getAllByWorld/getById/add/update/delete`.
- BattleMap main handlers are wired for `BATTLEMAPS_GET_ALL_BY_WORLD`, `BATTLEMAPS_GET_BY_ID`, `BATTLEMAPS_ADD`, `BATTLEMAPS_UPDATE`, and `BATTLEMAPS_DELETE`.
- `BATTLEMAPS_GET_ALL_BY_WORLD` is scoped by `world_id` and returns deterministic order (`updated_at DESC, id DESC`); `BATTLEMAPS_GET_BY_ID` returns a row or `null`.
- `BATTLEMAPS_ADD` validates required trimmed `name`, defaults omitted `config` to `'{}'`, validates `config` as a JSON object, normalizes runtime defaults (`runtime.grid`, `runtime.map`, `runtime.camera`), inserts (`world_id`, `name`, `config`), and returns the inserted row.
- `BATTLEMAPS_UPDATE` updates only explicitly provided fields (`name`, `config`) using `hasOwnProperty` checks, validates trimmed `name` and object JSON `config` when present, normalizes runtime defaults for `config`, always refreshes `updated_at`, and returns the refreshed row (throws `'BattleMap not found'` when missing).
- `BATTLEMAPS_DELETE` deletes by id and returns `{ id }` even when no row existed (idempotent no-op behavior).
- BattleMap channels are wired end-to-end in Step 03 via `window.db.battlemaps.getAllByWorld/getById/add/update/delete` and shared `BattleMap` + `DbApi.battlemaps` signatures in `forge.env.d.ts`.
- Token main handlers are wired for `TOKENS_GET_ALL_BY_WORLD`, `TOKENS_GET_ALL_BY_CAMPAIGN`, `TOKENS_GET_BY_ID`, `TOKENS_IMPORT_IMAGE`, `TOKENS_ADD`, `TOKENS_UPDATE`, `TOKENS_MOVE_TO_WORLD`, `TOKENS_MOVE_TO_CAMPAIGN`, and `TOKENS_DELETE`.
- `TOKENS_GET_ALL_BY_WORLD` is scoped by `world_id` (validated positive integer) and returns tokens ordered by `name ASC`; added in Tokens Step 01 (2026-03-04).
- `TOKENS_GET_ALL_BY_CAMPAIGN` is scoped by `campaign_id` and returns deterministic order (`updated_at DESC, id DESC`); `TOKENS_GET_BY_ID` returns a row or `null`.
- `TOKENS_IMPORT_IMAGE` accepts `{ fileName, mimeType, bytes }`, requires `bytes` to be a non-empty `Uint8Array`, accepts only `image/png`, `image/jpeg`, `image/webp`, or `image/gif`, enforces a 5 MB size limit, writes under `app.getPath('userData')/token-images` using a unique filename (`timestamp-random.ext`), and returns `{ image_src }` as `vv-media://token-images/<encoded-file-name>`.
- `vv-media` is registered in main via `protocol.handle(...)` and serves only files inside `app.getPath('userData')/token-images`; invalid host/path traversal requests return 400/404 and are rejected.
- `TOKENS_ADD` requires `world_id` (positive integer), accepts optional `campaign_id` (positive integer or null), validates required trimmed `name`, defaults omitted `config` to `'{}'`, validates provided `config` as a JSON object, validates `is_visible` as `0|1`, inserts (`world_id`, `campaign_id`, `name`, `image_src`, `config`, `is_visible`), and returns the inserted row.
- `TOKENS_UPDATE` updates only explicitly provided fields (`name`, `image_src`, `config`, `is_visible`) using `hasOwnProperty` checks, validates trimmed `name`, object JSON `config`, and `is_visible` as `0|1` when present, always refreshes `updated_at`, and returns the refreshed row (throws `'Token not found'` when missing).
- `TOKENS_MOVE_TO_WORLD` validates `tokenId` as a positive integer, verifies the token exists, then transactionally sets `campaign_id = NULL` and returns the refreshed token row.
- `TOKENS_MOVE_TO_CAMPAIGN` validates `tokenId` and `targetCampaignId` as positive integers, verifies both token and target campaign exist, enforces `token.world_id === campaign.world_id`, then transactionally updates `campaign_id` and returns the refreshed token row.
- `TOKENS_DELETE` deletes by id and returns `{ id }` even when no row existed (idempotent no-op behavior).
- Token channels are wired end-to-end via `window.db.tokens.getAllByWorld/getAllByCampaign/getById/importImage/add/update/moveToWorld/moveToCampaign/delete` and shared `Token` + `TokenImageImportPayload` + `TokenImageImportResult` + `DbApi.tokens` signatures in `forge.env.d.ts`.
- Arc main handlers are wired for `ARCS_GET_ALL_BY_CAMPAIGN`, `ARCS_GET_BY_ID`, `ARCS_ADD`, `ARCS_UPDATE`, and `ARCS_DELETE`.
- `ARCS_GET_ALL_BY_CAMPAIGN` is scoped by `campaign_id` and returns arcs ordered by `sort_order ASC, id ASC`.
- `ARCS_ADD` validates required trimmed `name`, appends to the sibling tail when `sort_order` is omitted, inserts (`campaign_id`, `name`, `sort_order`), and returns the inserted row.
- `ARCS_UPDATE` updates only explicitly provided fields (`name`, `sort_order`) using `hasOwnProperty` checks, validates trimmed `name` when present, always refreshes `updated_at`, and returns the refreshed row.
- `ARCS_DELETE` deletes by id, compacts remaining sibling `sort_order` values within `campaign_id`, and returns `{ id }` (idempotent no-op when row does not exist).
- Arc preload bridge methods are wired via `window.db.arcs.getAllByCampaign/getById/add/update/delete`.
- Act main handlers are wired for `ACTS_GET_ALL_BY_ARC`, `ACTS_GET_ALL_BY_CAMPAIGN`, `ACTS_GET_BY_ID`, `ACTS_ADD`, `ACTS_UPDATE`, `ACTS_DELETE`, and `ACTS_MOVE_TO_ARC`.
- `ACTS_GET_ALL_BY_ARC` is scoped by `arc_id` and returns acts ordered by `sort_order ASC, id ASC`.
- `ACTS_GET_ALL_BY_CAMPAIGN` uses a JOIN across arcs to return all acts for a campaign ordered by arc sort_order then act sort_order.
- `ACTS_ADD` validates required trimmed `name`, appends to the sibling tail when `sort_order` is omitted, inserts (`arc_id`, `name`, `sort_order`), and returns the inserted row.
- `ACTS_MOVE_TO_ARC` moves an act to a new arc, appends at the tail of the new arc's sort order, resequences the old arc, and returns the updated act.
- Act preload bridge methods are wired via `window.db.acts.getAllByArc/getAllByCampaign/getById/add/update/delete/moveTo`.
- Session main handlers are wired for `SESSIONS_GET_ALL_BY_ACT`, `SESSIONS_GET_BY_ID`, `SESSIONS_ADD`, `SESSIONS_UPDATE`, `SESSIONS_DELETE`, and `SESSIONS_MOVE_TO_ACT`.
- `SESSIONS_GET_ALL_BY_ACT` is scoped by `act_id` and returns sessions ordered by `sort_order ASC, id ASC`.
- `SESSIONS_ADD` validates required trimmed `name`, appends to the sibling tail when `sort_order` is omitted (`MAX(sort_order) + 1` within the act), inserts (`act_id`, `name`, `notes`, `planned_at`, `sort_order`), and returns the inserted row.
- `SESSIONS_UPDATE` updates only explicitly provided fields (`name`, `notes`, `planned_at`, `sort_order`) using `hasOwnProperty` checks, validates trimmed `name` when present, always refreshes `updated_at`, and returns the refreshed row.
- `SESSIONS_DELETE` deletes by id, compacts remaining sibling `sort_order` values to contiguous numbering within `act_id`, and returns `{ id }` even when no row existed (idempotent no-op behavior).
- `SESSIONS_MOVE_TO_ACT` moves a session to a new act, appends at the tail of the new act's sort order, resequences the old act, and returns the updated session.
- Session preload bridge methods are wired via `window.db.sessions.getAllByAct/getById/add/update/delete/moveTo`.
- Scene main handlers are wired for `SCENES_GET_ALL_BY_CAMPAIGN`, `SCENES_GET_ALL_BY_SESSION`, `SCENES_GET_BY_ID`, `SCENES_ADD`, `SCENES_UPDATE`, `SCENES_DELETE`, and `SCENES_MOVE_TO_SESSION`.
- `SCENES_GET_ALL_BY_CAMPAIGN` joins `scenes -> sessions -> acts -> arcs`, filters by `arcs.campaign_id`, and returns deterministic hierarchy order (`arc.sort_order/id`, `act.sort_order/id`, `session.sort_order/id`, `scene.sort_order/id`).
- `SCENES_GET_ALL_BY_SESSION` is scoped by `session_id` and returns scenes ordered by `sort_order ASC, id ASC`.
- `SCENES_ADD` validates required trimmed `name`, validates optional `payload` as JSON text when provided, defaults omitted `payload` to `'{}'`, preserves backward-compatible payload shape while validating optional `payload.runtime.battlemap_id` as a positive integer or `null`, appends to the sibling tail when `sort_order` is omitted (`MAX(sort_order) + 1` within the session), inserts (`session_id`, `name`, `notes`, `payload`, `sort_order`), and returns the inserted row.
- `SCENES_UPDATE` updates only explicitly provided fields (`name`, `notes`, `payload`, `sort_order`) using `hasOwnProperty` checks, validates trimmed `name` when present, validates JSON `payload` when present with the same optional runtime linkage rule (`payload.runtime.battlemap_id`), always refreshes `updated_at`, and returns the refreshed row.
- `SCENES_DELETE` deletes by id, compacts remaining sibling `sort_order` values to contiguous numbering within `session_id`, and returns `{ id }` even when no row existed (idempotent no-op behavior).
- `SCENES_MOVE_TO_SESSION` runs inside a transaction, validates source scene + target session, returns unchanged row when target equals current `session_id`, appends moved scene to target tail (`MAX(sort_order) + 1`), resequences the old session, and returns the refreshed moved row.
- Scene preload bridge methods are wired end-to-end in Step 10 via `window.db.scenes.getAllBySession/getById/add/update/delete`, extended in Scenes Move Step 01 with `window.db.scenes.moveTo`, and extended in Campaign Scenes Index Step 01 with `window.db.scenes.getAllByCampaign`.
- Never hardcode channel strings; always import from `src/shared/ipcChannels.ts`.
