# Campaign / Arc / Act / Session / Scene Backbone

## Purpose

Extends the Verse Vault data hierarchy below the World layer with five tiers: Campaign, Arc, Act, Session, and Scene. Campaigns are standard CRUD records; arcs, acts, sessions, and scenes are sequence-driven records with persisted sibling ordering. It also adds a campaign-wide scenes index for cross-session scene browsing inside a campaign.

Session is a pure grouping mechanic under Act, not a required parent for Scene. Scenes and Sessions sit on the same navigational tier underneath Act: an Act row exposes both a `Sessions` link and a `Scenes` link. A Scene may be grouped into a Session, or left "stray" (attached directly to its Act with no Session) and moved between Acts/Sessions later. See `docs/adr/0001-scenes-ungrouped-from-sessions.md` for the decision record.

## Hierarchy Model

```
World
`-- Campaign   (belongs to one World)
    `-- Arc        (belongs to one Campaign; ordered within campaign)
        `-- Act        (belongs to one Arc; ordered within arc)
            |-- Session    (belongs to one Act; ordered within act)
            `-- Scene      (belongs to one Campaign always; optionally to an Act, optionally grouped into one of that Act's Sessions)
```

Foreign keys cascade on delete, so removing a parent removes all descendants. A Scene's `campaign_id` is its permanent anchor; `act_id` and `session_id` are independent, optional grouping fields (see Database section below for the sync invariant between them).

## Delivered Behavior

### Database

Five tables are defined in `src/database/db.ts`:

| Table       | Key Columns                                                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `campaigns` | `id`, `world_id` FK, `name`, `summary`, `config` (JSON text, default `{}`), `created_at`, `updated_at`                                                                                            |
| `arcs`      | `id`, `campaign_id` FK, `name`, `sort_order` (default 0), `created_at`, `updated_at`                                                                                                              |
| `acts`      | `id`, `arc_id` FK, `name`, `sort_order` (default 0), `created_at`, `updated_at`                                                                                                                   |
| `sessions`  | `id`, `act_id` FK, `name`, `notes`, `planned_at` (optional text), `sort_order` (default 0), `created_at`, `updated_at`                                                                            |
| `scenes`    | `id`, `campaign_id` FK (NOT NULL), `act_id` FK (nullable), `session_id` FK (nullable), `name`, `notes`, `payload` (JSON text, default `{}`), `sort_order` (default 0), `created_at`, `updated_at` |

All FKs use `ON DELETE CASCADE`.

Note: `sessions.campaign_id` (previous schema) was migrated to `sessions.act_id`. Existing sessions were assigned to auto-generated `Arc 1` / `Act 1` records per campaign.

Note: `sessions.planned_at` was added as a nullable `TEXT` column. Existing databases missing the column are migrated in place.

Note: `scenes.session_id` (previously `NOT NULL`) was migrated to nullable, and `campaign_id`/`act_id` were added (`runSceneAnchorMigration`). Existing scenes had `campaign_id`/`act_id` backfilled from their session's `act_id -> arc_id -> campaign_id` chain, so no existing scene changed grouping.

Invariant: a scene's `act_id` and `session_id` are independent columns, but whenever `session_id` is non-NULL, `act_id` is kept in sync with that session's `act_id` (enforced by the insert and move handlers, not a DB-level trigger). A "stray" scene has `act_id` set and `session_id` NULL. A scene with neither `act_id` nor `session_id` is representable in the schema (only `campaign_id` required) but is not reachable through any current UI/IPC creation path.

### IPC Channels

Thirty channels are used for this backbone in `src/shared/ipcChannels.ts`:

| Tier     | Channels                                                                                                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Campaign | `db:campaigns:getAllByWorld`, `db:campaigns:getById`, `db:campaigns:add`, `db:campaigns:update`, `db:campaigns:delete`                                                                  |
| Arc      | `db:arcs:getAllByCampaign`, `db:arcs:getById`, `db:arcs:add`, `db:arcs:update`, `db:arcs:delete`                                                                                        |
| Act      | `db:acts:getAllByArc`, `db:acts:getAllByCampaign`, `db:acts:getById`, `db:acts:add`, `db:acts:update`, `db:acts:delete`                                                                 |
| Session  | `db:sessions:getAllByAct`, `db:sessions:getById`, `db:sessions:add`, `db:sessions:update`, `db:sessions:delete`, `db:sessions:moveToAct`                                                |
| Scene    | `db:scenes:getAllByCampaign`, `db:scenes:getAllByAct`, `db:scenes:getAllBySession`, `db:scenes:getById`, `db:scenes:add`, `db:scenes:update`, `db:scenes:delete`, `db:scenes:moveToAct` |
| Reparent | `db:acts:moveToArc`                                                                                                                                                                     |

Note: `db:acts:getAllByCampaign` is a convenience channel for `MoveSessionDialog` and `MoveSceneDialog` - it returns all acts across all arcs in a campaign ordered by `arc.sort_order, arc.id, act.sort_order, act.id`.

Note: `db:scenes:getAllByCampaign` is a campaign-level read used by `CampaignScenesPage` - it `LEFT JOIN`s `scenes -> sessions`, `scenes -> acts -> arcs` (session/act/arc are all optional), filters by `scenes.campaign_id`, and orders rows by `arc/act/session/scene sort_order` with `id` tie-breakers. `session_name`, `act_name`, `arc_id`, `arc_name` are nullable in the result.

Note: `db:scenes:getAllByAct` returns every scene anchored to an act (`WHERE scenes.act_id = ?`), regardless of whether each scene is grouped into a session or stray - used by `ActScenesPage`.

### Main-Process Handler Semantics (`src/main.ts`)

- Campaign list reads are ordered by `updated_at DESC`.
- Arc, act, session, and scene list reads are ordered by `sort_order ASC, id ASC`.
- Campaign scenes index reads return `CampaignSceneListItem[]` `LEFT JOIN`ed across `scenes -> sessions`, `scenes -> acts -> arcs`, filtered by `scenes.campaign_id`, ordered by hierarchy sort order (`arc`, `act`, `session`, `scene`) and `id`.
- Arc and act create append to sibling tail when `sort_order` is omitted (`MAX(sort_order) + 1` in parent scope).
- Session create appends to sibling tail (scoped by `act_id`) when `sort_order` is omitted.
- Scene create appends to sibling tail when `sort_order` is omitted, scoped by `session_id` when grouped, or by `(act_id, session_id IS NULL)` when stray.
- Scene create (`db:scenes:add`) accepts `{ act_id?, session_id?, name, notes?, payload?, sort_order? }`. If `session_id` is given, the target session's `act_id` is looked up and used as the scene's `act_id` (overriding/ignoring any caller-supplied `act_id`) to keep the two in sync; the scene's `campaign_id` is derived from that act's arc. If only `act_id` is given, `campaign_id` is derived from that act's arc and the scene is stray (`session_id` NULL). Missing both throws `Scene requires an act_id or session_id`.
- Arc and act update accept partial `sort_order` updates and refresh `updated_at`.
- Session and scene update accept partial `sort_order` updates and refresh `updated_at`. Scene update never changes `act_id`/`session_id` (use `db:scenes:moveToAct` to reparent).
- Session create/update payloads support optional `planned_at` (`string | null`) and persist it to `sessions.planned_at`.
- Arc and act delete compact sibling order to contiguous `0..N-1` in parent scope.
- Session delete compacts sibling order (scoped by `act_id`) to contiguous `0..N-1`. Scene delete compacts sibling order scoped by `session_id` (if grouped) or `(act_id, session_id IS NULL)` (if stray).
- Session handlers are scoped by `act_id` (not `campaign_id`).
- `db:sessions:moveToAct(sessionId, newActId)` runs as an atomic transaction: move session to target-act tail, resequence the old act, return updated session.
- `db:scenes:moveToAct(sceneId, newActId, newSessionId | null)` runs as an atomic transaction: validate the source scene and target act exist; if `newSessionId` is given, validate the target session exists and belongs to `newActId` (else throws `Target session does not belong to the target act`); returns the scene unchanged when both act and session are unchanged; otherwise moves the scene to the target group's tail (scoped by `session_id` if grouped, else `(act_id, session_id IS NULL)`), resequences the old group to contiguous `0..N-1`, and updates `campaign_id`/`act_id`/`session_id` together.
- `db:acts:moveToArc(actId, newArcId)` runs as an atomic transaction: move act to target-arc tail, resequence the old arc, return updated act.
- Delete handlers remain idempotent (`{ id }` is returned even when the row is already absent).

### Preload Bridge and Types

Renderer access stays behind `window.db` (`src/preload.ts`, `forge.env.d.ts`):

- `window.db.campaigns.{ getAllByWorld, getById, add, update, delete }`
- `window.db.arcs.{ getAllByCampaign, getById, add, update, delete }`
- `window.db.acts.{ getAllByArc, getAllByCampaign, getById, add, update, delete, moveTo }`
- `window.db.sessions.{ getAllByAct, getById, add, update, delete, moveTo }`
- `window.db.scenes.{ getAllByCampaign, getAllByAct, getAllBySession, getById, add, update, delete, moveTo }`
- Session contract includes `planned_at: string | null`; `window.db.sessions.add/update` accept optional `planned_at?: string | null`.
- Scene contract: `{ id, campaign_id, act_id: number | null, session_id: number | null, name, notes, payload, sort_order, created_at, updated_at }`. `window.db.scenes.add` accepts `{ act_id?, session_id?, name, notes?, payload?, sort_order? }`. `window.db.scenes.moveTo(sceneId, newActId, newSessionId: number | null)` replaces the old session-only move.
- Campaign scenes index contract: `window.db.scenes.getAllByCampaign(campaignId)` returns `CampaignSceneListItem[]` (`Scene` fields plus nullable `session_name`, `act_name`, `arc_id`, `arc_name`).
- Act scenes contract: `window.db.scenes.getAllByAct(actId)` returns `Scene[]` for every scene anchored to that act (grouped + stray).

### Renderer Routes and Pages

| Route                                                                             | Page                 | Behavior                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/world/:id/campaigns`                                                            | `CampaignsPage`      | Lists campaigns for a world; create/edit/delete; `Scenes` link opens campaign-wide scenes index; `Arcs` link drills down                                                                                                                                                                                                       |
| `/world/:id/campaign/:campaignId/scenes`                                          | `CampaignScenesPage` | Campaign-wide scenes index (read-only): validates world + campaign, loads campaign metadata + all scenes via `window.db.scenes.getAllByCampaign`, shows `Scene/Session/Act/Arc` columns (`-` when a scene has no session/act/arc), and links each row to session-scoped or act-scoped scenes depending on whether it's grouped |
| `/world/:id/campaign/:campaignId/arcs`                                            | `ArcsPage`           | Lists arcs ordered by `sort_order`; dnd-kit reorder; create/edit/delete; `Acts` link                                                                                                                                                                                                                                           |
| `/world/:id/campaign/:campaignId/arc/:arcId/acts`                                 | `ActsPage`           | Lists acts ordered by `sort_order`; dnd-kit reorder; create/edit/delete; `Sessions` link and `Scenes` link (same UX tier); move action opens `MoveActDialog`                                                                                                                                                                   |
| `/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/sessions`                  | `SessionsPage`       | Lists sessions ordered by `sort_order`; includes planned date-time column (localized display, `-` when missing); dnd-kit reorder; create/edit/delete; `Scenes` link; move action opens `MoveSessionDialog`                                                                                                                     |
| `/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/scenes`                    | `ActScenesPage`      | Lists every scene anchored to the act, grouped into a "Stray Scenes" section plus one section per session (no drag-reorder, since groups are heterogeneous); create makes a stray scene; move opens the cascading `MoveSceneDialog`                                                                                            |
| `/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/session/:sessionId/scenes` | `ScenesPage`         | Lists scenes ordered by `sort_order`; dnd-kit reorder; create/edit/delete; payload JSON validation                                                                                                                                                                                                                             |

## Campaign-Wide Scenes Index (v1)

- Update (2026-03-03): Added campaign-level scenes index route and bridge contract.
- WCAASS relationship: this index is a top-down read view of `Campaign -> Arc -> Act -> Session -> Scene`.
- Purpose: provide one campaign page to review all scenes with session/act/arc context before drilling into session-level scene management.
- User flow entry point: from `CampaignsPage`, click `Scenes` on a campaign row (`/world/:id/campaigns` -> `/world/:id/campaign/:campaignId/scenes`).
- Data source/contract summary: `CampaignScenesPage` calls `window.db.scenes.getAllByCampaign(campaignId)` which maps to `db:scenes:getAllByCampaign` in main and returns `CampaignSceneListItem[]`.
- Current v1 limitations/non-goals:
  - read-only index (no create/edit/delete/reorder/move actions on the campaign index page),
  - no search/filter/pagination,
  - navigation into editing remains session-scoped via `Open Session Scenes`.

## Sequence-Driven Ordering

- Arc, act, session, and scene sequence is parent-scoped and persisted in `sort_order`.
- Each ordered tier renders rows in `sort_order ASC, id ASC`.
- The visible `Order` column displays contiguous human-facing numbers (`1..N`), derived from sorted rows.
- Stored `sort_order` stays zero-based (`0..N-1`).

## dnd-kit Reorder Behavior

- Arc, act, session, and scene tables (`ArcsPage`, `ActsPage`, `SessionsPage`, `ScenesPage`) use dnd-kit sortable rows (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`).
- Reorder is row-internal via drag handle in the `Order` column.
- Pointer and keyboard sensors are enabled with the same pattern across all four tiers.
- Reorder is in-table only; there is no drag-and-drop cross-parent reparent.
- `ActScenesPage` does not support drag-reorder: it mixes a "Stray Scenes" group with one group per session, and dragging across heterogeneous groups would be ambiguous (would it also reparent the scene?). Reordering scenes within one session still happens on the session-scoped `ScenesPage`.

## Reparenting

Reparent operations are atomic transactions in the main process.

### Scene -> different Act, optionally into a Session ("Move...")

- Available from each scene row in `ScenesPage` and `ActScenesPage`.
- Opens `MoveSceneDialog`: a two-step cascading picker — pick a target Act (grouped by arc, any act including the current one), then optionally pick a Session within that act (or "No session (stray)"). Defaults to the scene's current act/session; the Move button is disabled until a real change is selected.
- On confirm: `db:scenes:moveToAct(sceneId, newActId, newSessionId | null)` validates the target act (and target session, if given) exist and that the target session belongs to the target act, moves the scene to the target group's tail, and resequences the old group to contiguous order (`0..N-1`).
- On `ScenesPage` (session-scoped), any successful move removes the scene from the current list. On `ActScenesPage` (act-scoped), a move that keeps the same act just regroups the scene in place (moves it between the stray section and a session section); only a move to a _different_ act removes it from the current list.
- Child entities are not affected because Scene is the leaf tier.

### Session -> different Act ("Move to Act...")

- Available from each session row in `SessionsPage`.
- Opens `MoveSessionDialog`: lists all acts across all arcs in the campaign, grouped by arc. The current act is excluded.
- On confirm: `db:sessions:moveToAct(sessionId, newActId)` moves the session to the tail of the target act and resequences the old act. The session disappears from the current `SessionsPage` list.
- Child scenes continue to follow the moved session through `session_id`.

### Act -> different Arc ("Move to Arc...")

- Available from each act row in `ActsPage`.
- Opens `MoveActDialog`: lists all arcs in the campaign. The current arc is excluded.
- On confirm: `db:acts:moveToArc(actId, newArcId)` moves the act to the tail of the target arc and resequences the old arc. The act disappears from the current `ActsPage` list.
- Child sessions and scenes remain attached through the moved act.

## Reorder Persistence and Failure Handling

- Reorder is optimistic in the renderer: UI order updates immediately after drop.
- Only rows whose `sort_order` changed are persisted.
- Persistence uses existing update APIs per row:
  - `window.db.arcs.update(id, { sort_order })`
  - `window.db.acts.update(id, { sort_order })`
  - `window.db.sessions.update(id, { sort_order })`
  - `window.db.scenes.update(id, { sort_order })`
- On persistence failure:
  - an inline error message is shown,
  - canonical order is reloaded from backend,
  - if reload also fails, UI falls back to the pre-drag snapshot.

## Validation and Error Rules

- `name`: required, trimmed; blank blocked in both renderer and main handlers.
- `summary` / `notes`: optional; empty string maps to `null` in forms.
- `planned_at` (Session): optional; renderer uses `datetime-local` input and submits `null` when blank.
- `planned_at` (Session): main handlers accept `string | null` and do not enforce a strict datetime format.
- `payload` (Scene): must be valid JSON when provided; empty form input defaults to `'{}'`.

## Tests

- `tests/unit/ArcsPage.test.tsx`, `tests/unit/ActsPage.test.tsx`, `tests/unit/MoveActDialog.test.tsx` — arc/act page rendering, reorder, reparent dialog, and the act row's `Scenes` link.
- `tests/unit/ipc/registerArcHandlers.test.ts`, `tests/unit/ipc/registerActHandlers.test.ts`, `tests/unit/ipc/registerSceneHandlers.test.ts` — main-process handler semantics for arcs/acts/scenes, including act-anchor creation, `getAllByAct`, and the unified `moveToAct` reparent.
- `tests/unit/renderer/campaignForm.test.tsx`, `campaignsPage.test.tsx`, `campaignScenesPage.test.tsx` — campaign CRUD and campaign-wide scenes index, including nullable session/act/arc rendering and the act-scoped vs. session-scoped "Open ... Scenes" link.
- `tests/unit/renderer/sessionForm.test.tsx`, `sessionsPage.test.tsx` — session CRUD, `planned_at` handling.
- `tests/unit/renderer/sceneForm.test.tsx`, `scenesPage.test.tsx`, `tests/unit/renderer/actScenesPage.test.tsx` — scene CRUD, payload JSON validation, stray creation, grouped-vs-stray display, and reparenting.
- `tests/unit/MoveSceneDialog.test.tsx` — cascading act-then-session picker, stray option, disabled/no-op state.
- `tests/unit/database/db.test.ts` — scene anchor migration (`runSceneAnchorMigration`) backfill and skip-when-already-migrated behavior.
- `tests/e2e/arc-act.test.ts` — serial end-to-end flow across world → campaign → arc → act → session.
- `tests/e2e/narrative-chain.test.ts` — cross-act scene reparenting via the real database.

## Known Limits and Non-Goals

- Scene runtime/execution engine (playback, branching) is not implemented.
- Prompt templating or LLM workflow integration is not implemented.
- Multi-select or bulk reparenting is not implemented.
- Drag-and-drop cross-level reparenting is not implemented (dialog only).
- Undo/redo for reorder or reparent operations is not implemented.
- Collaboration/conflict resolution is not implemented.
- Reorder persistence is multiple per-row updates, not a single atomic batch IPC call.
- No undo stack for reorder or reparent operations.
- A scene with neither `act_id` nor `session_id` (only `campaign_id`) is representable in the schema but not creatable through any current UI/IPC path.
- `ActScenesPage` has no drag-reorder; reordering a session's scenes still requires the session-scoped `ScenesPage`.
- Campaign rows still use `updated_at DESC`; sequence semantics apply only to arcs, acts, sessions, and scenes.
- `config` (Campaign) and `payload` (Scene) are stored as JSON text without schema-level domain validation.
- `sessions.planned_at` is stored as SQLite `TEXT` with no schema-level timezone/format constraint.
- Planned date-time display is locale-dependent (`Intl.DateTimeFormat`) and invalid stored values render as raw text.
- There is no route below scene level.

## Possible Next Extensions

- Add dedicated batch reorder IPC handlers for transactional sibling updates.
- Add campaign `config` editing UI.
- Add scene detail/editor page for structured `payload` editing.
- Add pagination and/or search at any tier.
- Add arc-level or act-level notes/description fields.
