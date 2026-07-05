# Image Cropping Feature

## Purpose

Shared non-destructive image editing for card-driven entities. Users can reframe card
art without losing original file, then reopen same image later and adjust crop again.

## Scope (Current Implementation)

- Applies to `worlds`, `characters`, `factions`, `backgrounds`, `items`, and
  `lore_notes`.
- File select/drop opens shared crop modal immediately.
- Save persists three things per edited image:
  - display image (`thumbnail` / `image_src`)
  - original image (`original_thumbnail_src` / `original_image_src`)
  - crop metadata JSON (`thumbnail_crop` / `image_crop`)
- Offline-media migration and world import/export preserve both display and original
  image URLs.
- Out of scope: `tokens`, multiple crop variants per entity, automatic orphan cleanup,
  dynamic aspect presets from settings.

## User-Facing Behavior

- Modal controls: `Card`, `Square`, `Free`, zoom, rotate, flip, reset, cancel, apply.
- Existing images show `Edit crop`, `Replace image`, and `Clear image on save`.
- Legacy rows without an original image fall back to the current display image for
  recrop.
- Validation/error strings:
  - `Unsupported image type. Use PNG, JPEG, WEBP, or GIF.`
  - `Selected file is empty.`
  - `Image exceeds 5 MB limit.`
  - `Unable to read the selected image file. Try a different image.`
  - `Unable to export cropped image.`

## Architecture Notes

- Shared renderer seam:
  - `src/renderer/components/media/ImageCropModal.tsx`
  - `src/renderer/lib/imageCrop.ts`
- Forms keep local `ImageEditDraft` state.
- CRUD hooks or world-page handlers resolve drafts with `persistImageEditDraft(...)`.
- Main handlers accept and validate new original/crop fields across world, character,
  faction, background, item, and lore-note registrars.
- `src/main/worldTransfer/*` and `src/database/offlineMediaImageMigration.ts` keep both
  image URLs stable across export/import and startup normalization.

## Data Model

Shared crop shape lives in `src/shared/contracts/imageCropTypes.ts`:

```ts
interface StoredImageCrop {
  version: 1;
  aspect_ratio: number | null;
  selection: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  transform: {
    matrix: [number, number, number, number, number, number];
  };
  source: {
    natural_width: number;
    natural_height: number;
  };
  output: {
    mime_type: string;
  };
}
```

## Validation and Error Rules

- Renderer validates mime type, empty file, and 5 MB limit before crop modal work.
- Main handlers normalize original image URLs with same media-source rules as display
  images.
- Crop JSON is optional, but if provided it must be valid JSON text; blank strings
  normalize to `NULL`.
- Clear-on-save nulls display image, original image, and crop metadata together.

## Export Resolution and Protocol Requirements

- `ImageCropModal` exports the crop via Cropper.js's `CropperSelection.$toCanvas`, which
  renders at the pixel size it's given — it does not know the source image's natural
  resolution on its own. `computeImageTransformScale` (in `src/renderer/lib/imageCrop.ts`)
  recovers the display-to-natural scale from the cropper image's transform matrix so
  `buildCropOutputSize` can request an output size in natural image pixels, not the small
  on-screen preview viewport size.
- The `vv-media` protocol (existing/persisted images) must be registered in
  `protocol.registerSchemesAsPrivileged` (`src/main.ts`) with
  `{ standard: true, secure: true, supportFetchAPI: true, corsEnabled: true }`, matching
  `vv-fmg`. Without this, re-cropping an existing (already-persisted) image taints the
  crop `<canvas>` and `toBlob()` throws `Tainted canvases may not be exported.`. Freshly
  selected files are unaffected because they use same-origin `blob:` URLs until saved.

## Tests

- DB migration coverage lives in world/character/background/item/lore-note/faction DB
  tests plus `tests/unit/database/offlineMediaMigration.test.ts`.
- IPC coverage lives in the corresponding `tests/unit/ipc/register*.test.ts` files.
- Renderer coverage lives in affected form tests, CRUD hook tests, and
  `tests/unit/renderer/worldsHomePage.test.tsx`.
- `buildCropOutputSize` / `computeImageTransformScale` unit coverage lives in
  `tests/unit/renderer/lib/imageCrop.test.ts`.
- The `vv-media` privileged-scheme registration is covered in `tests/unit/main.bootstrap.test.ts`.

## Known Limits and Non-Goals

- Only one derived crop exists per entity in phase 1.
- Crop metadata is opaque JSON text, not queryable SQL columns.
- Cancelled or replaced images can leave unused files on disk.
- `tokens` stay on their separate footprint-painter workflow.
