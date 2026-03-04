# Tokens Feature

## 1. Overview

Tokens are generic, composable visual assets used in battlemaps.

Design intent is deliberately scope-agnostic: a token can represent a character, a limb, an item, a wall, a structure, or any other visual element.

Tokens are world-first scoped:

- every token belongs to a world
- campaigns can hold independent copied rows
- copied campaign tokens do not stay linked to their world source row
- token create/edit supports desktop image upload via drag-and-drop or file picker; uploaded files are persisted by main and stored as `image_src` file URLs

## 2. Data Shape

### `Token` Interface

```ts
interface Token {
  id: number;
  world_id: number; // always set - token always belongs to a world
  campaign_id: number | null; // null = world-scoped; set = campaign-scoped copy
  name: string;
  image_src: string | null; // URL or local path; null if no image
  config: string; // JSON string, reserved for future use (defaults to '{}')
  is_visible: number; // 1 = visible in runtime palette, 0 = hidden
  created_at: string; // ISO datetime string (SQLite datetime('now'))
  updated_at: string;
}
```

### SQLite Schema

```sql
CREATE TABLE IF NOT EXISTS tokens (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  world_id    INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,
  image_src   TEXT,
  config      TEXT    NOT NULL DEFAULT '{}',
  is_visible  INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0, 1)),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

Indexes:

- `idx_tokens_campaign_id`
- `idx_tokens_world_id`

## 3. Scoping Model

- World-scoped token: `campaign_id = NULL`. These are available in runtime for that world.
- Campaign-scoped token: `campaign_id IS NOT NULL`. These are independent copied rows.
- Copy flow is one-way: world -> campaign.
- There is no "promote campaign token to world" action.

## 4. IPC Contract

| Channel                      | Signature                                                                       | Notes                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `db:tokens:getAllByWorld`    | `(worldId: number) => Token[]`                                                  | Returns tokens for `world_id` (includes world-scoped and campaign-scoped rows).   |
| `db:tokens:getAllByCampaign` | `(campaignId: number) => Token[]`                                               | Returns rows where `campaign_id = campaignId`.                                    |
| `db:tokens:getById`          | `(id: number) => Token \| null`                                                 | Returns matching row or `null`.                                                   |
| `db:tokens:importImage`      | `({ fileName, mimeType, bytes }) => { image_src: string }`                      | Validates and persists image bytes in main, then returns persisted `file://` URL. |
| `db:tokens:add`              | `({ world_id, campaign_id?, name, image_src?, config?, is_visible? }) => Token` | `world_id` required; `campaign_id` optional.                                      |
| `db:tokens:update`           | `(id, { name?, image_src?, config?, is_visible? }) => Token`                    | `world_id` and `campaign_id` are immutable after insert.                          |
| `db:tokens:delete`           | `(id: number) => { id: number }`                                                | Deletes by id; world/campaign parent deletes are handled by DB cascade rules.     |

## 5. User-Facing Behavior

### World-Level Tokens Page (`/world/:id/tokens`)

- Accessible from the `Tokens` entry in the world sidebar.
- Table shows thumbnail, name, scope label, updated date, created date, and actions.
- `New Token` always inserts a world-scoped row (`campaign_id = null`) and supports image upload by desktop drag-and-drop or file picker.
- `Edit` updates name, visibility, and image via three paths: replace with uploaded file, clear image, or keep/adjust text `image_src`.
- `Delete` requires confirmation (`Delete "<name>"? This cannot be undone.`) and removes that token row.
- `Copy to Campaign` is shown only for world-scoped rows; it creates an independent campaign-scoped copy with the same `name`, `image_src`, `config`, and `is_visible`.

### Runtime Palette (BattleMap Runtime)

- Two source sections: `World Tokens` and campaign tokens (for selected campaign).
- `Show invisible tokens` toggle applies to both sections.
- Hovering a token row with `image_src` shows an image tooltip preview.
- Clicking `Add` places a runtime token instance at a default/snap-aware position in the scene.
- Runtime token instances are session-only and are not persisted to DB.

## 6. Validation Rules

- `name`: required; trimmed; must not be empty.
- `world_id`: required positive integer; validated in main handler.
- `campaign_id`: optional; if provided, must be a positive integer.
- Same-world campaign copy is enforced by UI flow (campaign picker is scoped to the world). DB FKs enforce existence of `world_id` and `campaign_id` targets.
- `image_src`: optional string; renderer normalizes empty/whitespace text input to `null`.
- `image_upload` (renderer submit payload): optional `{ fileName, mimeType, bytes }`; when present, renderer and main both validate image type and 5 MB size before persistence.
- upload precedence in edit save path: `image_upload` replace > `clear_image` -> `image_src: null` > explicit/manual `image_src` update > omitted image field (leave unchanged).
- `config`: defaults to `'{}'`; when provided, must be JSON object text.
- `is_visible`: `1` (default) or `0`.

## 7. Cascade Behavior

- Deleting a world deletes all rows in `tokens` for that world via `tokens.world_id -> worlds.id ON DELETE CASCADE`.
- Deleting a campaign deletes only campaign-scoped token copies tied to that campaign via `tokens.campaign_id -> campaigns.id ON DELETE CASCADE`.
- World-scoped rows (`campaign_id = NULL`) are unaffected by campaign deletion.

## 8. Token Desktop Image Upload

### Overview

Token create/edit now supports desktop image upload through drag-and-drop or file picker. This solves the workflow gap where users previously had to manually paste paths/URLs for local assets.

### Architecture

- Renderer dropzone is implemented with `dnd-kit` (`TokenImageDropzone`) and native `dataTransfer.files` extraction from desktop drops.
- Renderer form (`TokenForm`) builds `image_upload` payload (`fileName`, normalized lowercase `mimeType`, `Uint8Array` bytes) and sends it through `window.db.tokens.importImage(...)`.
- Preload forwards `db:tokens:importImage` (`IPC.TOKENS_IMPORT_IMAGE`) and preserves the security boundary (renderer never touches Node APIs).
- Main handler validates payload and writes file bytes under `path.join(app.getPath('userData'), 'token-images')` with unique filename format `<timestamp>-<randomUUID>.<ext>`.
- Main returns `{ image_src }`, where `image_src` is a persisted `file://` URL built with `pathToFileURL(...)`.

### UX Behavior

- Create flow:
  - user can drag-and-drop an image or use picker in `New Token`;
  - on save, upload happens before `tokens.add`;
  - add payload uses returned `image_src`.
- Edit replace flow:
  - user can select a new image in `Edit Token`;
  - on save, upload happens before `tokens.update`;
  - updated row thumbnail uses new persisted `image_src`.
- Edit clear flow:
  - user selects `Clear image on save`;
  - save sends `image_src: null` without import call;
  - row falls back to placeholder thumbnail.
- Validation and feedback:
  - inline form validation for unsupported type, empty file, and oversized file;
  - upload/read/import failures surface as toast errors and block mutation.

### Security + Boundary Notes

- Renderer does not access Node filesystem APIs directly.
- Renderer uses `window.db` bridge only (`window.db.tokens.importImage`, `add`, `update`).
- All file writes happen in the main process only.

### Constraints

- Supported image MIME types: `image/png`, `image/jpeg`, `image/webp`, `image/gif`.
- Max file size: 5 MB.
- File bytes must be non-empty (`Uint8Array`).

### Test Coverage Summary

- Unit coverage:
  - `TokenImageDropzone`: drag drop, picker, keyboard activation, disabled state, file metadata, error rendering.
  - `TokenForm`: valid upload payload, invalid type/size validation, create/edit submit payload variants, clear-image path.
  - `TokensPage`: create/edit import ordering, create/edit failure handling, clear-image update behavior.
- E2E coverage (`tests/e2e/tokens.test.ts`):
  - create token with uploaded image and thumbnail `file:///.../token-images/...`;
  - edit replace image and assert thumbnail source changes;
  - edit clear image and assert placeholder;
  - invalid upload type shows inline error and does not mutate stored token image.

### Non-goals

- No image editing/cropping pipeline.
- No bulk image upload for multiple tokens at once.
- No cloud sync/distributed media storage for token image files.
- No typed character/item/entity model; tokens remain generic.
- No runtime token persistence; placement remains session-only.
- No drag-and-drop palette-to-canvas workflow; runtime placement remains click-to-add.
- No campaign-to-world promotion action.

## 9. Migration Notes

`runTokenWorldIdMigration` in `src/database/db.ts` handles pre-world-scope token tables:

- checks `PRAGMA table_info(tokens)` for `world_id`
- if missing, runs:
  - `ALTER TABLE tokens ADD COLUMN world_id INTEGER REFERENCES worlds(id) ON DELETE CASCADE`
  - backfill:
    - `UPDATE tokens SET world_id = (SELECT world_id FROM campaigns WHERE campaigns.id = tokens.campaign_id) WHERE world_id IS NULL AND campaign_id IS NOT NULL`
  - `CREATE INDEX IF NOT EXISTS idx_tokens_world_id ON tokens(world_id)`

Migration is safe to run repeatedly (no-op when `world_id` already exists).
