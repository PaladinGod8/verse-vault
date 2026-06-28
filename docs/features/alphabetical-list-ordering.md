# Alphabetical List Ordering

## Purpose

Keep name-based entity lists predictable. Card grids and simple name tables render in
alphabetical order instead of DB/load order. Character, Faction, and World card grids
additionally let the user toggle to a "Recently Viewed" order.

## Scope

- Character cards (alphabetical or recently-viewed, toggle)
- Faction cards (alphabetical or recently-viewed, toggle)
- World cards (alphabetical or recently-viewed, toggle)
- StatBlock cards (alphabetical only — no detail page to anchor a "viewed" moment)
- Tokens table
- Campaigns table
- BattleMaps table
- Levels table
- Abilities table

Explicit manual-order pages stay unchanged: arcs, acts, sessions, scenes, and other
`sort_order`-driven flows.

## Behavior

- Alphabetical sort uses entity `name`, case-insensitive, ascending; numeric substrings use
  natural ordering (`Item 2` before `Item 10`); equal names break ties by `id`.
- Recently-viewed sort uses `last_viewed_at` descending; never-viewed records sort last,
  alphabetically among themselves; equal timestamps break ties alphabetically.
- `last_viewed_at` is stamped via `markViewed` IPC calls when a character, faction, or world
  detail page loads (see `WORLDS_MARK_VIEWED`, `CHARACTERS_MARK_VIEWED`, `FACTIONS_MARK_VIEWED`
  in `docs/03_IPC_CONTRACT.md`).
- The chosen sort method persists per list (`characters`, `factions`, `worlds`) in
  `app_settings.config.cardSortPreferences`, surviving app restarts.
- Search and type filters apply first; visible results then sort by the active method.

## Renderer Notes

- Alphabetical-only helper: `src/renderer/lib/sortNamedRecords.ts`
- Dispatching helper (used by toggleable lists): `src/renderer/lib/sortCardRecords.ts`
- Sort-preference persistence: `src/renderer/hooks/useCardSortPreference.ts`
- Toggle UI: `src/renderer/components/ui/CardSortToggle.tsx`
- Applied at render level, so CRUD state shape and optimistic flows stay unchanged.

## Tests

- `tests/unit/renderer/lib/sortNamedRecords.test.ts`
- `tests/unit/renderer/lib/sortCardRecords.test.ts`
- `tests/unit/renderer/cardSortToggle.test.tsx`
- Page coverage in characters, factions, worlds, campaigns, and tokens tests
