# Characters Feature

## Purpose

Characters are a world-scoped wiki entry for each person/creature in a world: a short
profile, optional freeform author credit, optional player-character ownership metadata,
a fixed set of editable long-text sections, an optional image, and a large
standardized "Wiki Summary" of mostly-optional fields. Characters are searchable from a
single search bar by substring match against any stored field value (including faction
and any Wiki Summary value), and are listed as cards.

## Scope (Current Implementation)

- World-scoped character CRUD (`world_id` required on create).
- Optional freeform `author` field for writer credit.
- Optional player-character flag (`is_player_character`) plus required `owner` text when
  that flag is set.
- Fixed long-text sections: Background, Personality, Relationships, Notes.
- Standardized Wiki Summary groups: Biographic Information, Aliases, Titles, Personal
  Description, Ages & Timeline, Conditions, Status & Demographics, Educational History,
  Occupational History, Trivia. All fields are optional.
- Optional non-destructive character image crop/upload via the shared `vv-media://`
  media protocol.
- Client-side substring search across name, profile, player-character label, owner,
  sections, and every Wiki Summary value (including faction).
- Out of scope: SQLite full-text search (FTS5), per-field structured search UI,
  user-defined/arbitrary text sections (the four sections above are fixed), and
  campaign-scoping (characters are world-scoped only, matching the existing
  `statblocks.character_id` FK).

## User-Facing Behavior

### Characters page (`/world/:id/characters`)

- Loads the world and its characters via `window.db.characters.getAllByWorld(worldId)`.
- Shows explicit states for loading, load failure, and empty list (`No characters yet.`).
- A search input filters the in-memory character list by substring match against any
  field (e.g. typing a weight value like `90kg` narrows the list to matching
  characters). This includes `author`, `owner`, and `Player Character` for rows with
  player-character mode enabled. Additively, typing the exact name of a character's
  _primary_ faction (or
  any ancestor of that faction) also includes that character, even if the name doesn't
  appear verbatim in any of the character's own fields — see "Faction-aware search"
  below. When characters exist but none match, shows `No characters match your search.`.
- The total character count for the world (independent of search/pagination) is shown
  via `EntityCountBadge`, formatted with thousands separators (e.g. `11,231
  characters`).
- Below the search bar, a `PageSizeSelect` (10/50/100, default 50) sits at the top-right
  of the cards grid — not the page header — and a `PaginationBar` sits below the grid.
  Only the current page's cards are mounted, so the DOM node count stays bounded
  regardless of how many characters a world has; see "Pagination" below.
- "New Character" opens a modal form. Name is required; everything else, including
  Author, is optional except `Owner`, which becomes required when `Player Character` is
  checked.
- Clicking a card's body navigates to its detail page (`/world/:id/characters/:characterId`);
  the card's own Edit button still opens the form modal directly, and Delete requires
  confirmation (`Delete "<name>"? This cannot be undone.`).
- Cards show the character image (or a `No image` placeholder) and name as the primary
  attributes, with Main Epithet (pulled from the parsed Wiki Summary) as a smaller
  secondary line underneath.

### Character detail page (`/world/:id/characters/:characterId`)

- Read-first article view: image, profile, optional `Player Character` / `Owner: <name>`
  metadata, optional `Author: <name>` credit, the four fixed text sections, and the
  full Wiki Summary groups loaded via `window.db.characters.getById`.
- Every standard Wiki Summary group stays visible on the detail page even when some or
  all values are empty; table cells remain blank instead of the field disappearing.
- A "Factions" section lists every faction membership for this character (role +
  faction name, loaded via `window.db.factionMembers.getAllByCharacter`), with each
  faction name as a link to `/world/:id/factions/:factionId`. At most one membership is
  marked Primary; a "Make primary" button on every non-primary row calls
  `window.db.factionMembers.setPrimary(characterId, factionId)` — this is the only
  membership mutation available from the Character side (adding/removing members is
  faction-side only, see `docs/features/factions.md`).
- An "Edit" button opens the same `CharacterForm` modal used by the list page,
  pre-filled.

### Character image upload

- Powered by `CharacterImageDropzone` (same dnd-kit + hidden file input pattern as
  `WorldImageDropzone`/`TokenImageDropzone`).
- On file selection, `CharacterForm` opens the shared `ImageCropModal` immediately.
- Save persists cropped display bytes plus original source bytes through
  `window.db.characters.importImage(...)`.
- Rows keep both `characters.image_src` and `characters.original_image_src`, plus
  `characters.image_crop` JSON so `Edit crop` can restore the previous framing.
- Shared crop details live in `docs/features/image-cropping.md`.
- Main process validates mime type (PNG/JPEG/WEBP/GIF) and size (≤ 5 MB).
- The shared `vv-media://` protocol handler in `src/main.ts` serves character images
  from `userData/character-images/` alongside token/world images, with the same
  basename-only path checks.

### Faction-aware search (additive)

- `characterMatchesQuery(character, query, primaryFactionByCharacterId, allFactions)` first
  checks the existing substring match; if that fails, it additionally matches when the
  query is an _exact_ (case-insensitive) match against the name of the character's
  faction membership marked `is_primary`, or against the name of any ancestor of that
  faction (via `src/shared/factionHierarchy.ts`'s `getAncestorIds`). This is additive
  only — it never narrows what the old substring search already matched.
- `CharactersPage` loads `window.db.factions.getAllByWorld` and
  `window.db.factionMembers.getAllPrimaryByWorld` alongside the character list to build
  the `primaryFactionByCharacterId` map passed into the search.
- See `docs/features/factions.md` for the Faction entity and its membership model.

### Pagination (shared with Factions)

- The full `getAllByWorld` result is always fetched and filtered/sorted client-side
  (search, faction-aware matching, and `sortCardRecords` are unaffected by this
  change) — only the _rendered_ card grid is windowed. This targets the actual lag
  source: mounting hundreds/thousands of `CharacterCard`/`FactionCard` DOM trees is
  what stalls the renderer, not the in-memory array scan.
- `src/renderer/hooks/usePaginatedList.ts` — generic hook taking the filtered/sorted
  array and a page size (`PAGE_SIZE_OPTIONS = [10, 50, 100]`, default 50), returning
  `{ page, pageSize, totalPages, totalItems, pageItems, setPage, setPageSize }`.
  `setPageSize` resets to page 1; `page` auto-clamps to `totalPages` (e.g. after the
  filtered set shrinks).
- `CharactersPage`/`FactionsPage` reset to page 1 whenever `searchQuery`,
  `sortMethod` (and, for factions, `typeFilter`) change, so a new search never leaves
  the user stranded on an out-of-range page.
- `src/renderer/components/ui/PageSizeSelect.tsx` — the results-per-page `<select>`.
- `src/renderer/components/ui/PaginationBar.tsx` — Previous/Next + "Page X of Y";
  renders nothing when `totalPages <= 1`.

## Architecture Notes

- IPC channels (`src/shared/ipcChannels.ts`): `CHARACTERS_GET_ALL_BY_WORLD`,
  `CHARACTERS_GET_BY_ID`, `CHARACTERS_ADD`, `CHARACTERS_UPDATE`, `CHARACTERS_DELETE`,
  `CHARACTERS_IMPORT_IMAGE`, `CHARACTERS_SEARCH_BY_WORLD`.
- Main handler: `src/main/ipc/registerCharacterHandlers.ts`, registered in
  `src/main.ts`. `CHARACTERS_SEARCH_BY_WORLD` does a case-insensitive **prefix** match
  on `name` only (`LIKE 'query%' COLLATE NOCASE`), paginated via `offset`/`limit`, with
  an optional `excludeCharacterIds` list. Backed by the
  `idx_characters_world_id_name` index (`world_id, name COLLATE NOCASE`). This is a
  separate, narrower mechanism from `characterSearch.ts` below — it exists solely for
  the faction member-picker combobox (`docs/features/factions.md`), not as a
  replacement for the page-level full-text search.
- Preload bridge: `window.db.characters` in `src/preload.ts`, typed via
  `DbApi.characters` in `src/shared/contracts/dbApi.ts`.
- Renderer:
  - `src/renderer/pages/CharactersPage.tsx` (route `/world/:id/characters`, linked from
    `WorldSidebar`) and `src/renderer/pages/CharacterDetailPage.tsx` (route
    `/world/:id/characters/:characterId`).
  - `src/renderer/hooks/useWorldCharactersData.ts`, `useCharacterCrud.ts`,
    `useCharacterFactionMemberships.ts` (read-only memberships + the `setPrimary`
    action, used by the detail page), `usePaginatedList.ts` (shared with Factions —
    see "Pagination" above).
  - `src/renderer/components/ui/PageSizeSelect.tsx`, `PaginationBar.tsx` (shared with
    Factions — see "Pagination" above).
  - `src/renderer/components/characters/`: `CharacterCard.tsx`,
    `CharacterImageDropzone.tsx`, `CharacterForm.tsx`, `CharacterWikiSummaryEditor.tsx`
    and its group/list sub-editors (`CharacterWikiSummaryGroupFields.tsx`,
    `CharacterWikiSummaryListEditor.tsx`, `CharacterWikiSummaryNoteListEditor.tsx`,
    `CharacterWikiSummaryAgesTimelineEditor.tsx`).
  - `src/renderer/lib/characterSearch.ts` (`flattenCharacterForSearch`,
    `characterMatchesQuery`) and `src/renderer/lib/characterWikiSummaryFieldConfig.ts`
    (field label config for the group editors).

## Data Model

### Character row

```ts
interface Character {
  id: number;
  world_id: number;
  name: string;
  profile: string | null;
  is_player_character: number; // 0 | 1
  owner: string | null;
  author: string | null;
  image_src: string | null;
  original_image_src: string | null;
  image_crop: string | null;
  sections: string; // JSON text of CharacterSections
  wiki_summary: string; // JSON text of CharacterWikiSummary
  created_at: string;
  updated_at: string;
}
```

The `characters` table pre-existed as a bare FK stub (`id, created_at, updated_at`)
because `statblocks.character_id` references it; this feature added the rest of the
columns additively in `src/database/migrations.ts` (`runCharactersSchemaMigration`).

### JSON shapes (`src/shared/contracts/characterTypes.ts`)

`CharacterSections` — fixed keys: `background`, `personality`, `relationships`,
`notes` (all optional strings).

`CharacterWikiSummary` — grouped, all optional:

- `biographic`: `birthName`, `ipaPronunciation`, `mainEpithet`
- `aliases` / `titles`: `Array<{ text: string; note?: string | null }>`
- `personalDescription`: `birthDate`, `currentAge`, `gender`, `sex`, `height`,
  `weight`, `hair`, `eyes`, `skinColour`, `bloodType`, `creatureTypes`, `mainRace`,
  `mainClass`, `alignment`, `dominantHand`
- `agesTimeline`: `Array<{ age: string; reference: string }>`
- `conditions`: `string[]`
- `statusDemographics`: `status`, `birthPlace`,
  `circumstanceOfBirth`, `religiousBelief`, `currentLocation`, `currentResidence`,
  `currentOccupation`, `currentVehicle`
- `educationalHistory` / `occupationalHistory`: `string[]`
- `trivia`: `favouriteThings`, `notablePhysicalCharacteristics`, `physicalQuirks`,
  `mannerisms`, `likes`, `dislikes`, `habitsHobbies`, `apparelAccessories`

The card's epithet line reads directly from `wiki_summary.biographic.mainEpithet` —
there is no denormalized duplicate column. A character's faction affiliations are not
stored in `wiki_summary` at all; they live in the `faction_members` junction table (see
`docs/features/factions.md`), which is what the additive faction-aware search reads.

## Validation and Error Rules

Main-process rules (`registerCharacterHandlers.ts`):

- `world_id` is required on create (`Character world_id is required`).
- `name` is required and trimmed for create/update (`Character name is required`).
- `is_player_character` is stored as `0 | 1`; when it is `1`, `owner` is required
  (`Character owner is required for player characters`).
- When `is_player_character` is `0`, `owner` is normalized to `NULL`.
- `author` is optional freeform text; whitespace-only values are normalized to `NULL`.
- `original_image_src` is optional; blank values normalize to `NULL`.
- `image_crop` is optional; blank values normalize to `NULL`, otherwise must be valid
  JSON text.
- `sections` and `wiki_summary` must be valid JSON text when provided
  (`Character sections must be valid JSON` / `Character wiki_summary must be valid
  JSON`); they default to `'{}'`.
- Image import validates mime type (PNG/JPEG/WEBP/GIF only) and size (≤ 5 MB), mirroring
  the world/token image import handlers.

Renderer-side: `CharacterForm` requires a non-empty name (`Name is required.`) before
calling `onSave`, and requires `Owner` when `Player Character` is checked (`Owner is
required for player characters.`).

## Tests

- `tests/unit/database/characters.test.ts` — additive migration adds the expected
  columns/index and is idempotent.
- `tests/unit/ipc/registerCharacterHandlers.test.ts` — CRUD + image import handler
  behavior and validation errors.
- `tests/unit/ipc/registrars.test.ts`, `tests/unit/main.bootstrap.test.ts` — character
  registrar wiring and the `character-images` protocol host.
- `tests/unit/preload.test.ts` — `window.db.characters` bridge forwarding.
- `tests/unit/renderer/lib/characterSearch.test.ts` — flatten/match behavior, including
  matching a field value (e.g. weight) and the additive primary-faction/ancestor exact-
  match rule.
- `tests/unit/renderer/characterCard.test.tsx`, `characterImageDropzone.test.tsx`,
  `characterForm.test.tsx` — component-level behavior.
- `tests/unit/renderer/components/characters/*.test.tsx` — Wiki Summary group/list
  sub-editors.
- `tests/unit/renderer/charactersPage.test.tsx` — page-level load, search, create, and
  delete flows against a mocked `window.db`, plus pagination: default page size,
  Next-page navigation, results-per-page selection, and page-reset-on-search.
- `tests/unit/renderer/hooks/usePaginatedList.test.ts`,
  `tests/unit/renderer/components/ui/pageSizeSelect.test.tsx`,
  `tests/unit/renderer/components/ui/paginationBar.test.tsx` — the shared pagination
  hook and UI components in isolation (windowing, clamping, page-size reset,
  Previous/Next boundary states).
- `tests/unit/renderer/characterDetailPage.test.tsx` — detail-page rendering, faction
  membership links, the primary-toggle action, and edit-modal save flow.

Additional player-character coverage:

- `tests/unit/renderer/lib/characterSearch.test.ts` covers `player character` and owner-name search.
- `tests/unit/renderer/charactersPage.test.tsx` covers player-character create payloads and search.
- `tests/unit/renderer/characterDetailPage.test.tsx` covers player-character metadata rendering/editing.
- `tests/e2e/characters.test.ts` covers real app create + search flow.

## Known Limits and Non-Goals

- Search is a simple case-insensitive substring match over a flattened in-memory blob,
  not SQLite FTS5. This is intentional for the current dataset scale; revisit if
  character counts grow large enough to need server-side filtering.
- Pagination (see above) only windows what gets _rendered_; `getAllByWorld` still
  fetches and JSON-parses every character in the world on every load/reload, and
  search/sort still run over the full in-memory list. This was an intentional,
  lower-risk fix scoped to the actual reported bug (DOM render lag), not a full
  server-side pagination rebuild — revisit fetch-time pagination if load time itself
  becomes a problem at very large (~20k+) character counts.
- The four text sections (Background, Personality, Relationships, Notes) are fixed, not
  user-defined/arbitrary blocks.
- Orphaned character images (from cancelled forms or cleared images) are not cleaned up
  automatically, matching the accepted limitation already documented for worlds/tokens.
- No campaign-level scoping; characters belong to a world only.
