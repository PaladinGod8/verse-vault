type Point2d = {
  x: number;
  y: number;
};

type AxialHexRange = {
  qMin: number;
  qMax: number;
  rMin: number;
  rMax: number;
};

type WorldViewportBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

const SQRT_3 = Math.sqrt(3);

export const DEFAULT_GRID_CELL_SIZE = 50;
export const MIN_GRID_CELL_SIZE = 12;
export const MAX_GRID_CELL_SIZE = 240;
const DEFAULT_CAMERA_ZOOM = 1;
const DEFAULT_CAMERA_FOCUS_SMOOTHING = 0.18;
const DEFAULT_CAMERA_FOCUS_SNAP_DISTANCE = 0.5;

// Absolute zoom bounds enforced across all runtime camera interactions.
// MIN_CAMERA_ZOOM prevents the scene from shrinking to a useless sliver;
// MAX_CAMERA_ZOOM prevents runaway zoom-in that loses spatial context.
export const MIN_CAMERA_ZOOM = 0.25;
export const MAX_CAMERA_ZOOM = 8;

// Scene bounds describe the world-space extent of the rendered content area
// (the map/background layer). Used to compute the minimum zoom that keeps the
// scene visible within the viewport.
export type RuntimeSceneBounds = {
  /** Scene width in world units — the same coordinate space as camera.x. */
  width: number;
  /** Scene height in world units — the same coordinate space as camera.y. */
  height: number;
};

export function getSafeCameraZoom(
  zoom: number,
  fallback = DEFAULT_CAMERA_ZOOM,
): number {
  if (!Number.isFinite(zoom) || zoom <= 0) {
    return fallback;
  }

  return zoom;
}

/**
 * Returns scene bounds in world units for the current rendering model.
 *
 * Contract:
 * - The background and map layers are drawn as a viewport-sized rect centered
 *   at world origin (0, 0). In world coordinates, the scene spans:
 *     x: [-viewportWidth / 2, viewportWidth / 2]
 *     y: [-viewportHeight / 2, viewportHeight / 2]
 * - This applies whether or not a map image is present: the fallback
 *   background covers the same world-space area as the map sprite.
 * - If the rendering model changes to use natural map image dimensions
 *   instead of always filling the viewport, update this function to accept
 *   and use those dimensions as the scene extent.
 */
export function getRuntimeSceneBounds(
  viewportWidth: number,
  viewportHeight: number,
): RuntimeSceneBounds {
  return {
    width: viewportWidth > 0 ? viewportWidth : 1,
    height: viewportHeight > 0 ? viewportHeight : 1,
  };
}

/**
 * Returns the minimum camera zoom at which the scene fits entirely within
 * the viewport without empty margins on either axis.
 *
 * Below this zoom the scene is smaller than the viewport and empty space
 * appears around it. Always returns at least MIN_CAMERA_ZOOM.
 */
export function getMinZoomForScene(
  viewportWidth: number,
  viewportHeight: number,
  scene: RuntimeSceneBounds,
): number {
  if (
    viewportWidth <= 0
    || viewportHeight <= 0
    || scene.width <= 0
    || scene.height <= 0
  ) {
    return MIN_CAMERA_ZOOM;
  }

  const fitZoom = Math.min(
    viewportWidth / scene.width,
    viewportHeight / scene.height,
  );
  return Math.max(MIN_CAMERA_ZOOM, fitZoom);
}

/**
 * Clamps zoom to [minZoom, maxZoom], guarding against non-positive or
 * non-finite inputs. Always enforces MIN_CAMERA_ZOOM as the absolute floor.
 */
export function clampCameraZoom(
  zoom: number,
  minZoom: number,
  maxZoom = MAX_CAMERA_ZOOM,
): number {
  const safeZoom = getSafeCameraZoom(zoom);
  const safeMin = Number.isFinite(minZoom) && minZoom > 0
    ? Math.max(MIN_CAMERA_ZOOM, minZoom)
    : MIN_CAMERA_ZOOM;
  const safeMax = Number.isFinite(maxZoom) && maxZoom > 0
    ? Math.max(safeMin, maxZoom)
    : Math.max(safeMin, MAX_CAMERA_ZOOM);
  return Math.min(safeMax, Math.max(safeMin, safeZoom));
}

export function clampGridCellSize(
  value: number,
  fallback = DEFAULT_GRID_CELL_SIZE,
): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.min(MAX_GRID_CELL_SIZE, Math.max(MIN_GRID_CELL_SIZE, value));
}

export function getWorldViewportBounds(
  viewportWidth: number,
  viewportHeight: number,
  camera: Pick<BattleMapRuntimeCameraConfig, 'x' | 'y' | 'zoom'>,
): WorldViewportBounds {
  const safeZoom = getSafeCameraZoom(camera.zoom);
  const halfWorldWidth = viewportWidth / (2 * safeZoom);
  const halfWorldHeight = viewportHeight / (2 * safeZoom);

  return {
    left: camera.x - halfWorldWidth,
    right: camera.x + halfWorldWidth,
    top: camera.y - halfWorldHeight,
    bottom: camera.y + halfWorldHeight,
  };
}

export function worldDeltaFromScreenDelta(
  deltaX: number,
  deltaY: number,
  zoom: number,
): Point2d {
  const safeZoom = getSafeCameraZoom(zoom);
  return {
    x: deltaX / safeZoom,
    y: deltaY / safeZoom,
  };
}

export function stepCameraCenterTowardTarget(
  currentX: number,
  currentY: number,
  targetX: number,
  targetY: number,
  smoothing = DEFAULT_CAMERA_FOCUS_SMOOTHING,
  snapDistance = DEFAULT_CAMERA_FOCUS_SNAP_DISTANCE,
): { x: number; y: number; isComplete: boolean; } {
  const safeSmoothing = Number.isFinite(smoothing) && smoothing > 0
    ? Math.min(1, smoothing)
    : DEFAULT_CAMERA_FOCUS_SMOOTHING;
  const safeSnapDistance = Number.isFinite(snapDistance) && snapDistance >= 0
    ? snapDistance
    : DEFAULT_CAMERA_FOCUS_SNAP_DISTANCE;
  const deltaX = targetX - currentX;
  const deltaY = targetY - currentY;

  if (Math.hypot(deltaX, deltaY) <= safeSnapDistance) {
    return {
      x: targetX,
      y: targetY,
      isComplete: true,
    };
  }

  return {
    x: currentX + deltaX * safeSmoothing,
    y: currentY + deltaY * safeSmoothing,
    isComplete: false,
  };
}

export function getSquareGridLinePositions(
  min: number,
  max: number,
  origin: number,
  cellSize: number,
  maxLines = 800,
): number[] {
  const safeCellSize = clampGridCellSize(cellSize);
  const indexStart = Math.floor((min - origin) / safeCellSize) - 1;
  const indexEnd = Math.ceil((max - origin) / safeCellSize) + 1;
  const positions: number[] = [];

  for (let index = indexStart; index <= indexEnd; index += 1) {
    if (positions.length >= maxLines) {
      break;
    }
    positions.push(origin + index * safeCellSize);
  }

  return positions;
}

export function getPointyHexVertexOffsets(cellSize: number): Point2d[] {
  const radius = clampGridCellSize(cellSize) * 0.5;
  const halfRadius = radius * 0.5;
  const quarterHeight = SQRT_3 * radius * 0.5;

  return [
    { x: 0, y: -radius },
    { x: quarterHeight, y: -halfRadius },
    { x: quarterHeight, y: halfRadius },
    { x: 0, y: radius },
    { x: -quarterHeight, y: halfRadius },
    { x: -quarterHeight, y: -halfRadius },
  ];
}

export function pointyHexCenterFromAxial(
  q: number,
  r: number,
  originX: number,
  originY: number,
  cellSize: number,
): Point2d {
  const radius = clampGridCellSize(cellSize) * 0.5;

  return {
    x: originX + radius * SQRT_3 * (q + r * 0.5),
    y: originY + radius * 1.5 * r,
  };
}

function pointyHexAxialFromWorld(
  x: number,
  y: number,
  originX: number,
  originY: number,
  cellSize: number,
): Point2d {
  const radius = clampGridCellSize(cellSize) * 0.5;
  const shiftedX = x - originX;
  const shiftedY = y - originY;

  return {
    x: ((SQRT_3 / 3) * shiftedX - shiftedY / 3) / radius,
    y: ((2 / 3) * shiftedY) / radius,
  };
}

export function getPointyHexRangeForBounds(
  bounds: WorldViewportBounds,
  originX: number,
  originY: number,
  cellSize: number,
  padding = 2,
): AxialHexRange {
  const corners = [
    pointyHexAxialFromWorld(
      bounds.left,
      bounds.top,
      originX,
      originY,
      cellSize,
    ),
    pointyHexAxialFromWorld(
      bounds.right,
      bounds.top,
      originX,
      originY,
      cellSize,
    ),
    pointyHexAxialFromWorld(
      bounds.left,
      bounds.bottom,
      originX,
      originY,
      cellSize,
    ),
    pointyHexAxialFromWorld(
      bounds.right,
      bounds.bottom,
      originX,
      originY,
      cellSize,
    ),
  ];

  const qValues = corners.map((corner) => corner.x);
  const rValues = corners.map((corner) => corner.y);

  return {
    qMin: Math.floor(Math.min(...qValues)) - padding,
    qMax: Math.ceil(Math.max(...qValues)) + padding,
    rMin: Math.floor(Math.min(...rValues)) - padding,
    rMax: Math.ceil(Math.max(...rValues)) + padding,
  };
}
