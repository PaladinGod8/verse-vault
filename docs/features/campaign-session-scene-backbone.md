# Campaign / Arc / Act / Session / Scene Backbone

## Purpose

Extends the Verse Vault data hierarchy below the World layer with five tiers: Campaign, Arc, Act, Session, and Scene. Campaigns are standard CRUD records; arcs, acts, sessions, and scenes are sequence-driven records with persisted sibling ordering.

## Hierarchy Model

```
World
`-- Campaign   (belongs to one World)
    `-- Arc        (belongs to one Campaign; ordered within campaign)
        `-- Act        (belongs to one Arc; ordered within arc)
            `-- Session    (belongs to one Act; ordered within act)
                `-- Scene      (belongs to one Session; ordered within session)
```

Foreign keys cascade on delete, so removing a parent removes all descendants.

## Delivered Behavior

### Database

Five tables are defined in `src/database/db.ts`:

| Table       | Key Columns                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `campaigns` | `id`, `world_id` FK, `name`, `summary`, `config` (JSON text, default `{}`), `created_at`, `updated_at`                            |
| `arcs`      | `id`, `campaign_id` FK, `name`, `sort_order` (default 0), `created_at`, `updated_at`                                              |
| `acts`      | `id`, `arc_id` FK, `name`, `sort_order` (default 0), `created_at`, `updated_at`                                                   |
| `sessions`  | `id`, `act_id` FK, `name`, `notes`, `sort_order` (default 0), `created_at`, `updated_at`                                          |
| `scenes`    | `id`, `session_id` FK, `name`, `notes`, `payload` (JSON text, default `{}`), `sort_order` (default 0), `created_at`, `updated_at` |

All FKs use `ON DELETE CASCADE`.

Note: `sessions.campaign_id` (previous schema) was migrated to `sessions.act_id`. Existing sessions were assigned to auto-generated `Arc 1` / `Act 1` records per campaign.

### IPC Channels

Twenty-eight channels are used for this backbone in `src/shared/ipcChannels.ts`:

| Tier     | Channels                                                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Campaign | `db:campaigns:getAllByWorld`, `db:campaigns:getById`, `db:campaigns:add`, `db:campaigns:update`, `db:campaigns:delete`                   |
| Arc      | `db:arcs:getAllByCampaign`, `db:arcs:getById`, `db:arcs:add`, `db:arcs:update`, `db:arcs:delete`                                         |
| Act      | `db:acts:getAllByArc`, `db:acts:getAllByCampaign`, `db:acts:getById`, `db:acts:add`, `db:acts:update`, `db:acts:delete`                  |
| Session  | `db:sessions:getAllByAct`, `db:sessions:getById`, `db:sessions:add`, `db:sessions:update`, `db:sessions:delete`, `db:sessions:moveToAct` |
| Scene    | `db:scenes:getAllBySession`, `db:scenes:getById`, `db:scenes:add`, `db:scenes:update`, `db:scenes:delete`                                |
| Reparent | `db:acts:moveToArc`                                                                                                                      |

Note: `db:acts:getAllByCampaign` is a convenience channel for `MoveSessionDialog` - it returns all acts across all arcs in a campaign ordered by `arc.sort_order, arc.id, act.sort_order, act.id`.

### Main-Process Handler Semantics (`src/main.ts`)

- Campaign list reads are ordered by `updated_at DESC`.
- Arc, act, session, and scene list reads are ordered by `sort_order ASC, id ASC`.
- Arc and act create append to sibling tail when `sort_order` is omitted (`MAX(sort_order) + 1` in parent scope).
- Session and scene create append to sibling tail when `sort_order` is omitted (`MAX(sort_order) + 1` in parent scope).
- Arc and act update accept partial `sort_order` updates and refresh `updated_at`.
- Session and scene update accept partial `sort_order` updates and refresh `updated_at`.
- Arc and act delete compact sibling order to contiguous `0..N-1` in parent scope.
- Session and scene delete compact sibling order to contiguous `0..N-1` in parent scope.
- Session handlers are scoped by `act_id` (not `campaign_id`).
- `db:sessions:moveToAct(sessionId, newActId)` runs as an atomic transaction: move session to target-act tail, resequence the old act, return updated session.
- `db:acts:moveToArc(actId, newArcId)` runs as an atomic transaction: move act to target-arc tail, resequence the old arc, return updated act.
- Delete handlers remain idempotent (`{ id }` is returned even when the row is already absent).

### Preload Bridge and Types

Renderer access stays behind `window.db` (`src/preload.ts`, `forge.env.d.ts`):

- `window.db.campaigns.{ getAllByWorld, getById, add, update, delete }`
- `window.db.arcs.{ getAllByCampaign, getById, add, update, delete }`
- `window.db.acts.{ getAllByArc, getAllByCampaign, getById, add, update, delete, moveTo }`
- `window.db.sessions.{ getAllByAct, getById, add, update, delete, moveTo }`
- `window.db.scenes.{ getAllBySession, getById, add, update, delete }`

### Renderer Routes and Pages

| Route                                                                             | Page            | Behavior                                                                                                                          |
| --------------------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `/world/:id/campaigns`                                                            | `CampaignsPage` | Lists campaigns for a world; create/edit/delete; `Arcs` link drills down                                                          |
| `/world/:id/campaign/:campaignId/arcs`                                            | `ArcsPage`      | Lists arcs ordered by `sort_order`; dnd-kit reorder; create/edit/delete; `Acts` link                                              |
| `/world/:id/campaign/:campaignId/arc/:arcId/acts`                                 | `ActsPage`      | Lists acts ordered by `sort_order`; dnd-kit reorder; create/edit/delete; `Sessions` link; move action opens `MoveActDialog`       |
| `/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/sessions`                  | `SessionsPage`  | Lists sessions ordered by `sort_order`; dnd-kit reorder; create/edit/delete; `Scenes` link; move action opens `MoveSessionDialog` |
| `/world/:id/campaign/:campaignId/arc/:arcId/act/:actId/session/:sessionId/scenes` | `ScenesPage`    | Lists scenes ordered by `sort_order`; dnd-kit reorder; create/edit/delete; payload JSON validation                                |

## Sequence-Driven Ordering

- Arc, act, session, and scene sequence is parent-scoped and persisted in `sort_order`.
- Each ordered tier renders rows in `sort_order ASC, id ASC`.
- The visible `Order` column displays contiguous human-facing numbers (`1..N`), derived from sorted rows.
- Stored `sort_order` stays zero-based (`0..N-1`).

## dnd-kit Reorder Behavior

- Arc, act, session, and scene tables use dnd-kit sortable rows (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`).
- Reorder is row-internal via drag handle in the `Order` column.
- Pointer and keyboard sensors are enabled with the same pattern across all four tiers.
- Reorder is in-table only; there is no drag-and-drop cross-parent reparent.

## Reparenting

Two reparent operations are supported. Both are atomic transactions in the main process.

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

## Validation

- `name`: required, trimmed; blank blocked in both renderer and main handlers.
- `summary` / `notes`: optional; empty string maps to `null` in forms.
- `payload` (Scene): must be valid JSON when provided; empty form input defaults to `'{}'`.

## Non-Goals

- Scene runtime/execution engine (playback, branching).
- Prompt templating or LLM workflow integration.
- Cross-parent reparenting for scenes (scene -> different session).
- Multi-select or bulk reparenting.
- Drag-and-drop cross-level reparenting (dialog only).
- Undo/redo for reorder or reparent operations.
- Collaboration/conflict resolution.

## Known Limits

- Reorder persistence is multiple per-row updates, not a single atomic batch IPC call.
- No undo stack for reorder or reparent operations.
- Campaign rows still use `updated_at DESC`; sequence semantics apply only to arcs, acts, sessions, and scenes.
- `config` (Campaign) and `payload` (Scene) are stored as JSON text without schema-level domain validation.
- There is no route below scene level.

## Possible Next Extensions

- Add dedicated batch reorder IPC handlers for transactional sibling updates.
- Add campaign `config` editing UI.
- Add scene detail/editor page for structured `payload` editing.
- Add pagination and/or search at any tier.
- Add arc-level or act-level notes/description fields.
