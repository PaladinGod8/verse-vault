import type { Application } from 'pixi.js';
import type { RefObject } from 'react';
import type { RuntimeCameraController } from '../../hooks/useRuntimeCamera';
import { clampCameraZoom, getSafeCameraZoom } from '../runtimeMath';
import type { ActiveTokenDrag, RuntimeCastingState } from './runtimeCanvasTypes';

const WHEEL_ZOOM_BASE = 1.001;
const WHEEL_LINE_HEIGHT = 16;
const WHEEL_PAGE_HEIGHT = 400;

export function bindRuntimeWheelZoom({
  app,
  camera,
  cameraStateRef,
  activeTokenDragRef,
}: {
  app: Application;
  camera: RuntimeCameraController;
  cameraStateRef: RefObject<BattleMapRuntimeCameraConfig>;
  activeTokenDragRef: RefObject<ActiveTokenDrag | null>;
}): () => void {
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
    const cameraStateValue = cameraStateRef.current;
    const oldZoom = getSafeCameraZoom(cameraStateValue.zoom);
    const minZoom = camera.getEffectiveMinZoom();
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
    const halfViewportWidth = app.screen.width * 0.5;
    const halfViewportHeight = app.screen.height * 0.5;

    const worldX = cameraStateValue.x + (screenX - halfViewportWidth) / oldZoom;
    const worldY = cameraStateValue.y + (screenY - halfViewportHeight) / oldZoom;
    const newCameraX = worldX - (screenX - halfViewportWidth) / newZoom;
    const newCameraY = worldY - (screenY - halfViewportHeight) / newZoom;

    camera.stopCameraFocusAnimation();
    camera.applyCameraState({ x: newCameraX, y: newCameraY, zoom: newZoom });
  };

  wheelCanvas.addEventListener('wheel', handleWheel, { passive: false });
  return () => {
    wheelCanvas.removeEventListener('wheel', handleWheel);
  };
}

export function bindRuntimeCastingPointerMove({
  app,
  camera,
  castingStateRef,
  onCastingAngleChange,
}: {
  app: Application;
  camera: RuntimeCameraController;
  castingStateRef: RefObject<RuntimeCastingState>;
  onCastingAngleChange: (angleRad: number) => void;
}): () => void {
  const wheelCanvas = app.canvas as HTMLCanvasElement;
  const handlePointerMove = (event: PointerEvent) => {
    const state = castingStateRef.current;
    if (!state) {
      return;
    }

    const worldPoint = camera.getWorldPointFromClient(
      event.clientX,
      event.clientY,
    );
    if (!worldPoint) {
      return;
    }

    const angle = Math.atan2(
      worldPoint.y - state.casterY,
      worldPoint.x - state.casterX,
    );
    onCastingAngleChange(angle);
  };

  wheelCanvas.addEventListener('pointermove', handlePointerMove);
  return () => {
    wheelCanvas.removeEventListener('pointermove', handlePointerMove);
  };
}
