import { useEffect, useRef } from 'react';
import { Application, Assets, Container, Graphics, Sprite } from 'pixi.js';
import {
  clampGridCellSize,
  getPointyHexRangeForBounds,
  getPointyHexVertexOffsets,
  getSquareGridLinePositions,
  getWorldViewportBounds,
  pointyHexCenterFromAxial,
} from '../../lib/runtimeMath';

type BattleMapRuntimeCanvasProps = {
  runtimeConfig: BattleMapRuntimeConfig;
  className?: string;
};

type StageGraph = {
  worldContainer: Container;
  backgroundContainer: Container;
  mapContainer: Container;
  imageContainer: Container;
  gridContainer: Container;
  tokenContainer: Container;
  uiContainer: Container;
  backgroundLayer: Graphics;
  mapLayer: Graphics;
  gridLayer: Graphics;
};

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

export default function BattleMapRuntimeCanvas({
  runtimeConfig,
  className,
}: BattleMapRuntimeCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const stageGraphRef = useRef<StageGraph | null>(null);
  const mapSpriteRef = useRef<Sprite | null>(null);
  const mapImageSrcRef = useRef<string | null>(null);
  const imageLoadIdRef = useRef(0);
  const runtimeConfigRef = useRef(runtimeConfig);

  const removeMapSprite = () => {
    const sprite = mapSpriteRef.current;
    if (sprite) {
      sprite.parent?.removeChild(sprite);
      sprite.destroy();
      mapSpriteRef.current = null;
    }

    const previousImageSrc = mapImageSrcRef.current;
    mapImageSrcRef.current = null;
    if (previousImageSrc) {
      void Assets.unload(previousImageSrc).catch(() => {
        // Ignore unload failures and keep runtime rendering fallback layers.
      });
    }
  };

  const syncCameraTransform = () => {
    const app = appRef.current;
    const stageGraph = stageGraphRef.current;
    if (!app || !stageGraph) {
      return;
    }

    const { camera } = runtimeConfigRef.current;
    const viewportWidth = app.screen.width;
    const viewportHeight = app.screen.height;

    stageGraph.worldContainer.scale.set(camera.zoom);
    stageGraph.worldContainer.position.set(
      viewportWidth * 0.5 - camera.x * camera.zoom,
      viewportHeight * 0.5 - camera.y * camera.zoom,
    );
  };

  const syncBaseLayers = () => {
    const app = appRef.current;
    const stageGraph = stageGraphRef.current;
    if (!app || !stageGraph) {
      return;
    }

    const viewportWidth = app.screen.width;
    const viewportHeight = app.screen.height;
    const halfWidth = viewportWidth * 0.5;
    const halfHeight = viewportHeight * 0.5;
    const { map } = runtimeConfigRef.current;
    const hasMapImage = mapSpriteRef.current !== null;
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

    const mapSprite = mapSpriteRef.current;
    if (mapSprite) {
      mapSprite.anchor.set(0.5);
      mapSprite.position.set(0, 0);
      mapSprite.width = viewportWidth;
      mapSprite.height = viewportHeight;
    }
  };

  const syncGridLayer = () => {
    const app = appRef.current;
    const stageGraph = stageGraphRef.current;
    if (!app || !stageGraph) {
      return;
    }

    const gridLayer = stageGraph.gridLayer;
    const { grid, camera } = runtimeConfigRef.current;
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
          center.x < bounds.left - linePadding ||
          center.x > bounds.right + linePadding ||
          center.y < bounds.top - linePadding ||
          center.y > bounds.bottom + linePadding
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
  };

  const syncMapImage = async () => {
    const app = appRef.current;
    const stageGraph = stageGraphRef.current;
    if (!app || !stageGraph) {
      return;
    }

    const imageSrc = runtimeConfigRef.current.map.imageSrc;
    if (imageSrc === mapImageSrcRef.current && mapSpriteRef.current) {
      return;
    }

    imageLoadIdRef.current += 1;
    const loadId = imageLoadIdRef.current;
    removeMapSprite();
    syncBaseLayers();

    if (!imageSrc) {
      return;
    }

    try {
      const texture = await Assets.load(imageSrc);
      if (imageLoadIdRef.current !== loadId || !appRef.current) {
        void Assets.unload(imageSrc).catch(() => {
          // Ignore stale unload failures.
        });
        return;
      }

      const mapSprite = new Sprite(texture);
      stageGraph.imageContainer.addChild(mapSprite);
      mapSpriteRef.current = mapSprite;
      mapImageSrcRef.current = imageSrc;
      syncBaseLayers();
    } catch {
      mapImageSrcRef.current = null;
      syncBaseLayers();
    }
  };

  useEffect(() => {
    runtimeConfigRef.current = runtimeConfig;
    syncBaseLayers();
    syncCameraTransform();
    syncGridLayer();
  }, [runtimeConfig]);

  useEffect(() => {
    void syncMapImage();
  }, [runtimeConfig.map.imageSrc]);

  useEffect(() => {
    let isDisposed = false;
    let resizeObserver: ResizeObserver | null = null;

    const hostElement = hostRef.current;
    if (!hostElement) {
      return () => {
        isDisposed = true;
      };
    }

    const initializePixi = async () => {
      const app = new Application();
      await app.init({
        antialias: true,
        backgroundAlpha: 0,
        resizeTo: hostElement,
      });

      if (isDisposed) {
        app.destroy(true, true);
        return;
      }

      hostElement.appendChild(app.canvas);
      appRef.current = app;

      const worldContainer = new Container();
      const backgroundContainer = new Container();
      const mapContainer = new Container();
      const imageContainer = new Container();
      const gridContainer = new Container();
      const tokenContainer = new Container();
      const uiContainer = new Container();
      const backgroundLayer = new Graphics();
      const mapLayer = new Graphics();
      const gridLayer = new Graphics();

      backgroundContainer.addChild(backgroundLayer);
      mapContainer.addChild(mapLayer);
      gridContainer.addChild(gridLayer);
      worldContainer.addChild(backgroundContainer);
      worldContainer.addChild(mapContainer);
      worldContainer.addChild(imageContainer);
      worldContainer.addChild(gridContainer);
      worldContainer.addChild(tokenContainer);
      app.stage.addChild(worldContainer);
      app.stage.addChild(uiContainer);

      stageGraphRef.current = {
        worldContainer,
        backgroundContainer,
        mapContainer,
        imageContainer,
        gridContainer,
        tokenContainer,
        uiContainer,
        backgroundLayer,
        mapLayer,
        gridLayer,
      };

      syncBaseLayers();
      syncCameraTransform();
      syncGridLayer();
      void syncMapImage();

      resizeObserver = new ResizeObserver(() => {
        syncBaseLayers();
        syncCameraTransform();
        syncGridLayer();
      });
      resizeObserver.observe(hostElement);
    };

    void initializePixi();

    return () => {
      isDisposed = true;
      imageLoadIdRef.current += 1;
      resizeObserver?.disconnect();
      removeMapSprite();
      stageGraphRef.current = null;

      const app = appRef.current;
      if (app) {
        app.destroy(true, true);
      }
      appRef.current = null;
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={className ?? 'h-full w-full overflow-hidden bg-black'}
    />
  );
}
