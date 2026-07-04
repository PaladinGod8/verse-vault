# Cropper Non-Destructive Image Edit Plan

## Status

Design only. No implementation in this step.

## Goal

Add reliable image crop/manipulation for card-driven entities without losing original source image.

Phase 1 entities:

- `worlds`
- `characters`
- `factions`
- `backgrounds`
- `items`
- `lore_notes`

Explicit non-goal for first pass:

- `tokens`

Reason: tokens already have `FootprintPainterModal` image workflow. Combining crop + footprint in same pass adds UX and test risk.

## Decisions Locked

### Storage model

Keep both:

- current display image field
  - `worlds.thumbnail`
  - `<entity>.image_src`
- new original image field
  - `worlds.original_thumbnail_src`
  - `<entity>.original_image_src`
- new JSON crop metadata field
  - `worlds.thumbnail_crop`
  - `<entity>.image_crop`

### Crop metadata shape

Use one shared JSON column per row, not many scalar SQL columns.

Reason:

- additive and migration-safe
- future-proof for more manipulation fields
- easy import/export
- easier shared validation than many nullable columns

### Render model

Keep derived display image persisted.

Reason:

- cards/detail pages stay fast
- existing renderer mostly keeps reading `thumbnail` / `image_src`
- crop re-edit still possible from original + metadata

### UX target

Card-first UX.

This feature exists because card images need reliable framing. Detail views keep using same derived image for phase 1.

## Problem In Current Repo

Current image flow is file upload only:

- renderer forms collect file
- hooks call `window.db.<entity>.importImage(...)`
- main writes bytes to local `vv-media://...`
- row stores one image field only

Current result:

- user cannot crop/reframe card images reliably
- user cannot re-edit framing without replacing image again
- one source image must serve both card and detail with no manipulation seam

## Proposed User Experience

### Create flow

1. User opens create/edit form.
2. User drops or selects image.
3. Crop modal opens immediately.
4. User can:
   - move crop
   - resize crop
   - zoom
   - rotate
   - flip horizontally
   - flip vertically
   - choose aspect preset
   - reset
5. User clicks `Apply`.
6. Form shows cropped preview.
7. On save:
   - original image persisted to new original-image column
   - cropped derivative persisted to existing display-image column
   - crop metadata persisted to JSON column

### Re-edit existing image

1. Existing form with image shows:
   - current preview
   - `Edit crop`
   - `Replace image`
   - `Clear image on save`
2. `Edit crop` opens modal using:
   - `original_*_src` if present
   - fallback to current display image if legacy row has no original
3. Modal restores last saved crop metadata if present.
4. Saving crop updates:
   - display image field with new derived image
   - crop JSON field
   - original field only if source image changed

### Aspect presets

Recommended phase 1 presets:

- `Card` default
- `Square`
- `Free`

`Card` should map to entity display shape:

- worlds: `2:1` based on current `WorldCard` `h-40` landscape thumbnail use
- characters/factions/backgrounds/items/lore notes: default to current card display ratio, which is `320x160` by default, so `2:1`

Note:

- settings can change card dimensions
- current settings still preserve same default ratio for card surfaces
- phase 1 should treat `Card` preset as `2:1`
- do not attempt dynamic live preset changes from settings in first pass

### Error UX

Inline errors in form/modal:

- unsupported mime type
- empty file
- over size limit
- unable to read source image
- unable to export cropped image

Save button disabled while image import/export work is active.

### Accessibility

Need keyboard-visible controls for:

- aspect preset
- zoom in/out
- rotate left/right
- flip horizontal/vertical
- reset
- cancel/apply

Do not rely on drag-only interactions.

## Shared Crop Metadata Contract

Use shared contract type, probably new file:

- `src/shared/contracts/imageCropTypes.ts`

Recommended stored shape:

```ts
export interface StoredImageCrop {
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

Notes:

- store transform matrix because Cropper.js v2 naturally exposes/reapplies transform through matrix-based APIs
- store source dimensions for debugging/future-proofing
- keep JSON compact and renderer-safe
- store as JSON text in DB, matching repo pattern used by `config`, `sections`, `wiki_summary`

## Cropper.js Integration Shape

## Library choice

Use official `cropperjs` package.

Current official docs indicate v2 line is active and constructor APIs are available through `new Cropper(...)`. Selection export uses `<cropper-selection>` `$toCanvas()`. Rotation/scale are handled through `<cropper-image>` methods.

## Shared renderer seam

Create one shared renderer module, not six copied integrations.

Recommended seam:

- `src/renderer/components/media/ImageCropModal.tsx`
- `src/renderer/lib/imageCrop.ts`

### `ImageCropModal.tsx` owns

- Cropper instance lifecycle
- toolbar controls
- restore previous metadata
- export cropped blob/canvas
- returning structured result back to form

### `imageCrop.ts` owns

- metadata serialization/parsing
- validation helpers
- file-to-upload conversion helpers
- aspect preset helpers

## Form/Hook Design

Keep current repo pattern:

- forms work with local `File` / preview state
- hooks perform `window.db.<entity>.importImage(...)`
- main handlers persist validated URLs and row data

### New local form payload pattern

Forms should not directly persist image URLs.

Recommended transient result from crop modal:

```ts
type ImageEditDraft = {
  originalUpload?: {
    fileName: string;
    mimeType: string;
    bytes: Uint8Array;
  };
  croppedUpload: {
    fileName: string;
    mimeType: string;
    bytes: Uint8Array;
  };
  cropJson: string;
  previewUrl: string;
};
```

Behavior:

- new image selected:
  - include `originalUpload`
  - include `croppedUpload`
  - include `cropJson`
- existing image recropped from stored original:
  - no `originalUpload`
  - yes `croppedUpload`
  - yes `cropJson`

### Hook responsibility

Hooks resolve local draft to persisted row fields:

- import original bytes if present
- import cropped bytes
- send add/update payload with:
  - existing display field (`image_src`/`thumbnail`)
  - new original field
  - new crop JSON field

## Main/DB Contract Changes

### Domain rows

Add fields:

```ts
interface World {
  thumbnail: string | null;
  original_thumbnail_src: string | null;
  thumbnail_crop: string | null;
}

interface Character {
  image_src: string | null;
  original_image_src: string | null;
  image_crop: string | null;
}
```

Same for:

- `Faction`
- `Background`
- `Item`
- `LoreNote`

### DB API payloads

Add optional fields:

- worlds:
  - `original_thumbnail_src?: string | null`
  - `thumbnail_crop?: string | null`
- image entities:
  - `original_image_src?: string | null`
  - `image_crop?: string | null`

### Main-process validation

Need shared validation helpers:

- original image fields normalize through `normalizeMediaImageSrcForHost(...)`
- crop JSON must be valid JSON when provided
- blank crop strings normalize to `null`

## Schema Changes

### Fresh DB schema

Add columns to `createCoreTables()` and related create-table SQL.

#### `worlds`

- `original_thumbnail_src TEXT`
- `thumbnail_crop TEXT`

#### `characters`

- `original_image_src TEXT`
- `image_crop TEXT`

#### `backgrounds`

- `original_image_src TEXT`
- `image_crop TEXT`

#### `items`

- `original_image_src TEXT`
- `image_crop TEXT`

#### `lore_notes`

- `original_image_src TEXT`
- `image_crop TEXT`

#### `factions`

- `original_image_src TEXT`
- `image_crop TEXT`

### Legacy migrations

Need additive idempotent migrations for all above.

Migration rule for existing rows:

- leave new original/crop fields null
- do not try to backfill original from current display image automatically
- fallback to current display image during re-edit for legacy rows

Reason:

- avoid fake provenance
- avoid extra file copies during migration

## Offline Media Policy Impact

Current offline scrub only normalizes:

- `worlds.thumbnail`
- `*.image_src`

Need extend scrub to also normalize:

- `worlds.original_thumbnail_src`
- `characters.original_image_src`
- `backgrounds.original_image_src`
- `items.original_image_src`
- `factions.original_image_src`
- `lore_notes.original_image_src`

Crop JSON fields should not be touched by offline scrub.

## World Export/Import Impact

Current world transfer registry supports one media column per table.

This feature requires multiple media refs for affected tables.

### Required registry refactor

Change:

```ts
media?: TableMedia;
```

to:

```ts
media?: TableMedia[];
```

Then register both display + original media columns for each affected table.

Example:

```ts
{
  name: 'characters',
  select: { by: 'world' },
  foreignKeys: [worldFk],
  media: [
    { column: 'image_src', host: 'character-images' },
    { column: 'original_image_src', host: 'character-images' },
  ],
}
```

Same for worlds with `thumbnail` + `original_thumbnail_src`.

Reason:

- export/import must preserve both source and derived files
- otherwise recrop would break after import

## Legacy/Compatibility Behavior

### Existing rows with only display image

If row has:

- `image_src` present
- `original_image_src` null

Then `Edit crop` should load current display image as source.

On save after recrop:

- current display image can become source fallback for original if no true original exists
- recommended behavior: when recropping legacy-only image, set both:
  - `original_image_src` = current source image URL used by editor
  - `image_src` = new derived result

This preserves future re-editability even for legacy rows.

## Testing Plan

Follow repo TDD workflow. Build in vertical slices.

### Slice 1: shared contract + schema migration

Tests:

- DB schema tests for:
  - worlds
  - characters
  - backgrounds
  - items
  - lore notes
  - factions
- offline media migration tests for original-image columns
- world transfer export/import tests for dual media refs

### Slice 2: main IPC validation

Tests:

- `registerWorldHandlers`
- `registerCharacterHandlers`
- `registerFactionHandlers`
- `registerBackgroundHandlers`
- `registerItemHandlers`
- `registerLoreNoteHandlers`

Need coverage for:

- add/update accepts original-image fields + crop JSON
- invalid crop JSON rejected
- original image URLs normalized

### Slice 3: shared crop modal

Tests:

- open/close
- restore metadata
- apply returns cropped bytes + metadata
- rotate/flip/reset controls
- aspect preset selection

Likely new unit file:

- `tests/unit/renderer/components/media/imageCropModal.test.tsx`

### Slice 4: first integrated entity

Recommended first entity:

- `items`

Reason:

- lightweight form
- minimal extra fields
- no character/faction secondary complexity
- world form currently has immediate-import special case, so not best first slice

Tests:

- item form opens crop modal after file select
- save path imports original + cropped bytes
- recrop existing image path

### Slice 5: shared rollout to remaining entities

- backgrounds
- lore notes
- characters
- factions
- worlds

### Slice 6: targeted E2E

Recommended E2E flows:

- create item with crop
- edit item crop
- create character with crop
- edit world thumbnail crop
- export/import world preserves recrop ability

## UX Open Questions For Review

These are not blockers for plan doc, but should be explicitly decided before code:

1. Should `Edit crop` also be available from detail pages, not only modal forms?
   - Recommendation: yes, wherever same form already opens.

2. Should phase 1 include manual numeric rotation readout?
   - Recommendation: no. Buttons only.

3. Should users be able to clear crop metadata but keep original file?
   - Recommendation: no dedicated control in phase 1. `Reset` in modal then `Apply` is enough.

4. Should there be multiple derived crops per entity for card/detail?
   - Recommendation: no in phase 1. One derived image only.

5. Should world cards get settings-driven aspect presets too?
   - Recommendation: no in phase 1.

## Implementation Order

1. Add shared crop contract types.
2. Add DB columns + migrations.
3. Extend offline scrub.
4. Refactor world transfer registry to support multiple media columns.
5. Extend DB API/domain payloads.
6. Extend main IPC handlers.
7. Add Cropper.js dependency and shared modal.
8. Wire first entity (`items`).
9. Roll shared wiring to remaining entities.
10. Update docs:

- `docs/features/worlds.md`
- `docs/features/items.md`
- `docs/features/backgrounds.md`
- `docs/features/lore-notes.md`
- `docs/features/characters.md`
- `docs/features/factions.md`
- new cross-cutting feature doc, likely `docs/features/image-cropping.md`
- `docs/07_TECH_STACK.md`

11. Run `yarn docs:generate` if shared contracts / IPC docs require it.

## Risks

### Biggest technical risks

- Cropper.js v2 integration in React without wrapper drift
- world transfer dual-media change touching export/import assumptions
- world form refactor because it currently imports immediately on file select
- preserving stable tests around image preview/object URL lifecycles

### Biggest UX risks

- card crop choice may look odd on square detail pages
- crop modal can become too heavy if toolbar grows too fast
- legacy rows with no original source need clear fallback behavior

## Recommendation Before Implementation

Approve this plan, then implement in slices with `items` first and shared seam extraction only after first green path proves shape.

## Validation Target

Before merge-ready claim:

- targeted unit tests during slices
- `yarn test:unit:run`
- `yarn docs:check`
- `yarn guard:contracts`
- targeted E2E for new crop flows
- full ordered quality gate per `docs/06_AGENTIC_TESTING_QUALITY_GATE.md`
