# StatBlock Feature

## 1. Problem Statement

Currently, Verse Vault can create tokens (visual placeholders) and abilities, but lacks a cohesive in-game character representation that bridges these systems. When a user interacts with the TTRPG—rolling ability checks, tracking hit points, casting spells, using items—they need a unified data container and UI that surfaces character mechanics contextually.

**StatBlock** is that container: a CRUD entity that holds the complete rule state and mechanical data for a player character or NPC in a campaign. It is the primary interface through which a player interacts with the world's mechanics. Every token during runtime must link to a StatBlock, and every StatBlock must have a default associated token for visual representation.

## 2. Acceptance Criteria (Phase 1: Scaffold)

The Phase 1 scaffold establishes the data model, IPC contracts, and preparatory UI structure. **No rolling, no stat mechanics, no resource tracking**—just storage and future-proof extensibility.

### 2.1 Database Schema

- [x] Create `statblocks` table in SQLite with:
  - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
  - `world_id` (INTEGER NOT NULL FK -> worlds, ON DELETE CASCADE): every statblock belongs to a world
  - `campaign_id` (INTEGER, nullable, FK -> campaigns, ON DELETE CASCADE): optional campaign scope
  - `character_id` (INTEGER, nullable, FK -> characters, ON DELETE CASCADE): link to future character entity (null for now; character feature is out of scope)
  - `name` (TEXT NOT NULL): statblock display name or character name
  - `default_token_id` (INTEGER, nullable, FK -> tokens, ON DELETE SET NULL): link to default visual representation; nullable to allow future token association
  - `description` (TEXT, nullable): lore snippet or character notes
  - `config` (TEXT NOT NULL DEFAULT '{}'): JSON object for extensible mechanics (stats, resources, conditions, abilities, etc.)
  - `created_at` (TEXT NOT NULL DEFAULT datetime('now'))
  - `updated_at` (TEXT NOT NULL DEFAULT datetime('now'))
  - Indexes: `idx_statblocks_world_id`, `idx_statblocks_campaign_id`, `idx_statblocks_character_id`, `idx_statblocks_default_token_id`

### 2.2 IPC Channels & Handlers

Define channel constants in `src/shared/ipcChannels.ts`:
- `STATBLOCKS_GET_ALL_BY_WORLD`
- `STATBLOCKS_GET_ALL_BY_CAMPAIGN`
- `STATBLOCKS_GET_BY_ID`
- `STATBLOCKS_ADD`
- `STATBLOCKS_UPDATE`
- `STATBLOCKS_DELETE`
- `STATBLOCKS_LINK_TOKEN` (link a token as default; future step)
- `STATBLOCKS_UNLINK_TOKEN` (remove default token link; future step)

Implement handlers in `src/main.ts`:
- All 6 core CRUD channels with appropriate world/campaign scoping and validation
- Reads ordered by `updated_at DESC`
- Add/Update validate required trimmed `name` field
- Add requires target `world_id` and optional `campaign_id` (validation: if `campaign_id` set, must be in same world)
- Update uses explicit `hasOwnProperty` checks for partial field updates
- Delete returns `{ id }` (idempotent)
- Config JSON is persisted as-is (no validation of mechanics structure in Phase 1)

### 2.3 Shared Types in `forge.env.d.ts`

```ts
interface StatBlock {
  id: number;
  world_id: number;
  campaign_id: number | null;
  character_id: number | null;
  name: string;
  default_token_id: number | null;
  description: string | null;
  config: string; // JSON object; extensible for stats, resources, abilities, conditions, etc.
  created_at: string;
  updated_at: string;
}

// Extend DbApi
interface DbApi {
  statblocks: {
    getAllByWorld(worldId: number): Promise<StatBlock[]>;
    getAllByCampaign(campaignId: number): Promise<StatBlock[]>;
    getById(id: number): Promise<StatBlock | null>;
    add(data: {
      world_id: number;
      campaign_id?: number;
      name: string;
      description?: string;
      config?: string;
    }): Promise<StatBlock>;
    update(id: number, data: {
      name?: string;
      description?: string;
      config?: string;
    }): Promise<StatBlock>;
    delete(id: number): Promise<{ id: number }>;
  };
}
```

### 2.4 Preload Bridge

Wire bridge methods in `src/preload.ts`:
- `window.db.statblocks.getAllByWorld(worldId)`
- `window.db.statblocks.getAllByCampaign(campaignId)`
- `window.db.statblocks.getById(id)`
- `window.db.statblocks.add(data)`
- `window.db.statblocks.update(id, data)`
- `window.db.statblocks.delete(id)`

### 2.5 Routing & UI Skeleton

Add route in `src/renderer/App.tsx`:
- `/world/:id/statblocks` (list page)
- `/world/:id/statblocks/:statBlockId` (detail view, future phase)

Create shell page components (no full implementation; basic scaffold only):
- `src/renderer/pages/StatBlocksPage.tsx`: world-scoped list, create/edit/delete placeholders
- `src/renderer/components/statblocks/StatBlockForm.tsx`: name + description + config JSON editor scaffold
- `src/renderer/components/statblocks/StatBlockCard.tsx`: card display with name and linked token info

Add sidebar nav link in `src/renderer/components/worlds/WorldSidebar.tsx`:
- "StatBlocks" -> `/world/:id/statblocks`

### 2.6 Database Migration

Add additive migration function `runStatBlocksSchemaMigration()` in `src/database/db.ts`:
- Safely create `statblocks` table on startup if missing (no data loss on existing databases)
- Called from `initializeSchema()`

### 2.7 Documentation

Create/update:
- `docs/features/statblocks.md` (this file, expanded with runtime/UI details after Phase 1)
- `docs/02_CODEBASE_MAP.md`: add StatBlocks entry to Feature Map
- `docs/03_IPC_CONTRACT.md`: add StatBlocks channels section

## 3. Non-Goals (Phase 1)

- **Character Management**: Statblocks can have a `character_id` field, but character CRUD and linking workflows are separate and out of scope.
- **Mechanics Implementation**: No stat rolling, ability checks, resource tracking, or condition resolution. Config is stored as-is; future phases will define and validate structure.
- **Token Association Workflows**: `default_token_id` is stored but Token↔StatBlock linking UI is deferred to a later phase.
- **Runtime UI (Modal/Popup)**: The token double-click → statblock-modal flow is a runtime feature, not Phase 1. Phase 1 is data + navigation only.
- **Ability Integration**: Linking statblock to specific character abilities is future work; Phase 1 is isolated.
- **StatBlock Inheritance/Templating**: No copy workflows, versioning, or duplication helpers yet.
- **Ownership/Permissions**: All local app; no multi-user checks.

## 4. Affected Files

### Core IPC & Database Layer
- `src/shared/ipcChannels.ts` (add 6+ constants)
- `src/main.ts` (register 6+ handlers)
- `src/database/db.ts` (schema + migration)
- `forge.env.d.ts` (SharedTypes)

### Preload & Renderer Bridge
- `src/preload.ts` (6+ bridge methods)

### Routing & Pages
- `src/renderer/App.tsx` (add /statblocks routes)
- `src/renderer/pages/StatBlocksPage.tsx` (new page, scaffold)
- `src/renderer/pages/StatBlockDetailPage.tsx` (future phase; not in Phase 1)

### Components
- `src/renderer/components/statblocks/StatBlockForm.tsx` (new, scaffold)
- `src/renderer/components/statblocks/StatBlockCard.tsx` (new, scaffold)
- `src/renderer/components/worlds/WorldSidebar.tsx` (add nav link)

### Documentation
- `docs/features/statblocks.md` (living docs, Phase 1 version)
- `docs/02_CODEBASE_MAP.md` (feature map entry)
- `docs/03_IPC_CONTRACT.md` (channel documentation)

## 5. Recommended Decomposition into Sequential Tasks

**YES—this feature should be split into smaller sequential work items**, following the established patterns from tokens and abilities. Suggested breakdown:

### Phase 1a: Shared Contract & Channels (prep phase, no implementation yet)
- Define `StatBlock` interface in `forge.env.d.ts`
- Define `DbApi.statblocks` signatures
- Add IPC channel constants in `src/shared/ipcChannels.ts`

### Phase 1b: Database Schema & Migration
- Add migration function `runStatBlocksSchemaMigration()`
- Create `statblocks` table schema
- Wire migration call in `initializeSchema()`

### Phase 1c: Main Process Handlers
- Register 6 CRUD handlers in `src/main.ts`
- Add validation (required `name`, world FK, campaign FK if set)
- Use `hasOwnProperty` partial update pattern
- Order reads by `updated_at DESC`

### Phase 1d: Preload Bridges
- Wire 6 bridge methods in `src/preload.ts`
- Use typed `ipcRenderer.invoke` pattern (consistent with existing features)

### Phase 1e: Router & Pages (UI Scaffold)
- Add routes in `src/renderer/App.tsx`
- Create `StatBlocksPage.tsx` with loading/empty/list states (table scaffold)
- Create `StatBlockForm.tsx` with name + description + config JSON editor scaffold
- Create `StatBlockCard.tsx` for future use
- Add sidebar nav link

### Phase 1f: Tests
- Unit tests for statblock schema, migrations, validation
- E2E tests for CRUD workflows (create, read, list, update, delete)

### Phase 1g: Documentation & Cleanup
- Update `docs/features/statblocks.md` with full Phase 1 behavior
- Update `docs/02_CODEBASE_MAP.md` with statblocks entry
- Update `docs/03_IPC_CONTRACT.md` with channel docs
- Run formatting and verification

### Future Phases (Out of Phase 1 Scope)

**Phase 2: Token Association**
- UI: Modal dialog to link/unlink default token
- Handlers: `STATBLOCKS_LINK_TOKEN`, `STATBLOCKS_UNLINK_TOKEN`
- Validation: Token must be in same world

**Phase 3: Character Integration**
- Character CRUD (separate entity)
- Character ↔ StatBlock linking
- Character form with statblock selector

**Phase 4: Ability Integration & Config Schema**
- Define `StatBlockConfig` schema (stats, resources, ability slot allocation)
- Validation at IPC layer for mechanics structure
- Ability slot manager UI

**Phase 5: Runtime Modal & Token Integration**
- Double-click token → open statblock modal (not separate window, but in-app modal)
- Link runtime token selection to statblock display
- Context-aware ability picker from statblock

**Phase 6: Mechanics Implementations** (future, as user requests)
- Dice rolling from ability scores
- Resource tracking (HP, mana, action points)
- Condition/status effect tracking
- Skill checks and saves

## 6. Notes on Design Robustness

StatBlock is deliberately designed to accommodate future complexity without breaking existing data:

1. **Extensible Config**: The `config` JSON field can grow to include arbitrary mechanics (stats objects, resource pools, condition sets, ability slot blueprints, etc.) without schema changes. Phases 4+ define and validate structure incrementally.

2. **Flexible Relationships**: 
   - `character_id` is nullable; can link to future character entity without requiring it now.
   - `default_token_id` is nullable; tokens can exist without statblock association in Phase 1; Phase 2 makes linking explicit.
   - `campaign_id` is optional like tokens; supports world-first scoping but allows campaign-level variants.

3. **Multiple Forms**: From the outset, statblock does **not** assume 1:1 relationship with character. A character may have multiple statblocks (alternate forms, power-ups, degraded states). Character entity (future) manages this multiplicity; statblock remains simple and focused.

4. **Sorted Reads**: Statblocks are read sorted by `updated_at DESC`, consistent with abilities and campaigns, enabling recent-first UX and supporting future filtering by date or tag.

5. **Idempotent Deletes**: Delete returns `{ id }` consistently, allowing UI to safely remove from local state without extra verification round-trip.

---

## Appendix: Sample Runtime Behavior (Phase 5+)

In future battlemap runtime phase, a double-click on a token will:
1. Look up the token's associated statblock (via `default_token_id` link)
2. Fetch full statblock via `window.db.statblocks.getById()`
3. Open an in-app modal (not electron BrowserWindow) displaying:
   - StatBlock name, description
   - Linked token thumbnail
   - Summary of mechanics from config (stats, resources, abilities, etc.)
   - Context-aware action buttons (cast ability, use item, etc.)
4. Modal closes on Escape or "X" button; selection state remains on token

This workflow requires Phase 2 (token linking), Phase 4 (config schema + ability integration), and Phase 5 (modal UI + runtime hooks).
