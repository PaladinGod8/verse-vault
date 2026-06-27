# Settings Feature

## Purpose

Settings adds one app-wide preferences surface that is not scoped to any world. It gives
the app a durable place to store user preferences like theme or card density without
threading them through per-world records.

## Scope (Current Implementation)

- Single global Settings page at `/settings`.
- Singleton SQLite row in `app_settings` with one JSON `config` blob.
- Current editable preferences: `theme` and `cardSize`.
- Theme customization supports one custom seed color that derives a matching
  dark-theme palette for primary, secondary, and accent roles.
- Out of scope: per-world overrides, sync/import-export, and app-wide visual application
  of preferences other than theme.

## User-Facing Behavior

### Settings page (`/settings`)

- Reachable from the Worlds home page header via a `Settings` link.
- Loads the singleton row through `window.db.settings.get()`.
- Shows explicit loading and load-failure states.
- Renders one `Display` section with:
  - `Theme` select: `Light`, `Dark`, or `Custom`
  - `Card size` select: `Small`, `Medium`, or `Large`
  - Custom-only `Theme preview` sample for common action buttons, chips, and text emphasis
  - Custom-only `Theme color` control with preset palettes plus browser color picker/hex input
- Saves immediately on change through `window.db.settings.update(...)`.
- App boot defaults to dark mode when no theme preference exists yet.
- Theme changes are managed from Settings page and persist through same settings row.
- Stored custom theme color applies immediately on top of dark base surfaces; light/dark
  themes ignore custom palette state until the user switches back to `Custom`.
- Save failures surface a toast: `Failed to save settings.` plus the thrown error message.
- UI falls back to `dark` theme and `medium` card size when the stored JSON omits those keys.

## Architecture Notes

- Route: `/settings` in `src/renderer/App.tsx`.
- Renderer files:
  - `src/renderer/pages/SettingsPage.tsx`
  - `src/renderer/components/settings/DisplaySettingsSection.tsx`
  - `src/renderer/components/settings/ThemeColorRoleControl.tsx`
  - `src/renderer/hooks/useAppSettings.ts`
  - `src/renderer/lib/themeCustomization.ts`
- IPC channels: `SETTINGS_GET`, `SETTINGS_UPDATE` in `src/shared/ipcChannels.ts`.
- Main handler: `src/main/ipc/registerSettingsHandlers.ts`, registered in `src/main.ts`.
- Preload bridge: `window.db.settings` in `src/preload.ts`, typed via
  `DbApi.settings` in `src/shared/contracts/dbApi.ts`.
- Shared types:
  - `AppSettings` row in `src/shared/contracts/domainTypes.ts`
  - parsed JSON shape in `src/shared/contracts/settingsTypes.ts`

## Data Model

```ts
interface AppSettings {
  id: number; // always 1
  config: string; // JSON text of AppSettingsConfig
  created_at: string;
  updated_at: string;
}

interface AppSettingsConfig {
  theme?: 'light' | 'dark' | 'custom';
  cardSize?: 'small' | 'medium' | 'large';
  themeColors?: {
    primary?: { palette: string; customHex?: string };
  };
}
```

- Table: `app_settings`
- Invariant: one singleton row keyed by `id = 1`
- Storage strategy: additive preferences go into `config`, not new SQL columns

## Validation and Error Rules

- Main process ensures the singleton row exists before every read/write.
- `SETTINGS_UPDATE` accepts one JSON string payload and replaces the stored `config`.
- Renderer treats invalid JSON from storage as `{}` rather than crashing.
- Initial load failure shows `Unable to load settings right now.`.

## Tests

- `tests/unit/ipc/registerSettingsHandlers.test.ts`:
  verifies singleton-row creation and update payload persistence.
- `tests/unit/renderer/pages/SettingsPage.test.tsx`:
  verifies load, custom-only preview/color controls, palette persistence, custom hex
  persistence, and save-failure toast.
- `tests/unit/App.test.tsx`:
  verifies stored custom theme color becomes dark-derived document CSS variables on boot.
- `tests/unit/ipc/registrars.test.ts`:
  verifies settings registrar wiring and channel coverage.
- `tests/unit/main.bootstrap.test.ts`:
  verifies `registerSettingsHandlers` is wired into main bootstrap.
- `tests/unit/shared/ipcChannels.test.ts`:
  verifies `SETTINGS_GET` and `SETTINGS_UPDATE` constants.

## Known Limits and Non-Goals

- Stored `theme` and `cardSize` preferences are persisted now, but not every renderer
  surface consumes `cardSize` yet.
- No debounce/batching; every select change writes immediately.
- Custom theme derives shared semantic/app-primary color roles from one seed color; it is
  not a fully independent per-screen styling system.
- No settings search, grouping beyond `Display`, or reset-to-default action yet.
