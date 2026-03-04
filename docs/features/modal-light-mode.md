# Modal Light-Mode Feature

## Purpose

All CRUD create/edit/move/confirm dialogs in the app share a single `ModalShell` component. Without an explicit theme anchor, DaisyUI's `modal-box` resolved to a dark background when the OS was in dark mode, making every dialog unreadable.

This fix pins the app to the `versevault` light theme and applies DaisyUI semantic color classes to `ModalShell` so all 13+ modal surfaces inherit a consistent light appearance.

## Changes

### `index.html`

Added `data-theme="versevault"` to the `<html>` element. This is the canonical DaisyUI v5 way to lock a theme: without it, DaisyUI applies the custom theme via `:root` but built-in dark-mode media queries can still override `modal-box` colors when the OS prefers dark.

### `src/renderer/components/ui/ModalShell.tsx`

Added `bg-base-100 text-base-content` to the `modal-box` div class list. These are DaisyUI semantic utilities that map to the theme's base background (`#f8fafc`) and foreground (`#0f172a`) variables defined in `index.css`. Using semantic classes means callers receive correct colors from the theme rather than hard-coded Tailwind values.

## Affected Surfaces (all via ModalShell)

- World create / edit
- Level create / edit
- Ability create / edit
- Campaign create / edit
- BattleMap create / edit
- Arc create / edit
- Act create / edit
- Session create / edit
- Scene create / edit
- Move act / session / scene dialogs
- Confirm delete dialog

## Non-Goals

- No dark-mode toggle or theme-switching infrastructure added.
- No per-form style changes.
- No changes to the modal backdrop/scrim.

## Testing

`tests/unit/renderer/modalShell.test.tsx` — added one test case:

- **renders modal panel with DaisyUI light-mode classes** — asserts `bg-base-100` and `text-base-content` are present on the dialog element when open.

`ModalShell.tsx` coverage: 100% statements / 100% functions / 100% lines / 88% branches.
