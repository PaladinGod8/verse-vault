# Backgrounds Feature

## Purpose

Backgrounds are a world-scoped wiki entity for places, scenes, atmospheres, or other
setting context that needs a lightweight record. Each background has a required name,
an optional image, and an optional freeform Description. Backgrounds are listed as
cards, searchable from one input, and open into a minimal read-first detail page.

## Scope (Current Implementation)

- World-scoped background CRUD (`world_id` required on create).
- Fields: required `name`, optional `description`, optional `image_src`.
- Optional non-destructive image crop/upload via shared `vv-media://` media protocol.
- Client-side substring search across `name` and `description`.
- Card-grid list page with shared count badge, sort toggle, page-size selector, and
  pagination.
- Detail page with image, name, description, and same edit modal used by list page.
- Out of scope: SQLite FTS, structured/sectioned wiki content, relationships, and any
  attempt to abstract Characters/Factions/Backgrounds into one generic entity module.

## User-Facing Behavior

### Backgrounds page (`/world/:id/backgrounds`)

- Loads world and backgrounds via `window.db.worlds.getById(worldId)` and
  `window.db.backgrounds.getAllByWorld(worldId)`.
- Shows explicit states for loading, load failure, and empty list (`No backgrounds yet.`).
- Search input filters in-memory list by substring match against name and description.
  When backgrounds exist but none match, shows `No backgrounds match your search.`.
- Total world background count is shown via `EntityCountBadge`.
- Uses shared `CardSortToggle`, `PageSizeSelect`, and `PaginationBar`. Sort supports
  alphabetical and recently viewed, using `last_viewed_at`.
- "New Background" opens modal form. Name required. Description and image optional.
- Clicking card body navigates to detail page
  (`/world/:id/backgrounds/:backgroundId`). Edit opens same modal directly. Delete
  requires confirmation.
- Cards show image or `No image`, name, and a short description preview when present.

### Background detail page (`/world/:id/backgrounds/:backgroundId`)

- Loads row via `window.db.backgrounds.getById(backgroundId)`.
- Calls `window.db.backgrounds.markViewed(backgroundId)` after successful load so
  "Recently viewed" sort can surface it on list page.
- Shows back link, name, optional image, optional description, and Edit button.
- Edit button opens same `BackgroundForm` modal used by list page, pre-filled.

### Background image upload

- Powered by `BackgroundImageDropzone`, using same drag/drop + hidden file-input pattern
  as world/character/faction image forms.
- On file selection, `BackgroundForm` opens the shared `ImageCropModal` immediately.
  Save persists cropped display bytes plus original source bytes through
  `window.db.backgrounds.importImage(...)`.
- Rows keep both `backgrounds.image_src` and `backgrounds.original_image_src`, plus
  `backgrounds.image_crop` JSON so `Edit crop` can restore the previous framing.
- Main process validates mime type (PNG/JPEG/WEBP/GIF) and size (<= 5 MB).
- Shared `vv-media://` protocol handler in `src/main.ts` serves background images from
  `userData/background-images/` alongside world/character/faction/token images.
- Shared crop details live in `docs/features/image-cropping.md`.

## Architecture Notes

- IPC channels (`src/shared/ipcChannels.ts`): `BACKGROUNDS_GET_ALL_BY_WORLD`,
  `BACKGROUNDS_GET_BY_ID`, `BACKGROUNDS_ADD`, `BACKGROUNDS_UPDATE`,
  `BACKGROUNDS_DELETE`, `BACKGROUNDS_IMPORT_IMAGE`, `BACKGROUNDS_MARK_VIEWED`.
- Main handler: `src/main/ipc/registerBackgroundHandlers.ts`, registered in
  `src/main.ts`.
- Preload bridge: `window.db.backgrounds` in `src/preload.ts`, typed via
  `DbApi.backgrounds` in `src/shared/contracts/dbApi.ts`.
- Renderer:
  - `src/renderer/pages/BackgroundsPage.tsx` and
    `src/renderer/pages/BackgroundDetailPage.tsx`.
  - `src/renderer/hooks/useWorldBackgroundsData.ts`, `useBackgroundCrud.ts`.
  - `src/renderer/components/backgrounds/BackgroundCard.tsx`,
    `BackgroundForm.tsx`, `BackgroundImageDropzone.tsx`.
  - `src/renderer/lib/backgroundSearch.ts`.
  - `src/renderer/components/worlds/WorldSidebar.tsx` adds Backgrounds nav entry.

## Data Model

### Background row

```ts
interface Background {
  id: number;
  world_id: number;
  name: string;
  description: string | null;
  image_src: string | null;
  original_image_src: string | null;
  image_crop: string | null;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
}
```

`BackgroundUpsertPayload` carries `name`, `description`, `image_src`,
`original_image_src`, and `image_crop`. Main-process handler requires `world_id` on
create, trims `name`, normalizes blank description/image fields to `NULL`, validates
`image_crop` as JSON when present, and updates `last_viewed_at` through a dedicated
`markViewed` mutation.

`backgrounds` table lives in `src/database/schema.ts` and additive migration logic lives
in `src/database/migrations.ts`. Table is indexed on `world_id`.

## Validation and Error Rules

Main-process rules (`registerBackgroundHandlers.ts`):

- `world_id` required on create (`Background world_id is required`).
- `name` required and trimmed on create/update (`Background name is required`).
- `description` optional; whitespace-only values normalize to `NULL`.
- `image_src` optional; blank values normalize to `NULL`.
- `original_image_src` optional; blank values normalize to `NULL`.
- `image_crop` optional; blank values normalize to `NULL`, otherwise must be valid JSON.
- Image import rejects unsupported mime types, empty byte arrays, oversized files, and
  non-`Uint8Array` payloads.

Renderer-side: `BackgroundForm` requires non-empty name before save (`Name is required.`).
Description and image are optional in both create and edit flows.

## Tests

- `tests/unit/database/backgrounds.test.ts` - schema creation, migration idempotence,
  and index coverage.
- `tests/unit/ipc/registerBackgroundHandlers.test.ts` - CRUD, validation, mark-viewed,
  and image import behavior.
- `tests/unit/main.bootstrap.test.ts` - registrar wiring and `background-images`
  protocol host.
- `tests/unit/preload.test.ts` - `window.db.backgrounds` bridge forwarding.
- `tests/unit/shared/ipcChannels.test.ts` - channel constant coverage.
- `tests/unit/renderer/lib/backgroundSearch.test.ts` - flatten/match behavior across
  name and description.
- `tests/unit/renderer/backgroundForm.test.tsx`,
  `tests/unit/renderer/backgroundCard.test.tsx` - component behavior and image fallback.
- `tests/unit/renderer/backgroundsPage.test.tsx` - load, search, create, edit, delete,
  pagination, count badge, and sort behavior.
- `tests/unit/renderer/backgroundDetailPage.test.tsx` - load, mark-viewed, render, and
  edit flow.
- `tests/e2e/backgrounds.test.ts` - real app create, search, detail, and edit journey.

## Known Limits and Non-Goals

- Search is simple case-insensitive substring match over in-memory data, not SQLite FTS.
- Detail page is intentionally narrow: no relationships, structured wiki sections, or
  extra metadata beyond image/name/description.
- Orphaned uploaded images are not cleaned up automatically if a form is cancelled or an
  image is later cleared.
- Backgrounds are world-scoped only.
