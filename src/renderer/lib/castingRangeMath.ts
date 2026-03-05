import {
  clampGridCellSize,
  pointyHexCenterFromAxial,
  getPointyHexVertexOffsets,
  getPointyHexRangeForBounds,
} from './runtimeMath';

export type AoeShape = 'circle' | 'rectangle' | 'cone' | 'line';

export type HighlightedSquareTile = { col: number; row: number };
export type HighlightedHexTile = { q: number; r: number };

export type CastingShapeParams = {
  shape: AoeShape | null; // null = point target (range circle only)
  sizeCells: number; // radius for circle, half-width for rect, length for cone/line
  angleRad: number; // direction angle in radians (used for cone/line)
};

type Point = { x: number; y: number };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function polygonArea(vertices: Point[]): number {
  const n = vertices.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    sum += vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
  }
  return Math.abs(sum) * 0.5;
}

function isInsideHalfPlane(p: Point, a: Point, b: Point): boolean {
  // Returns true if p is on the left side of (or on) the directed edge a -> b.
  // "Left" here means the cross product (b-a) × (p-a) >= 0.
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= 0;
}

function intersectSegments(a: Point, b: Point, c: Point, d: Point): Point {
  // Intersection of line through AB with line through CD.
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const cdx = d.x - c.x;
  const cdy = d.y - c.y;
  const denom = abx * cdy - aby * cdx;
  if (Math.abs(denom) < 1e-12) return a; // parallel — caller handles degenerate cases
  const t = ((c.x - a.x) * cdy - (c.y - a.y) * cdx) / denom;
  return { x: a.x + t * abx, y: a.y + t * aby };
}

/**
 * Sutherland-Hodgman single half-plane clip step.
 *
 * Clips `polygon` against the half-plane that is to the LEFT of the directed
 * edge from `edgeA` to `edgeB`.  Returns the clipped polygon (may be empty).
 */
function clipPolygonByHalfPlane(
  polygon: Point[],
  edgeA: Point,
  edgeB: Point,
): Point[] {
  const n = polygon.length;
  if (n === 0) return [];
  const output: Point[] = [];
  for (let i = 0; i < n; i++) {
    const curr = polygon[i];
    const prev = polygon[(i + n - 1) % n];
    const currInside = isInsideHalfPlane(curr, edgeA, edgeB);
    const prevInside = isInsideHalfPlane(prev, edgeA, edgeB);
    if (currInside) {
      if (!prevInside) {
        output.push(intersectSegments(prev, curr, edgeA, edgeB));
      }
      output.push(curr);
    } else if (prevInside) {
      output.push(intersectSegments(prev, curr, edgeA, edgeB));
    }
  }
  return output;
}

/**
 * Clips `subject` against the convex `clip` polygon using Sutherland-Hodgman
 * and returns the area of the result via the shoelace formula.
 *
 * The `clip` polygon must be wound such that the interior is to the LEFT of
 * each directed edge (CW winding in screen / PixiJS Y-down coordinates).
 */
function intersectionArea(subject: Point[], clip: Point[]): number {
  if (subject.length === 0 || clip.length === 0) return 0;
  let clipped = [...subject];
  const n = clip.length;
  for (let i = 0; i < n; i++) {
    if (clipped.length === 0) return 0;
    clipped = clipPolygonByHalfPlane(clipped, clip[i], clip[(i + 1) % n]);
  }
  return polygonArea(clipped);
}

/**
 * Builds a rectangle clip polygon wound CW in screen Y-down coordinates,
 * so that the interior is to the LEFT of every directed edge.
 *
 *   BL -> TL -> TR -> BR  (bottom-left, top-left, top-right, bottom-right)
 */
function rectClipPolygon(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): Point[] {
  return [
    { x: minX, y: maxY }, // bottom-left
    { x: minX, y: minY }, // top-left
    { x: maxX, y: minY }, // top-right
    { x: maxX, y: maxY }, // bottom-right
  ];
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Returns the world-space polygon vertices for the given AoE shape, centered
 * at `(centerX, centerY)`.  Returns an empty array when `shape` is `null`.
 *
 * All coordinates are in world units.  Angles are in radians with 0 pointing
 * in the positive-X (right) direction, consistent with PixiJS screen coords
 * where Y increases downward.
 */
export function getShapePolygon(
  params: CastingShapeParams,
  centerX: number,
  centerY: number,
  cellSize: number,
): Point[] {
  const { shape, sizeCells, angleRad } = params;
  const safe = clampGridCellSize(cellSize);

  if (shape === null) return [];

  if (shape === 'circle') {
    const radius = sizeCells * safe;
    const segments = 32;
    const vertices: Point[] = [];
    for (let i = 0; i < segments; i++) {
      const a = (2 * Math.PI * i) / segments;
      vertices.push({
        x: centerX + radius * Math.cos(a),
        y: centerY + radius * Math.sin(a),
      });
    }
    return vertices;
  }

  if (shape === 'rectangle') {
    const half = sizeCells * safe * 0.5;
    return [
      { x: centerX - half, y: centerY - half },
      { x: centerX + half, y: centerY - half },
      { x: centerX + half, y: centerY + half },
      { x: centerX - half, y: centerY + half },
    ];
  }

  if (shape === 'cone') {
    const dist = sizeCells * safe;
    return [
      { x: centerX, y: centerY },
      {
        x: centerX + dist * Math.cos(angleRad - Math.PI / 4),
        y: centerY + dist * Math.sin(angleRad - Math.PI / 4),
      },
      {
        x: centerX + dist * Math.cos(angleRad + Math.PI / 4),
        y: centerY + dist * Math.sin(angleRad + Math.PI / 4),
      },
    ];
  }

  if (shape === 'line') {
    const length = sizeCells * safe;
    const width = safe; // 1 cell wide
    const halfLen = length / 2;
    const halfW = width / 2;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const perpCos = Math.cos(angleRad + Math.PI / 2);
    const perpSin = Math.sin(angleRad + Math.PI / 2);
    return [
      {
        x: centerX + cos * halfLen + perpCos * halfW,
        y: centerY + sin * halfLen + perpSin * halfW,
      },
      {
        x: centerX + cos * halfLen - perpCos * halfW,
        y: centerY + sin * halfLen - perpSin * halfW,
      },
      {
        x: centerX - cos * halfLen - perpCos * halfW,
        y: centerY - sin * halfLen - perpSin * halfW,
      },
      {
        x: centerX - cos * halfLen + perpCos * halfW,
        y: centerY - sin * halfLen + perpSin * halfW,
      },
    ];
  }

  return [];
}

/**
 * Returns all square grid tiles whose area is ≥50% covered by the AoE shape.
 *
 * When `shape` is `null`, a point-target circle of `radius = cellSize * 0.5`
 * is used, which naturally selects the single tile the caster's centre is in.
 */
export function getHighlightedSquareTiles(
  params: CastingShapeParams,
  casterX: number,
  casterY: number,
  rangeCells: number,
  cellSize: number,
  originX: number,
  originY: number,
): HighlightedSquareTile[] {
  const safe = clampGridCellSize(cellSize);
  const { shape, sizeCells } = params;

  const effectiveSizeCells = shape === null ? 0.5 : sizeCells;
  const effectiveParams: CastingShapeParams =
    shape === null
      ? { shape: 'circle', sizeCells: 0.5, angleRad: 0 }
      : params;

  const shapePolygon = getShapePolygon(effectiveParams, casterX, casterY, safe);

  const searchRadius = (rangeCells + effectiveSizeCells + 1) * safe;
  const colMin = Math.floor((casterX - searchRadius - originX) / safe);
  const colMax = Math.ceil((casterX + searchRadius - originX) / safe);
  const rowMin = Math.floor((casterY - searchRadius - originY) / safe);
  const rowMax = Math.ceil((casterY + searchRadius - originY) / safe);

  const tileArea = safe * safe;
  const result: HighlightedSquareTile[] = [];

  for (let col = colMin; col <= colMax; col++) {
    for (let row = rowMin; row <= rowMax; row++) {
      const tileMinX = originX + col * safe;
      const tileMinY = originY + row * safe;
      const tileMaxX = tileMinX + safe;
      const tileMaxY = tileMinY + safe;

      const clip = rectClipPolygon(tileMinX, tileMinY, tileMaxX, tileMaxY);
      const coverage = intersectionArea(shapePolygon, clip);
      if (coverage / tileArea >= 0.5 - 1e-9) {
        result.push({ col, row });
      }
    }
  }

  return result;
}

/**
 * Returns all pointy-top hex tiles (axial coords) whose area is ≥50% covered
 * by the AoE shape.
 *
 * When `shape` is `null`, a point-target circle of `radius = cellSize * 0.5`
 * is used, selecting the single hex the caster's centre is in.
 */
export function getHighlightedHexTiles(
  params: CastingShapeParams,
  casterX: number,
  casterY: number,
  rangeCells: number,
  cellSize: number,
  originX: number,
  originY: number,
): HighlightedHexTile[] {
  const safe = clampGridCellSize(cellSize);
  const { shape, sizeCells } = params;

  const effectiveSizeCells = shape === null ? 0.5 : sizeCells;
  const effectiveParams: CastingShapeParams =
    shape === null
      ? { shape: 'circle', sizeCells: 0.5, angleRad: 0 }
      : params;

  const shapePolygon = getShapePolygon(effectiveParams, casterX, casterY, safe);

  const searchRadius = (rangeCells + effectiveSizeCells + 1) * safe;
  const bounds = {
    left: casterX - searchRadius,
    right: casterX + searchRadius,
    top: casterY - searchRadius,
    bottom: casterY + searchRadius,
  };

  const hexRange = getPointyHexRangeForBounds(bounds, originX, originY, safe);
  const vertexOffsets = getPointyHexVertexOffsets(safe);

  // Hex area: (3√3 / 2) * r²  where r = cellSize / 2
  const hexRadius = safe * 0.5;
  const hexArea = ((3 * Math.sqrt(3)) / 2) * hexRadius * hexRadius;

  const maxSearchDistSq = (searchRadius + safe) * (searchRadius + safe);
  const result: HighlightedHexTile[] = [];

  for (let q = hexRange.qMin; q <= hexRange.qMax; q++) {
    for (let r = hexRange.rMin; r <= hexRange.rMax; r++) {
      const center = pointyHexCenterFromAxial(q, r, originX, originY, safe);

      // Skip tiles whose centre is obviously too far from the caster.
      const dx = center.x - casterX;
      const dy = center.y - casterY;
      if (dx * dx + dy * dy > maxSearchDistSq) continue;

      // Build the hex clip polygon in CW screen-Y-down winding.
      // getPointyHexVertexOffsets returns vertices starting at the top and
      // going clockwise in screen (Y-down) coords, so the interior is to the
      // LEFT of each directed edge — exactly what clipPolygonByHalfPlane needs.
      const hexClip: Point[] = vertexOffsets.map((off) => ({
        x: center.x + off.x,
        y: center.y + off.y,
      }));

      const coverage = intersectionArea(shapePolygon, hexClip);
      if (coverage / hexArea >= 0.5 - 1e-9) {
        result.push({ q, r });
      }
    }
  }

  return result;
}
