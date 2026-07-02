# Character & Faction Relationships

## Purpose

Track named, directional relationships between two characters, and separately between
two factions (e.g. "Myra is the Mentor of Agnes, Agnes is the Student of Myra"; "The
Silver Hand is the Rival of the Ashen Concord"). Distinct from the pre-existing free-text
`sections.relationships` narrative field on both entities — this is a structured,
per-counterpart record with its own labels, shown as a list panel on the detail page.

## Scope (Current Implementation)

- Same-type only: character<->character and faction<->faction. No character<->faction
  relationships.
- Each relationship is a single row with two labels — one per direction — created,
  edited, and deleted as one atomic unit, not as two independent rows.
- A character (or faction) may have any number of relationships with the same
  counterpart, as long as the label pair differs from any existing relationship with
  that counterpart (enforced by a DB `UNIQUE` constraint).
- Display is a simple list/card panel on the detail page — explicitly not a graph/network
  visualization; no new charting library was introduced for this feature.
- Out of scope: relationship history/audit trail beyond `created_at`/`updated_at`, a
  controlled vocabulary/enum for labels (freeform text only), and character<->faction
  relationships.

## User-Facing Behavior

### Character detail page (`/world/:id/characters/:characterId`)

- A "Character Relationships" panel renders below the existing Factions membership
  section (deliberately not titled just "Relationships", to avoid colliding with the
  pre-existing free-text `sections.relationships` field rendered above it).
- Empty state: "No tracked relationships yet."
- Each row shows the counterpart's name as a link to their own detail page, followed by
  this character's label for them in parentheses (e.g. "Agnes (Mentor)"), plus Edit and
  Remove actions.
- "Add Relationship" opens a modal with a searchable character combobox (reusing
  `CharacterCombobox`, excluding only the current character) and two text inputs: "This
  character calls them" and "They call this character". The combobox does **not**
  exclude already-related characters, since multiple differently-labeled relationships
  with the same person are allowed.
- Editing a relationship pre-fills both labels (oriented from the currently-viewed
  character's perspective) and disables the counterpart picker — changing who the
  relationship is with is delete-then-add, not an in-place edit.
- Removing a relationship requires confirmation via `ConfirmDialog`.

### Faction detail page (`/world/:id/factions/:factionId`)

- Same panel/form pattern, titled "Faction Relationships", rendered inside
  `FactionDetailContent.tsx` (not `FactionDetailPage.tsx`) so it stays part of the same
  single bordered "card" as the rest of the faction's body sections.
- The counterpart picker is a plain `<select>` populated from the world's already-loaded
  faction list (`allFactionsInWorld`), not a searchable combobox — no server-side faction
  search infrastructure exists, and faction lists are small enough not to need one.

## Architecture Notes

- IPC channels (`src/shared/ipcChannels.ts`):
  - `CHARACTER_RELATIONSHIPS_GET_ALL_BY_CHARACTER`, `CHARACTER_RELATIONSHIPS_ADD`,
    `CHARACTER_RELATIONSHIPS_UPDATE`, `CHARACTER_RELATIONSHIPS_DELETE`.
  - `FACTION_RELATIONSHIPS_GET_ALL_BY_FACTION`, `FACTION_RELATIONSHIPS_ADD`,
    `FACTION_RELATIONSHIPS_UPDATE`, `FACTION_RELATIONSHIPS_DELETE`.
- Main handlers: `src/main/ipc/registerCharacterRelationshipHandlers.ts`,
  `registerFactionRelationshipHandlers.ts` — one file per domain, both registered in
  `src/main.ts`. The `getAllBy*` handlers run a single orientation-normalizing query
  (`CASE WHEN <id-column> = ?` on every projected column) so the caller never needs to
  know which physical DB column the queried id landed in — the result always exposes
  `counterpart_id`, `counterpart_name`, `subject_label` (what the queried entity calls
  the counterpart), and `counterpart_label` (what the counterpart calls the queried
  entity).
- Preload bridges: `window.db.characterRelationships`, `window.db.factionRelationships`
  in `src/preload.ts`, typed via `DbApiRelationships` in
  `src/shared/contracts/dbApiRelationships.ts` (split out of `dbApi.ts` to stay within
  its file-size budget; `DbApi extends DbApiRelationships`).
- Renderer:
  - `src/renderer/hooks/useCharacterRelationships.ts`, `useFactionRelationships.ts` —
    load-on-mount plus `addRelationship`/`updateRelationship`/`deleteRelationship`
    mutations, each reloading the list on success and surfacing success/error toasts
    itself (matching `useCharacterCrud.ts`'s toast-owning convention, not
    `useCharacterFactionMemberships.ts`'s silent one).
  - `src/renderer/components/characters/CharacterRelationshipsPanel.tsx`,
    `CharacterRelationshipForm.tsx` and the faction equivalents in
    `src/renderer/components/factions/` — two near-duplicate component pairs rather than
    one generic/parameterized component, matching the existing
    characters-vs-factions folder split and the differing counterpart-picker UI.
  - Both panels' `handleSave` reorient the form's subject/counterpart labels onto the
    correct DB column before calling `updateRelationship`: the DB's
    `character_label`/`related_label` (or `faction_label`/`related_label`) columns are
    pinned to whichever id was stored as the row's `character_id` vs
    `related_character_id` when the row was first created, which is not necessarily the
    entity currently being viewed. Passing the form's fields straight through without
    this check would silently swap the two labels when editing from the counterpart's
    side — covered by a dedicated test in each panel's test file.

## Data Model

### CharacterRelationship row

```ts
interface CharacterRelationship {
  id: number;
  character_id: number; // FK -> characters.id, ON DELETE CASCADE
  related_character_id: number; // FK -> characters.id, ON DELETE CASCADE
  character_label: string; // what character_id calls related_character_id
  related_label: string; // what related_character_id calls character_id
  created_at: string;
  updated_at: string;
}
```

`CHECK (character_id != related_character_id)`;
`UNIQUE (character_id, related_character_id, character_label, related_label)`.

### FactionRelationship row

Structural equivalent, scoped to `faction_id` / `related_faction_id` / `faction_label` /
`related_label`, referencing `factions(id)`.

### View/Input shapes (`src/shared/contracts/dbApiPayloads.ts`)

`CharacterRelationshipView`/`FactionRelationshipView` — the raw row plus `counterpart_id`,
`counterpart_name`, `subject_label`, `counterpart_label` (the orientation-normalized
projection returned by `getAllByCharacter`/`getAllByFaction`).

`CharacterRelationshipInput`/`FactionRelationshipInput` — add payload (both ids, both
labels). `CharacterRelationshipUpdateInput`/`FactionRelationshipUpdateInput` — update
payload (labels only; the counterpart id is immutable post-creation).

## Validation and Error Rules

Main-process rules (`registerCharacterRelationshipHandlers.ts`,
`registerFactionRelationshipHandlers.ts`):

- Self-relationships are rejected before the DB CHECK is reached, with a friendlier
  message: `'A character cannot have a relationship with themselves.'` /
  `'A faction cannot have a relationship with itself.'`
- Both labels are required (trimmed non-empty): `'Both relationship labels are
  required.'`
- A `UNIQUE` constraint violation on add/update is translated to: `'A relationship with
  these exact labels already exists between these two characters/factions.'`

Renderer-side: both forms require a selected counterpart and two non-empty labels before
calling `onSave`.

## Tests

- `tests/unit/database/characters.test.ts`, `factions.test.ts` — migration creates
  `character_relationships`/`faction_relationships` with the expected columns, `CHECK`,
  `UNIQUE`, and indexes.
- `tests/unit/ipc/registerCharacterRelationshipHandlers.test.ts`,
  `registerFactionRelationshipHandlers.test.ts` — orientation-normalizing query params,
  add/update/delete, self-relationship rejection, and unique-violation friendly errors.
- `tests/unit/ipc/registrars.test.ts` — registrar wiring and full IPC channel coverage.
- `tests/unit/renderer/characterRelationshipsPanel.test.tsx`,
  `factionRelationshipsPanel.test.tsx` — empty state, row rendering, add flow (including
  counterpart picker), remove flow, and the label-reorientation edit case (editing from
  the side where the viewed entity is stored as the row's "related" id).
- `tests/e2e/characterRelationships.test.ts`, `factionRelationships.test.ts` — full app
  flow: add a relationship from one entity's detail page, verify correctly-oriented
  labels on both entities' pages, edit, verify both sides update, delete, verify both
  sides return to the empty state.

## Known Limits and Non-Goals

- The `UNIQUE` constraint does not catch a "reverse-orientation duplicate" — a second row
  inserted with the two id columns swapped relative to an existing row (e.g. inserting
  `(Agnes, Myra, Student, Mentor)` as a separate row rather than editing the existing
  `(Myra, Agnes, Mentor, Student)` row). This is a deliberate accepted limitation: SQL
  can't express swap-invariant uniqueness without a generated column or trigger, and the
  UI's edit-in-place flow makes this a contrived edge case rather than a realistic bug
  vector.
- Labels are freeform text with no controlled vocabulary/enum.
- No relationship history or audit trail beyond `created_at`/`updated_at`.
- No graph/network visualization — list/card display only.
