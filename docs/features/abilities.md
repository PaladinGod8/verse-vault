# Abilities Feature

## Purpose

The Abilities feature provides a local-first workflow to create, view, edit, and delete world-scoped abilities, plus optional parent-child ability links for supported passive subtypes.

## User-Facing Behavior

### Abilities Page (`/world/:id/abilities`)

- Validates the route `:id` as a positive integer; otherwise shows `Invalid world id.`.
- Loads the parent world via `window.db.worlds.getById(worldId)`.
- If the world is missing, shows `World not found.`.
- Loads abilities via `window.db.abilities.getAllByWorld(worldId)` after world lookup succeeds.
- Shows explicit states for loading (`Loading abilities...`), load failure (`Unable to load abilities right now.`), empty list (`No abilities yet.`), and table view.
- Renders a table with columns: Name, Type, Subtype, Trigger, Actions.
- Subtype and Trigger cells fall back to `N/A` when values are null.
- Supports creation from a `New Ability` modal.
- Supports editing from an `Edit Ability` modal with prefilled values.
- Supports deletion from each row:
  - Requires confirmation (`Delete "<name>"? This cannot be undone.`).
  - Shows `Deleting...` on the active row action.
  - Removes the ability from local state after successful delete.
- Shows `Manage children` only when the ability is `type=passive` and `passive_subtype` is `linchpin`, `keystone`, or `rostering`.
- Includes a `Back to world` link to `/world/:id` and renders `WorldSidebar`.

### Ability Form Behavior (Create/Edit Modal)

- Core fields:
  - `Name` is required.
  - `Type` is required (`active` or `passive`).
  - `Description` and `Trigger` are optional.
- Conditional fields by type/subtype:
  - `active`: shows `Cast cost (JSON object)`.
  - `passive`: shows `Passive subtype (optional)` and `Conditions (JSON array)`.
  - `passive + keystone`: shows `Keystone level (optional)` (loaded from levels in the same world).
  - `passive + rostering`: shows `Pick count`, `Pick timing`, and `Picks are permanent`.
- JSON fields are normalized before submit:
  - `effects` and `conditions` are stored as compact JSON arrays.
  - `cast_cost` is stored as a compact JSON object.
  - Empty JSON editors fall back to `[]` or `{}` depending on field.
- Edit mode pretty-prints initial JSON values for readability in the textareas.
- On successful create, new ability is inserted/moved to top of local list.
- On successful edit, only the matching local row is replaced (position preserved).

### Child Link Management Modal

- Opened from `Manage children` on supported parent abilities only.
- Loads current children via `window.db.abilities.getChildren(parentId)`.
- Provides search across name, type, and subtype.
- Splits results into:
  - `Linked children`
  - `Available abilities` (same world, excluding self and already linked)
- Add flow:
  - Calls `window.db.abilities.addChild({ parent_id, child_id })`.
  - Reloads linked children from backend after success.
- Remove flow:
  - Calls `window.db.abilities.removeChild({ parent_id, child_id })`.
  - Removes child from local linked list after success.
- Friendly duplicate-link mapping: backend message `Child ability link already exists` is shown as `That ability is already linked as a child.`.

## Architecture Notes

- Renderer components:
  - `src/renderer/pages/AbilitiesPage.tsx`
  - `src/renderer/components/abilities/AbilityForm.tsx`
  - `src/renderer/components/abilities/AbilityChildrenManager.tsx`
- Renderer uses `window.db` only (no direct `ipcRenderer` usage).
- Preload bridge methods on `window.db.abilities`:
  - `getAllByWorld`
  - `getById`
  - `add`
  - `update`
  - `delete`
  - `addChild`
  - `removeChild`
  - `getChildren`
- Main IPC handlers:
  - `ABILITIES_GET_ALL_BY_WORLD`: select abilities by `world_id` ordered `updated_at DESC`
  - `ABILITIES_GET_BY_ID`
  - `ABILITIES_ADD`
  - `ABILITIES_UPDATE` (partial update via `hasOwnProperty` checks)
  - `ABILITIES_DELETE`
  - `ABILITIES_ADD_CHILD`
  - `ABILITIES_REMOVE_CHILD`
  - `ABILITIES_GET_CHILDREN` (join `ability_children` -> child ability rows, ordered `updated_at DESC`)
- Database tables:
  - `abilities`
  - `ability_children` (`UNIQUE(parent_id, child_id)`)

## Data Shape

`Ability` includes:

- `id`
- `world_id`
- `name`
- `description`
- `type`
- `passive_subtype`
- `level_id`
- `effects`
- `conditions`
- `cast_cost`
- `trigger`
- `pick_count`
- `pick_timing`
- `pick_is_permanent`
- `created_at`
- `updated_at`

`AbilityChild` includes:

- `parent_id`
- `child_id`

## Validation and Error Rules

### Renderer Validation

- `Ability name is required.` when name is blank after trim.
- `Ability type is required.` when type is blank.
- `Ability type must be active or passive.` when value is outside supported options.
- `Passive subtype can only be set when type is passive.` for invalid type/subtype combinations.
- `Passive subtype must be linchpin, keystone, or rostering.` for unsupported subtype values.
- JSON validation:
  - Invalid JSON parse and shape checks for effects/conditions/cast cost.
  - Shape-specific errors such as `Cast cost must be a JSON object.`.
- Keystone level validation:
  - `Level must be a valid selection.` if keystone level is provided but not a positive integer.
- Rostering validation:
  - `Pick count must be a non-negative whole number.` when invalid.
  - `Pick timing must be obtain or rest.` when invalid.
- Levels lookup failure (keystone UI): `Unable to load levels.`.

### Main Handler Validation and Errors

- Add ability:
  - Trims `name` and `type`.
  - Throws `Ability name is required` when empty.
  - Throws `Ability type is required` when empty.
  - Throws `Failed to create ability` if inserted row cannot be read back.
- Update ability:
  - Validates trimmed `name`/`type` when those keys are provided.
  - Throws `Ability name cannot be empty` / `Ability type cannot be empty` for invalid updates.
  - Always updates `updated_at` (even with no mutable fields provided).
  - Throws `Ability not found` if row does not exist after update.
- Child links:
  - Rejects self-linking: `Parent ability cannot be linked to itself`.
  - Requires parent and child rows to exist.
  - Enforces same-world linking (`Parent and child abilities must belong to the same world`).
  - Maps unique-constraint duplicates to `Child ability link already exists`.
- Delete behaviors:
  - `ABILITIES_DELETE` returns `{ id }` even if row was already absent.
  - `ABILITIES_REMOVE_CHILD` returns `{ parent_id, child_id }` even if link did not exist.

### Database Constraints

- `abilities.type` check constraint: `active | passive`.
- `abilities.passive_subtype` check constraint (nullable): `linchpin | keystone | rostering`.
- `abilities.pick_timing` check constraint (nullable): `obtain | rest`.
- Defaults:
  - `effects = '[]'`
  - `conditions = '[]'`
  - `cast_cost = '{}'`
  - `pick_is_permanent = 0`
- `ability_children` uniqueness on `(parent_id, child_id)`.

## Limits and Non-Goals

- No dedicated ability detail route yet; interaction is table + modal driven.
- The list table intentionally shows only summary columns (name/type/subtype/trigger), not full JSON payload fields.
- Child management UI is intentionally limited to passive abilities with subtype `linchpin`, `keystone`, or `rostering`.
- No cycle-detection or graph-depth rules are implemented for child links beyond self-link prevention and duplicate prevention.
- JSON field validation checks parseability and top-level shape only; there is no domain-specific JSON schema validation for effects/conditions/cast cost.
