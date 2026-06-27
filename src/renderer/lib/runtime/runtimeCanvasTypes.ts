import type { Application, Container, Graphics, Sprite } from 'pixi.js';
import type { RefObject } from 'react';
import type { HighlightedHexTile, HighlightedSquareTile } from '../castingRangeMath';

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

export type RuntimeCastingState = {
  casterX: number;
  casterY: number;
  ability: Ability;
  angleRad: number;
} | null;

export type StageGraph = {
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

export type TokenDisplay = {
  container: Container;
  body: Sprite | Graphics | null;
  ring: Graphics;
  imageSrc: string | null;
  failedImageSrc: string | null;
  imageLoadId: number;
};

export type ActiveTokenDrag = {
  tokenInstanceId: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  didMove: boolean;
};

export type ActiveCameraPan = {
  pointerId: number;
  lastClientX: number;
  lastClientY: number;
};

export type CameraFocusAnimation = {
  tick: () => void;
};

export type OverlayTileCache = {
  key: string;
  squareTiles: HighlightedSquareTile[] | null;
  hexTiles: HighlightedHexTile[] | null;
} | null;

export type LastTokenPointerUp = {
  tokenInstanceId: string;
  timestampMs: number;
} | null;

/**
 * Bag of mutable refs shared across the runtime canvas helper modules
 * (layerRendering, castingOverlay, tokenDisplay, useRuntimeCamera).
 * Built once per BattleMapRuntimeCanvas instance so identity is stable
 * across renders; the extracted modules read/write `ref.current` rather
 * than closing over component-local variables.
 */
export type RuntimeCanvasContext = {
  appRef: RefObject<Application | null>;
  stageGraphRef: RefObject<StageGraph | null>;
  mapSpriteRef: RefObject<Sprite | null>;
  mapImageSrcRef: RefObject<string | null>;
  imageLoadIdRef: RefObject<number>;
  runtimeConfigRef: RefObject<BattleMapRuntimeConfig>;
  tokensRef: RefObject<RuntimeSceneToken[]>;
  selectedTokenInstanceIdRef: RefObject<string | null>;
  cameraStateRef: RefObject<BattleMapRuntimeCameraConfig>;
  tokenDisplaysRef: RefObject<Map<string, TokenDisplay>>;
  activeTokenDragRef: RefObject<ActiveTokenDrag | null>;
  activeCameraPanRef: RefObject<ActiveCameraPan | null>;
  cameraFocusAnimationRef: RefObject<CameraFocusAnimation | null>;
  removeDragListenersRef: RefObject<(() => void) | null>;
  removeCameraPanListenersRef: RefObject<(() => void) | null>;
  castingStateRef: RefObject<RuntimeCastingState>;
  overlayTileCacheRef: RefObject<OverlayTileCache>;
  lastTokenPointerUpRef: RefObject<LastTokenPointerUp>;
  onTokenSelectRef: RefObject<(tokenInstanceId: string | null) => void>;
  onTokenDoubleClickRef: RefObject<(tokenInstanceId: string) => void>;
  onTokenMoveRef: RefObject<
    (tokenInstanceId: string, position: { x: number; y: number; }) => void
  >;
};

export function getTokenByInstanceId(
  ctx: RuntimeCanvasContext,
  tokenInstanceId: string,
): RuntimeSceneToken | null {
  return (
    ctx.tokensRef.current.find(
      (token) => token.instanceId === tokenInstanceId,
    ) ?? null
  );
}
