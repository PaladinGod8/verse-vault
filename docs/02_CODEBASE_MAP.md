# Codebase Map

This document is a current-state map for agents and maintainers. The tables below are generated from code-adjacent sources; update the source files and rerun `yarn docs:generate` instead of hand-editing generated rows.

## What Stays Human-Written

- Feature intent and user-visible behavior belong in `docs/features/*.md`.
- Architecture rationale belongs in `docs/01_ARCHITECTURE.md` and ADRs.
- This file stays short on purpose: use it to find the seam, not to narrate project history.

## Landmarks

<!-- BEGIN GENERATED LANDMARKS -->

| Path                                        | Role                      | Owns                                                                  | Seam                                                                     | Calls                                                                  |
| ------------------------------------------- | ------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `src/main.ts`                               | Main bootstrap entrypoint | BrowserWindow startup, protocol registration, and registrar wiring    | Main process entrypoint for preload and database adapters                | getDatabase, closeDatabase, and register*Handlers modules              |
| `src/preload.ts`                            | Renderer bridge adapter   | The full window.db surface exposed to renderer code                   | Main-to-renderer IPC contract via contextBridge                          | ipcRenderer.invoke and shared IPC constants only                       |
| `src/database/db.ts`                        | SQLite repository hub     | Schema initialization, migrations, and database-backed domain helpers | Main-process persistence adapter consumed by IPC registrars              | better-sqlite3 statements, transactions, and migration helpers         |
| `src/renderer/App.tsx`                      | Renderer route map        | Top-level route-to-page wiring and shared UI providers                | Renderer navigation entrypoint for feature pages                         | React Router Route definitions and ToastProvider                       |
| `src/shared/ipcChannels.ts`                 | IPC constant registry     | Channel names shared across main, preload, docs, and tests            | Stable channel-key source of truth for the IPC contract                  | No runtime dependencies beyond consumers importing IPC                 |
| `src/shared/ipcCatalog.ts`                  | IPC metadata catalog      | Doc-generation and guard metadata for every registered IPC channel    | Shared mapping between IPC constants, preload bridges, and handler files | Shared IPC constants only                                              |
| `src/shared/contracts/dbApi.ts`             | Renderer-facing contract  | The typed window.db surface and its method inventory metadata         | Shared preload contract consumed by ambient typing, docs, and guards     | Shared domain row and payload types only                               |
| `forge.env.d.ts`                            | Ambient type adapter      | Global compatibility aliases and Window.db ambient declarations       | Renderer TypeScript ambient bridge to the shared contract modules        | Shared contract type modules and Forge/Vite ambient declarations       |
| `src/main/ipc/registerAbilityHandlers.ts`   | Ability IPC registrar     | Ability CRUD and relationship channel handlers                        | Main-process adapter for ability IPC requests                            | SQLite statements plus shared validation helpers                       |
| `src/main/ipc/registerActHandlers.ts`       | Act IPC registrar         | Act CRUD and reparenting channel handlers                             | Main-process adapter for act IPC requests                                | SQLite statements and sort-order resequencing helpers                  |
| `src/main/ipc/registerArcHandlers.ts`       | Arc IPC registrar         | Arc CRUD channel handlers and sibling resequencing                    | Main-process adapter for arc IPC requests                                | SQLite statements and transactional ordering helpers                   |
| `src/main/ipc/registerBattleMapHandlers.ts` | BattleMap IPC registrar   | BattleMap CRUD channel handlers and runtime config validation         | Main-process adapter for battlemap IPC requests                          | SQLite statements and shared JSON validation helpers                   |
| `src/main/ipc/registerCampaignHandlers.ts`  | Campaign IPC registrar    | Campaign CRUD channel handlers                                        | Main-process adapter for campaign IPC requests                           | SQLite statements and partial-update helpers                           |
| `src/main/ipc/registerLevelHandlers.ts`     | Level IPC registrar       | Level CRUD channel handlers                                           | Main-process adapter for level IPC requests                              | SQLite statements and trimmed-field validation                         |
| `src/main/ipc/registerSceneHandlers.ts`     | Scene IPC registrar       | Scene CRUD, campaign index, and move channel handlers                 | Main-process adapter for scene IPC requests                              | SQLite statements, payload validation, and resequencing helpers        |
| `src/main/ipc/registerSessionHandlers.ts`   | Session IPC registrar     | Session CRUD, campaign index, and move channel handlers               | Main-process adapter for session IPC requests                            | SQLite statements and resequencing helpers                             |
| `src/main/ipc/registerStatBlockHandlers.ts` | StatBlock IPC registrar   | StatBlock CRUD, linkage, and assignment channel handlers              | Main-process adapter for statblock IPC requests                          | SQLite statements and statblock validation helpers                     |
| `src/main/ipc/registerTokenHandlers.ts`     | Token IPC registrar       | Token CRUD, moves, and image import channel handlers                  | Main-process adapter for token IPC requests                              | SQLite statements, token db helpers, and filesystem persistence        |
| `src/main/ipc/registerVerseHandlers.ts`     | Verse IPC registrar       | Verse CRUD channel handlers                                           | Main-process adapter for verse IPC requests                              | SQLite statements only                                                 |
| `src/main/ipc/registerWorldHandlers.ts`     | World IPC registrar       | World CRUD, viewed-state, and image import channel handlers           | Main-process adapter for world IPC requests                              | SQLite statements, filesystem persistence, and shared image validation |

<!-- END GENERATED LANDMARKS -->

## Routes

<!-- BEGIN GENERATED ROUTES -->

| Route                                                                             | Page                        | File                                               |
| --------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------- |
| `/`                                                                               | `WorldsHomePage`            | `src/renderer/pages/WorldsHomePage.tsx`            |
| `/settings`                                                                       | `SettingsPage`              | `src/renderer/pages/SettingsPage.tsx`              |
| `/world/:id`                                                                      | `WorldPage`                 | `src/renderer/pages/WorldPage.tsx`                 |
| `/world/:id/levels`                                                               | `LevelsPage`                | `src/renderer/pages/LevelsPage.tsx`                |
| `/world/:id/abilities`                                                            | `AbilitiesPage`             | `src/renderer/pages/AbilitiesPage.tsx`             |
| `/world/:id/campaigns`                                                            | `CampaignsPage`             | `src/renderer/pages/CampaignsPage.tsx`             |
| `/world/:id/battlemaps`                                                           | `BattleMapsPage`            | `src/renderer/pages/BattleMapsPage.tsx`            |
| `/world/:id/tokens`                                                               | `TokensPage`                | `src/renderer/pages/TokensPage.tsx`                |
| `/world/:id/statblocks`                                                           | `StatBlocksPage`            | `src/renderer/pages/StatBlocksPage.tsx`            |
| `/world/:id/characters`                                                           | `CharactersPage`            | `src/renderer/pages/CharactersPage.tsx`            |
| `/world/:id/characters/:characterId`                                              | `CharacterDetailPage`       | `src/renderer/pages/CharacterDetailPage.tsx`       |
| `/world/:id/factions`                                                             | `FactionsPage`              | `src/renderer/pages/FactionsPage.tsx`              |
| `/world/:id/factions/:factionId`                                                  | `FactionDetailPage`         | `src/renderer/pages/FactionDetailPage.tsx`         |
| `/world/:id/statistics`                                                           | `WorldStatisticsConfigPage` | `src/renderer/pages/WorldStatisticsConfigPage.tsx` |
| `/world/:id/battlemaps/:battleMapId/runtime`                                      | `BattleMapRuntimePage`      | `src/renderer/pages/BattleMapRuntimePage.tsx`      |
| `/world/:id/campaign/:campaignId/scenes`                                          | `CampaignScenesPage`        | `src/renderer/pages/CampaignScenesPage.tsx`        |
| `/world/:id/campaign/:campaignId/arcs`                                            | `ArcsPage`                  | `src/renderer/pages/ArcsPage.tsx`                  |
| `/world/:id/campaign/:campaignId/arc/:arcId/acts`                                 | `ActsPage`                  | `src/renderer/pages/ActsPage.tsx`                  |
| `/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/sessions`                  | `SessionsPage`              | `src/renderer/pages/SessionsPage.tsx`              |
| `/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/session/:sessionId/scenes` | `ScenesPage`                | `src/renderer/pages/ScenesPage.tsx`                |

<!-- END GENERATED ROUTES -->

## IPC Registrars

<!-- BEGIN GENERATED REGISTRARS -->

| Handler                                                 | Domains                | Channels |
| ------------------------------------------------------- | ---------------------- | -------- |
| `src/main/ipc/registerVerseHandlers.ts`                 | verses                 | 4        |
| `src/main/ipc/registerWorldHandlers.ts`                 | worlds                 | 7        |
| `src/main/ipc/registerLevelHandlers.ts`                 | levels                 | 5        |
| `src/main/ipc/registerAbilityHandlers.ts`               | abilities              | 8        |
| `src/main/ipc/registerCampaignHandlers.ts`              | campaigns              | 5        |
| `src/main/ipc/registerBattleMapHandlers.ts`             | battlemaps             | 5        |
| `src/main/ipc/registerTokenHandlers.ts`                 | tokens                 | 9        |
| `src/main/ipc/registerArcHandlers.ts`                   | arcs                   | 5        |
| `src/main/ipc/registerActHandlers.ts`                   | acts                   | 7        |
| `src/main/ipc/registerSessionHandlers.ts`               | sessions               | 7        |
| `src/main/ipc/registerSceneHandlers.ts`                 | scenes                 | 7        |
| `src/main/ipc/registerStatBlockHandlers.ts`             | statblocks             | 13       |
| `src/main/ipc/registerCharacterHandlers.ts`             | characters             | 8        |
| `src/main/ipc/registerFactionHandlers.ts`               | factions               | 7        |
| `src/main/ipc/registerFactionTypeHandlers.ts`           | factionTypes           | 4        |
| `src/main/ipc/registerFactionMemberHandlers.ts`         | factionMembers         | 5        |
| `src/main/ipc/registerCharacterRelationshipHandlers.ts` | characterRelationships | 4        |
| `src/main/ipc/registerFactionRelationshipHandlers.ts`   | factionRelationships   | 4        |
| `src/main/ipc/registerSettingsHandlers.ts`              | settings               | 2        |

<!-- END GENERATED REGISTRARS -->
