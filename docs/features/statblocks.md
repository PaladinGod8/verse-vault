# StatBlocks Feature

## Purpose

StatBlocks are the gameplay container for character/NPC state in a world. A statblock combines:

- identity data (name, description)
- statistics values (resources and passive scores)
- attached abilities
- lightweight skills data
- optional links to runtime tokens

This feature now powers statblock-centric runtime behavior in battlemaps.

## Scope (Current Implementation)

- World-scoped statblock CRUD.
- Optional campaign scoping (`campaign_id`).
- Token linkage contract (`linkToken`, `unlinkToken`, `getLinkedTokens`, `getLinkedStatblock`).
- Ability assignment contract (`attachAbility`, `detachAbility`, `listAbilities`).
- Unified statblock editor (statistics + abilities + skills).
- Runtime integration:
  - ability selection resolves from selected token's linked statblock
  - double-click token opens statblock popup in the same renderer window

## Data Model

### StatBlock row

```ts
interface StatBlock {
  id: number;
  world_id: number;
  campaign_id: number | null;
  character_id: number | null;
  default_token_id: number | null;
  name: string;
  description: string | null;
  config: string; // JSON object text
  created_at: string;
  updated_at: string;
}
```

### Linkage tables

`statblock_token_links`

- `UNIQUE(token_id)` enforces one token -> one statblock link
- `UNIQUE(statblock_id, token_id)` prevents duplicate pair rows

`statblock_ability_assignments`

- `UNIQUE(statblock_id, ability_id)` prevents duplicate assignments

## IPC + Preload Contract

Channels are defined in `src/shared/ipcChannels.ts` and bridged through `window.db.statblocks`.

CRUD:

- `STATBLOCKS_GET_ALL_BY_WORLD`
- `STATBLOCKS_GET_ALL_BY_CAMPAIGN`
- `STATBLOCKS_GET_BY_ID`
- `STATBLOCKS_ADD`
- `STATBLOCKS_UPDATE`
- `STATBLOCKS_DELETE`

Linkage + assignment:

- `STATBLOCKS_LINK_TOKEN`
- `STATBLOCKS_UNLINK_TOKEN`
- `STATBLOCKS_GET_LINKED_TOKENS`
- `STATBLOCKS_GET_LINKED_STATBLOCK`
- `STATBLOCKS_ATTACH_ABILITY`
- `STATBLOCKS_DETACH_ABILITY`
- `STATBLOCKS_LIST_ABILITIES`

## Validation and Guardrails

Main-process rules:

- `name` is required and trimmed for create/update.
- `config` must be JSON object text.
- token link and ability assignment are world-bound:
  - token world must match statblock world
  - ability world must match statblock world

Error semantics:

- `Token and StatBlock must belong to the same world`
- `Ability and StatBlock must belong to the same world`
- `Token is already linked to a statblock`
- `Ability is already attached to statblock`

## Renderer Behavior

### StatBlocks page

Route: `/world/:id/statblocks`

- Loads world, statblocks, world abilities, and assigned abilities.
- Create/edit uses one `StatBlockForm` payload:
  - `statblock` (core row + serialized config)
  - `abilityIds` (assignment reconciliation)
- Create path rolls back newly created statblock if assignment fails.
- Edit path diffs assignment sets and applies attach/detach calls.

### Unified editor

`StatBlockForm` manages:

- resources and passive scores from world statistics definitions
- ability checklist constrained to abilities in the same world
- skills list (`[{ key, rank }]`) with key/rank validation

Config behavior:

- editor-managed sections (`statistics`, `skills`) are deterministic
- unknown legacy config keys are preserved on save
- removed world statistic definitions are filtered on save to avoid re-saving orphaned entries

### Card summary

`StatBlockCard` renders:

- name/description/token id
- resource/passive score summary
- assigned ability chips
- skill chips

## Runtime Integration

Runtime feature files:

- `AbilityPickerPanel` (`src/renderer/components/runtime/AbilityPickerPanel.tsx`)
- `StatBlockPopup` (`src/renderer/components/runtime/StatBlockPopup.tsx`)
- `BattleMapRuntimePage` (`src/renderer/pages/BattleMapRuntimePage.tsx`)

Behavior:

- selected runtime token -> `getLinkedStatblock(sourceTokenId)`
- if linked, runtime abilities come from `listAbilities(statblock.id)`
- ability picker only shows `type === 'active'`
- double left-click on runtime token opens popup modal with:
  - statblock identity fields
  - assigned abilities
  - parsed resources, passive scores, and skills

Runtime edge cases:

- no source token id -> `Selected token has no source link.`
- source token without linked statblock -> `No linked statblock for this token.`
- non-castable ability (`range_cells === null`) is cleared from casting selection

## Usage Examples

### Programmatic linking flow

```ts
const sb = await window.db.statblocks.add({ world_id, name: 'Goblin' });

await window.db.statblocks.attachAbility({
  statblock_id: sb.id,
  ability_id,
});

await window.db.statblocks.linkToken({
  statblock_id: sb.id,
  token_id,
});

const linked = await window.db.statblocks.getLinkedStatblock(token_id);
const abilities = linked ? await window.db.statblocks.listAbilities(linked.id) : [];
```

### Runtime user flow

1. Create token and statblock in the same world.
2. Attach one or more abilities to the statblock.
3. Link token to statblock.
4. Enter battlemap runtime and place/select token.
5. Use ability picker for active abilities.
6. Double-click token to inspect full statblock popup.

## Related Files

- `src/database/db.ts`
- `src/main.ts`
- `src/preload.ts`
- `src/shared/ipcChannels.ts`
- `src/renderer/pages/StatBlocksPage.tsx`
- `src/renderer/components/statblocks/StatBlockForm.tsx`
- `src/renderer/components/statblocks/StatBlockCard.tsx`
- `src/renderer/components/runtime/AbilityPickerPanel.tsx`
- `src/renderer/components/runtime/StatBlockPopup.tsx`
- `src/renderer/pages/BattleMapRuntimePage.tsx`

## Test Coverage

- `tests/unit/main.test.ts`
- `tests/unit/renderer/components/statblocks.test.tsx`
- `tests/unit/renderer/abilityPickerPanel.test.tsx`
- `tests/unit/renderer/battleMapRuntimePage.test.tsx`
- `tests/e2e/statblock-statistics.test.ts`
- `tests/e2e/battlemap-runtime-statblock-popup.test.ts`

## Known Limits

- No dedicated renderer UI yet for link/unlink token operations (API is available and tested through integration flows).
- Runtime popup is read-first; it does not edit statblocks in place.
- No combat state machine or rule resolution built into statblocks.
