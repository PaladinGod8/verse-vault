# Casting Range Overlay Feature

## Purpose

The Casting Range Overlay feature enables TTRPG game masters and players to visually preview ability casting ranges and areas of effect (AoE) directly on battlemaps. It solves the problem of uncertain targeting by overlaying a range ring (all tiles within casting reach), shape-specific AoE highlights (affected tiles), and directional feedback for cone and line abilities—allowing users to confirm targeting before committing to an action.

## Scope (Current Implementation)

### What is Included

- Four new immutable fields on the `Ability` record:
  - `range_cells`: integer maximum range in grid cells
  - `aoe_shape`: shape type (none, circle, cone, line, rectangle)
  - `aoe_size_cells`: integer AoE radius/width in grid cells
  - `target_type`: targeting mode (tile or token)
- Ability form fields (create/edit modal) to author these four fields for active abilities only.
- Pure math module (`castingRangeMath.ts`) for:
  - Generating shape polygons (circle, cone, line, rectangle) around a casting origin
  - Computing tile coverage via Sutherland-Hodgman polygon clipping
  - Applying ≥50% coverage rule for tile highlighting
- Battlemap runtime overlay layer:
  - New `rangeOverlayContainer` inserted between `gridContainer` and `tokenContainer` in the PixiJS stage
  - Ability picker panel (loads abilities from selected token's linked statblock, filters by active type)
  - Range ring visualization (all tiles within `range_cells`)
  - AoE highlights (tiles affected by the AoE shape at ≥50% coverage)
  - Directional shape tracking (pointer-tracking for cone/line angles on square grids)
- Unit tests with ≥80% coverage on all new code.
- E2E tests validating visual overlay rendering and user interactions.

### What is Not Included

- Combat/encounter resolution; abilities do not have mechanical effects.
- Line-of-sight, fog of war, or obstacle/wall blocking.
- Token-to-ability linking UI in token management pages.
- Multiplayer sync or persistence of cast mode state.
- Click-to-cast, ability activation, or tile marking from the overlay.
- Animation on range overlay or transition effects.
- For `rectangle` shapes: rotation tracking; rectangles are always axis-aligned.
- For `none`-mode (freeform) battlemaps: tile coverage highlights; range ring is visual-only.

## User-Facing Behavior

### Authoring: Ability Form

When creating or editing an **active** ability, the form presents four new fields:

- **Range (cells)** — integer input; must be ≥ 0. Represents the outer boundary of the casting range.
- **AoE Shape** — dropdown: `none`, `circle`, `cone`, `line`, `rectangle`. Defaults to `none`.
- **AoE Size (cells)** — integer input; appears only when AoE Shape is not `none`. Must be ≥ 0 when the shape is selected. Represents the radius (`circle`, `cone`, `line`) or width (`rectangle`).
- **Target Type** — dropdown: `tile` or `token`. Defaults to `tile`. Determines the visual rendering mode at runtime.

Validation:

- `Range (cells)` is required; must be a non-negative integer.
- If `AoE Shape` is not `none`, then `AoE Size (cells)` is required and must be a non-negative integer.
- If `AoE Shape` is `none`, `AoE Size (cells)` is hidden and ignored.

### Runtime: Entering Cast Mode

1. From the battlemap runtime view, select a token on the canvas.
2. The **Ability Picker Panel** slides in (or becomes visible) on the side.
3. The panel resolves the selected token's linked statblock and lists active assigned abilities (`type = 'active'`).
4. The panel resolves the selected token's linked statblock and displays active assigned abilities (`type = 'active'`).
5. Select an ability from the panel list.

### Runtime: Range Ring and AoE Highlights

Once an ability is selected:

1. **Range Ring** — A colored circle (or hex ring for hex grids) appears on the grid, centered at the token's position, extending to `range_cells` distance. This ring shows all tiles the caster can reach.
2. **AoE Shape Display**:
   - For `aoe_shape = none`: no highlights; only the range ring is shown.
   - For `aoe_shape = circle`: a filled circle of radius `aoe_size_cells` appears, centered on the selected target tile or token.
   - For `aoe_shape = cone` (square grids only): a cone shape extends from the caster, opening toward the aimed direction; width scales with `aoe_size_cells`.
   - For `aoe_shape = line` (square grids only): a line extends from the caster in the aimed direction with width proportional to `aoe_size_cells`.
   - For `aoe_shape = rectangle`: an axis-aligned rectangle of width/height `aoe_size_cells` appears. For square grids, the rectangle is centered on the target tile; for hex grids, rectangles are not recommended and rendering may be degraded.

3. **Tile Highlighting** — A tile is highlighted if ≥50% of its area is covered by the AoE polygon (computed via Sutherland-Hodgman clipping). Hex tiles and square cells both respect this threshold.

### Runtime: Directional Shapes (Pointer Tracking)

For `aoe_shape = cone` or `aoe_shape = line` on square grids:

- The overlay **tracks the mouse pointer** on the canvas.
- The shape's angle and direction rotate to point toward the cursor.
- As the cursor moves, AoE highlights update in real-time.
- Upon leaving the canvas or selecting a different ability, tracking stops.

For hex grids or `aoe_shape = circle` / `aoe_shape = rectangle`:

- No pointer tracking; shapes are static relative to the caster.

### Runtime: Target Type Rendering

- **`target_type = tile`** — AoE highlights are applied to individual grid cells. Affects grid tiles only.
- **`target_type = token`** — Overlay highlights grid tiles, but semantically indicates token-level targeting (tokens on affected tiles are potential targets). Visual rendering is the same; the semantic distinction is informational for future token-level features.

### Runtime: Exiting Cast Mode

- Click the ability panel's close/back button.
- Select a different ability from the panel.
- Select a different token on the canvas.
- Exit the battlemap runtime.

When cast mode exits, the range ring and AoE highlights are immediately removed from the overlay.

## Architecture Notes

### Database Schema

The `abilities` table gains four new columns (all nullable; backward-compatible):

- `range_cells INTEGER NULL` — Grid cells of casting distance.
- `aoe_shape TEXT NULL CHECK(aoe_shape IN ('none', 'circle', 'cone', 'line', 'rectangle'))` — Shape type.
- `aoe_size_cells INTEGER NULL` — AoE radius/width in cells (required when shape is not 'none').
- `target_type TEXT NULL CHECK(target_type IN ('tile', 'token')) DEFAULT 'tile'` — Targeting mode.

Migrations add these columns with `NULL` defaults; existing abilities remain unaffected.

### Math Module: `castingRangeMath.ts`

Pure math functions (no PixiJS, no side effects):

- **Shape Polygon Generation**
  - `generateShapePolygon(origin, shape, radius, direction, gridMode)` → world-space polygon vertices.
  - Supports: circle, cone, line (square grids only), rectangle.
  - For grids, all distances are in grid cells; conversion to world pixels happens at render time.

- **Tile Coverage Computation**
  - `getTileCoverageForShape(shapePolygon, gridMode, gridSize)` → list of highlighted tiles.
  - Clips shape polygon against each tile boundary via Sutherland-Hodgman algorithm.
  - Applies ≥50% coverage rule: `(clippedArea / tileArea) >= 0.5`.

- **Angle Computation**
  - `computeAngleFromPointer(cursorWorldPos, casterWorldPos)` → angle in radians or grid direction.

### Frontend Overlay Layer

- **Layer Insertion** — New `rangeOverlayContainer` (PixiJS Container) is inserted into the stage graph between `gridContainer` and `tokenContainer`, ensuring overlays render above the grid but below tokens.

- **Runtime Overlay Renderer**
  - `BattlemapRangeOverlay.tsx` (or equivalent) renders using PixiJS primitives (circles, polygons).
  - Listens to token selection state and ability picker selection.
  - Updates overlay visuals on state change and continuous pointer movement.

- **Ability Picker Panel**
  - `AbilityPickerPanel` in `src/renderer/components/runtime/`.
  - Resolves linked statblock via `window.db.statblocks.getLinkedStatblock(sourceTokenId)`.
  - Loads abilities via `window.db.statblocks.listAbilities(statblockId)`.
  - Filters to `type = 'active'` only.
  - Displays ability name and summary (type/description optional).
  - Emits selection change and close events.
  - Token-statblock scoped, with safe fallback messages for unlinked tokens.

### IPC and Preload Contract

No new casting-specific IPC channels; existing contracts are reused:

- `window.db.statblocks.getLinkedStatblock(tokenId)` — resolves selected token link.
- `window.db.statblocks.listAbilities(statblockId)` — loads linked statblock abilities.
- `window.db.battlemaps.update(id, partialData)` — persists grid config if needed (already implemented).

The overlay does not persist cast-mode state or reads/writes any ability-specific runtime data; it is a stateless visual layer.

### Pointer Tracking for Directional Shapes

- Canvas `pointermove` events are captured.
- Cursor screen position is converted to world-space coordinates using the camera transform.
- World-space angle from caster to cursor is computed.
- For cone shapes: opening angle is fixed; direction rotates to point toward cursor.
- For line shapes: width is fixed; direction rotates to point toward cursor.
- Updates occur on every pointer move (throttled if necessary for performance).

### Coverage Clipping Algorithm

Sutherland-Hodgman clipping:

1. Start with tile boundary polygon (usually a square or hexagon cell).
2. Iteratively clip against each edge of the AoE shape polygon.
3. Compute area of resulting clipped polygon.
4. If `clipped_area / tile_area >= 0.5`, tile is highlighted.

This algorithm handles complex shape intersections (e.g., cones, lines, irregular overlaps).

## Data Model

### Schema (`src/database/db.ts`)

`abilities` table gains four new columns:

```sql
ALTER TABLE abilities ADD COLUMN range_cells INTEGER NULL;
ALTER TABLE abilities ADD COLUMN aoe_shape TEXT NULL CHECK(aoe_shape IN ('none', 'circle', 'cone', 'line', 'rectangle'));
ALTER TABLE abilities ADD COLUMN aoe_size_cells INTEGER NULL;
ALTER TABLE abilities ADD COLUMN target_type TEXT NULL CHECK(target_type IN ('tile', 'token')) DEFAULT 'tile';
```

All columns are nullable to maintain backward compatibility.

### Shared Type (`forge.env.d.ts`)

`Ability` type is extended with:

```typescript
{
  range_cells?: number | null;
  aoe_shape?: 'none' | 'circle' | 'cone' | 'line' | 'rectangle' | null;
  aoe_size_cells?: number | null;
  target_type?: 'tile' | 'token' | null;
  // ... existing fields ...
}
```

## Validation and Error Rules

### Ability Form Validation (Renderer)

- `Range must be a non-negative integer.` — When range is provided but invalid.
- `Range is required.` — When ability is active but range is empty or blank.
- `AoE shape must be one of: none, circle, cone, line, rectangle.` — When invalid shape selected.
- `AoE size is required when AoE shape is selected.` — When shape is not `none` but size is missing.
- `AoE size must be a non-negative integer.` — When size is provided but invalid.
- `Target type must be tile or token.` — When invalid target type selected.

### Main Handler Validation

When updating an ability with new range/AoE fields:

- **Range cells** — Trim and parse as integer; reject if negative or NaN.
- **AoE shape** — Must be one of the enum values or `null`.
- **AoE size cells** — If shape is not `none`, size is required and must be non-negative; if shape is `none`, size is ignored.
- **Target type** — Must be `tile` or `token` (default `tile`).
- If validation fails, main process returns error: `Invalid ability fields: <detail>`.

### Check Constraints (Database)

- `aoe_shape IN ('none', 'circle', 'cone', 'line', 'rectangle')` — Prevents invalid shape values.
- `target_type IN ('tile', 'token')` — Prevents invalid target types.

## Limits and Non-Goals

### Explicit Non-Goals

- **No combat resolution** — The overlay is visual only; it does not apply effects, roll dice, or track ability usage.
- **No line-of-sight or obstacle blocking** — All tiles within range are highlighted regardless of walls, terrain, or visibility.
- **No dedicated token-link management UI here** — token/statblock linking exists, but this feature does not provide link-management screens.
- **No multiplayer sync** — Cast mode state is local to the current runtime session.
- **No animation or transitions** — Overlays appear/disappear instantly.
- **No click-to-cast or tile marking** — Clicking a tile does not trigger ability casting; the overlay is preview-only.
- **Rectangle rotation** — Rectangles are always axis-aligned; pointer direction has no effect on rectangle angle or shape.
- **`none`-mode (freeform) battlemap tile highlights** — On freeform grids, the range ring still renders visually, but individual tile highlighting is disabled (no grid cells to highlight).

### Current Limitations

- Hex grids on directional shapes (cone, line) render primarily with square grid assumptions; hex-specific cone/line rendering may appear imperfect.
- Pointer tracking only works when the mouse is over the canvas; moving the cursor off-canvas freezes the shape at the last tracked angle.
- Range ring and AoE visibility is determined by overlay layer depth; no z-order control within the overlay layer itself.
- Performance on very large AoE shapes (radius > 20 cells) or densely packed tile grids may degrade; no automatic LOD (level-of-detail) optimization.
- Undo/redo is not implemented for ability field changes in the form.

### Future Enhancements

- Token-scoped ability filtering (retrieve abilities linked to the active token).
- Multi-target or multi-ability previews (simultaneous display of multiple casting ranges).
- Click-to-cast integration (confirm and execute from the overlay).
- Procedural terrain/obstacle awareness for line-of-sight filtering.
- Animated shape transitions or pulsing highlights for usability.
- Customizable overlay colors and opacity per campaign or user preferences.
