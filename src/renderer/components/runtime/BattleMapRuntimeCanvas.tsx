import { useEffect, useRef } from 'react';
import { Application, Assets, Container, Graphics, Sprite } from 'pixi.js';

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
};

const MAP_BORDER_STYLE = {
  color: 0xffffff,
  width: 1,
  alpha: 0.2,
} as const;

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

    stageGraph.backgroundLayer
      .clear()
      .rect(-halfWidth, -halfHeight, viewportWidth, viewportHeight)
      .fill(map.backgroundColor);

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
    }
  };

  useEffect(() => {
    runtimeConfigRef.current = runtimeConfig;
    syncBaseLayers();
    syncCameraTransform();
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

      backgroundContainer.addChild(backgroundLayer);
      mapContainer.addChild(mapLayer);
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
      };

      syncBaseLayers();
      syncCameraTransform();
      void syncMapImage();

      resizeObserver = new ResizeObserver(() => {
        syncBaseLayers();
        syncCameraTransform();
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
