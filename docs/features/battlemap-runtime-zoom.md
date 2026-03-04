# BattleMap Runtime Zoom

## Problem / Context

When the runtime canvas first launched, the camera had no user-controlled zoom. DMs
needed a way to zoom in on details (tokens, terrain features) and zoom out to regain
spatial context, all without leaving the runtime play view.

Additionally, the camera required an absolute lower bound so the scene could never
shrink to a useless sliver, and an upper bound so the view could never zoom in so far
that it loses spatial context.

## Scope

**In scope**

- Mouse-wheel zoom on the Pixi canvas during runtime play.
- Viewport-relative minimum zoom (scene fits within the viewport without empty margins).
- Absolute zoom bounds: `MIN_CAMERA_ZOOM = 0.25`, `MAX_CAMERA_ZOOM = 8`.
- Cursor-anchored zoom (the world point under the cursor stays fixed while zooming).

**Out of scope**

- Pinch-to-zoom on touch devices.
- Explicit zoom buttons in the UI.
- Persisting zoom level across sessions or to the database.
- Pan boundaries / scroll limits.

## Delivered Behavior

### Wheel direction mapping

| Scroll direction | `deltaY` sign | Effect   |
| ---------------- | ------------- | -------- |
| Scroll down      | positive      | Zoom in  |
| Scroll up        | negative      | Zoom out |

This matches the de-facto browser convention for map/canvas zoom.

### Delta normalization

`WheelEvent.deltaMode` is normalized before computing the zoom factor:

| `deltaMode` | Multiplier | Reason                           |
| ----------- | ---------- | -------------------------------- |
| `0` (pixel) | ×1         | Raw pixel delta, already correct |
| `1` (line)  | ×16        | Estimated line height (px)       |
| `2` (page)  | ×400       | Estimated page height (px)       |

Normalized delta → zoom factor: `factor = WHEEL_ZOOM_BASE ^ normalizedDelta`
where `WHEEL_ZOOM_BASE = 1.001`.

### Zoom bounds

```
MIN_CAMERA_ZOOM = 0.25   (absolute floor, enforced in clampCameraZoom)
MAX_CAMERA_ZOOM = 8      (absolute ceiling)
```

The _effective_ minimum zoom for a given viewport is computed via
`getMinZoomForScene(viewportWidth, viewportHeight, scene)`:

- Scene bounds equal the viewport size in world coordinates (see `getRuntimeSceneBounds`).
- The fit zoom is `min(viewportWidth / sceneWidth, viewportHeight / sceneHeight)`.
- The result is clamped to `[MIN_CAMERA_ZOOM, ∞)`.

`clampCameraZoom(zoom, minZoom, maxZoom?)` enforces both sides:

- Always floors at `MIN_CAMERA_ZOOM` even when `minZoom` is supplied lower.
- Handles non-finite and non-positive inputs via `getSafeCameraZoom` (falls back to `1`).

### Cursor-anchored zoom

While zooming, the world point under the cursor stays fixed:

```
worldX = camera.x + (screenX - halfVpW) / oldZoom
newCameraX = worldX - (screenX - halfVpW) / newZoom
```

The same formula applies on the Y axis.

### Wheel during token drag

Wheel events are ignored (`return` early) when a token drag is active, preventing
accidental zoom changes mid-drag.

### Camera focus animation

Any in-progress camera focus animation (from a token-select click) is cancelled when
a wheel zoom begins, so the two motions do not fight each other.

## Key Source Files

| File                                                                                                                           | Purpose                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| [src/renderer/lib/runtimeMath.ts](../../src/renderer/lib/runtimeMath.ts)                                                       | `MIN_CAMERA_ZOOM`, `MAX_CAMERA_ZOOM`, `getRuntimeSceneBounds`, `getMinZoomForScene`, `clampCameraZoom`, `getSafeCameraZoom` |
| [src/renderer/components/runtime/BattleMapRuntimeCanvas.tsx](../../src/renderer/components/runtime/BattleMapRuntimeCanvas.tsx) | `handleWheel` event handler, `getEffectiveMinZoom`, `WHEEL_ZOOM_BASE`, `WHEEL_LINE_HEIGHT`, `WHEEL_PAGE_HEIGHT`             |

## Tests

| Test file                                                                                                        | Coverage                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [tests/unit/renderer/runtimeMath.test.ts](../../tests/unit/renderer/runtimeMath.test.ts)                         | `getRuntimeSceneBounds`, `getMinZoomForScene`, `clampCameraZoom`, `getSafeCameraZoom` — bounds, edge cases, invalid inputs |
| [tests/unit/renderer/battleMapRuntimeCanvas.test.tsx](../../tests/unit/renderer/battleMapRuntimeCanvas.test.tsx) | Wheel zoom-in/out changes camera scale; zoom clamps at bounds; no zoom during token drag                                   |
| [tests/e2e/battlemap-runtime-play.test.ts](../../tests/e2e/battlemap-runtime-play.test.ts)                       | Smoke test: scroll down → canvas differs from pre-zoom snapshot; scroll up → canvas remains visible and functional         |

## Known Limitations / Follow-ups

- **No pan bounds**: Camera can be panned off the scene entirely; there are no world-edge
  clamps. A follow-up should add pan boundary enforcement that uses scene bounds.
- **Touch pinch-to-zoom not implemented**: Only pointer-based panning and wheel zoom are
  available. Multi-touch gestures are a separate follow-up.
- **Scene bounds always equal viewport**: `getRuntimeSceneBounds` returns the viewport
  size regardless of the map image's natural dimensions. If the rendering model changes
  to use actual map image dimensions (e.g., large maps scrolled within a smaller
  viewport), `getRuntimeSceneBounds` must be updated.
- **Zoom level is not persisted**: Each runtime session starts from the saved camera
  config. User zoom adjustments are lost on exit.
