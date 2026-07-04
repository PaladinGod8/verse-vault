# Items Feature

## Purpose

Items are a world-scoped lightweight wiki entity for gear, relics, loot, props, or
other named objects that need a minimal record now and room to grow later.

## Scope (Current Implementation)

- World-scoped item CRUD (`world_id` required on create).
- Fields: required `name`, optional `description`, optional `image_src`.
- Optional non-destructive image crop/upload via shared `vv-media://` media protocol.
- Client-side substring search across `name` and `description`.
- Card-grid list page with shared count badge, sort toggle, page-size selector, and
  pagination.
- Detail page with image, name, description, and same edit modal used by list page.
- Out of scope: SQLite FTS, structured sections, relationships, and generic shared
  entity infrastructure.

## User-Facing Behavior

### Items page (`/world/:id/items`)

- Loads world and items via `window.db.worlds.getById(worldId)` and
  `window.db.items.getAllByWorld(worldId)`.
- Shows explicit states for loading, load failure, and empty list (`No items yet.`).
- Search input filters in-memory list by substring match against name and description.
  When items exist but none match, shows `No items match your search.`.
- Total world item count is shown via `EntityCountBadge`.
- Uses shared `CardSortToggle`, `PageSizeSelect`, and `PaginationBar`. Sort supports
  alphabetical and recently viewed, using `last_viewed_at`.
- `New Item` opens modal form. Name required. Description and image optional.
- Clicking card body navigates to detail page (`/world/:id/items/:itemId`). Edit opens
  same modal directly. Delete requires confirmation.
- Cards show image or `No image`, name, and short description preview when present.

### Item detail page (`/world/:id/items/:itemId`)

- Loads row via `window.db.items.getById(itemId)`.
- Calls `window.db.items.markViewed(itemId)` after successful load so `Recently viewed`
  sort can surface it on list page.
- Shows back link, name, optional image, optional description, and `Edit` button.
- Edit button opens same `ItemForm` modal used by list page, pre-filled.

### Item image upload

- Powered by `ItemImageDropzone`, using same drag/drop + hidden file-input pattern as
  world/character/faction/background image forms.
- On file selection, `ItemForm` opens the shared `ImageCropModal` immediately. Save
  persists cropped display bytes plus original source bytes through
  `window.db.items.importImage(...)`.
- Rows keep both `items.image_src` and `items.original_image_src`, plus
  `items.image_crop` JSON so `Edit crop` can restore the previous framing.
- Main process validates mime type (PNG/JPEG/WEBP/GIF) and size (<= 5 MB).
- Shared `vv-media://` protocol handler in `src/main.ts` serves item images from
  `userData/item-images/` alongside world/character/faction/background/token images.
- Shared crop details live in `docs/features/image-cropping.md`.

## Architecture Notes

- IPC channels (`src/shared/ipcChannels.ts`): `ITEMS_GET_ALL_BY_WORLD`,
  `ITEMS_GET_BY_ID`, `ITEMS_ADD`, `ITEMS_UPDATE`, `ITEMS_DELETE`,
  `ITEMS_IMPORT_IMAGE`, `ITEMS_MARK_VIEWED`.
- Main handler: `src/main/ipc/registerItemHandlers.ts`, registered in `src/main.ts`.
- Preload bridge: `window.db.items` in `src/preload.ts`, typed via `DbApi.items` in
  `src/shared/contracts/dbApiShape.ts`.
- Renderer:
  - `src/renderer/pages/ItemsPage.tsx` and `src/renderer/pages/ItemDetailPage.tsx`.
  - `src/renderer/hooks/useWorldItemsData.ts`, `useItemCrud.ts`.
  - `src/renderer/components/items/ItemCard.tsx`, `ItemForm.tsx`,
    `ItemImageDropzone.tsx`.
  - `src/renderer/lib/itemSearch.ts`.
  - `src/renderer/components/worlds/WorldSidebar.tsx` adds `Items` nav entry.

## Data Model

### Item row

```ts
interface Item {
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

`ItemUpsertPayload` carries `name`, `description`, `image_src`,
`original_image_src`, and `image_crop`. Main-process handler requires `world_id` on
create, trims `name`, normalizes blank description/image fields to `NULL`, validates
`image_crop` as JSON when present, and updates `last_viewed_at` through a dedicated
`markViewed` mutation.

`items` table lives in `src/database/schema.ts` and additive migration logic lives in
`src/database/itemMigrations.ts`. Table is indexed on `world_id`.

## Validation and Error Rules

Main-process rules (`registerItemHandlers.ts`):

- `world_id` required on create (`Item world_id is required`).
- `name` required and trimmed on create/update (`Item name is required`).
- `description` optional; whitespace-only values normalize to `NULL`.
- `image_src` optional; blank values normalize to `NULL`.
- `original_image_src` optional; blank values normalize to `NULL`.
- `image_crop` optional; blank values normalize to `NULL`, otherwise must be valid JSON.
- Image import rejects unsupported mime types, empty byte arrays, oversized files, and
  non-`Uint8Array` payloads.

Renderer-side: `ItemForm` requires non-empty name before save (`Name is required.`).
Description and image are optional in both create and edit flows.

## Tests

- `tests/unit/database/items.test.ts` - schema creation, migration idempotence, and
  index coverage.
- `tests/unit/ipc/registerItemHandlers.test.ts` - CRUD, validation, mark-viewed, and
  image import behavior.
- `tests/unit/main.bootstrap.test.ts` - registrar wiring and `item-images` protocol
  host.
- `tests/unit/preload.test.ts` - `window.db.items` bridge forwarding.
- `tests/unit/shared/ipcChannels.test.ts` - channel constant coverage.
- `tests/unit/renderer/lib/itemSearch.test.ts` - flatten/match behavior across name
  and description.
- `tests/unit/renderer/itemForm.test.tsx`,
  `tests/unit/renderer/itemCard.test.tsx` - component behavior and image fallback.
- `tests/unit/renderer/itemsPage.test.tsx` - load, search, create, edit, delete,
  pagination, count badge, and sort behavior.
- `tests/unit/renderer/itemDetailPage.test.tsx` - load, mark-viewed, render, and
  edit flow.
- `tests/unit/renderer/hooks/useItemCrud.test.ts`,
  `tests/unit/renderer/hooks/useWorldItemsData.test.ts` - mutation and loading hooks.
- `tests/e2e/items.test.ts` - real app create, search, detail, and edit journey.

## Known Limits and Non-Goals

- Search is simple case-insensitive substring match over in-memory data, not SQLite FTS.
- Detail page is intentionally narrow: no relationships, structured wiki sections, or
  extra metadata beyond image/name/description.
- Orphaned uploaded images are not cleaned up automatically if a form is cancelled or an
  image is later cleared.
- Items are world-scoped only.
