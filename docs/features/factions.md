# Factions Feature

## Purpose

Factions are a world-scoped wiki entity for organizations (companies, cults,
governments, guilds, etc.). Each faction has a short profile, a fixed set of editable
long-text sections, an optional image, a standardized "Wiki Summary" of mostly-optional
fields, a per-world user-managed Type, an optional Parent Organization (forming a
hierarchy), and a roster of Character memberships with free-text roles (founder,
member, or any leadership title). Factions are searchable, listed as cards, and have a
read-first detail/article page with clickable links to parent/child factions and member
characters.

## Scope (Current Implementation)

- World-scoped faction CRUD (`world_id` required on create).
- Fixed long-text sections: History, Goals/Motives, Relationships, Notes.
- Standardized Wiki Summary fields (all optional): Status, IPA Pronunciation,
  Headquarters, Current Total Members, Founded, Disbanded, Aliases (list), Locations
  (list).
- Type: a per-world managed list (`faction_types` table), not a hardcoded enum, edited
  via a "Manage Types" modal reachable from the Factions list page and from the Faction
  form. Deleting a type in use sets affected factions' type to null ("Uncategorized").
- Parent Organization: a self-referencing `parent_faction_id`, forming a hierarchy.
  Deleting a parent promotes its children to top-level (`ON DELETE SET NULL`), never
  cascades. Assigning a parent that would create a cycle is rejected both client-side
  (inline form error, options for descendants are excluded from the picker entirely)
  and server-side (defense in depth).
- Character membership: a `faction_members` junction table (`role` free text, `is_primary`
  flag). Membership rows (add/remove/role) are managed only from the Faction's edit
  form; the Character side can only toggle which one of its memberships is primary.
- Optional non-destructive faction image crop/upload via the shared `vv-media://`
  media protocol.
- Client-side substring search across name, profile, sections, and every Wiki Summary
  value, plus an exact-name-match rule that also surfaces all descendants of a matched
  ancestor, plus an independent Type filter dropdown.
- Out of scope: SQLite full-text search (FTS5), per-field structured search UI,
  user-defined/arbitrary text sections (the four sections above are fixed), and
  campaign-scoping (factions are world-scoped only).

## User-Facing Behavior

### Factions page (`/world/:id/factions`)

- Loads the world, its factions, and its faction types via
  `window.db.factions.getAllByWorld(worldId)` and
  `window.db.factionTypes.getAllByWorld(worldId)`.
- Shows explicit states for loading, load failure, and empty list (`No factions yet.`).
- A search input filters by substring match against any field. Additionally, typing a
  faction's name _exactly_ (case-insensitive) also surfaces all of its descendants,
  even if the descendant's own fields don't contain that text. A separate "Filter by
  type" dropdown narrows to an exact type match; the two filters combine with AND.
- The total faction count for the world (independent of search/filter/pagination) is
  shown via `EntityCountBadge`, formatted with thousands separators.
- Below the search/type-filter row, a `PageSizeSelect` (10/50/100, default 50) sits at
  the top-right of the cards grid and a `PaginationBar` sits below it; only the current
  page's cards are mounted. Changing the search text, type filter, or sort method
  resets to page 1. See "Pagination" in `docs/features/characters.md` — the mechanism
  is shared verbatim between both pages.
- "New Faction" and "Manage Types" buttons in the header; "Manage Types" opens a modal
  to add/rename/delete the world's faction type list.
- Clicking a card's body navigates to its detail page
  (`/world/:id/factions/:factionId`); the card's own Edit button still opens the form
  modal directly, and Delete requires confirmation.
- Cards show the faction image (or a `No image` placeholder), name, and the resolved
  type name ("Uncategorized" if unset or the type was deleted).

### Faction detail page (`/world/:id/factions/:factionId`)

- Read-first article view loaded via `window.db.factions.getById`, plus the world's
  full faction list (for resolving the parent link and computing direct children) and
  faction members (joined with character names).
- Basic Information: Type (resolved name), Parent Organization (clickable link to the
  parent's detail page, or "None (top-level)"), and the Wiki Summary fields.
- Every standard Wiki Summary field/group stays visible on the detail page even when
  values are empty; rows remain with blank values instead of disappearing.
- Aliases / Locations lists, then the four text sections (only rendered when non-empty).
- Founders / Leadership / Members are rendered as three separate grouped lists, derived
  from `faction_members.role`: literal `'founder'` rows under Founders, literal
  `'member'` rows under Members, and any other role string (e.g. "President", "King")
  under Leadership with the role shown alongside the name. Each member name links to
  `/world/:id/characters/:characterId`.
- Children: factions whose `parent_faction_id` points to this faction, each as a link
  to its own detail page (direct children only, not the full subtree).
- An "Edit" button opens the same `FactionForm` modal used by the list page, pre-filled,
  including the current member roster.

### Faction image upload

- Powered by `FactionImageDropzone` (same dnd-kit + hidden file input pattern as
  `CharacterImageDropzone`/`WorldImageDropzone`/`TokenImageDropzone`).
- On file selection, `FactionForm` opens the shared `ImageCropModal` immediately.
- Save persists cropped display bytes plus original source bytes through
  `window.db.factions.importImage(...)`.
- Rows keep both `factions.image_src` and `factions.original_image_src`, plus
  `factions.image_crop` JSON so `Edit crop` can restore the previous framing.
- Shared crop details live in `docs/features/image-cropping.md`.
- Main process validates mime type (PNG/JPEG/WEBP/GIF) and size (≤ 5 MB).
- The shared `vv-media://` protocol handler in `src/main.ts` serves faction images from
  `userData/faction-images/` alongside character/token/world images.

### Faction type management

- `ManageFactionTypesModal` lists the world's faction types with inline rename (text
  input + Save) and delete (with a `ConfirmDialog`), plus an "Add Type" input + button.
- `useFactionTypes` wraps `window.db.factionTypes.{add,rename,delete}` and reloads the
  world's faction data after each mutation.
- Deleting a type sets `factions.type_id` to `NULL` for any faction using it
  (`ON DELETE SET NULL` — no app-level cleanup needed).

### Faction membership management

- Managed only from `FactionForm`'s "Members, Founders & Leadership" section: a
  repeatable list of `[character combobox] [role text input] [remove]` rows, plus an
  "Add Member" button.
- The character picker (`CharacterCombobox.tsx`, used by `FactionMembersEditor.tsx`) is
  a searchable, server-side combobox rather than a plain `<select>` over a fully-loaded
  character list — the world's character list is no longer eagerly loaded for this
  form. It searches via `CHARACTERS_SEARCH_BY_WORLD` (case-insensitive **prefix** match
  on `name` only — distinct from the page-level substring search described in
  `docs/features/characters.md`), debounced 200ms, paginated via infinite scroll in
  fixed batches of 50, and excludes characters already added as members of the same
  faction from each row's results.
- On save, `useFactionCrud` calls `window.db.factions.add`/`update` and then
  `window.db.factionMembers.setForFaction(factionId, members)`, which transactionally
  replaces the faction's entire roster while preserving any existing `is_primary` flag
  for characters who remain in the new set (primary status is owned by the Character
  side, not reset by a faction-form save). A character who had no faction membership
  anywhere before being added is automatically made primary in the faction they're
  newly assigned to.
- The character-side primary toggle (`window.db.factionMembers.setPrimary`) is
  documented in `docs/features/characters.md`'s Character detail page section.

## Architecture Notes

- IPC channels (`src/shared/ipcChannels.ts`):
  - `FACTIONS_GET_ALL_BY_WORLD`, `FACTIONS_GET_BY_ID`, `FACTIONS_ADD`,
    `FACTIONS_UPDATE`, `FACTIONS_DELETE`, `FACTIONS_IMPORT_IMAGE`.
  - `FACTION_TYPES_GET_ALL_BY_WORLD`, `FACTION_TYPES_ADD`, `FACTION_TYPES_RENAME`,
    `FACTION_TYPES_DELETE`.
  - `FACTION_MEMBERS_GET_ALL_BY_FACTION`, `FACTION_MEMBERS_GET_ALL_BY_CHARACTER`,
    `FACTION_MEMBERS_GET_ALL_PRIMARY_BY_WORLD`, `FACTION_MEMBERS_SET_FOR_FACTION`,
    `FACTION_MEMBERS_SET_PRIMARY`.
  - `CHARACTERS_SEARCH_BY_WORLD` (owned by the Characters domain, documented in
    `docs/features/characters.md`) is used here by the member-picker combobox.
- Main handlers: `src/main/ipc/registerFactionHandlers.ts`,
  `registerFactionTypeHandlers.ts`, `registerFactionMemberHandlers.ts` — three separate
  files (one per preload namespace), all registered in `src/main.ts`.
- Preload bridges: `window.db.factions`, `window.db.factionTypes`,
  `window.db.factionMembers` in `src/preload.ts`, typed via `DbApi.factions` /
  `DbApi.factionTypes` / `DbApi.factionMembers` in `src/shared/contracts/dbApi.ts`.
- Shared hierarchy logic: `src/shared/factionHierarchy.ts` — pure functions
  (`getAncestorIds`, `getDescendantIds`, `wouldCreateCycle`) over
  `{ id, parent_faction_id }[]`, used by: the server-side cycle check in
  `registerFactionHandlers.ts`'s update handler, the client-side cycle check and
  parent-picker filtering in `FactionForm.tsx`, the Factions-page search's
  ancestor-exact-match expansion (`factionSearch.ts`), and the Characters-page search's
  primary-faction ancestor expansion (`characterSearch.ts`).
- Renderer:
  - `src/renderer/pages/FactionsPage.tsx` (route `/world/:id/factions`, linked from
    `WorldSidebar`) and `src/renderer/pages/FactionDetailPage.tsx` (route
    `/world/:id/factions/:factionId`).
  - `src/renderer/hooks/useWorldFactionsData.ts`, `useFactionCrud.ts`,
    `useFactionTypes.ts`, `useCharacterSearch.ts` (debounced, paginated search backing
    the member-picker combobox; documented alongside `CHARACTERS_SEARCH_BY_WORLD` in
    `docs/features/characters.md`), `usePaginatedList.ts` (list-page pagination,
    shared with Characters — see "Pagination" in `docs/features/characters.md`).
  - `src/renderer/components/ui/PageSizeSelect.tsx`, `PaginationBar.tsx` (shared with
    Characters — see "Pagination" in `docs/features/characters.md`).
  - `src/renderer/components/factions/`: `FactionCard.tsx`, `FactionImageDropzone.tsx`,
    `FactionForm.tsx`, `FactionMembersEditor.tsx`, `CharacterCombobox.tsx`,
    `ManageFactionTypesModal.tsx`. Aliases/Locations list editing and the flat Basic
    Information fields reuse Character's existing
    `CharacterWikiSummaryListEditor`/`CharacterWikiSummaryGroupFields` components
    directly (both are already generic over field keys/labels, not Character-specific).
  - `src/renderer/lib/factionSearch.ts` (`flattenFactionForSearch`,
    `factionMatchesQuery`) and `src/renderer/lib/factionWikiSummaryFieldConfig.ts`
    (`FACTION_BASIC_INFO_FIELDS`).

## Data Model

### Faction row

```ts
interface Faction {
  id: number;
  world_id: number;
  name: string;
  profile: string | null;
  image_src: string | null;
  original_image_src: string | null;
  image_crop: string | null;
  sections: string; // JSON text of FactionSections
  wiki_summary: string; // JSON text of FactionWikiSummary
  type_id: number | null; // FK -> faction_types.id, ON DELETE SET NULL
  parent_faction_id: number | null; // FK -> factions.id (self), ON DELETE SET NULL
  created_at: string;
  updated_at: string;
}
```

### FactionType row

```ts
interface FactionType {
  id: number;
  world_id: number;
  name: string; // UNIQUE(world_id, name)
  created_at: string;
}
```

### FactionMember row (junction table)

```ts
interface FactionMember {
  id: number;
  faction_id: number; // FK -> factions.id, ON DELETE CASCADE
  character_id: number; // FK -> characters.id, ON DELETE CASCADE
  role: string; // 'founder' | 'member' | any free-text leadership title
  is_primary: number; // 0 | 1, app-layer-enforced "at most one true per character"
  created_at: string;
}
```

### JSON shapes (`src/shared/contracts/factionTypes.ts`)

`FactionSections` — fixed keys: `history`, `goalsMotives`, `relationships`, `notes`
(all optional strings).

`FactionWikiSummary` — flat, all optional: `status`, `ipaPronunciation`,
`headquarters`, `currentTotalMembers`, `founded`, `disbanded`, `aliases: string[]`,
`locations: string[]`.

## Validation and Error Rules

Main-process rules (`registerFactionHandlers.ts`):

- `world_id` is required on create (`Faction world_id is required`).
- `name` is required and trimmed for create/update (`Faction name is required`).
- `original_image_src` is optional; blank values normalize to `NULL`.
- `image_crop` is optional; blank values normalize to `NULL`, otherwise must be valid
  JSON text.
- `sections` and `wiki_summary` must be valid JSON text when provided; default to `'{}'`.
- On update, if `parent_faction_id` is set to a number, the handler loads all factions
  in the same world and rejects the update with `'A faction cannot be its own
  ancestor.'` if `wouldCreateCycle` returns true.
- Image import validates mime type (PNG/JPEG/WEBP/GIF only) and size (≤ 5 MB).

`registerFactionTypeHandlers.ts`: `name` is required; a duplicate name within the same
world surfaces `'A faction type with this name already exists.'` (translated from the
`UNIQUE(world_id, name)` SQLite constraint violation).

Renderer-side: `FactionForm` requires a non-empty name, excludes the faction itself and
all of its descendants from the Parent Organization picker (so a cycle can't even be
selected), and re-validates with `wouldCreateCycle` on submit as a final guard.

## Tests

- `tests/unit/shared/factionHierarchy.test.ts` — ancestor/descendant walks and cycle
  detection on fixture graphs, including malformed pre-existing cycles.
- `tests/unit/database/factions.test.ts` — schema migration creates all three tables,
  columns, indexes, and FK-safe creation order, and is idempotent.
- `tests/unit/ipc/registerFactionHandlers.test.ts`,
  `registerFactionTypeHandlers.test.ts`, `registerFactionMemberHandlers.test.ts` — CRUD,
  validation errors, cycle rejection, roster replace with primary-flag preservation, and
  the primary-toggle transaction.
- `tests/unit/ipc/registrars.test.ts`, `tests/unit/main.bootstrap.test.ts` — registrar
  wiring and the `faction-images` protocol host.
- `tests/unit/preload.test.ts` — `window.db.factions`/`factionTypes`/`factionMembers`
  bridge forwarding.
- `tests/unit/renderer/lib/factionSearch.test.ts` — substring match, type-exact-match
  ancestor-subtree expansion, and the no-false-positive-on-partial-match guard.
- `tests/unit/renderer/factionCard.test.tsx`, `factionForm.test.tsx`,
  `manageFactionTypesModal.test.tsx` — component-level behavior, including the
  cycle-rejection inline error and the member add/remove rows (driven via the
  `CharacterCombobox`, with member-exclusion coverage).
- `tests/unit/renderer/characterCombobox.test.tsx`,
  `tests/unit/renderer/hooks/useCharacterSearch.test.ts` — combobox selection,
  exclusion, debounce, and infinite-scroll behavior.
- `tests/unit/renderer/factionsPage.test.tsx`, `factionDetailPage.test.tsx` — page-level
  load, search, type filter, create flow, detail-page rendering/grouping/linking, and
  pagination (default page size, Next-page navigation, results-per-page selection,
  page-reset-on-search).
- `tests/unit/renderer/hooks/usePaginatedList.test.ts`,
  `tests/unit/renderer/components/ui/pageSizeSelect.test.tsx`,
  `tests/unit/renderer/components/ui/paginationBar.test.tsx` — shared pagination hook
  and UI components, documented in full in `docs/features/characters.md`.
- `tests/unit/renderer/lib/characterSearch.test.ts` — the additive primary-faction
  exact-match and ancestor-expansion rules (documented in `docs/features/characters.md`).

## Known Limits and Non-Goals

- Page-level search (`FactionsPage`) is a simple case-insensitive substring match over a
  flattened in-memory blob, not SQLite FTS5, matching the same accepted limitation as
  Characters. The member-picker combobox is a _separate_ mechanism: server-side,
  name-only, prefix-match (`LIKE 'query%'`), backed by `CHARACTERS_SEARCH_BY_WORLD` —
  do not confuse the two.
- The four text sections (History, Goals/Motives, Relationships, Notes) are fixed, not
  user-defined/arbitrary blocks.
- Leadership/Founder/Member grouping on the detail page is a UI convention over the
  free-text `role` column (anything not literally `'founder'` or `'member'` is shown
  under Leadership) — it is not a structural/enum constraint, so a role typo won't be
  caught by validation.
- `is_primary` is enforced "at most one true per character" at the app layer
  (`FACTION_MEMBERS_SET_PRIMARY`'s transaction), not by a DB constraint.
- Orphaned faction images (from cancelled forms or cleared images) are not cleaned up
  automatically, matching the accepted limitation already documented for
  worlds/tokens/characters.
- No campaign-level scoping; factions belong to a world only.
- Pagination only windows what gets _rendered_; `getAllByWorld` still fetches every
  faction in the world on every load/reload, and search/type-filter/sort still run
  over the full in-memory list — see the matching note in
  `docs/features/characters.md`'s Known Limits.
