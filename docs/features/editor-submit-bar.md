# Editor Submit Bar

## Purpose

Shared modal-editor UX rule: primary submit action stays pinned at top-right of form so
long editors do not force scroll-to-bottom before save/create.

## Current Behavior

- Modal-backed editors render a sticky action bar at top of form content.
- Bar stays right-aligned and keeps `Cancel` plus primary submit action visible while the
  modal body scrolls.
- Submit label still reflects mode (`Create`, `Save`, `Save changes`, etc.); behavior of
  each form submit handler is unchanged.

## Seams Touched

- Shared renderer UI component: `src/renderer/components/ui/EditorActionBar.tsx`
- Wired into modal editor forms across world/wiki/statblock/campaign/session/scene/
  battlemap/statistics CRUD surfaces

## Tests

- `tests/unit/renderer/editorActionBar.test.tsx`
- Existing form tests continue covering submit/cancel behavior on individual editors
