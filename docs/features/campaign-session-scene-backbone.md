# Campaign / Session / Scene Backbone

## Purpose

Extends the Verse Vault data hierarchy below the World layer with three tiers: Campaign, Session, and Scene. Campaigns are standard CRUD records; sessions and scenes are sequence-driven records with persisted sibling ordering.

## Hierarchy Model

```
World
`-- Campaign   (belongs to one World)
    `-- Session    (belongs to one Campaign; ordered within campaign)
        `-- Scene      (belongs to one Session; ordered within session)
```

Foreign keys cascade on delete, so removing a parent removes all descendants.

## Delivered Behavior

### Database

Three tables are defined in `src/database/db.ts`:

| Table       | Key Columns                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `campaigns` | `id`, `world_id` FK, `name`, `summary`, `config` (JSON text, default `{}`), `created_at`, `updated_at`                            |
| `sessions`  | `id`, `campaign_id` FK, `name`, `notes`, `sort_order` (default 0), `created_at`, `updated_at`                                     |
| `scenes`    | `id`, `session_id` FK, `name`, `notes`, `payload` (JSON text, default `{}`), `sort_order` (default 0), `created_at`, `updated_at` |

All FKs use `ON DELETE CASCADE`.

### IPC Channels

Fifteen channels are defined in `src/shared/ipcChannels.ts`:

| Tier     | Channels                                                                                                               |
| -------- | ---------------------------------------------------------------------------------------------------------------------- |
| Campaign | `db:campaigns:getAllByWorld`, `db:campaigns:getById`, `db:campaigns:add`, `db:campaigns:update`, `db:campaigns:delete` |
| Session  | `db:sessions:getAllByCampaign`, `db:sessions:getById`, `db:sessions:add`, `db:sessions:update`, `db:sessions:delete`   |
| Scene    | `db:scenes:getAllBySession`, `db:scenes:getById`, `db:scenes:add`, `db:scenes:update`, `db:scenes:delete`              |

### Main-Process Handler Semantics (`src/main.ts`)

- Campaign list reads are ordered by `updated_at DESC`.
- Session and scene list reads are ordered by `sort_order ASC, id ASC`.
- Session/scene create appends to sibling tail when `sort_order` is omitted (`MAX(sort_order) + 1` in parent scope).
- Session/scene update accepts partial `sort_order` updates and refreshes `updated_at`.
- Session/scene delete compacts sibling order to contiguous `0..N-1` in parent scope.
- Delete remains idempotent (`{ id }` is returned even if the row was already absent).

### Preload Bridge and Types

Renderer access stays behind `window.db` (`src/preload.ts`, `forge.env.d.ts`):

- `window.db.campaigns.{ getAllByWorld, getById, add, update, delete }`
- `window.db.sessions.{ getAllByCampaign, getById, add, update, delete }`
- `window.db.scenes.{ getAllBySession, getById, add, update, delete }`

### Renderer Routes and Pages

| Route                                                       | Page            | Behavior                                                                                                                                                                                                                               |
| ----------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/world/:id/campaigns`                                      | `CampaignsPage` | Lists campaigns for a world; create/edit modal (name required, summary optional); delete with confirmation; "Sessions" link drills down                                                                                                |
| `/world/:id/campaign/:campaignId/sessions`                  | `SessionsPage`  | Lists sessions ordered by `sort_order`; shows visible order numbers; create/edit/delete; dnd-kit row reorder persisted through `sessions.update(..., { sort_order })`; "Scenes" link drills down                                       |
| `/world/:id/campaign/:campaignId/session/:sessionId/scenes` | `ScenesPage`    | Lists scenes ordered by `sort_order`; shows visible order numbers; create/edit/delete; dnd-kit row reorder persisted through `scenes.update(..., { sort_order })`; scene form validates payload JSON; no child route below scene level |

## Sequence-Driven Ordering

- Session and scene sequence is parent-scoped and persisted in `sort_order`.
- Tables render rows in `sort_order ASC, id ASC`.
- The visible "Order" column displays contiguous human-facing numbers (`1..N`), derived from the sorted rows.
- The stored `sort_order` remains zero-based (`0..N-1`).

## dnd-kit Reorder Behavior

- Both sessions and scenes use dnd-kit sortable rows (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`).
- Reorder is row-internal via drag handle in the "Order" column.
- Pointer and keyboard sensors are enabled.
- Reorder is in-table only; there is no cross-parent or cross-table move.

## Reorder Persistence and Failure Handling

- Reorder is optimistic in the renderer: UI order updates immediately after drop.
- Only rows whose `sort_order` changed are persisted.
- Persistence uses existing update APIs per row:
  - `window.db.sessions.update(id, { sort_order })`
  - `window.db.scenes.update(id, { sort_order })`
- On persistence failure:
  - an inline error message is shown,
  - canonical order is reloaded from backend (`getAllByCampaign` / `getAllBySession`),
  - if reload also fails, the UI falls back to the pre-drag snapshot.

## Validation

- `name`: required, trimmed; blank blocked in both renderer and main handlers.
- `summary` / `notes`: optional; empty string maps to `null` in forms.
- `payload` (Scene): must be valid JSON when provided; empty form input defaults to `'{}'`.

## Non-Goals

- Scene runtime/execution engine (playback, branching, condition evaluation).
- Prompt templating or LLM workflow integration.
- Cross-parent reparenting moves (session -> different campaign, scene -> different session).
- Collaboration/conflict resolution across multiple concurrent clients.

## Known Limits

- Reorder persistence is multiple per-row updates, not a single atomic batch IPC call.
- No undo stack for reorder operations.
- Campaign rows still use `updated_at DESC`; sequence semantics apply only to sessions/scenes.
- `config` (Campaign) and `payload` (Scene) are stored as JSON text without schema-level domain validation.
- There is still no route below scene level.

## Possible Next Extensions

- Add dedicated batch reorder IPC handlers for transactional sibling updates.
- Add explicit reparent/move flows with validation for cross-parent transfers.
- Add campaign `config` editing UI.
- Add scene detail/editor page for structured `payload` editing.
- Add pagination and/or search to campaign/session/scene tables.
