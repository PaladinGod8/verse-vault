# Alphabetical List Ordering

## Purpose

Keep name-based entity lists predictable. Card grids and simple name tables render in
alphabetical order instead of DB/load order.

## Scope

- Character cards
- Faction cards
- World cards
- StatBlock cards
- Tokens table
- Campaigns table
- BattleMaps table
- Levels table
- Abilities table

Explicit manual-order pages stay unchanged: arcs, acts, sessions, scenes, and other
`sort_order`-driven flows.

## Behavior

- Sorting uses entity `name`, case-insensitive, ascending.
- Numeric substrings use natural ordering (`Item 2` before `Item 10`).
- Equal names break ties by `id` for stable render order.
- Search and type filters apply first; visible results then sort alphabetically.

## Renderer Notes

- Shared helper: `src/renderer/lib/sortNamedRecords.ts`
- Applied at render level, so CRUD state shape and optimistic flows stay unchanged.

## Tests

- `tests/unit/renderer/lib/sortNamedRecords.test.ts`
- Page coverage in characters, factions, worlds, campaigns, and tokens tests
