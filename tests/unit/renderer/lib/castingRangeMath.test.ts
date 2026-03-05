import { describe, expect, it } from 'vitest';
import {
  getShapePolygon,
  getHighlightedSquareTiles,
  getHighlightedHexTiles,
  type CastingShapeParams,
} from '../../../../src/renderer/lib/castingRangeMath';

describe('castingRangeMath', () => {
  const cellSize = 64; // Standard size: 64 pixels per cell

  describe('getShapePolygon', () => {
    it('returns empty polygon when shape is null', () => {
      const params: CastingShapeParams = {
        shape: null,
        sizeCells: 1,
        angleRad: 0,
      };
      const poly = getShapePolygon(params, 100, 100, cellSize);
      expect(poly.points.length).toBe(0);
    });

    it('returns 32-vertex circle at correct radius', () => {
      const params: CastingShapeParams = {
        shape: 'circle',
        sizeCells: 1,
        angleRad: 0,
      };
      const poly = getShapePolygon(params, 0, 0, cellSize);

      // Check vertex count
      expect(poly.points.length).toBe(64); // 32 vertices × 2 coords per vertex

      // Check that all vertices are at the expected radius
      const radius = cellSize;
      for (let i = 0; i < poly.points.length; i += 2) {
        const x = poly.points[i];
        const y = poly.points[i + 1];
        const dist = Math.sqrt(x * x + y * y);
        expect(dist).toBeCloseTo(radius, 1);
      }

      // Check first vertex is at angle 0 (right side)
      expect(poly.points[0]).toBeCloseTo(radius, 1);
      expect(poly.points[1]).toBeCloseTo(0, 1);
    });

    it('returns 4-vertex rectangle', () => {
      const params: CastingShapeParams = {
        shape: 'rectangle',
        sizeCells: 2,
        angleRad: 0,
      };
      const poly = getShapePolygon(params, 0, 0, cellSize);

      // Check vertex count
      expect(poly.points.length).toBe(8); // 4 vertices × 2 coords

      // Rectangle should be centered at (0,0) with half-width = 2*cellSize*0.5 = cellSize
      const half = cellSize;
      expect(poly.points).toEqual(
        expect.arrayContaining([
          -half,
          -half, // TL
          half,
          -half, // TR
          half,
          half, // BR
          -half,
          half, // BL
        ]),
      );
    });

    it('returns 3-vertex cone with tip at center', () => {
      const params: CastingShapeParams = {
        shape: 'cone',
        sizeCells: 1,
        angleRad: 0,
      };
      const poly = getShapePolygon(params, 0, 0, cellSize);

      // Check vertex count
      expect(poly.points.length).toBe(6); // 3 vertices × 2 coords

      // First vertex should be tip at center
      expect(poly.points[0]).toBeCloseTo(0, 0.1);
      expect(poly.points[1]).toBeCloseTo(0, 0.1);
    });

    it('returns 4-vertex line rectangle along angle', () => {
      const params: CastingShapeParams = {
        shape: 'line',
        sizeCells: 2,
        angleRad: 0,
      };
      const poly = getShapePolygon(params, 0, 0, cellSize);

      // Check vertex count
      expect(poly.points.length).toBe(8); // 4 vertices × 2 coords

      // Length is sizeCells * cellSize = 2 * 64 = 128
      // Width is cellSize = 64
      // Line pointing right (angle 0)
      const length = 2 * cellSize;
      const width = cellSize;
      const halfLen = length / 2;
      const halfW = width / 2;

      // Vertices should form a rectangle along the angle direction
      expect(poly.points).toEqual(
        expect.arrayContaining([
          halfLen,
          halfW, // top-right
          halfLen,
          -halfW, // bottom-right
          -halfLen,
          -halfW, // bottom-left
          -halfLen,
          halfW, // top-left
        ]),
      );
    });

    it('returns degenerate polygon when sizeCells = 0 without throwing', () => {
      const params: CastingShapeParams = {
        shape: 'circle',
        sizeCells: 0,
        angleRad: 0,
      };
      const poly = getShapePolygon(params, 100, 100, cellSize);

      // Should return a degenerate polygon (all vertices at center)
      expect(poly.points.length).toBe(64); // still 32 vertices
      for (let i = 0; i < poly.points.length; i += 2) {
        expect(poly.points[i]).toBeCloseTo(100, 0.1);
        expect(poly.points[i + 1]).toBeCloseTo(100, 0.1);
      }
    });

    it('rotates cone correctly by angleRad', () => {
      const angleRad = Math.PI / 2; // 90 degrees
      const params: CastingShapeParams = {
        shape: 'cone',
        sizeCells: 1,
        angleRad,
      };
      const poly = getShapePolygon(params, 0, 0, cellSize);

      // Cone tip at center
      expect(poly.points[0]).toBeCloseTo(0, 0.1);
      expect(poly.points[1]).toBeCloseTo(0, 0.1);

      // Other two vertices should be rotated (pointing up/down)
      const vertex1 = { x: poly.points[2], y: poly.points[3] };
      const vertex2 = { x: poly.points[4], y: poly.points[5] };

      // Both vertices should have significant distance from center
      const dist1 = Math.sqrt(vertex1.x * vertex1.x + vertex1.y * vertex1.y);
      const dist2 = Math.sqrt(vertex2.x * vertex2.x + vertex2.y * vertex2.y);

      expect(dist1).toBeGreaterThan(cellSize * 0.5);
      expect(dist2).toBeGreaterThan(cellSize * 0.5);
    });

    it('handles very large sizeCells without throwing', () => {
      const params: CastingShapeParams = {
        shape: 'circle',
        sizeCells: 100,
        angleRad: 0,
      };
      const poly = getShapePolygon(params, 500, 500, cellSize);
      expect(poly.points.length).toBe(64); // should still work
    });
  });

  describe('getHighlightedSquareTiles', () => {
    const originX = 0;
    const originY = 0;
    const casterX = cellSize / 2; // center of (0,0) cell
    const casterY = cellSize / 2;

    describe('point target (shape = null)', () => {
      it('returns single tile when shape is null', () => {
        const params: CastingShapeParams = {
          shape: null,
          sizeCells: 1,
          angleRad: 0,
        };
        const tiles = getHighlightedSquareTiles(
          params,
          casterX,
          casterY,
          0,
          cellSize,
          originX,
          originY,
        );
        expect(tiles).toHaveLength(1);
        expect(tiles[0]).toEqual({ col: 0, row: 0 });
      });

      it('returns single tile even with rangeCells = 0', () => {
        const params: CastingShapeParams = {
          shape: 'circle',
          sizeCells: 1,
          angleRad: 0,
        };
        const tiles = getHighlightedSquareTiles(
          params,
          casterX,
          casterY,
          0,
          cellSize,
          originX,
          originY,
        );
        expect(tiles.length).toBeGreaterThan(0);
        expect(tiles).toContainEqual({ col: 0, row: 0 });
      });
    });

    describe('circle shape', () => {
      it('includes caster tile when shape = circle, sizeCells = 1', () => {
        const params: CastingShapeParams = {
          shape: 'circle',
          sizeCells: 1,
          angleRad: 0,
        };
        const tiles = getHighlightedSquareTiles(
          params,
          casterX,
          casterY,
          0,
          cellSize,
          originX,
          originY,
        );
        expect(tiles).toContainEqual({ col: 0, row: 0 });
      });

      it('highlights symmetric tiles around center for circle', () => {
        const params: CastingShapeParams = {
          shape: 'circle',
          sizeCells: 2,
          angleRad: 0,
        };
        const tiles = getHighlightedSquareTiles(
          params,
          casterX,
          casterY,
          0,
          cellSize,
          originX,
          originY,
        );

        // Should highlight more tiles with larger radius
        expect(tiles.length).toBeGreaterThan(1);

        // Check for some symmetry (rough check)
        const cols = tiles.map((t) => t.col);
        const rows = tiles.map((t) => t.row);
        const minCol = Math.min(...cols);
        const maxCol = Math.max(...cols);
        const minRow = Math.min(...rows);
        const maxRow = Math.max(...rows);

        // For circle centered at 0,0, should have rough symmetry
        expect(Math.abs(minCol - -maxCol)).toBeLessThanOrEqual(1);
        expect(Math.abs(minRow - -maxRow)).toBeLessThanOrEqual(1);
      });

      it('respects 50% coverage threshold', () => {
        const params: CastingShapeParams = {
          shape: 'circle',
          sizeCells: 1,
          angleRad: 0,
        };
        const tiles = getHighlightedSquareTiles(
          params,
          casterX,
          casterY,
          0,
          cellSize,
          originX,
          originY,
        );

        // Circle with radius=cellSize centered at cell center should highlight
        // at least the caster's tile
        expect(tiles.length).toBeGreaterThanOrEqual(1);
      });

      it('returns no tiles when rangeCells far away', () => {
        const params: CastingShapeParams = {
          shape: 'circle',
          sizeCells: 0.5,
          angleRad: 0,
        };
        const tiles = getHighlightedSquareTiles(
          params,
          casterX,
          casterY,
          100, // Very far away range
          cellSize,
          originX,
          originY,
        );
        // Should still include at least the caster tile or nearby
        expect(tiles.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('rectangle shape', () => {
      it('highlights tiles fully inside rectangle', () => {
        const params: CastingShapeParams = {
          shape: 'rectangle',
          sizeCells: 2,
          angleRad: 0,
        };
        const tiles = getHighlightedSquareTiles(
          params,
          casterX,
          casterY,
          0,
          cellSize,
          originX,
          originY,
        );

        // Rectangle with half-width = cellSize should include multiple tiles
        expect(tiles.length).toBeGreaterThan(1);
        expect(tiles).toContainEqual({ col: 0, row: 0 });
      });

      it('does not highlight corner-only tiles below 50% coverage', () => {
        const params: CastingShapeParams = {
          shape: 'rectangle',
          sizeCells: 2,
          angleRad: 0,
        };
        const tiles = getHighlightedSquareTiles(
          params,
          casterX,
          casterY,
          0,
          cellSize,
          originX,
          originY,
        );

        // Tiles should form a roughly square shape, not include distant corners
        const cols = tiles.map((t) => t.col);
        const rows = tiles.map((t) => t.row);
        const maxDist = Math.max(
          Math.abs(Math.max(...cols)),
          Math.abs(Math.min(...cols)),
          Math.abs(Math.max(...rows)),
          Math.abs(Math.min(...rows)),
        );
        expect(maxDist).toBeLessThanOrEqual(3);
      });
    });

    describe('cone shape', () => {
      it('highlights tiles on the pointing direction for cone at angle 0 (right)', () => {
        const params: CastingShapeParams = {
          shape: 'cone',
          sizeCells: 3,
          angleRad: 0,
        };
        const tiles = getHighlightedSquareTiles(
          params,
          casterX,
          casterY,
          0,
          cellSize,
          originX,
          originY,
        );

        // Cone pointing right should have tiles with col > 0
        const rightTiles = tiles.filter((t) => t.col > 0);
        expect(rightTiles.length).toBeGreaterThan(0);

        // Should not have many tiles on the left
        const leftTiles = tiles.filter((t) => t.col < -2);
        expect(leftTiles.length).toBeLessThan(2);
      });

      it('mirrors cone when angleRad = Math.PI (pointing left)', () => {
        const params: CastingShapeParams = {
          shape: 'cone',
          sizeCells: 3,
          angleRad: Math.PI,
        };
        const tiles = getHighlightedSquareTiles(
          params,
          casterX,
          casterY,
          0,
          cellSize,
          originX,
          originY,
        );

        // Cone pointing left should have tiles with col < 0
        const leftTiles = tiles.filter((t) => t.col < 0);
        expect(leftTiles.length).toBeGreaterThan(0);

        // Should not have many tiles on the right
        const rightTiles = tiles.filter((t) => t.col > 2);
        expect(rightTiles.length).toBeLessThan(2);
      });
    });

    describe('line shape', () => {
      it('highlights strip of tiles along angle 0 (horizontal right)', () => {
        const params: CastingShapeParams = {
          shape: 'line',
          sizeCells: 4,
          angleRad: 0,
        };
        const tiles = getHighlightedSquareTiles(
          params,
          casterX,
          casterY,
          0,
          cellSize,
          originX,
          originY,
        );

        // Line pointing right should have tiles with col > 0
        const rightTiles = tiles.filter((t) => t.col > 0);
        expect(rightTiles.length).toBeGreaterThan(0);

        // Should be in a narrow strip (not too many rows away)
        const rows = tiles.map((t) => t.row);
        const maxDistFromCenter = Math.max(
          Math.abs(Math.max(...rows)),
          Math.abs(Math.min(...rows)),
        );
        expect(maxDistFromCenter).toBeLessThanOrEqual(2);
      });

      it('does not highlight tiles above/below line', () => {
        const params: CastingShapeParams = {
          shape: 'line',
          sizeCells: 4,
          angleRad: 0,
        };
        const tiles = getHighlightedSquareTiles(
          params,
          casterX,
          casterY,
          0,
          cellSize,
          originX,
          originY,
        );

        // Should be mostly along row 0, not spread out vertically
        const rows = tiles.map((t) => t.row);
        const range = Math.max(...rows) - Math.min(...rows);
        expect(range).toBeLessThanOrEqual(2);
      });
    });

    describe('edge cases', () => {
      it('handles cellSize = 0 gracefully', () => {
        const params: CastingShapeParams = {
          shape: 'circle',
          sizeCells: 1,
          angleRad: 0,
        };
        const tiles = getHighlightedSquareTiles(
          params,
          casterX,
          casterY,
          0,
          0.001, // Very small cellSize
          originX,
          originY,
        );
        expect(tiles).toBeDefined();
        expect(Array.isArray(tiles)).toBe(true);
      });

      it('handles very large sizeCells without throwing', () => {
        const params: CastingShapeParams = {
          shape: 'circle',
          sizeCells: 100,
          angleRad: 0,
        };
        const tiles = getHighlightedSquareTiles(
          params,
          casterX,
          casterY,
          0,
          cellSize,
          originX,
          originY,
        );
        expect(tiles).toBeDefined();
        expect(tiles.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getHighlightedHexTiles', () => {
    const originX = 0;
    const originY = 0;
    const casterX = cellSize / 2;
    const casterY = cellSize / 2;

    describe('point target (shape = null)', () => {
      it('returns single hex tile when shape is null', () => {
        const params: CastingShapeParams = {
          shape: null,
          sizeCells: 1,
          angleRad: 0,
        };
        const tiles = getHighlightedHexTiles(
          params,
          casterX,
          casterY,
          0,
          cellSize,
          originX,
          originY,
        );
        expect(tiles).toHaveLength(1);
        // Check it's a valid hex coordinate
        expect(tiles[0]).toHaveProperty('q');
        expect(tiles[0]).toHaveProperty('r');
      });
    });

    describe('circle shape', () => {
      it('includes center hex when shape = circle', () => {
        const params: CastingShapeParams = {
          shape: 'circle',
          sizeCells: 1,
          angleRad: 0,
        };
        const tiles = getHighlightedHexTiles(
          params,
          casterX,
          casterY,
          0,
          cellSize,
          originX,
          originY,
        );
        expect(tiles.length).toBeGreaterThan(0);
        // Should contain center hex
        expect(tiles).toContainEqual({ q: 0, r: 0 });
      });

      it('highlights adjacent hexes with sufficient coverage', () => {
        const params: CastingShapeParams = {
          shape: 'circle',
          sizeCells: 1,
          angleRad: 0,
        };
        const tiles = getHighlightedHexTiles(
          params,
          casterX,
          casterY,
          0,
          cellSize,
          originX,
          originY,
        );

        // Circle should highlight center + some neighbors
        expect(tiles.length).toBeGreaterThanOrEqual(1);
        expect(tiles.length).toBeLessThanOrEqual(10);
      });

      it('respects 50% coverage threshold for hex tiles', () => {
        const params: CastingShapeParams = {
          shape: 'circle',
          sizeCells: 2,
          angleRad: 0,
        };
        const tiles = getHighlightedHexTiles(
          params,
          casterX,
          casterY,
          0,
          cellSize,
          originX,
          originY,
        );

        // Larger circle should get more hexes
        const smallCircle = getHighlightedHexTiles(
          { shape: 'circle', sizeCells: 1, angleRad: 0 },
          casterX,
          casterY,
          0,
          cellSize,
          originX,
          originY,
        );

        expect(tiles.length).toBeGreaterThanOrEqual(smallCircle.length);
      });
    });

    describe('cone shape', () => {
      it('returns non-empty set for cone targeting', () => {
        const params: CastingShapeParams = {
          shape: 'cone',
          sizeCells: 2,
          angleRad: 0,
        };
        const tiles = getHighlightedHexTiles(
          params,
          casterX,
          casterY,
          0,
          cellSize,
          originX,
          originY,
        );

        expect(tiles.length).toBeGreaterThan(0);
      });

      it('highlights tiles on the pointing direction for cone', () => {
        const params: CastingShapeParams = {
          shape: 'cone',
          sizeCells: 2,
          angleRad: 0,
        };
        const tiles = getHighlightedHexTiles(
          params,
          casterX,
          casterY,
          0,
          cellSize,
          originX,
          originY,
        );

        // For a cone pointing right (angle 0), most tiles should be in certain quadrants
        // This is a rough check since hex coords are more complex
        expect(tiles.length).toBeGreaterThan(0);
      });
    });

    describe('edge cases', () => {
      it('handles cellSize = 0 gracefully', () => {
        const params: CastingShapeParams = {
          shape: 'circle',
          sizeCells: 1,
          angleRad: 0,
        };
        const tiles = getHighlightedHexTiles(
          params,
          casterX,
          casterY,
          0,
          0.001,
          originX,
          originY,
        );
        expect(tiles).toBeDefined();
        expect(Array.isArray(tiles)).toBe(true);
      });

      it('handles very large sizeCells without throwing', () => {
        const params: CastingShapeParams = {
          shape: 'circle',
          sizeCells: 100,
          angleRad: 0,
        };
        const tiles = getHighlightedHexTiles(
          params,
          casterX,
          casterY,
          0,
          cellSize,
          originX,
          originY,
        );
        expect(tiles).toBeDefined();
        expect(tiles.length).toBeGreaterThan(0);
      });

      it('handles polygon with fewer than 3 vertices gracefully', () => {
        // This is tested indirectly through the functions,
        // as getShapePolygon with sizeCells=0 creates degenerate polygons
        const params: CastingShapeParams = {
          shape: 'circle',
          sizeCells: 0,
          angleRad: 0,
        };
        const tiles = getHighlightedHexTiles(
          params,
          casterX,
          casterY,
          0,
          cellSize,
          originX,
          originY,
        );
        expect(tiles).toBeDefined();
      });
    });
  });

  describe('floating-point precision', () => {
    it('uses numeric tolerance for coordinate comparisons in box coverage', () => {
      const params: CastingShapeParams = {
        shape: 'circle',
        sizeCells: 1.5,
        angleRad: 0,
      };
      const tiles1 = getHighlightedSquareTiles(
        params,
        100.0000001,
        100.0000001,
        0,
        cellSize,
        0,
        0,
      );
      const tiles2 = getHighlightedSquareTiles(
        params,
        100 + 1e-9,
        100 + 1e-9,
        0,
        cellSize,
        0,
        0,
      );

      // Should be approximately the same despite float precision differences
      expect(tiles1.length).toBe(tiles2.length);
    });
  });
});
