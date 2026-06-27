import { Assets, Sprite } from 'pixi.js';

import {
  clampGridCellSize,
  getPointyHexRangeForBounds,
  getPointyHexVertexOffsets,
  getSafeCameraZoom,
  getSquareGridLinePositions,
  getWorldViewportBounds,
  pointyHexCenterFromAxial,
} from '../runtimeMath';
import type { RuntimeCanvasContext } from './runtimeCanvasTypes';

const MAP_BORDER_STYLE = {
  color: 0xffffff,
  width: 1,
  alpha: 0.2,
} as const;

const GRID_LINE_STYLE = {
  color: 0xffffff,
  width: 1,
  alpha: 0.28,
} as const;

const FALLBACK_BACKGROUND_COLOR = '#000000';
const GRID_HEX_DRAW_LIMIT = 3200;

export function removeMapSprite(ctx: RuntimeCanvasContext): void {
  const sprite = ctx.mapSpriteRef.current;
  if (sprite) {
    sprite.parent?.removeChild(sprite);
    sprite.destroy();
    ctx.mapSpriteRef.current = null;
  }

  const previousImageSrc = ctx.mapImageSrcRef.current;
  ctx.mapImageSrcRef.current = null;
  if (previousImageSrc) {
    void Assets.unload(previousImageSrc).catch(() => {
      // Ignore unload failures and keep runtime rendering fallback layers.
    });
  }
}

export function syncCameraTransform(ctx: RuntimeCanvasContext): void {
  const app = ctx.appRef.current;
  const stageGraph = ctx.stageGraphRef.current;
  if (!app || !stageGraph) {
    return;
  }

  const camera = ctx.cameraStateRef.current;
  const zoom = getSafeCameraZoom(camera.zoom);
  const viewportWidth = app.screen.width;
  const viewportHeight = app.screen.height;

  stageGraph.worldContainer.scale.set(zoom);
  stageGraph.worldContainer.position.set(
    viewportWidth * 0.5 - camera.x * zoom,
    viewportHeight * 0.5 - camera.y * zoom,
  );
}

export function syncBaseLayers(ctx: RuntimeCanvasContext): void {
  const app = ctx.appRef.current;
  const stageGraph = ctx.stageGraphRef.current;
  if (!app || !stageGraph) {
    return;
  }

  const viewportWidth = app.screen.width;
  const viewportHeight = app.screen.height;
  const halfWidth = viewportWidth * 0.5;
  const halfHeight = viewportHeight * 0.5;
  const { map } = ctx.runtimeConfigRef.current;
  const hasMapImage = ctx.mapSpriteRef.current !== null;
  const fillColor = hasMapImage
    ? map.backgroundColor
    : FALLBACK_BACKGROUND_COLOR;

  stageGraph.backgroundLayer
    .clear()
    .rect(-halfWidth, -halfHeight, viewportWidth, viewportHeight)
    .fill(fillColor);

  stageGraph.mapLayer
    .clear()
    .rect(-halfWidth, -halfHeight, viewportWidth, viewportHeight)
    .stroke(MAP_BORDER_STYLE);

  const mapSprite = ctx.mapSpriteRef.current;
  if (mapSprite) {
    mapSprite.anchor.set(0.5);
    mapSprite.position.set(0, 0);
    mapSprite.width = viewportWidth;
    mapSprite.height = viewportHeight;
  }
}

export function syncGridLayer(ctx: RuntimeCanvasContext): void {
  const app = ctx.appRef.current;
  const stageGraph = ctx.stageGraphRef.current;
  if (!app || !stageGraph) {
    return;
  }

  const gridLayer = stageGraph.gridLayer;
  const { grid } = ctx.runtimeConfigRef.current;
  const camera = ctx.cameraStateRef.current;
  gridLayer.clear();

  if (grid.mode === 'none') {
    return;
  }

  const cellSize = clampGridCellSize(grid.cellSize);
  const bounds = getWorldViewportBounds(
    app.screen.width,
    app.screen.height,
    camera,
  );
  const linePadding = cellSize * 2;

  if (grid.mode === 'square') {
    const verticals = getSquareGridLinePositions(
      bounds.left,
      bounds.right,
      grid.originX,
      cellSize,
    );
    const horizontals = getSquareGridLinePositions(
      bounds.top,
      bounds.bottom,
      grid.originY,
      cellSize,
    );

    for (const x of verticals) {
      gridLayer.moveTo(x, bounds.top - linePadding);
      gridLayer.lineTo(x, bounds.bottom + linePadding);
    }

    for (const y of horizontals) {
      gridLayer.moveTo(bounds.left - linePadding, y);
      gridLayer.lineTo(bounds.right + linePadding, y);
    }

    if (verticals.length > 0 || horizontals.length > 0) {
      gridLayer.stroke(GRID_LINE_STYLE);
    }
    return;
  }

  const vertexOffsets = getPointyHexVertexOffsets(cellSize);
  const axialRange = getPointyHexRangeForBounds(
    bounds,
    grid.originX,
    grid.originY,
    cellSize,
    2,
  );
  let renderedHexCount = 0;

  for (let q = axialRange.qMin; q <= axialRange.qMax; q += 1) {
    for (let r = axialRange.rMin; r <= axialRange.rMax; r += 1) {
      if (renderedHexCount >= GRID_HEX_DRAW_LIMIT) {
        break;
      }

      const center = pointyHexCenterFromAxial(
        q,
        r,
        grid.originX,
        grid.originY,
        cellSize,
      );
      if (
        center.x < bounds.left - linePadding
        || center.x > bounds.right + linePadding
        || center.y < bounds.top - linePadding
        || center.y > bounds.bottom + linePadding
      ) {
        continue;
      }

      const firstVertex = vertexOffsets[0];
      gridLayer.moveTo(center.x + firstVertex.x, center.y + firstVertex.y);
      for (let index = 1; index < vertexOffsets.length; index += 1) {
        const vertex = vertexOffsets[index];
        gridLayer.lineTo(center.x + vertex.x, center.y + vertex.y);
      }
      gridLayer.closePath();
      renderedHexCount += 1;
    }

    if (renderedHexCount >= GRID_HEX_DRAW_LIMIT) {
      break;
    }
  }

  if (renderedHexCount > 0) {
    gridLayer.stroke(GRID_LINE_STYLE);
  }
}

export async function syncMapImage(ctx: RuntimeCanvasContext): Promise<void> {
  const app = ctx.appRef.current;
  const stageGraph = ctx.stageGraphRef.current;
  if (!app || !stageGraph) {
    return;
  }

  const imageSrc = ctx.runtimeConfigRef.current.map.imageSrc;
  if (imageSrc === ctx.mapImageSrcRef.current && ctx.mapSpriteRef.current) {
    return;
  }

  ctx.imageLoadIdRef.current += 1;
  const loadId = ctx.imageLoadIdRef.current;
  removeMapSprite(ctx);
  syncBaseLayers(ctx);

  if (!imageSrc) {
    return;
  }

  try {
    const texture = await Assets.load(imageSrc);
    if (ctx.imageLoadIdRef.current !== loadId || !ctx.appRef.current) {
      void Assets.unload(imageSrc).catch(() => {
        // Ignore stale unload failures.
      });
      return;
    }

    const mapSprite = new Sprite(texture);
    stageGraph.imageContainer.addChild(mapSprite);
    ctx.mapSpriteRef.current = mapSprite;
    ctx.mapImageSrcRef.current = imageSrc;
    syncBaseLayers(ctx);
  } catch {
    ctx.mapImageSrcRef.current = null;
    syncBaseLayers(ctx);
  }
}
