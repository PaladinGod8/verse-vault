// eslint-disable-next-line import/no-unresolved -- pixi.js exposes these via package exports; eslint-import resolver flags a false positive.
import type { PointData } from 'pixi.js';
// eslint-disable-next-line import/no-unresolved -- pixi.js exposes these via package exports; eslint-import resolver flags a false positive.
import { Polygon, Rectangle } from 'pixi.js';

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

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Extract individual vertices from a PixiJS Polygon's flat number[] store. */
function polygonVertices(poly: Polygon): PointData[] {
  const pts: PointData[] = [];
  for (let i = 0; i + 1 < poly.points.length; i += 2) {
    pts.push({ x: poly.points[i], y: poly.points[i + 1] });
  }
  return pts;
}

/** Build a PixiJS Polygon from an array of PointData vertices. */
function polygonFromPoints(pts: PointData[]): Polygon {
  const flat: number[] = [];
  for (const p of pts) flat.push(p.x, p.y);
  return new Polygon(flat);
}

/**
 * Build a rectangle clip polygon wound CW in screen Y-down coordinates from a
 * PixiJS Rectangle, so the interior is to the LEFT of every directed edge.
 *
 *   BL -> TL -> TR -> BR  (bottom-left, top-left, top-right, bottom-right)
 */
function rectClipPolygon(rect: Rectangle): PointData[] {
  return [
    { x: rect.left, y: rect.bottom }, // bottom-left
    { x: rect.left, y: rect.top }, // top-left
    { x: rect.right, y: rect.top }, // top-right
    { x: rect.right, y: rect.bottom }, // bottom-right
  ];
}

function polygonArea(vertices: PointData[]): number {
  const n = vertices.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    sum += vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
  }
  return Math.abs(sum) * 0.5;
}

function isInsideHalfPlane(p: PointData, a: PointData, b: PointData): boolean {
  // Returns true if p is on the left side of (or on) the directed edge a -> b.
  // "Left" means the cross product (b-a) × (p-a) >= 0.
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= 0;
}

function intersectSegments(
  a: PointData,
  b: PointData,
  c: PointData,
  d: PointData,
): PointData {
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
  polygon: PointData[],
  edgeA: PointData,
  edgeB: PointData,
): PointData[] {
  const n = polygon.length;
  if (n === 0) return [];
  const output: PointData[] = [];
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
 * Clips `subject` vertices against the convex `clip` polygon using
 * Sutherland-Hodgman and returns the area of the result via shoelace.
 *
 * The `clip` polygon must be wound CW in screen Y-down coordinates so the
 * interior is to the LEFT of each directed edge.
 */
function intersectionArea(subject: PointData[], clip: PointData[]): number {
  if (subject.length === 0 || clip.length === 0) return 0;
  let clipped = [...subject];
  const n = clip.length;
  for (let i = 0; i < n; i++) {
    if (clipped.length === 0) return 0;
    clipped = clipPolygonByHalfPlane(clipped, clip[i], clip[(i + 1) % n]);
  }
  return polygonArea(clipped);
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Returns the world-space PixiJS Polygon for the given AoE shape, centered at
 * `(centerX, centerY)`.  Returns an empty Polygon when `shape` is `null`.
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
): Polygon {
  const { shape, sizeCells, angleRad } = params;
  const safe = clampGridCellSize(cellSize);

  if (shape === null) return new Polygon([]);

  if (shape === 'circle') {
    const radius = sizeCells * safe;
    const segments = 32;
    const pts: PointData[] = [];
    for (let i = 0; i < segments; i++) {
      const a = (2 * Math.PI * i) / segments;
      pts.push({ x: centerX + radius * Math.cos(a), y: centerY + radius * Math.sin(a) });
    }
    return polygonFromPoints(pts);
  }

  if (shape === 'rectangle') {
    const half = sizeCells * safe * 0.5;
    return polygonFromPoints([
      { x: centerX - half, y: centerY - half },
      { x: centerX + half, y: centerY - half },
      { x: centerX + half, y: centerY + half },
      { x: centerX - half, y: centerY + half },
    ]);
  }

  if (shape === 'cone') {
    const dist = sizeCells * safe;
    return polygonFromPoints([
      { x: centerX, y: centerY },
      {
        x: centerX + dist * Math.cos(angleRad - Math.PI / 4),
        y: centerY + dist * Math.sin(angleRad - Math.PI / 4),
      },
      {
        x: centerX + dist * Math.cos(angleRad + Math.PI / 4),
        y: centerY + dist * Math.sin(angleRad + Math.PI / 4),
      },
    ]);
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
    return polygonFromPoints([
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
    ]);
  }

  return new Polygon([]);
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
    shape === null ? { shape: 'circle', sizeCells: 0.5, angleRad: 0 } : params;

  const shapePoly = getShapePolygon(effectiveParams, casterX, casterY, safe);
  const shapeVerts = polygonVertices(shapePoly);

  const searchRadius = (rangeCells + effectiveSizeCells + 1) * safe;
  const colMin = Math.floor((casterX - searchRadius - originX) / safe);
  const colMax = Math.ceil((casterX + searchRadius - originX) / safe);
  const rowMin = Math.floor((casterY - searchRadius - originY) / safe);
  const rowMax = Math.ceil((casterY + searchRadius - originY) / safe);

  const tileArea = safe * safe;
  const result: HighlightedSquareTile[] = [];

  for (let col = colMin; col <= colMax; col++) {
    for (let row = rowMin; row <= rowMax; row++) {
      const tile = new Rectangle(originX + col * safe, originY + row * safe, safe, safe);
      const clip = rectClipPolygon(tile);
      const coverage = intersectionArea(shapeVerts, clip);
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
    shape === null ? { shape: 'circle', sizeCells: 0.5, angleRad: 0 } : params;

  const shapePoly = getShapePolygon(effectiveParams, casterX, casterY, safe);
  const shapeVerts = polygonVertices(shapePoly);

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
      const hexClip: PointData[] = vertexOffsets.map((off) => ({
        x: center.x + off.x,
        y: center.y + off.y,
      }));

      const coverage = intersectionArea(shapeVerts, hexClip);
      if (coverage / hexArea >= 0.5 - 1e-9) {
        result.push({ q, r });
      }
    }
  }

  return result;
}
