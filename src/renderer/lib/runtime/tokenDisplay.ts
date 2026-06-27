import type { FederatedPointerEvent } from 'pixi.js';
import { Assets, Circle, Container, Graphics, Sprite } from 'pixi.js';

import { clampGridCellSize, hashTokenColor } from '../runtimeMath';
import {
  getTokenByInstanceId,
  type RuntimeCanvasContext,
  type RuntimeSceneToken,
  type TokenDisplay,
} from './runtimeCanvasTypes';

const TOKEN_SPRITE_SCALE = 0.82;
const MIN_TOKEN_PIXEL_SIZE = 24;
const INVISIBLE_TOKEN_ALPHA = 0.38;
const SELECTED_TOKEN_RING_COLOR = 0x38bdf8;
const MISSING_TOKEN_RING_COLOR = 0xf97316;
const TOKEN_MISSING_TINT = 0xf97316;

export function getTokenPixelSize(ctx: RuntimeCanvasContext): number {
  const gridCellSize = clampGridCellSize(ctx.runtimeConfigRef.current.grid.cellSize);
  return Math.max(MIN_TOKEN_PIXEL_SIZE, gridCellSize * TOKEN_SPRITE_SCALE);
}

function replaceTokenBody(
  display: TokenDisplay,
  nextBody: Sprite | Graphics,
): void {
  if (display.body) {
    display.body.parent?.removeChild(display.body);
    display.body.destroy();
  }

  display.body = nextBody;
  display.container.addChildAt(nextBody, 0);
}

function syncTokenDisplayStyle(
  token: RuntimeSceneToken,
  display: TokenDisplay,
  pixelSize: number,
  isSelected: boolean,
): void {
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
}

function syncTokenDisplayBody(
  ctx: RuntimeCanvasContext,
  token: RuntimeSceneToken,
  display: TokenDisplay,
  pixelSize: number,
  isSelected: boolean,
): void {
  const normalizedImageSrc = typeof token.imageSrc === 'string' && token.imageSrc.trim().length > 0
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
        const latestDisplay = ctx.tokenDisplaysRef.current.get(token.instanceId);
        if (!latestDisplay || latestDisplay.imageLoadId !== loadId) {
          return;
        }

        const latestToken = getTokenByInstanceId(ctx, token.instanceId);
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
          getTokenPixelSize(ctx),
          ctx.selectedTokenInstanceIdRef.current === latestToken.instanceId,
        );
      })
      .catch(() => {
        const latestDisplay = ctx.tokenDisplaysRef.current.get(token.instanceId);
        if (!latestDisplay || latestDisplay.imageLoadId !== loadId) {
          return;
        }

        latestDisplay.failedImageSrc = normalizedImageSrc;
        latestDisplay.imageSrc = normalizedImageSrc;
        if (!(latestDisplay.body instanceof Graphics)) {
          replaceTokenBody(latestDisplay, new Graphics());
        }

        const latestToken = getTokenByInstanceId(ctx, token.instanceId);
        if (!latestToken) {
          return;
        }
        syncTokenDisplayStyle(
          latestToken,
          latestDisplay,
          getTokenPixelSize(ctx),
          ctx.selectedTokenInstanceIdRef.current === latestToken.instanceId,
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
}

export function removeTokenDisplay(
  ctx: RuntimeCanvasContext,
  tokenInstanceId: string,
): void {
  const display = ctx.tokenDisplaysRef.current.get(tokenInstanceId);
  if (!display) {
    return;
  }

  display.container.removeAllListeners();
  display.container.parent?.removeChild(display.container);
  display.container.destroy({ children: true });
  ctx.tokenDisplaysRef.current.delete(tokenInstanceId);
}

export function clearTokenDisplays(ctx: RuntimeCanvasContext): void {
  for (const tokenInstanceId of ctx.tokenDisplaysRef.current.keys()) {
    removeTokenDisplay(ctx, tokenInstanceId);
  }
  ctx.tokenDisplaysRef.current.clear();
}

/**
 * Syncs the token display layer. `onTokenPointerDown` is injected rather
 * than imported directly because starting a token drag also needs to
 * finalize any in-progress camera pan/focus animation (see
 * useRuntimeCamera.ts) — keeping that dependency out of this module avoids
 * a tokenDisplay -> camera import that this module otherwise wouldn't need.
 */
export function syncTokenLayer(
  ctx: RuntimeCanvasContext,
  onTokenPointerDown: (tokenInstanceId: string, event: FederatedPointerEvent) => void,
): void {
  const stageGraph = ctx.stageGraphRef.current;
  if (!stageGraph) {
    return;
  }

  const tokenContainer = stageGraph.tokenContainer;
  const tokenDisplayMap = ctx.tokenDisplaysRef.current;
  const activeTokenIds = new Set(
    ctx.tokensRef.current.map((token) => token.instanceId),
  );

  for (const tokenInstanceId of tokenDisplayMap.keys()) {
    if (!activeTokenIds.has(tokenInstanceId)) {
      removeTokenDisplay(ctx, tokenInstanceId);
    }
  }

  const tokenPixelSize = getTokenPixelSize(ctx);
  ctx.tokensRef.current.forEach((token, index) => {
    let display = tokenDisplayMap.get(token.instanceId);
    if (!display) {
      const container = new Container();
      const ring = new Graphics();
      container.addChild(ring);
      container.eventMode = 'static';
      container.cursor = 'grab';
      container.on('pointerdown', (event: FederatedPointerEvent) => {
        onTokenPointerDown(token.instanceId, event);
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

    const isSelected = ctx.selectedTokenInstanceIdRef.current === token.instanceId;
    display.container.zIndex = isSelected ? 10000 : index;
    syncTokenDisplayBody(ctx, token, display, tokenPixelSize, isSelected);
  });
}
