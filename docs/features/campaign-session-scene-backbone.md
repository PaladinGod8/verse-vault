# Campaign / Session / Scene Backbone

## Purpose

Extends the Verse Vault data hierarchy below the World layer with three new tiers: Campaign, Session, and Scene. Each tier is a full CRUD resource wired end-to-end through SQLite → IPC → preload bridge → renderer UI.

## Hierarchy Model

```
World
└── Campaign   (belongs to one World)
    └── Session    (belongs to one Campaign)
        └── Scene      (belongs to one Session)
```

Foreign keys cascade on delete, so removing a parent removes all descendants.

## Delivered Behavior

### Database

Three tables added in `src/database/db.ts`:

| Table       | Key Columns                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `campaigns` | `id`, `world_id` FK, `name`, `summary`, `config` (JSON text, default `{}`), `created_at`, `updated_at`                            |
| `sessions`  | `id`, `campaign_id` FK, `name`, `notes`, `sort_order` (default 0), `created_at`, `updated_at`                                     |
| `scenes`    | `id`, `session_id` FK, `name`, `notes`, `payload` (JSON text, default `{}`), `sort_order` (default 0), `created_at`, `updated_at` |

All FKs use `ON DELETE CASCADE`.

### IPC Channels

Fifteen channels defined in `src/shared/ipcChannels.ts` (five per tier):

| Tier     | Channels                                                                                                               |
| -------- | ---------------------------------------------------------------------------------------------------------------------- |
| Campaign | `db:campaigns:getAllByWorld`, `db:campaigns:getById`, `db:campaigns:add`, `db:campaigns:update`, `db:campaigns:delete` |
| Session  | `db:sessions:getAllByCampaign`, `db:sessions:getById`, `db:sessions:add`, `db:sessions:update`, `db:sessions:delete`   |
| Scene    | `db:scenes:getAllBySession`, `db:scenes:getById`, `db:scenes:add`, `db:scenes:update`, `db:scenes:delete`              |

### Main-Process Handlers (src/main.ts)

- **getAll\***: ordered `updated_at DESC`.
- **getById**: returns row or `null`.
- **add**: validates trimmed `name` as required; defaults `config`/`payload` to `'{}'`, `summary`/`notes` to `null`; scene `add` also validates `payload` as valid JSON.
- **update**: partial update via `hasOwnProperty` guards; re-validates `name` and JSON fields when present; always refreshes `updated_at`; throws if row not found.
- **delete**: idempotent — returns `{ id }` even if row was already absent.

### Preload Bridge (src/preload.ts)

Exposed on `window.db`:

- `window.db.campaigns.{ getAllByWorld, getById, add, update, delete }`
- `window.db.sessions.{ getAllByCampaign, getById, add, update, delete }`
- `window.db.scenes.{ getAllBySession, getById, add, update, delete }`

### TypeScript Contracts (forge.env.d.ts)

```ts
interface Campaign {
  id: number;
  world_id: number;
  name: string;
  summary: string | null;
  config: string;
  created_at: string;
  updated_at: string;
}

interface Session {
  id: number;
  campaign_id: number;
  name: string;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface Scene {
  id: number;
  session_id: number;
  name: string;
  notes: string | null;
  payload: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
```

### Renderer Routes and Pages

| Route                                                       | Page            | Behavior                                                                                                                                |
| ----------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `/world/:id/campaigns`                                      | `CampaignsPage` | Lists campaigns for a world; create/edit modal (name required, summary optional); delete with confirmation; "Sessions" link drills down |
| `/world/:id/campaign/:campaignId/sessions`                  | `SessionsPage`  | Lists sessions for a campaign; create/edit modal (name required, notes optional); delete with confirmation; "Scenes" link drills down   |
| `/world/:id/campaign/:campaignId/session/:sessionId/scenes` | `ScenesPage`    | Lists scenes for a session; create/edit modal (name required, notes optional, payload optional JSON); delete with confirmation          |

### Form Validation

- `name`: required, trimmed; blank → client error before submit.
- `summary` / `notes`: optional; empty string converted to `null`.
- `payload` (Scene only): must be valid JSON when non-empty; empty string converted to `'{}'`; invalid JSON shows "Payload must be valid JSON." before submit.

## Non-Goals (Scene Engine / Runtime)

The following are explicitly out of scope for this backbone:

- **Scene execution / playback** — `payload` is stored as raw JSON text with no runtime interpretation.
- **Scene graph or state machine** — no step sequencing, branching logic, or condition evaluation.
- **Prompt templates / AI integration** — scenes carry no prompt rendering or LLM wiring.
- **Campaign or session state tracking** — no "active session", progress tracking, or event log.
- **Real-time collaboration** — all operations are local-only via better-sqlite3.

## Known Limits

- List ordering is fixed at `updated_at DESC`; `sort_order` columns are stored but not used by the UI to reorder rows.
- Delete is idempotent on the backend but the renderer does not handle the "already deleted" case specially.
- `config` (Campaign) and `payload` (Scene) are stored as opaque JSON strings; no schema validation beyond syntactic JSON validity.
- Campaign form does not expose `config`; it is always written as the default `'{}'` on create.
- There is no drill-down page below scenes; scenes have no child resource yet.
- `/world/:id` does not yet link to campaigns; navigation starts from a manually typed or linked URL.

## Possible Next Extensions

- Wire `/world/:id` world page to surface a "Campaigns" entry point link.
- Use `sort_order` to support drag-and-drop reordering of sessions and scenes.
- Add a scene detail/editor page for structured `payload` editing.
- Add campaign `config` editing to the campaign form.
- Add pagination or search to the campaign/session/scene lists.
