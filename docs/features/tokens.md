# Tokens Feature

## 1. Overview

Tokens are generic, composable visual assets used in battlemaps.

Design intent is deliberately scope-agnostic: a token can represent a character, a limb, an item, a wall, a structure, or any other visual element.

Tokens are world-first scoped:

- every token belongs to a world
- campaigns can hold independent copied rows
- copied campaign tokens do not stay linked to their world source row
- token create/edit supports desktop image upload via drag-and-drop or file picker; `TokenImageDropzone` is the sole image input mechanism — no URL text input

## 2. Data Shape

### `Token` Interface

```ts
interface Token {
  id: number;
  world_id: number; // always set - token always belongs to a world
  campaign_id: number | null; // null = world-scoped; set = campaign-scoped copy
  grid_type: TokenGridType; // runtime compatibility shape: 'square' | 'hex'
  name: string;
  image_src: string | null; // vv-media:// URL persisted by main; null if no image
  config: string; // JSON object text; may include additive footprint/framing metadata
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
  grid_type   TEXT    NOT NULL DEFAULT 'square' CHECK (grid_type IN ('square', 'hex')),
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
- Copy flow is one-way: world -> campaign (creates a new row).
- Move flow is bidirectional: world <-> campaign, and campaign <-> campaign (updates existing row).
  - Move to world: `campaign_id` -> `NULL`
  - Move to campaign: `campaign_id` -> new target campaign ID (must be in same world)
  - All other fields immutable; only scope changes.

## 4. IPC Contract

| Channel                      | Signature                                                                                   | Notes                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `db:tokens:getAllByWorld`    | `(worldId: number) => Token[]`                                                              | Returns tokens for `world_id` (includes world-scoped and campaign-scoped rows).                                  |
| `db:tokens:getAllByCampaign` | `(campaignId: number) => Token[]`                                                           | Returns rows where `campaign_id = campaignId`.                                                                   |
| `db:tokens:getById`          | `(id: number) => Token \| null`                                                             | Returns matching row or `null`.                                                                                  |
| `db:tokens:importImage`      | `({ fileName, mimeType, bytes }) => { image_src: string }`                                  | Validates and persists image bytes in main, then returns persisted `vv-media://token-images/...` URL.            |
| `db:tokens:add`              | `({ world_id, campaign_id?, grid_type?, name, image_src?, config?, is_visible? }) => Token` | `world_id` required; `campaign_id` optional; `grid_type` defaults to `square` when omitted.                      |
| `db:tokens:update`           | `(id, { grid_type?, name?, image_src?, config?, is_visible? }) => Token`                    | `world_id` and `campaign_id` are immutable after insert. `grid_type` is editable (`square`/`hex`).               |
| `db:tokens:delete`           | `(id: number) => { id: number }`                                                            | Deletes by id; world/campaign parent deletes are handled by DB cascade rules.                                    |
| `db:tokens:moveToWorld`      | `(id: number) => Token`                                                                     | Moves a token to world scope (`campaign_id` -> `null`); requires token to exist; returns updated `Token`.        |
| `db:tokens:moveToCampaign`   | `(id: number, targetCampaignId: number) => Token`                                           | Moves a token to a campaign; requires token and campaign to exist and be in same world; returns updated `Token`. |

## 5. Grid Variants + Footprint Painter

### Token Identity and Runtime Compatibility

- Every token has `grid_type: 'square' | 'hex'` persisted in the `tokens` row.
- Runtime palette behavior is grid-aware:
  - when BattleMap runtime grid mode is `square` or `hex`, palette lists only tokens with matching `token.grid_type`;
  - when runtime grid mode is `none`, all token grid variants are shown.
- Runtime add logic has a guard that blocks mismatched placement when mode is not `none`.

### Painter Flow (Create/Edit)

- `TokenForm` opens `FootprintPainterModal` immediately after a valid image file is selected in the dropzone.
- Painter supports both grid families, based on the token's selected `grid_type`:
  - `square`: cartesian cell painting (`col`, `row`)
  - `hex`: axial cell painting (`q`, `r`)
- Painter UX constraints:
  - brush/eraser tools only;
  - click-drag painting supported;
  - overview/navigator panel shown in the upper-right;
  - `Confirm` is disabled until at least one occupied cell is painted.
- On confirm, painter returns deterministic `footprint` + `framing`; this is serialized into `TokenForm` submit payload `config`.

### Occupancy and Framing Config Shape

Stored in `Token.config` JSON (additive, backward-compatible):

```ts
interface TokenConfigShape {
  footprint?: {
    version?: 1;
    grid_type?: 'square' | 'hex';
    square_cells?: Array<{ col: number; row: number }>;
    hex_cells?: Array<{ q: number; r: number }>;
    width_cells?: number;
    height_cells?: number;
    radius_cells?: number;
  };
  framing?: {
    center_x_cells?: number;
    center_y_cells?: number;
    extent_x_cells?: number;
    extent_y_cells?: number;
    max_extent_cells?: number;
  };
}
```

Normalization/persistence constraints:

- `ensureTokenConfigJsonText()` validates `config` as a JSON object and normalizes occupancy arrays.
- Occupied-cell arrays are deduped and canonically sorted before persistence.
- Numeric footprint/framing fields are validated as finite values; extent/radius fields must be greater than `0` when present.

## 6. Move Actions and User Flows

### Problem Solved

Previously, tokens were immutable in scope:

- World tokens could only be copied (new row) to campaigns.
- Campaign tokens could not be moved to other campaigns or back to world.
- Scope changes required manual deletion + recreation.

Token Move adds in-place scope transitions via two new actions:

- Move to World: campaign-scoped -> world-scoped
- Move to Campaign: world-scoped -> campaign-scoped (or campaign -> different campaign)

### Starting State: TokensPage at `/world/:id/tokens`

Table displays all tokens (world + campaign-scoped) with context-aware actions per row.

### Scenario 1: Move World Token to Campaign

1. User clicks "Move to Campaign" button on a world-scoped row.
2. Dialog opens: `MoveTokenDialog` in `toCampaign` mode.
3. Campaign dropdown populated with campaigns in the token's world.
4. User selects target campaign + clicks Confirm.
5. IPC calls `window.db.tokens.moveToCampaign(tokenId, campaignId)`.
6. On success:
   - Token row updates: `campaign_id` set to new campaign.
   - Scope label changes: `World` -> `Campaign: <name>`.
   - Toast: `Moved '<name>' to <campaign>.`
   - Dialog closes; table refreshes.

### Scenario 2: Move Campaign Token to World

1. User clicks "Move to World" button on a campaign-scoped row.
2. Dialog opens: `MoveTokenDialog` in `toWorld` mode.
3. Simple confirmation message (no campaign picker).
4. User clicks Confirm.
5. IPC calls `window.db.tokens.moveToWorld(tokenId)`.
6. On success:
   - Token row updates: `campaign_id` set to `null`.
   - Scope label changes: `Campaign: <name>` -> `World`.
   - Toast: `Moved '<name>' to World.`
   - Dialog closes; table refreshes.

### Scenario 3: Move Campaign Token to Different Campaign

1. User clicks "Move to Campaign" button on a campaign-scoped row.
2. Dialog opens: `MoveTokenDialog` in `toCampaign` mode.
3. Campaign dropdown populated (excludes current campaign).
4. User selects different campaign + clicks Confirm.
5. IPC calls `window.db.tokens.moveToCampaign(tokenId, newCampaignId)`.
6. On success:
   - Token row updates: `campaign_id` changed.
   - Scope label updates to new campaign name.
   - Toast: `Moved '<name>' to <new-campaign>.`

### Dialog Behavior

The `MoveTokenDialog` component handles UX:

- Two modes: `toWorld` (simple confirmation) and `toCampaign` (with campaign picker).
- Campaign picker is filtered to token parent world; FKs prevent cross-world moves.
- Confirm button disabled until campaign is selected (in `toCampaign` mode).
- Pending state disables button text and form controls during async call.
- Errors display inline or as toast.
- Cancel closes dialog without changes.

### Token Data Model and Immutability

Move operations preserve all token fields except `campaign_id`:

| Field         | Mutable | Notes                                                               |
| ------------- | ------- | ------------------------------------------------------------------- |
| `id`          | No      | Primary key; never changes                                          |
| `world_id`    | No      | FK to world; set at creation; immutable                             |
| `campaign_id` | Yes     | Scoped by move; set to null (world) or campaign_id (campaign)       |
| `name`        | No      | User edit only, not touched by move                                 |
| `image_src`   | No      | User edit only, not touched by move                                 |
| `config`      | No      | User edit only; may contain additive `footprint`/`framing` metadata |
| `is_visible`  | No      | User edit only, not touched by move                                 |
| `created_at`  | No      | Never changes                                                       |
| `updated_at`  | Yes     | Updated by move operation (`datetime('now')`)                       |

### Component Hierarchy

```text
TokensPage
  |- MoveTokenDialog (mounted with dialog state)
  |  |- ModalShell (DaisyUI modal)
  |  |- Campaign select (toCampaign mode only)
  |  \- Confirm/Cancel buttons
  \- Table row actions
     |- Edit (existing)
     |- Move to Campaign (new for world + campaign tokens)
     |- Move to World (new for campaign tokens)
     \- Delete (existing)
```

### Validation and Error Handling

#### Validation Rules

- Move target validation: campaigns must exist and be in the same world as the token.
- Idempotent: moving a world-scoped token to world again succeeds (no-op).
- Atomic: all-or-nothing transactional semantics (rollback on error).
- Token exists: `moveToWorld` and `moveToCampaign` throw if token ID not found.
- Campaign exists: `moveToCampaign` throws if campaign ID not found.
- Same world: `moveToCampaign` validates target campaign is in same world as token `world_id`.
- Transactional: both move handlers wrap updates in SQLite transactions.

#### Error Messages and UX

| Error              | Condition                                             | User Feedback                                                       |
| ------------------ | ----------------------------------------------------- | ------------------------------------------------------------------- |
| Token not found    | `moveToWorld` or `moveToCampaign` on invalid token ID | Toast error: `Failed to move token: Token not found`                |
| Campaign not found | `moveToCampaign` on invalid campaign ID               | Toast error: `Failed to move token: Campaign not found`             |
| Wrong world        | `moveToCampaign` to campaign in different world       | Toast error: `Failed to move token: Campaign not in the same world` |
| Generic error      | Unexpected DB error                                   | Toast error: `Failed to move token: <error>`                        |

### Testing Coverage

#### Unit Tests

- `tests/unit/database/tokenMove.test.ts`: 10+ test cases
  - Happy paths (world->campaign, campaign->world, campaign->campaign)
  - Validation errors (not found, world mismatch)
  - Data preservation (immutable fields)
  - Transactional semantics

- `tests/unit/preload/tokenMove.test.ts`: 4+ test cases
  - IPC channel invocation
  - Error propagation

#### E2E Tests

- `tests/e2e/tokenMove.test.ts`: 9+ test cases
  - UI flow (dialog open/close, campaign selection)
  - Scope label updates
  - Toast feedback
  - Action button visibility
  - Cancel behavior

#### Coverage

- Combined unit + E2E coverage: 80%+ for all move-related code.

### Design Decisions

#### Why In-Place Move vs. Copy + Delete?

Move advantages:

- Single operation; no orphaning old rows.
- Preserves token ID (important if external systems reference the token).
- Atomic; no partial states.
- Simpler UI (single action vs. multi-step).

#### Why World ID Immutable?

- Tokens are world-first scoped.
- Moving a token to a different world would require:
  - remapping campaign FK (new world's campaign hierarchy might differ)
  - potentially breaking runtime battlemap linkages
  - complicating validation logic
- Solution: keep move restricted to same-world transitions; cross-world use case remains copy + delete.

#### Why Separate Dialog Component?

- Reusable pattern (like `MoveSceneDialog`, `MoveSessionDialog`).
- Isolates move UX from TokensPage UI complexity.
- Can be extended in future (for example, batch moves, move with copy).

### Future Enhancements

- Batch move: move multiple tokens at once.
- Move with copy: optionally keep a copy in source campaign after move.
- Move history: track scope transitions in audit log.
- Cross-world move: if world hierarchy changes, allow reparenting tokens across worlds.

## 7. Token Desktop Image Upload

### Overview

Token create/edit supports desktop image upload through drag-and-drop or file picker via
`TokenImageDropzone`. File upload is the sole mechanism for setting a token image — there
is no URL text input. Uploaded files are validated in the renderer, transferred to the main
process via `window.db.tokens.importImage`, and stored under `userData/token-images/` as
`vv-media://token-images/...` URLs.

### Architecture

- Renderer dropzone is implemented with `dnd-kit` (`TokenImageDropzone`) and native `dataTransfer.files` extraction from desktop drops.
- Renderer form (`TokenForm`) builds `image_upload` payload (`fileName`, normalized lowercase `mimeType`, `Uint8Array` bytes) and sends it through `window.db.tokens.importImage(...)`.
- Preload forwards `db:tokens:importImage` (`IPC.TOKENS_IMPORT_IMAGE`) and preserves the security boundary (renderer never touches Node APIs).
- Main handler validates payload and writes file bytes under `path.join(app.getPath('userData'), 'token-images')` with unique filename format `<timestamp>-<randomUUID>.<ext>`.
- Main returns `{ image_src }`, where `image_src` is a persisted `vv-media://token-images/...` URL.

### UX Behavior

- Create flow:
  - user can drag-and-drop an image or use picker in `New Token`;
  - selecting a valid file opens `FootprintPainterModal` before save;
  - user must paint at least one occupied cell and confirm;
  - on save, upload happens before `tokens.add`;
  - add payload uses returned `image_src` and includes `config` footprint/framing JSON from painter.
- Edit replace flow:
  - user can select a new image in `Edit Token`;
  - selecting a valid file opens `FootprintPainterModal` before save;
  - on save, upload happens before `tokens.update`;
  - updated row thumbnail uses new persisted `image_src`, and save payload includes updated `config` footprint/framing JSON.
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
  - create token with uploaded image and thumbnail `vv-media://token-images/...`;
  - edit replace image and assert thumbnail source changes;
  - edit clear image and assert placeholder;
  - invalid upload type shows inline error and does not mutate stored token image.

### Non-goals

- No URL text input for token images; file upload is the only supported mechanism.
- No image editing/cropping pipeline.
- No bulk image upload for multiple tokens at once.
- No cloud sync/distributed media storage for token image files.
- No typed character/item/entity model; tokens remain generic.
- No runtime token persistence; placement remains session-only.
- No drag-and-drop palette-to-canvas workflow; runtime placement remains click-to-add.
- No cross-world move action.

## 8. Migration Notes

`runTokenWorldIdMigration` in `src/database/db.ts` handles pre-world-scope token tables:

- checks `PRAGMA table_info(tokens)` for `world_id`
- if missing, runs:
  - `ALTER TABLE tokens ADD COLUMN world_id INTEGER REFERENCES worlds(id) ON DELETE CASCADE`
  - backfill:
    - `UPDATE tokens SET world_id = (SELECT world_id FROM campaigns WHERE campaigns.id = tokens.campaign_id) WHERE world_id IS NULL AND campaign_id IS NOT NULL`
  - `CREATE INDEX IF NOT EXISTS idx_tokens_world_id ON tokens(world_id)`

Migration is safe to run repeatedly (no-op when `world_id` already exists).
