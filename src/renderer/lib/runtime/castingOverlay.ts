import {
  type CastingShapeParams,
  getHighlightedHexTiles,
  getHighlightedSquareTiles,
  getShapePolygon,
  type HighlightedHexTile,
  type HighlightedSquareTile,
} from '../castingRangeMath';
import {
  clampGridCellSize,
  getPointyHexVertexOffsets,
  pointyHexCenterFromAxial,
  roundPointyHexAxial,
} from '../runtimeMath';
import type { RuntimeCanvasContext } from './runtimeCanvasTypes';

const SQRT_3 = Math.sqrt(3);

export function syncOverlayLayer(ctx: RuntimeCanvasContext): void {
  const stageGraph = ctx.stageGraphRef.current;
  const state = ctx.castingStateRef.current;
  if (!stageGraph) return;

  const overlayLayer = stageGraph.rangeOverlayLayer;
  overlayLayer.clear();

  if (!state) return;

  const { casterX, casterY, ability, angleRad } = state;

  if (ability.range_cells === null) {
    console.warn(
      '[castingRange] ability with range_cells=null passed into castingState — skipping overlay',
    );
    return;
  }

  const gridConfig = ctx.runtimeConfigRef.current.grid;
  const cellSize = clampGridCellSize(gridConfig.cellSize);

  // 1. Range ring
  const rangeRadius = ability.range_cells * cellSize;
  overlayLayer
    .circle(casterX, casterY, rangeRadius)
    .stroke({ color: 0xffffff, alpha: 0.45, width: 2 });

  // 2. AoE shape fill
  if (ability.aoe_shape !== null) {
    const sizeCells = ability.aoe_size_cells ?? 1;
    const shapeParams: CastingShapeParams = {
      shape: ability.aoe_shape,
      sizeCells,
      angleRad,
    };
    const shapePoly = getShapePolygon(shapeParams, casterX, casterY, cellSize);
    if (shapePoly.points.length >= 6) {
      overlayLayer
        .poly(shapePoly.points, true)
        .fill({ color: 0x38bdf8, alpha: 0.22 });
      overlayLayer
        .poly(shapePoly.points, true)
        .stroke({ color: 0x38bdf8, alpha: 0.7, width: 1.5 });
    }
  }

  // 3. Tile highlights (skip for mode = 'none')
  if (gridConfig.mode !== 'none') {
    const sizeCells = ability.aoe_size_cells ?? 1;
    const isAngleDependent = ability.aoe_shape === 'cone' || ability.aoe_shape === 'line';
    const cacheKey = `${casterX}:${casterY}:${ability.id}:${
      isAngleDependent ? angleRad : 0
    }:${cellSize}`;

    let squareTiles: HighlightedSquareTile[] | null = null;
    let hexTiles: HighlightedHexTile[] | null = null;

    const cached = ctx.overlayTileCacheRef.current;
    if (cached?.key === cacheKey) {
      squareTiles = cached.squareTiles;
      hexTiles = cached.hexTiles;
    } else {
      const shapeParams: CastingShapeParams = {
        shape: ability.aoe_shape ?? null,
        sizeCells,
        angleRad: isAngleDependent ? angleRad : 0,
      };
      if (gridConfig.mode === 'square') {
        squareTiles = getHighlightedSquareTiles(
          shapeParams,
          casterX,
          casterY,
          ability.range_cells,
          cellSize,
          gridConfig.originX,
          gridConfig.originY,
        );
      } else {
        hexTiles = getHighlightedHexTiles(
          shapeParams,
          casterX,
          casterY,
          ability.range_cells,
          cellSize,
          gridConfig.originX,
          gridConfig.originY,
        );
      }
      ctx.overlayTileCacheRef.current = { key: cacheKey, squareTiles, hexTiles };
    }

    const isTokenTarget = ability.target_type === 'token';

    if (gridConfig.mode === 'square' && squareTiles) {
      let occupiedKeys: Set<string> | null = null;
      if (isTokenTarget) {
        occupiedKeys = new Set<string>();
        for (const token of ctx.tokensRef.current) {
          const col = Math.floor((token.x - gridConfig.originX) / cellSize);
          const row = Math.floor((token.y - gridConfig.originY) / cellSize);
          occupiedKeys.add(`${col}:${row}`);
        }
      }
      for (const tile of squareTiles) {
        if (
          isTokenTarget
          && occupiedKeys
          && !occupiedKeys.has(`${tile.col}:${tile.row}`)
        ) {
          continue;
        }
        const tileX = gridConfig.originX + tile.col * cellSize;
        const tileY = gridConfig.originY + tile.row * cellSize;
        overlayLayer
          .rect(tileX, tileY, cellSize, cellSize)
          .fill({ color: 0x38bdf8, alpha: 0.18 });
      }
    } else if (gridConfig.mode === 'hex' && hexTiles) {
      let occupiedKeys: Set<string> | null = null;
      if (isTokenTarget) {
        occupiedKeys = new Set<string>();
        const radius = cellSize * 0.5;
        for (const token of ctx.tokensRef.current) {
          const shiftedX = token.x - gridConfig.originX;
          const shiftedY = token.y - gridConfig.originY;
          const q = ((SQRT_3 / 3) * shiftedX - shiftedY / 3) / radius;
          const r = ((2 / 3) * shiftedY) / radius;
          const { roundedQ, roundedR } = roundPointyHexAxial(q, r);
          occupiedKeys.add(`${roundedQ}:${roundedR}`);
        }
      }
      const vertexOffsets = getPointyHexVertexOffsets(cellSize);
      for (const tile of hexTiles) {
        if (
          isTokenTarget
          && occupiedKeys
          && !occupiedKeys.has(`${tile.q}:${tile.r}`)
        ) {
          continue;
        }
        const center = pointyHexCenterFromAxial(
          tile.q,
          tile.r,
          gridConfig.originX,
          gridConfig.originY,
          cellSize,
        );
        const hexPts: number[] = [];
        for (const v of vertexOffsets) {
          hexPts.push(center.x + v.x, center.y + v.y);
        }
        overlayLayer.poly(hexPts, true).fill({ color: 0x38bdf8, alpha: 0.18 });
      }
    }
  }
}
