import { Application, Container, Graphics, Rectangle } from 'pixi.js';
import type { StageGraph } from './runtimeCanvasTypes';

export function syncStageHitArea(app: Application): void {
  app.stage.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height);
}

export function createRuntimeStage(app: Application): StageGraph {
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
  syncStageHitArea(app);

  return {
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
}
