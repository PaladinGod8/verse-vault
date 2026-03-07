import { useEffect, useRef } from 'react';
// eslint-disable-next-line import/no-unresolved -- pixi.js exposes this via package exports; eslint-import resolver flags a false positive.
import 'pixi.js/unsafe-eval';
import { Application, Assets, Circle, Container, Graphics, Rectangle, Sprite } from 'pixi.js';

import type { FederatedPointerEvent } from 'pixi.js';
import {
  type CastingShapeParams,
  getHighlightedHexTiles,
  getHighlightedSquareTiles,
  getShapePolygon,
  type HighlightedHexTile,
  type HighlightedSquareTile,
} from '../../lib/castingRangeMath';
import {
  clampCameraZoom,
  clampGridCellSize,
  getMinZoomForScene,
  getPointyHexRangeForBounds,
  getPointyHexVertexOffsets,
  getRuntimeSceneBounds,
  getSafeCameraZoom,
  getSquareGridLinePositions,
  getWorldViewportBounds,
  MIN_CAMERA_ZOOM,
  pointyHexCenterFromAxial,
  stepCameraCenterTowardTarget,
  worldDeltaFromScreenDelta,
} from '../../lib/runtimeMath';

export type RuntimeSceneToken = {
  instanceId: string;
  sourceTokenId: number | null;
  campaignId: number | null;
  name: string;
  imageSrc: string | null;
  isVisible: boolean;
  sourceMissing: boolean;
  x: number;
  y: number;
};

type CastingState = {
  casterX: number;
  casterY: number;
  ability: Ability;
  angleRad: number;
} | null;

type BattleMapRuntimeCanvasProps = {
  runtimeConfig: BattleMapRuntimeConfig;
  tokens: RuntimeSceneToken[];
  selectedTokenInstanceId: string | null;
  onTokenSelect: (tokenInstanceId: string | null) => void;
  onTokenMove: (
    tokenInstanceId: string,
    position: { x: number; y: number; },
  ) => void;
  castingState: CastingState;
  onCastingAngleChange: (angleRad: number) => void;
  className?: string;
};

type StageGraph = {
  worldContainer: Container;
  backgroundContainer: Container;
  mapContainer: Container;
  imageContainer: Container;
  gridContainer: Container;
  rangeOverlayContainer: Container;
  tokenContainer: Container;
  uiContainer: Container;
  backgroundLayer: Graphics;
  mapLayer: Graphics;
  gridLayer: Graphics;
  rangeOverlayLayer: Graphics;
};

type TokenDisplay = {
  container: Container;
  body: Sprite | Graphics | null;
  ring: Graphics;
  imageSrc: string | null;
  failedImageSrc: string | null;
  imageLoadId: number;
};

type ActiveTokenDrag = {
  tokenInstanceId: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  didMove: boolean;
};

type ActiveCameraPan = {
  pointerId: number;
  lastClientX: number;
  lastClientY: number;
};

type CameraFocusAnimation = {
  tick: () => void;
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
const TOKEN_SPRITE_SCALE = 0.82;
const MIN_TOKEN_PIXEL_SIZE = 24;
const INVISIBLE_TOKEN_ALPHA = 0.38;
const SELECTED_TOKEN_RING_COLOR = 0x38bdf8;
const MISSING_TOKEN_RING_COLOR = 0xf97316;
const TOKEN_MISSING_TINT = 0xf97316;
const SQRT_3 = Math.sqrt(3);
const CAMERA_FOCUS_SMOOTHING = 0.18;
const CAMERA_FOCUS_SNAP_DISTANCE = 0.5;
const WHEEL_ZOOM_BASE = 1.001;
const WHEEL_LINE_HEIGHT = 16;
const WHEEL_PAGE_HEIGHT = 400;

const TOKEN_FALLBACK_COLORS = [
  0x22c55e,
  0x0ea5e9,
  0xf59e0b,
  0xec4899,
  0xeab308,
  0x14b8a6,
  0x8b5cf6,
];

function hashTokenColor(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return TOKEN_FALLBACK_COLORS[hash % TOKEN_FALLBACK_COLORS.length];
}

function roundPointyHexAxial(
  q: number,
  r: number,
): { roundedQ: number; roundedR: number; } {
  const x = q;
  const z = r;
  const y = -x - z;

  let roundedX = Math.round(x);
  let roundedY = Math.round(y);
  let roundedZ = Math.round(z);

  const xDiff = Math.abs(roundedX - x);
  const yDiff = Math.abs(roundedY - y);
  const zDiff = Math.abs(roundedZ - z);

  if (xDiff > yDiff && xDiff > zDiff) {
    roundedX = -roundedY - roundedZ;
  } else if (yDiff > zDiff) {
    roundedY = -roundedX - roundedZ;
  } else {
    roundedZ = -roundedX - roundedY;
  }

  return { roundedQ: roundedX, roundedR: roundedZ };
}

function snapSquareTokenPosition(
  x: number,
  y: number,
  gridConfig: BattleMapRuntimeGridConfig,
): { x: number; y: number; } {
  const cellSize = clampGridCellSize(gridConfig.cellSize);
  return {
    x: gridConfig.originX
      + (Math.floor((x - gridConfig.originX) / cellSize) + 0.5) * cellSize,
    y: gridConfig.originY
      + (Math.floor((y - gridConfig.originY) / cellSize) + 0.5) * cellSize,
  };
}

function snapHexTokenPosition(
  x: number,
  y: number,
  gridConfig: BattleMapRuntimeGridConfig,
): { x: number; y: number; } {
  const cellSize = clampGridCellSize(gridConfig.cellSize);
  const radius = cellSize * 0.5;
  const shiftedX = x - gridConfig.originX;
  const shiftedY = y - gridConfig.originY;
  const q = ((SQRT_3 / 3) * shiftedX - shiftedY / 3) / radius;
  const r = ((2 / 3) * shiftedY) / radius;
  const { roundedQ, roundedR } = roundPointyHexAxial(q, r);
  return pointyHexCenterFromAxial(
    roundedQ,
    roundedR,
    gridConfig.originX,
    gridConfig.originY,
    cellSize,
  );
}

function snapTokenPositionToGrid(
  x: number,
  y: number,
  gridConfig: BattleMapRuntimeGridConfig,
): { x: number; y: number; } {
  if (gridConfig.mode === 'none') {
    return { x, y };
  }

  if (gridConfig.mode === 'square') {
    return snapSquareTokenPosition(x, y, gridConfig);
  }

  return snapHexTokenPosition(x, y, gridConfig);
}

function getCameraConfigKey(
  camera: Pick<BattleMapRuntimeCameraConfig, 'x' | 'y' | 'zoom'>,
): string {
  return `${camera.x}:${camera.y}:${camera.zoom}`;
}

export default function BattleMapRuntimeCanvas({
  runtimeConfig,
  tokens,
  selectedTokenInstanceId,
  onTokenSelect,
  onTokenMove,
  castingState,
  onCastingAngleChange,
  className,
}: BattleMapRuntimeCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const stageGraphRef = useRef<StageGraph | null>(null);
  const mapSpriteRef = useRef<Sprite | null>(null);
  const mapImageSrcRef = useRef<string | null>(null);
  const imageLoadIdRef = useRef(0);
  const runtimeConfigRef = useRef(runtimeConfig);
  const tokensRef = useRef(tokens);
  const selectedTokenInstanceIdRef = useRef(selectedTokenInstanceId);
  const cameraStateRef = useRef<BattleMapRuntimeCameraConfig>({
    x: runtimeConfig.camera.x,
    y: runtimeConfig.camera.y,
    zoom: getSafeCameraZoom(runtimeConfig.camera.zoom),
  });
  const runtimeCameraKeyRef = useRef(getCameraConfigKey(runtimeConfig.camera));
  const onTokenSelectRef = useRef(onTokenSelect);
  const onTokenMoveRef = useRef(onTokenMove);
  const tokenDisplaysRef = useRef<Map<string, TokenDisplay>>(new Map());
  const activeTokenDragRef = useRef<ActiveTokenDrag | null>(null);
  const activeCameraPanRef = useRef<ActiveCameraPan | null>(null);
  const cameraFocusAnimationRef = useRef<CameraFocusAnimation | null>(null);
  const removeDragListenersRef = useRef<(() => void) | null>(null);
  const removeCameraPanListenersRef = useRef<(() => void) | null>(null);
  const removeWheelListenerRef = useRef<(() => void) | null>(null);
  const removePointerMoveListenerRef = useRef<(() => void) | null>(null);
  const castingStateRef = useRef<CastingState>(castingState);
  const onCastingAngleChangeRef = useRef(onCastingAngleChange);
  const overlayTileCacheRef = useRef<
    {
      key: string;
      squareTiles: HighlightedSquareTile[] | null;
      hexTiles: HighlightedHexTile[] | null;
    } | null
  >(null);

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

  const removeDragListeners = () => {
    removeDragListenersRef.current?.();
    removeDragListenersRef.current = null;
  };

  const removeCameraPanListeners = () => {
    removeCameraPanListenersRef.current?.();
    removeCameraPanListenersRef.current = null;
  };

  const removeWheelListener = () => {
    removeWheelListenerRef.current?.();
    removeWheelListenerRef.current = null;
  };

  const removePointerMoveListener = () => {
    removePointerMoveListenerRef.current?.();
    removePointerMoveListenerRef.current = null;
  };

  const getTokenByInstanceId = (tokenInstanceId: string) => {
    return (
      tokensRef.current.find((token) => token.instanceId === tokenInstanceId)
        ?? null
    );
  };

  const getTokenPixelSize = () => {
    const gridCellSize = clampGridCellSize(
      runtimeConfigRef.current.grid.cellSize,
    );
    return Math.max(MIN_TOKEN_PIXEL_SIZE, gridCellSize * TOKEN_SPRITE_SCALE);
  };

  const replaceTokenBody = (
    display: TokenDisplay,
    nextBody: Sprite | Graphics,
  ) => {
    if (display.body) {
      display.body.parent?.removeChild(display.body);
      display.body.destroy();
    }

    display.body = nextBody;
    display.container.addChildAt(nextBody, 0);
  };

  const syncTokenDisplayStyle = (
    token: RuntimeSceneToken,
    display: TokenDisplay,
    pixelSize: number,
    isSelected: boolean,
  ) => {
    const radius = pixelSize * 0.5;
    const fallbackAlpha = token.isVisible ? 0.95 : INVISIBLE_TOKEN_ALPHA;
    display.container.eventMode = 'static';
    display.container.cursor = 'grab';
    display.container.hitArea = new Circle(0, 0, radius + 6);
    display.container.position.set(token.x, token.y);

    if (display.body instanceof Sprite) {
      display.body.anchor.set(0.5);
      display.body.width = pixelSize;
      display.body.height = pixelSize;
      display.body.alpha = token.isVisible ? 1 : INVISIBLE_TOKEN_ALPHA;
      if (token.sourceMissing) {
        display.body.tint = TOKEN_MISSING_TINT;
      } else if (token.isVisible) {
        display.body.tint = 0xffffff;
      } else {
        display.body.tint = 0xb6d4fe;
      }
    }

    if (display.body instanceof Graphics) {
      const fallbackColor = token.sourceMissing
        ? TOKEN_MISSING_TINT
        : hashTokenColor(token.name);
      display.body
        .clear()
        .circle(0, 0, radius)
        .fill({ color: fallbackColor, alpha: fallbackAlpha })
        .circle(0, 0, radius)
        .stroke({
          color: 0x0f172a,
          width: 2,
          alpha: token.isVisible ? 0.85 : 0.55,
        });
    }

    display.ring.clear();
    if (isSelected) {
      display.ring.circle(0, 0, radius + 4).stroke({
        color: token.sourceMissing
          ? MISSING_TOKEN_RING_COLOR
          : SELECTED_TOKEN_RING_COLOR,
        width: 3,
        alpha: 1,
      });
    }
  };

  const syncTokenDisplayBody = (
    token: RuntimeSceneToken,
    display: TokenDisplay,
    pixelSize: number,
    isSelected: boolean,
  ) => {
    const normalizedImageSrc =
      typeof token.imageSrc === 'string' && token.imageSrc.trim().length > 0
        ? token.imageSrc.trim()
        : null;

    if (normalizedImageSrc) {
      if (
        display.imageSrc === normalizedImageSrc
        && display.body instanceof Sprite
      ) {
        syncTokenDisplayStyle(token, display, pixelSize, isSelected);
        return;
      }

      if (display.failedImageSrc === normalizedImageSrc) {
        if (!(display.body instanceof Graphics)) {
          replaceTokenBody(display, new Graphics());
        }
        display.imageSrc = normalizedImageSrc;
        syncTokenDisplayStyle(token, display, pixelSize, isSelected);
        return;
      }

      if (!(display.body instanceof Graphics)) {
        replaceTokenBody(display, new Graphics());
      }
      display.imageSrc = normalizedImageSrc;
      const loadId = display.imageLoadId + 1;
      display.imageLoadId = loadId;
      syncTokenDisplayStyle(token, display, pixelSize, isSelected);

      void Assets.load(normalizedImageSrc)
        .then((texture) => {
          const latestDisplay = tokenDisplaysRef.current.get(token.instanceId);
          if (!latestDisplay || latestDisplay.imageLoadId !== loadId) {
            return;
          }

          const latestToken = getTokenByInstanceId(token.instanceId);
          if (!latestToken) {
            return;
          }

          latestDisplay.failedImageSrc = null;
          latestDisplay.imageSrc = normalizedImageSrc;
          const sprite = new Sprite(texture);
          replaceTokenBody(latestDisplay, sprite);
          syncTokenDisplayStyle(
            latestToken,
            latestDisplay,
            getTokenPixelSize(),
            selectedTokenInstanceIdRef.current === latestToken.instanceId,
          );
        })
        .catch(() => {
          const latestDisplay = tokenDisplaysRef.current.get(token.instanceId);
          if (!latestDisplay || latestDisplay.imageLoadId !== loadId) {
            return;
          }

          latestDisplay.failedImageSrc = normalizedImageSrc;
          latestDisplay.imageSrc = normalizedImageSrc;
          if (!(latestDisplay.body instanceof Graphics)) {
            replaceTokenBody(latestDisplay, new Graphics());
          }

          const latestToken = getTokenByInstanceId(token.instanceId);
          if (!latestToken) {
            return;
          }
          syncTokenDisplayStyle(
            latestToken,
            latestDisplay,
            getTokenPixelSize(),
            selectedTokenInstanceIdRef.current === latestToken.instanceId,
          );
        });
      return;
    }

    display.imageLoadId += 1;
    display.failedImageSrc = null;
    display.imageSrc = null;
    if (!(display.body instanceof Graphics)) {
      replaceTokenBody(display, new Graphics());
    }
    syncTokenDisplayStyle(token, display, pixelSize, isSelected);
  };

  const removeTokenDisplay = (tokenInstanceId: string) => {
    const display = tokenDisplaysRef.current.get(tokenInstanceId);
    if (!display) {
      return;
    }

    display.container.removeAllListeners();
    display.container.parent?.removeChild(display.container);
    display.container.destroy({ children: true });
    tokenDisplaysRef.current.delete(tokenInstanceId);
  };

  const clearTokenDisplays = () => {
    for (const tokenInstanceId of tokenDisplaysRef.current.keys()) {
      removeTokenDisplay(tokenInstanceId);
    }
    tokenDisplaysRef.current.clear();
  };

  const stopCameraFocusAnimation = () => {
    const app = appRef.current;
    const animation = cameraFocusAnimationRef.current;
    if (!app || !animation) {
      cameraFocusAnimationRef.current = null;
      return;
    }

    app.ticker.remove(animation.tick);
    cameraFocusAnimationRef.current = null;
  };

  // Returns the effective minimum zoom for the current viewport, derived from
  // scene bounds. Scene bounds use viewport dimensions because the background
  // and map layers are drawn to fill the viewport in world space (see
  // getRuntimeSceneBounds in runtimeMath.ts for the full contract).
  // Falls back to MIN_CAMERA_ZOOM when the Pixi app is not yet initialized.
  const getEffectiveMinZoom = () => {
    const app = appRef.current;
    if (!app || app.screen.width <= 0 || app.screen.height <= 0) {
      return MIN_CAMERA_ZOOM;
    }

    const scene = getRuntimeSceneBounds(app.screen.width, app.screen.height);
    return getMinZoomForScene(app.screen.width, app.screen.height, scene);
  };

  const applyCameraState = (
    nextCamera: Pick<BattleMapRuntimeCameraConfig, 'x' | 'y' | 'zoom'>,
  ) => {
    cameraStateRef.current = {
      x: nextCamera.x,
      y: nextCamera.y,
      zoom: clampCameraZoom(nextCamera.zoom, getEffectiveMinZoom()),
    };
    syncCameraTransform();
    syncGridLayer();
  };

  const startCameraFocusAnimation = (targetX: number, targetY: number) => {
    const app = appRef.current;
    if (!app) {
      return;
    }

    stopCameraFocusAnimation();

    const tick = () => {
      const currentCamera = cameraStateRef.current;
      const step = stepCameraCenterTowardTarget(
        currentCamera.x,
        currentCamera.y,
        targetX,
        targetY,
        CAMERA_FOCUS_SMOOTHING,
        CAMERA_FOCUS_SNAP_DISTANCE,
      );
      applyCameraState({
        x: step.x,
        y: step.y,
        zoom: currentCamera.zoom,
      });

      if (step.isComplete) {
        stopCameraFocusAnimation();
      }
    };

    cameraFocusAnimationRef.current = { tick };
    app.ticker.add(tick);
  };

  const getWorldPointFromClient = (clientX: number, clientY: number) => {
    const app = appRef.current;
    if (!app) {
      return null;
    }

    const canvas = app.canvas as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    const screenX = ((clientX - rect.left) / rect.width) * app.screen.width;
    const screenY = ((clientY - rect.top) / rect.height) * app.screen.height;
    const camera = cameraStateRef.current;
    const zoom = getSafeCameraZoom(camera.zoom);

    return {
      x: camera.x + (screenX - app.screen.width * 0.5) / zoom,
      y: camera.y + (screenY - app.screen.height * 0.5) / zoom,
    };
  };

  const finalizeActiveTokenDrag = (
    clientX?: number,
    clientY?: number,
    shouldCommit = true,
  ) => {
    const activeDrag = activeTokenDragRef.current;
    if (!activeDrag) {
      return;
    }

    activeTokenDragRef.current = null;
    removeDragListeners();

    let nextX: number;
    let nextY: number;
    const pointerPosition = clientX !== undefined && clientY !== undefined
      ? getWorldPointFromClient(clientX, clientY)
      : null;
    if (pointerPosition) {
      nextX = pointerPosition.x - activeDrag.offsetX;
      nextY = pointerPosition.y - activeDrag.offsetY;
    } else {
      const display = tokenDisplaysRef.current.get(activeDrag.tokenInstanceId);
      const fallbackToken = getTokenByInstanceId(activeDrag.tokenInstanceId);
      nextX = display?.container.position.x ?? fallbackToken?.x ?? 0;
      nextY = display?.container.position.y ?? fallbackToken?.y ?? 0;
    }

    if (shouldCommit) {
      const snappedPosition = snapTokenPositionToGrid(
        nextX,
        nextY,
        runtimeConfigRef.current.grid,
      );
      const display = tokenDisplaysRef.current.get(activeDrag.tokenInstanceId);
      if (display) {
        display.container.position.set(snappedPosition.x, snappedPosition.y);
      }
      onTokenMoveRef.current(activeDrag.tokenInstanceId, snappedPosition);
      if (!activeDrag.didMove) {
        startCameraFocusAnimation(snappedPosition.x, snappedPosition.y);
      }
      return;
    }

    const display = tokenDisplaysRef.current.get(activeDrag.tokenInstanceId);
    if (display) {
      display.container.position.set(nextX, nextY);
    }
  };

  const finalizeActiveCameraPan = () => {
    if (!activeCameraPanRef.current) {
      return;
    }

    activeCameraPanRef.current = null;
    removeCameraPanListeners();
  };

  const startCameraPan = (event: FederatedPointerEvent) => {
    if (event.pointerType !== 'touch' && event.button !== 0) {
      return;
    }

    if (activeTokenDragRef.current) {
      return;
    }

    stopCameraFocusAnimation();
    finalizeActiveCameraPan();

    activeCameraPanRef.current = {
      pointerId: event.pointerId,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
    };

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      const activePan = activeCameraPanRef.current;
      if (!activePan || pointerEvent.pointerId !== activePan.pointerId) {
        return;
      }

      const deltaX = pointerEvent.clientX - activePan.lastClientX;
      const deltaY = pointerEvent.clientY - activePan.lastClientY;
      activePan.lastClientX = pointerEvent.clientX;
      activePan.lastClientY = pointerEvent.clientY;

      if (deltaX === 0 && deltaY === 0) {
        return;
      }

      const camera = cameraStateRef.current;
      const deltaWorld = worldDeltaFromScreenDelta(deltaX, deltaY, camera.zoom);
      applyCameraState({
        x: camera.x - deltaWorld.x,
        y: camera.y - deltaWorld.y,
        zoom: camera.zoom,
      });
    };

    const handlePointerUp = (pointerEvent: PointerEvent) => {
      const activePan = activeCameraPanRef.current;
      if (!activePan || pointerEvent.pointerId !== activePan.pointerId) {
        return;
      }

      finalizeActiveCameraPan();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    removeCameraPanListenersRef.current = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    event.stopPropagation();
    if (event.nativeEvent instanceof PointerEvent) {
      event.nativeEvent.preventDefault();
    }
  };

  const startTokenDrag = (
    tokenInstanceId: string,
    event: FederatedPointerEvent,
  ) => {
    if (event.pointerType !== 'touch' && event.button !== 0) {
      return;
    }

    const token = getTokenByInstanceId(tokenInstanceId);
    const stageGraph = stageGraphRef.current;
    if (!token || !stageGraph) {
      return;
    }

    const pointerWorldPosition = stageGraph.worldContainer.toLocal(
      event.global,
    );
    onTokenSelectRef.current(tokenInstanceId);
    finalizeActiveTokenDrag();
    finalizeActiveCameraPan();
    stopCameraFocusAnimation();

    activeTokenDragRef.current = {
      tokenInstanceId,
      pointerId: event.pointerId,
      offsetX: pointerWorldPosition.x - token.x,
      offsetY: pointerWorldPosition.y - token.y,
      didMove: false,
    };

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      const activeDrag = activeTokenDragRef.current;
      if (!activeDrag || pointerEvent.pointerId !== activeDrag.pointerId) {
        return;
      }

      const pointerPosition = getWorldPointFromClient(
        pointerEvent.clientX,
        pointerEvent.clientY,
      );
      if (!pointerPosition) {
        return;
      }

      const nextX = pointerPosition.x - activeDrag.offsetX;
      const nextY = pointerPosition.y - activeDrag.offsetY;
      if (
        Math.abs(nextX - token.x) > 0.01
        || Math.abs(nextY - token.y) > 0.01
      ) {
        activeDrag.didMove = true;
      }
      const display = tokenDisplaysRef.current.get(activeDrag.tokenInstanceId);
      if (display) {
        display.container.position.set(nextX, nextY);
      }
    };

    const handlePointerUp = (pointerEvent: PointerEvent) => {
      const activeDrag = activeTokenDragRef.current;
      if (!activeDrag || pointerEvent.pointerId !== activeDrag.pointerId) {
        return;
      }

      finalizeActiveTokenDrag(pointerEvent.clientX, pointerEvent.clientY);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    removeDragListenersRef.current = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    event.stopPropagation();
    if (event.nativeEvent instanceof PointerEvent) {
      event.nativeEvent.preventDefault();
    }
  };

  const syncTokenLayer = () => {
    const stageGraph = stageGraphRef.current;
    if (!stageGraph) {
      return;
    }

    const tokenContainer = stageGraph.tokenContainer;
    const tokenDisplayMap = tokenDisplaysRef.current;
    const activeTokenIds = new Set(
      tokensRef.current.map((token) => token.instanceId),
    );

    for (const tokenInstanceId of tokenDisplayMap.keys()) {
      if (!activeTokenIds.has(tokenInstanceId)) {
        removeTokenDisplay(tokenInstanceId);
      }
    }

    const tokenPixelSize = getTokenPixelSize();
    tokensRef.current.forEach((token, index) => {
      let display = tokenDisplayMap.get(token.instanceId);
      if (!display) {
        const container = new Container();
        const ring = new Graphics();
        container.addChild(ring);
        container.eventMode = 'static';
        container.cursor = 'grab';
        container.on('pointerdown', (event: FederatedPointerEvent) => {
          startTokenDrag(token.instanceId, event);
        });

        tokenContainer.addChild(container);
        display = {
          container,
          body: null,
          ring,
          imageSrc: null,
          failedImageSrc: null,
          imageLoadId: 0,
        };
        tokenDisplayMap.set(token.instanceId, display);
      }

      const isSelected = selectedTokenInstanceIdRef.current === token.instanceId;
      display.container.zIndex = isSelected ? 10000 : index;
      syncTokenDisplayBody(token, display, tokenPixelSize, isSelected);
    });
  };

  const syncOverlayLayer = () => {
    const stageGraph = stageGraphRef.current;
    const state = castingStateRef.current;
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

    const gridConfig = runtimeConfigRef.current.grid;
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
      const shapePoly = getShapePolygon(
        shapeParams,
        casterX,
        casterY,
        cellSize,
      );
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

      const cached = overlayTileCacheRef.current;
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
        overlayTileCacheRef.current = { key: cacheKey, squareTiles, hexTiles };
      }

      const isTokenTarget = ability.target_type === 'token';

      if (gridConfig.mode === 'square' && squareTiles) {
        let occupiedKeys: Set<string> | null = null;
        if (isTokenTarget) {
          occupiedKeys = new Set<string>();
          for (const token of tokensRef.current) {
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
          for (const token of tokensRef.current) {
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
          overlayLayer
            .poly(hexPts, true)
            .fill({ color: 0x38bdf8, alpha: 0.18 });
        }
      }
    }
  };

  const syncCameraTransform = () => {
    const app = appRef.current;
    const stageGraph = stageGraphRef.current;
    if (!app || !stageGraph) {
      return;
    }

    const camera = cameraStateRef.current;
    const zoom = getSafeCameraZoom(camera.zoom);
    const viewportWidth = app.screen.width;
    const viewportHeight = app.screen.height;

    stageGraph.worldContainer.scale.set(zoom);
    stageGraph.worldContainer.position.set(
      viewportWidth * 0.5 - camera.x * zoom,
      viewportHeight * 0.5 - camera.y * zoom,
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
    const { grid } = runtimeConfigRef.current;
    const camera = cameraStateRef.current;
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
    onTokenSelectRef.current = onTokenSelect;
  }, [onTokenSelect]);

  useEffect(() => {
    onTokenMoveRef.current = onTokenMove;
  }, [onTokenMove]);

  useEffect(() => {
    runtimeConfigRef.current = runtimeConfig;
    const nextCameraKey = getCameraConfigKey(runtimeConfig.camera);
    if (nextCameraKey !== runtimeCameraKeyRef.current) {
      runtimeCameraKeyRef.current = nextCameraKey;
      stopCameraFocusAnimation();
      applyCameraState(runtimeConfig.camera);
    }

    syncBaseLayers();
    syncCameraTransform();
    syncGridLayer();
  }, [runtimeConfig]);

  useEffect(() => {
    tokensRef.current = tokens;
    syncTokenLayer();
    syncOverlayLayer();
  }, [tokens]);

  useEffect(() => {
    selectedTokenInstanceIdRef.current = selectedTokenInstanceId;
    syncTokenLayer();

    if (!selectedTokenInstanceId) {
      stopCameraFocusAnimation();
      return;
    }

    if (activeTokenDragRef.current || activeCameraPanRef.current) {
      return;
    }

    const selectedToken = getTokenByInstanceId(selectedTokenInstanceId);
    if (!selectedToken) {
      return;
    }

    startCameraFocusAnimation(selectedToken.x, selectedToken.y);
  }, [selectedTokenInstanceId]);

  useEffect(() => {
    void syncMapImage();
  }, [runtimeConfig.map.imageSrc]);

  useEffect(() => {
    onCastingAngleChangeRef.current = onCastingAngleChange;
  }, [onCastingAngleChange]);

  useEffect(() => {
    castingStateRef.current = castingState;
    overlayTileCacheRef.current = null;
    syncOverlayLayer();
  }, [castingState]);

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
      // Electron custom protocols (vv-media://) are not accessible from blob
      // workers. Disable workers and ImageBitmap so PixiJS loads textures via
      // new Image() in the renderer main thread where the protocol is available.
      Assets.setPreferences({
        preferWorkers: false,
        preferCreateImageBitmap: false,
      });

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
      const rangeOverlayContainer = new Container();
      const tokenContainer = new Container();
      tokenContainer.sortableChildren = true;
      const uiContainer = new Container();
      const backgroundLayer = new Graphics();
      const mapLayer = new Graphics();
      const gridLayer = new Graphics();
      const rangeOverlayLayer = new Graphics();

      backgroundContainer.addChild(backgroundLayer);
      mapContainer.addChild(mapLayer);
      gridContainer.addChild(gridLayer);
      rangeOverlayContainer.addChild(rangeOverlayLayer);
      worldContainer.addChild(backgroundContainer);
      worldContainer.addChild(mapContainer);
      worldContainer.addChild(imageContainer);
      worldContainer.addChild(gridContainer);
      worldContainer.addChild(rangeOverlayContainer);
      worldContainer.addChild(tokenContainer);
      app.stage.addChild(worldContainer);
      app.stage.addChild(uiContainer);
      app.stage.eventMode = 'static';
      app.stage.hitArea = new Rectangle(
        0,
        0,
        app.screen.width,
        app.screen.height,
      );
      app.stage.on('pointerdown', (event: FederatedPointerEvent) => {
        if (activeTokenDragRef.current) {
          return;
        }
        onTokenSelectRef.current(null);
        startCameraPan(event);
      });

      const wheelCanvas = app.canvas as HTMLCanvasElement;
      const handleWheel = (event: WheelEvent) => {
        if (activeTokenDragRef.current) {
          return;
        }

        event.preventDefault();

        const normalizedDelta = event.deltaMode === 1
          ? event.deltaY * WHEEL_LINE_HEIGHT
          : event.deltaMode === 2
          ? event.deltaY * WHEEL_PAGE_HEIGHT
          : event.deltaY;

        const factor = Math.pow(WHEEL_ZOOM_BASE, normalizedDelta);
        const camera = cameraStateRef.current;
        const oldZoom = getSafeCameraZoom(camera.zoom);
        const minZoom = getEffectiveMinZoom();
        const newZoom = clampCameraZoom(oldZoom * factor, minZoom);

        if (newZoom === oldZoom) {
          return;
        }

        const rect = wheelCanvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
          return;
        }

        const screenX = ((event.clientX - rect.left) / rect.width) * app.screen.width;
        const screenY = ((event.clientY - rect.top) / rect.height) * app.screen.height;
        const halfVpW = app.screen.width * 0.5;
        const halfVpH = app.screen.height * 0.5;

        // Keep the world point under the cursor fixed while zooming.
        const worldX = camera.x + (screenX - halfVpW) / oldZoom;
        const worldY = camera.y + (screenY - halfVpH) / oldZoom;
        const newCameraX = worldX - (screenX - halfVpW) / newZoom;
        const newCameraY = worldY - (screenY - halfVpH) / newZoom;

        stopCameraFocusAnimation();
        applyCameraState({ x: newCameraX, y: newCameraY, zoom: newZoom });
      };

      wheelCanvas.addEventListener('wheel', handleWheel, { passive: false });
      removeWheelListenerRef.current = () => {
        wheelCanvas.removeEventListener('wheel', handleWheel);
      };

      const handlePointerMove = (event: PointerEvent) => {
        const state = castingStateRef.current;
        if (!state) return;
        const worldPoint = getWorldPointFromClient(
          event.clientX,
          event.clientY,
        );
        if (!worldPoint) return;
        const angle = Math.atan2(
          worldPoint.y - state.casterY,
          worldPoint.x - state.casterX,
        );
        onCastingAngleChangeRef.current(angle);
      };

      wheelCanvas.addEventListener('pointermove', handlePointerMove);
      removePointerMoveListenerRef.current = () => {
        wheelCanvas.removeEventListener('pointermove', handlePointerMove);
      };

      stageGraphRef.current = {
        worldContainer,
        backgroundContainer,
        mapContainer,
        imageContainer,
        gridContainer,
        rangeOverlayContainer,
        tokenContainer,
        uiContainer,
        backgroundLayer,
        mapLayer,
        gridLayer,
        rangeOverlayLayer,
      };

      syncBaseLayers();
      syncCameraTransform();
      syncGridLayer();
      syncTokenLayer();
      syncOverlayLayer();
      void syncMapImage();

      resizeObserver = new ResizeObserver(() => {
        app.stage.hitArea = new Rectangle(
          0,
          0,
          app.screen.width,
          app.screen.height,
        );
        syncBaseLayers();
        syncCameraTransform();
        syncGridLayer();
        syncTokenLayer();
        syncOverlayLayer();
      });
      resizeObserver.observe(hostElement);
    };

    void initializePixi();

    return () => {
      isDisposed = true;
      imageLoadIdRef.current += 1;
      resizeObserver?.disconnect();
      finalizeActiveTokenDrag(undefined, undefined, false);
      finalizeActiveCameraPan();
      stopCameraFocusAnimation();
      removeDragListeners();
      removeCameraPanListeners();
      removeWheelListener();
      removePointerMoveListener();
      clearTokenDisplays();
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
