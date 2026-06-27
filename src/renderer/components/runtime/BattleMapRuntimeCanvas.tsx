import { useEffect, useMemo, useRef } from 'react';
// eslint-disable-next-line import/no-unresolved -- pixi.js exposes this via package exports; eslint-import resolver flags a false positive.
import 'pixi.js/unsafe-eval';
import { Application, Assets } from 'pixi.js';

import useRuntimeCamera from '../../hooks/useRuntimeCamera';
import { syncOverlayLayer } from '../../lib/runtime/castingOverlay';
import { createRuntimeStage, syncStageHitArea } from '../../lib/runtime/createRuntimeStage';
import {
  removeMapSprite,
  syncBaseLayers,
  syncCameraTransform,
  syncGridLayer,
  syncMapImage,
} from '../../lib/runtime/layerRendering';
import type {
  ActiveCameraPan,
  ActiveTokenDrag,
  CameraFocusAnimation,
  LastTokenPointerUp,
  OverlayTileCache,
  RuntimeCanvasContext,
  RuntimeCastingState,
  RuntimeSceneToken,
  StageGraph,
} from '../../lib/runtime/runtimeCanvasTypes';
import {
  bindRuntimeCastingPointerMove,
  bindRuntimeWheelZoom,
} from '../../lib/runtime/runtimeInteraction';
import { clearTokenDisplays, syncTokenLayer } from '../../lib/runtime/tokenDisplay';
import { getSafeCameraZoom } from '../../lib/runtimeMath';

export type {
  RuntimeCastingState as CastingState,
  RuntimeSceneToken,
} from '../../lib/runtime/runtimeCanvasTypes';

type BattleMapRuntimeCanvasProps = {
  runtimeConfig: BattleMapRuntimeConfig;
  tokens: RuntimeSceneToken[];
  selectedTokenInstanceId: string | null;
  onTokenSelect: (tokenInstanceId: string | null) => void;
  onTokenDoubleClick: (tokenInstanceId: string) => void;
  onTokenMove: (
    tokenInstanceId: string,
    position: { x: number; y: number; },
  ) => void;
  castingState: RuntimeCastingState;
  onCastingAngleChange: (angleRad: number) => void;
  className?: string;
};

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
  onTokenDoubleClick,
  onTokenMove,
  castingState,
  onCastingAngleChange,
  className,
}: BattleMapRuntimeCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const stageGraphRef = useRef<StageGraph | null>(null);
  const mapSpriteRef: RuntimeCanvasContext['mapSpriteRef'] = useRef(null);
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
  const onTokenDoubleClickRef = useRef(onTokenDoubleClick);
  const onTokenMoveRef = useRef(onTokenMove);
  const tokenDisplaysRef: RuntimeCanvasContext['tokenDisplaysRef'] = useRef(new Map());
  const activeTokenDragRef = useRef<ActiveTokenDrag | null>(null);
  const activeCameraPanRef = useRef<ActiveCameraPan | null>(null);
  const cameraFocusAnimationRef = useRef<CameraFocusAnimation | null>(null);
  const removeDragListenersRef = useRef<(() => void) | null>(null);
  const removeCameraPanListenersRef = useRef<(() => void) | null>(null);
  const removeWheelListenerRef = useRef<(() => void) | null>(null);
  const removePointerMoveListenerRef = useRef<(() => void) | null>(null);
  const castingStateRef = useRef<RuntimeCastingState>(castingState);
  const onCastingAngleChangeRef = useRef(onCastingAngleChange);
  const overlayTileCacheRef = useRef<OverlayTileCache>(null);
  const lastTokenPointerUpRef = useRef<LastTokenPointerUp>(null);

  const ctx: RuntimeCanvasContext = useMemo(
    () => ({
      appRef,
      stageGraphRef,
      mapSpriteRef,
      mapImageSrcRef,
      imageLoadIdRef,
      runtimeConfigRef,
      tokensRef,
      selectedTokenInstanceIdRef,
      cameraStateRef,
      tokenDisplaysRef,
      activeTokenDragRef,
      activeCameraPanRef,
      cameraFocusAnimationRef,
      removeDragListenersRef,
      removeCameraPanListenersRef,
      castingStateRef,
      overlayTileCacheRef,
      lastTokenPointerUpRef,
      onTokenSelectRef,
      onTokenDoubleClickRef,
      onTokenMoveRef,
    }),
    [],
  );

  const camera = useRuntimeCamera(ctx);

  const removeWheelListener = () => {
    removeWheelListenerRef.current?.();
    removeWheelListenerRef.current = null;
  };

  const removePointerMoveListener = () => {
    removePointerMoveListenerRef.current?.();
    removePointerMoveListenerRef.current = null;
  };

  const syncSceneLayers = () => {
    syncBaseLayers(ctx);
    syncCameraTransform(ctx);
    syncGridLayer(ctx);
  };

  const syncInteractiveLayers = () => {
    syncTokenLayer(ctx, camera.startTokenDrag);
    syncOverlayLayer(ctx);
  };

  const syncFullRuntimeCanvas = () => {
    syncSceneLayers();
    syncInteractiveLayers();
  };

  useEffect(() => {
    onTokenSelectRef.current = onTokenSelect;
  }, [onTokenSelect]);

  useEffect(() => {
    onTokenMoveRef.current = onTokenMove;
  }, [onTokenMove]);

  useEffect(() => {
    onTokenDoubleClickRef.current = onTokenDoubleClick;
  }, [onTokenDoubleClick]);

  useEffect(() => {
    runtimeConfigRef.current = runtimeConfig;
    const nextCameraKey = getCameraConfigKey(runtimeConfig.camera);
    if (nextCameraKey !== runtimeCameraKeyRef.current) {
      runtimeCameraKeyRef.current = nextCameraKey;
      camera.stopCameraFocusAnimation();
      camera.applyCameraState(runtimeConfig.camera);
    }

    syncSceneLayers();
  }, [camera, runtimeConfig]);

  useEffect(() => {
    tokensRef.current = tokens;
    syncInteractiveLayers();
  }, [camera, tokens]);

  useEffect(() => {
    selectedTokenInstanceIdRef.current = selectedTokenInstanceId;
    syncTokenLayer(ctx, camera.startTokenDrag);

    if (!selectedTokenInstanceId) {
      camera.stopCameraFocusAnimation();
      return;
    }

    if (activeTokenDragRef.current || activeCameraPanRef.current) {
      return;
    }

    const selectedToken = tokensRef.current.find(
      (token) => token.instanceId === selectedTokenInstanceId,
    );
    if (!selectedToken) {
      return;
    }

    camera.startCameraFocusAnimation(selectedToken.x, selectedToken.y);
  }, [camera, selectedTokenInstanceId]);

  useEffect(() => {
    void syncMapImage(ctx);
  }, [runtimeConfig.map.imageSrc]);

  useEffect(() => {
    onCastingAngleChangeRef.current = onCastingAngleChange;
  }, [onCastingAngleChange]);

  useEffect(() => {
    castingStateRef.current = castingState;
    overlayTileCacheRef.current = null;
    syncOverlayLayer(ctx);
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
      stageGraphRef.current = createRuntimeStage(app);
      app.stage.on('pointerdown', (event) => {
        if (activeTokenDragRef.current) {
          return;
        }

        lastTokenPointerUpRef.current = null;
        onTokenSelectRef.current(null);
        camera.startCameraPan(event);
      });

      removeWheelListenerRef.current = bindRuntimeWheelZoom({
        app,
        camera,
        cameraStateRef,
        activeTokenDragRef,
      });
      removePointerMoveListenerRef.current = bindRuntimeCastingPointerMove({
        app,
        camera,
        castingStateRef,
        onCastingAngleChange: (angleRad) => {
          onCastingAngleChangeRef.current(angleRad);
        },
      });

      syncFullRuntimeCanvas();
      void syncMapImage(ctx);

      resizeObserver = new ResizeObserver(() => {
        syncStageHitArea(app);
        syncFullRuntimeCanvas();
      });
      resizeObserver.observe(hostElement);
    };

    void initializePixi();

    return () => {
      isDisposed = true;
      imageLoadIdRef.current += 1;
      resizeObserver?.disconnect();
      camera.finalizeActiveTokenDrag(undefined, undefined, false);
      camera.finalizeActiveCameraPan();
      camera.stopCameraFocusAnimation();
      removeWheelListener();
      removePointerMoveListener();
      clearTokenDisplays(ctx);
      removeMapSprite(ctx);
      stageGraphRef.current = null;

      const app = appRef.current;
      if (app) {
        app.destroy(true, true);
      }
      appRef.current = null;
    };
  }, [camera]);

  return (
    <div
      ref={hostRef}
      className={className ?? 'h-full w-full overflow-hidden bg-black'}
    />
  );
}
