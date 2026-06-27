# Characters Feature

## Purpose

Characters are a world-scoped wiki entry for each person/creature in a world: a short
profile, a fixed set of editable long-text sections, an optional image, and a large
standardized "Wiki Summary" of mostly-optional fields. Characters are searchable from a
single search bar by substring match against any stored field value (including faction
and any Wiki Summary value), and are listed as cards.

## Scope (Current Implementation)

- World-scoped character CRUD (`world_id` required on create).
- Fixed long-text sections: Background, Personality, Relationships, Notes.
- Standardized Wiki Summary groups: Biographic Information, Aliases, Titles, Personal
  Description, Ages & Timeline, Conditions, Status & Demographics, Educational History,
  Occupational History, Trivia. All fields are optional.
- Optional character image upload via the shared `vv-media://` media protocol.
- Client-side substring search across name, profile, sections, and every Wiki Summary
  value (including faction).
- Out of scope: SQLite full-text search (FTS5), per-field structured search UI,
  user-defined/arbitrary text sections (the four sections above are fixed), and
  campaign-scoping (characters are world-scoped only, matching the existing
  `statblocks.character_id` FK).

## User-Facing Behavior

### Characters page (`/world/:id/characters`)

- Loads the world and its characters via `window.db.characters.getAllByWorld(worldId)`.
- Shows explicit states for loading, load failure, and empty list (`No characters yet.`).
- A search input filters the in-memory character list by substring match against any
  field (e.g. typing a weight value like `90kg` or a faction name like `Constellation
  Company` narrows the list to matching characters). When characters exist but none
  match, shows `No characters match your search.`.
- "New Character" opens a modal form. Name is required; everything else is optional.
- Each card opens the same form pre-filled for editing (clicking the card or its Edit
  button); Delete requires confirmation (`Delete "<name>"? This cannot be undone.`).
- Cards show the character image (or a `No image` placeholder) and name as the primary
  attributes, with Main Epithet and Primary Faction (pulled from the parsed Wiki
  Summary) as smaller secondary lines underneath.

### Character image upload

- Powered by `CharacterImageDropzone` (same dnd-kit + hidden file input pattern as
  `WorldImageDropzone`/`TokenImageDropzone`).
- On file selection, `CharacterForm` calls
  `window.db.characters.importImage({ fileName, mimeType, bytes })`, which writes the
  file to `userData/character-images/<timestamp>-<uuid>.<ext>` and returns a
  `vv-media://character-images/<encoded-filename>` URL stored in `characters.image_src`.
- Main process validates mime type (PNG/JPEG/WEBP/GIF) and size (≤ 5 MB).
- The shared `vv-media://` protocol handler in `src/main.ts` serves character images
  from `userData/character-images/` alongside token/world images, with the same
  basename-only path checks.

## Architecture Notes

- IPC channels (`src/shared/ipcChannels.ts`): `CHARACTERS_GET_ALL_BY_WORLD`,
  `CHARACTERS_GET_BY_ID`, `CHARACTERS_ADD`, `CHARACTERS_UPDATE`, `CHARACTERS_DELETE`,
  `CHARACTERS_IMPORT_IMAGE`.
- Main handler: `src/main/ipc/registerCharacterHandlers.ts`, registered in
  `src/main.ts`.
- Preload bridge: `window.db.characters` in `src/preload.ts`, typed via
  `DbApi.characters` in `src/shared/contracts/dbApi.ts`.
- Renderer:
  - `src/renderer/pages/CharactersPage.tsx` (route `/world/:id/characters`, linked from
    `WorldSidebar`).
  - `src/renderer/hooks/useWorldCharactersData.ts`, `useCharacterCrud.ts`.
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
  image_src: string | null;
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
- `statusDemographics`: `status`, `primaryFaction`, `birthPlace`,
  `circumstanceOfBirth`, `religiousBelief`, `currentLocation`, `currentResidence`,
  `currentOccupation`, `currentVehicle`
- `educationalHistory` / `occupationalHistory`: `string[]`
- `trivia`: `favouriteThings`, `notablePhysicalCharacteristics`, `physicalQuirks`,
  `mannerisms`, `likes`, `dislikes`, `habitsHobbies`, `apparelAccessories`

The card's epithet/faction lines read directly from
`wiki_summary.biographic.mainEpithet` and
`wiki_summary.statusDemographics.primaryFaction` — there is no denormalized duplicate
column.

## Validation and Error Rules

Main-process rules (`registerCharacterHandlers.ts`):

- `world_id` is required on create (`Character world_id is required`).
- `name` is required and trimmed for create/update (`Character name is required`).
- `sections` and `wiki_summary` must be valid JSON text when provided
  (`Character sections must be valid JSON` / `Character wiki_summary must be valid
  JSON`); they default to `'{}'`.
- Image import validates mime type (PNG/JPEG/WEBP/GIF only) and size (≤ 5 MB), mirroring
  the world/token image import handlers.

Renderer-side: `CharacterForm` requires a non-empty name (`Name is required.`) before
calling `onSave`.

## Tests

- `tests/unit/database/characters.test.ts` — additive migration adds the expected
  columns/index and is idempotent.
- `tests/unit/ipc/registerCharacterHandlers.test.ts` — CRUD + image import handler
  behavior and validation errors.
- `tests/unit/ipc/registrars.test.ts`, `tests/unit/main.bootstrap.test.ts` — character
  registrar wiring and the `character-images` protocol host.
- `tests/unit/preload.test.ts` — `window.db.characters` bridge forwarding.
- `tests/unit/renderer/lib/characterSearch.test.ts` — flatten/match behavior, including
  matching a field value (e.g. weight) and a faction name.
- `tests/unit/renderer/characterCard.test.tsx`, `characterImageDropzone.test.tsx`,
  `characterForm.test.tsx` — component-level behavior.
- `tests/unit/renderer/components/characters/*.test.tsx` — Wiki Summary group/list
  sub-editors.
- `tests/unit/renderer/charactersPage.test.tsx` — page-level load, search, create, and
  delete flows against a mocked `window.db`.

## Known Limits and Non-Goals

- Search is a simple case-insensitive substring match over a flattened in-memory blob,
  not SQLite FTS5. This is intentional for the current dataset scale; revisit if
  character counts grow large enough to need server-side filtering.
- The four text sections (Background, Personality, Relationships, Notes) are fixed, not
  user-defined/arbitrary blocks.
- Orphaned character images (from cancelled forms or cleared images) are not cleaned up
  automatically, matching the accepted limitation already documented for worlds/tokens.
- No campaign-level scoping; characters belong to a world only.
