import { describe, expect, it } from 'vitest';
import {
  clampGridCellSize,
  DEFAULT_GRID_CELL_SIZE,
  getPointyHexRangeForBounds,
  getPointyHexVertexOffsets,
  getSafeCameraZoom,
  getSquareGridLinePositions,
  getWorldViewportBounds,
  pointyHexCenterFromAxial,
  stepCameraCenterTowardTarget,
  worldDeltaFromScreenDelta,
} from '../../../src/renderer/lib/runtimeMath';

describe('runtimeMath', () => {
  it('returns safe camera zoom using fallback for invalid values', () => {
    expect(getSafeCameraZoom(2)).toBe(2);
    expect(getSafeCameraZoom(0)).toBe(1);
    expect(getSafeCameraZoom(Number.NaN, 1.5)).toBe(1.5);
  });

  it('clamps grid cell size and falls back for invalid inputs', () => {
    expect(clampGridCellSize(9999)).toBe(240);
    expect(clampGridCellSize(1)).toBe(12);
    expect(clampGridCellSize(50)).toBe(50);
    expect(clampGridCellSize(-1)).toBe(DEFAULT_GRID_CELL_SIZE);
  });

  it('computes world viewport bounds from camera and viewport size', () => {
    const bounds = getWorldViewportBounds(800, 600, {
      x: 100,
      y: -50,
      zoom: 2,
    });
    expect(bounds).toEqual({
      left: -100,
      right: 300,
      top: -200,
      bottom: 100,
    });
  });

  it('converts screen deltas to world deltas using camera zoom', () => {
    expect(worldDeltaFromScreenDelta(120, -60, 2)).toEqual({ x: 60, y: -30 });
    expect(worldDeltaFromScreenDelta(10, 20, 0)).toEqual({ x: 10, y: 20 });
  });

  it('steps camera center toward target and snaps when close', () => {
    const stepped = stepCameraCenterTowardTarget(0, 0, 10, 20, 0.5, 0.25);
    expect(stepped).toEqual({ x: 5, y: 10, isComplete: false });

    const snapped = stepCameraCenterTowardTarget(9.9, 20.1, 10, 20, 0.5, 1);
    expect(snapped).toEqual({ x: 10, y: 20, isComplete: true });
  });

  it('returns square grid lines across bounds with max line cap', () => {
    const lines = getSquareGridLinePositions(-5000, 5000, 0, 50, 10);
    expect(lines).toHaveLength(10);
    expect(lines[0] % 50).toBeCloseTo(0, 6);
    expect(lines[9] % 50).toBeCloseTo(0, 6);
  });

  it('returns six pointy-hex vertices sized by cell size', () => {
    const vertices = getPointyHexVertexOffsets(40);
    expect(vertices).toHaveLength(6);
    expect(vertices[0]).toEqual({ x: 0, y: -20 });
    expect(vertices[3]).toEqual({ x: 0, y: 20 });
  });

  it('computes pointy-hex centers and visible axial ranges', () => {
    const center = pointyHexCenterFromAxial(2, -1, 10, 20, 50);
    expect(center.x).toBeCloseTo(74.9519, 3);
    expect(center.y).toBeCloseTo(-17.5, 3);

    const range = getPointyHexRangeForBounds(
      { left: -100, right: 100, top: -80, bottom: 80 },
      0,
      0,
      50,
      1,
    );
    expect(range.qMin).toBeLessThanOrEqual(range.qMax);
    expect(range.rMin).toBeLessThanOrEqual(range.rMax);
  });
});
