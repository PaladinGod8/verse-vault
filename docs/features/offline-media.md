# Offline Media

## Purpose

Keep Verse Vault fully local-first in airplane mode. Image records must resolve from local `vv-media://` assets only, never live web URLs.

## User-Facing Behavior

- World thumbnails and entity images now persist only canonical local media URLs:
  - `vv-media://world-images/<file>`
  - `vv-media://token-images/<file>`
  - `vv-media://character-images/<file>`
  - `vv-media://background-images/<file>`
  - `vv-media://item-images/<file>`
  - `vv-media://faction-images/<file>`
  - `vv-media://lore-note-images/<file>`
- Legacy `file://.../<host>/<file>` values are migrated automatically to canonical `vv-media://` URLs on startup.
- Legacy external image URLs (`http://`, `https://`, `data:`, relative paths, custom schemes) are deprecated and stripped to `null` on migration and on future saves/updates.
- Upload/import flows remain local-file only. No renderer form accepts arbitrary remote image URLs.
- Airplane-mode smoke coverage verifies app launch, world creation with local thumbnail upload, and settings/theme flow without any network requests.

## Architecture Notes

- Shared normalization policy lives in `src/shared/media/imageSource.ts`.
- Main-process IPC handlers sanitize image fields before SQLite writes.
- Database startup migrations run `runOfflineMediaImageMigration()` to repair legacy local paths and clear unsupported external values.
- Renderer image helpers normalize read-time values through same shared policy so stale unsupported values do not render.

## Tests

- `tests/unit/shared/mediaImageSource.test.ts` - canonicalization and rejection rules for supported/unsupported image sources.
- `tests/unit/database/offlineMediaMigration.test.ts` - startup migration for legacy file URLs and deprecated external URLs.
- `tests/e2e/offline-smoke.test.ts` - airplane-mode launch/create/settings smoke with network blocked.

## Known Limits and Follow-Ups

- Migration clears deprecated external URLs instead of downloading or preserving them.
- Existing orphaned local image files are still not garbage-collected automatically.
