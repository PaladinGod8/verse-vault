import type { FederatedPointerEvent } from 'pixi.js';
import { useMemo } from 'react';

import { syncCameraTransform, syncGridLayer } from '../lib/runtime/layerRendering';
import { getTokenByInstanceId, type RuntimeCanvasContext } from '../lib/runtime/runtimeCanvasTypes';
import {
  clampCameraZoom,
  getMinZoomForScene,
  getRuntimeSceneBounds,
  getSafeCameraZoom,
  MIN_CAMERA_ZOOM,
  snapTokenPositionToGrid,
  stepCameraCenterTowardTarget,
  worldDeltaFromScreenDelta,
} from '../lib/runtimeMath';

const CAMERA_FOCUS_SMOOTHING = 0.18;
const CAMERA_FOCUS_SNAP_DISTANCE = 0.5;
const TOKEN_DOUBLE_CLICK_INTERVAL_MS = 280;

export type RuntimeCameraController = {
  getEffectiveMinZoom: () => number;
  applyCameraState: (
    nextCamera: Pick<BattleMapRuntimeCameraConfig, 'x' | 'y' | 'zoom'>,
  ) => void;
  startCameraFocusAnimation: (targetX: number, targetY: number) => void;
  stopCameraFocusAnimation: () => void;
  getWorldPointFromClient: (
    clientX: number,
    clientY: number,
  ) => { x: number; y: number; } | null;
  startCameraPan: (event: FederatedPointerEvent) => void;
  finalizeActiveCameraPan: () => void;
  startTokenDrag: (
    tokenInstanceId: string,
    event: FederatedPointerEvent,
  ) => void;
  finalizeActiveTokenDrag: (
    clientX?: number,
    clientY?: number,
    shouldCommit?: boolean,
  ) => void;
};

/**
 * Camera pan/zoom, token drag, and camera-focus-animation for the runtime
 * canvas. These are kept in a single hook (rather than split further)
 * because they share `activeTokenDragRef`/`activeCameraPanRef` lifecycle
 * and interrupt each other (e.g. starting a token drag must finalize any
 * in-progress camera pan and stop the focus animation, and vice versa).
 * `ctx` is expected to be stable for the lifetime of the owning component
 * (built once via useMemo/useRef), so this hook's returned controller is
 * memoized on it and behaves like a plain factory.
 */
export default function useRuntimeCamera(
  ctx: RuntimeCanvasContext,
): RuntimeCameraController {
  return useMemo<RuntimeCameraController>(() => {
    const removeDragListeners = () => {
      ctx.removeDragListenersRef.current?.();
      ctx.removeDragListenersRef.current = null;
    };

    const removeCameraPanListeners = () => {
      ctx.removeCameraPanListenersRef.current?.();
      ctx.removeCameraPanListenersRef.current = null;
    };

    const stopCameraFocusAnimation = () => {
      const app = ctx.appRef.current;
      const animation = ctx.cameraFocusAnimationRef.current;
      if (!app || !animation) {
        ctx.cameraFocusAnimationRef.current = null;
        return;
      }

      app.ticker.remove(animation.tick);
      ctx.cameraFocusAnimationRef.current = null;
    };

    // Returns the effective minimum zoom for the current viewport, derived
    // from scene bounds. Scene bounds use viewport dimensions because the
    // background and map layers are drawn to fill the viewport in world
    // space (see getRuntimeSceneBounds in runtimeMath.ts for the full
    // contract). Falls back to MIN_CAMERA_ZOOM when the Pixi app is not yet
    // initialized.
    const getEffectiveMinZoom = () => {
      const app = ctx.appRef.current;
      if (!app || app.screen.width <= 0 || app.screen.height <= 0) {
        return MIN_CAMERA_ZOOM;
      }

      const scene = getRuntimeSceneBounds(app.screen.width, app.screen.height);
      return getMinZoomForScene(app.screen.width, app.screen.height, scene);
    };

    const applyCameraState: RuntimeCameraController['applyCameraState'] = (
      nextCamera,
    ) => {
      ctx.cameraStateRef.current = {
        x: nextCamera.x,
        y: nextCamera.y,
        zoom: clampCameraZoom(nextCamera.zoom, getEffectiveMinZoom()),
      };
      syncCameraTransform(ctx);
      syncGridLayer(ctx);
    };

    const startCameraFocusAnimation: RuntimeCameraController['startCameraFocusAnimation'] = (
      targetX,
      targetY,
    ) => {
      const app = ctx.appRef.current;
      if (!app) {
        return;
      }

      stopCameraFocusAnimation();

      const tick = () => {
        const currentCamera = ctx.cameraStateRef.current;
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

      ctx.cameraFocusAnimationRef.current = { tick };
      app.ticker.add(tick);
    };

    const getWorldPointFromClient: RuntimeCameraController['getWorldPointFromClient'] = (
      clientX,
      clientY,
    ) => {
      const app = ctx.appRef.current;
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
      const camera = ctx.cameraStateRef.current;
      const zoom = getSafeCameraZoom(camera.zoom);

      return {
        x: camera.x + (screenX - app.screen.width * 0.5) / zoom,
        y: camera.y + (screenY - app.screen.height * 0.5) / zoom,
      };
    };

    const finalizeActiveTokenDrag: RuntimeCameraController['finalizeActiveTokenDrag'] = (
      clientX,
      clientY,
      shouldCommit = true,
    ) => {
      const activeDrag = ctx.activeTokenDragRef.current;
      if (!activeDrag) {
        return;
      }

      ctx.activeTokenDragRef.current = null;
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
        const display = ctx.tokenDisplaysRef.current.get(
          activeDrag.tokenInstanceId,
        );
        const fallbackToken = getTokenByInstanceId(
          ctx,
          activeDrag.tokenInstanceId,
        );
        nextX = display?.container.position.x ?? fallbackToken?.x ?? 0;
        nextY = display?.container.position.y ?? fallbackToken?.y ?? 0;
      }

      if (shouldCommit) {
        const snappedPosition = snapTokenPositionToGrid(
          nextX,
          nextY,
          ctx.runtimeConfigRef.current.grid,
        );
        const display = ctx.tokenDisplaysRef.current.get(
          activeDrag.tokenInstanceId,
        );
        if (display) {
          display.container.position.set(snappedPosition.x, snappedPosition.y);
        }
        ctx.onTokenMoveRef.current(activeDrag.tokenInstanceId, snappedPosition);
        if (!activeDrag.didMove) {
          const nowMs = Date.now();
          const lastPointerUp = ctx.lastTokenPointerUpRef.current;
          if (
            lastPointerUp
            && lastPointerUp.tokenInstanceId === activeDrag.tokenInstanceId
            && nowMs - lastPointerUp.timestampMs <= TOKEN_DOUBLE_CLICK_INTERVAL_MS
          ) {
            ctx.lastTokenPointerUpRef.current = null;
            ctx.onTokenDoubleClickRef.current(activeDrag.tokenInstanceId);
            return;
          }
          ctx.lastTokenPointerUpRef.current = {
            tokenInstanceId: activeDrag.tokenInstanceId,
            timestampMs: nowMs,
          };
          startCameraFocusAnimation(snappedPosition.x, snappedPosition.y);
        } else {
          ctx.lastTokenPointerUpRef.current = null;
        }
        return;
      }

      const display = ctx.tokenDisplaysRef.current.get(
        activeDrag.tokenInstanceId,
      );
      if (display) {
        display.container.position.set(nextX, nextY);
      }
    };

    const finalizeActiveCameraPan: RuntimeCameraController['finalizeActiveCameraPan'] = () => {
      if (!ctx.activeCameraPanRef.current) {
        return;
      }

      ctx.activeCameraPanRef.current = null;
      removeCameraPanListeners();
    };

    const startCameraPan: RuntimeCameraController['startCameraPan'] = (
      event,
    ) => {
      if (event.pointerType !== 'touch' && event.button !== 0) {
        return;
      }

      if (ctx.activeTokenDragRef.current) {
        return;
      }

      stopCameraFocusAnimation();
      finalizeActiveCameraPan();

      ctx.activeCameraPanRef.current = {
        pointerId: event.pointerId,
        lastClientX: event.clientX,
        lastClientY: event.clientY,
      };

      const handlePointerMove = (pointerEvent: PointerEvent) => {
        const activePan = ctx.activeCameraPanRef.current;
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

        const camera = ctx.cameraStateRef.current;
        const deltaWorld = worldDeltaFromScreenDelta(deltaX, deltaY, camera.zoom);
        applyCameraState({
          x: camera.x - deltaWorld.x,
          y: camera.y - deltaWorld.y,
          zoom: camera.zoom,
        });
      };

      const handlePointerUp = (pointerEvent: PointerEvent) => {
        const activePan = ctx.activeCameraPanRef.current;
        if (!activePan || pointerEvent.pointerId !== activePan.pointerId) {
          return;
        }

        finalizeActiveCameraPan();
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
      ctx.removeCameraPanListenersRef.current = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };

      event.stopPropagation();
      if (event.nativeEvent instanceof PointerEvent) {
        event.nativeEvent.preventDefault();
      }
    };

    const startTokenDrag: RuntimeCameraController['startTokenDrag'] = (
      tokenInstanceId,
      event,
    ) => {
      if (event.pointerType !== 'touch' && event.button !== 0) {
        return;
      }

      const token = getTokenByInstanceId(ctx, tokenInstanceId);
      const stageGraph = ctx.stageGraphRef.current;
      if (!token || !stageGraph) {
        return;
      }

      const pointerWorldPosition = stageGraph.worldContainer.toLocal(
        event.global,
      );
      ctx.onTokenSelectRef.current(tokenInstanceId);
      finalizeActiveTokenDrag();
      finalizeActiveCameraPan();
      stopCameraFocusAnimation();

      ctx.activeTokenDragRef.current = {
        tokenInstanceId,
        pointerId: event.pointerId,
        offsetX: pointerWorldPosition.x - token.x,
        offsetY: pointerWorldPosition.y - token.y,
        didMove: false,
      };

      const handlePointerMove = (pointerEvent: PointerEvent) => {
        const activeDrag = ctx.activeTokenDragRef.current;
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
        const display = ctx.tokenDisplaysRef.current.get(
          activeDrag.tokenInstanceId,
        );
        if (display) {
          display.container.position.set(nextX, nextY);
        }
      };

      const handlePointerUp = (pointerEvent: PointerEvent) => {
        const activeDrag = ctx.activeTokenDragRef.current;
        if (!activeDrag || pointerEvent.pointerId !== activeDrag.pointerId) {
          return;
        }

        finalizeActiveTokenDrag(pointerEvent.clientX, pointerEvent.clientY);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
      ctx.removeDragListenersRef.current = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };

      event.stopPropagation();
      if (event.nativeEvent instanceof PointerEvent) {
        event.nativeEvent.preventDefault();
      }
    };

    return {
      getEffectiveMinZoom,
      applyCameraState,
      startCameraFocusAnimation,
      stopCameraFocusAnimation,
      getWorldPointFromClient,
      startCameraPan,
      finalizeActiveCameraPan,
      startTokenDrag,
      finalizeActiveTokenDrag,
    };
  }, [ctx]);
}
