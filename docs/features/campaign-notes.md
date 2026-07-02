# Campaign Notes Feature

## Purpose

Campaign Notes are campaign-scoped infinite-canvas whiteboards for planning encounters,
mapping ideas, and working visually inside a specific campaign instead of a whole world.

## Scope (Current Implementation)

- Campaign-scoped CRUD entity under `Campaigns` via new `Notes` row action.
- Fields: required `name`, optional `tags`, optional Excalidraw scene JSON, optional saved
  PNG preview image.
- Separate per-campaign tag vocabulary backed by `campaign_note_tags`; does not share lore
  note tags.
- Search supports plain text tokens against note `name` and `#tag` exact-match tokens
  against note tags, all AND'd case-insensitively.
- New-note flow is metadata-first: create lightweight record, then navigate into full-page
  canvas editor.
- Out of scope: rich text, uploaded images, autosave, collaborative sync, and separate tag
  management.

## User-Facing Behavior

### Campaigns page (`/world/:id/campaigns`)

- Each campaign row now includes `Notes` alongside `Scenes` and `Arcs`.

### Campaign Notes page (`/world/:id/campaign/:campaignId/notes`)

- Loads world, campaign, notes, and campaign tag vocabulary.
- Shows explicit loading, not-found/load-failure, empty-list, and empty-search states.
- Search placeholder: `Search campaign notes by name or #tag...`.
- Renders cards with preview thumbnail (or `Blank canvas`), note name, updated date, and tag
  chips.
- `New Campaign Note` opens metadata modal with required `name` and optional `tags`.
- Create immediately inserts blank record, then navigates to editor route.
- Delete requires confirmation and removes note from current list without full-page reload.

### Campaign Note editor (`/world/:id/campaign/:campaignId/notes/:campaignNoteId`)

- Full-page editor with campaign/world header, `Back`, `Save`, metadata controls, and main
  Excalidraw surface.
- Metadata panel edits `name` and `tags`.
- `Save` captures current Excalidraw scene plus PNG preview thumbnail and persists both.
- `Back` returns to notes list without saving additional changes.

## Architecture Notes

- IPC channels: `CAMPAIGN_NOTES_GET_ALL_BY_CAMPAIGN`, `CAMPAIGN_NOTES_GET_BY_ID`,
  `CAMPAIGN_NOTES_ADD`, `CAMPAIGN_NOTES_UPDATE`, `CAMPAIGN_NOTES_DELETE`,
  `CAMPAIGN_NOTE_TAGS_GET_ALL_BY_CAMPAIGN`.
- Main handler: `src/main/ipc/registerCampaignNoteHandlers.ts`.
- Preload bridge: `window.db.campaignNotes` in `src/preload.ts`.
- Shared renderer seam: `src/renderer/components/excalidraw/ExcalidrawCanvasEditor.tsx`
  wraps `@excalidraw/excalidraw`, theme handoff, asset path setup, scene capture, and PNG
  export.
- Renderer pages/components:
  - `src/renderer/pages/CampaignNotesPage.tsx`
  - `src/renderer/pages/CampaignNoteDetailPage.tsx`
  - `src/renderer/components/campaignNotes/CampaignNoteCard.tsx`
  - `src/renderer/components/campaignNotes/CampaignNoteMetadataForm.tsx`
  - `src/renderer/lib/campaignNoteSearch.ts`

## Data Model

### Shared type

```ts
interface CampaignNote {
  id: number;
  world_id: number;
  campaign_id: number;
  name: string;
  canvas_scene: CanvasSceneData | null;
  canvas_preview_image: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}
```

`CanvasSceneData` stores Excalidraw `elements`, `appState`, and `files` as JSON-safe values.

### Tables

- `campaign_notes` - one row per campaign note, with serialized scene JSON and preview image
  data URL.
- `campaign_note_tags` - one row per `(campaign_note_id, tag_name)` pair, denormalized with
  `world_id` and `campaign_id` for campaign-scoped tag vocabulary and search support.

## Validation and Error Rules

- Create/update require trimmed `name`; blank names reject with `Campaign note name is required`.
- Create requires `world_id` and `campaign_id`.
- Tags are trimmed, blank tags dropped, duplicates removed case-insensitively.
- Scene payload is optional; when provided it is normalized to `{ elements, appState, files }`
  before persistence.
- Preview image is optional and only refreshed on explicit save.

## Tests

- `tests/unit/database/campaignNotes.test.ts` - schema, migration, and index coverage.
- `tests/unit/ipc/registerCampaignNoteHandlers.test.ts` - CRUD, validation, tags, and scene
  persistence.
- `tests/unit/preload.campaignNotes.test.ts`, `tests/unit/ipc/registrars.test.ts`,
  `tests/unit/shared/ipcChannels.test.ts` - bridge, registrar, and channel coverage.
- `tests/unit/renderer/campaignNotesPage.test.tsx` - list load, search, create flow, and
  delete flow.
- `tests/unit/renderer/campaignNoteDetailPage.test.tsx` - editor metadata load, save, and
  back navigation.
- `tests/unit/renderer/excalidrawCanvasEditor.test.tsx` - Excalidraw wrapper initial data,
  theme, capture, and preview export behavior.

## Known Limits and Non-Goals

- No autosave; preview and scene persist only when user clicks `Save`.
- Search covers `name` and `#tag` only, not scene contents.
- No dedicated packaged E2E coverage yet for campaign-note drawing flows.
- Tags are campaign-scoped only; there is no cross-campaign merge or rename UI.
