import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import BattleMapRuntimeCanvas, {
  type RuntimeSceneToken,
} from '../../../src/renderer/components/runtime/BattleMapRuntimeCanvas';

const pixiState = vi.hoisted(() => ({
  appInstances: [] as unknown[],
  assetsLoadMock: vi.fn(),
  assetsUnloadMock: vi.fn(),
  nextInitImplementation: null as null | (() => Promise<void>),
}));

const resizeObserverState = {
  instances: [] as ResizeObserverMock[],
};

type MockDisplayNode = {
  children: MockDisplayNode[];
  emit: (event: string, payload: unknown) => void;
};

type MockPixiApp = {
  stage: MockDisplayNode & { hitArea: unknown };
  ticker: {
    add: (...args: unknown[]) => void;
  };
  destroy: (...args: unknown[]) => void;
};

vi.mock('pixi.js', () => {
  type Listener = (event: unknown) => void;

  class MockContainer {
    children: MockContainer[] = [];
    parent: MockContainer | null = null;
    eventMode = '';
    cursor = '';
    hitArea: unknown = null;
    sortableChildren = false;
    zIndex = 0;
    listeners = new Map<string, Listener[]>();
    position = {
      x: 0,
      y: 0,
      set: (x: number, y?: number) => {
        this.position.x = x;
        this.position.y = y ?? x;
      },
    };
    scale = {
      x: 1,
      y: 1,
      set: (x: number, y?: number) => {
        this.scale.x = x;
        this.scale.y = y ?? x;
      },
    };

    addChild<T extends MockContainer>(child: T): T {
      child.parent = this;
      this.children.push(child);
      return child;
    }

    addChildAt<T extends MockContainer>(child: T, index: number): T {
      child.parent = this;
      this.children.splice(index, 0, child);
      return child;
    }

    removeChild(child: MockContainer): void {
      this.children = this.children.filter((entry) => entry !== child);
      child.parent = null;
    }

    on(event: string, handler: Listener): this {
      const existing = this.listeners.get(event) ?? [];
      existing.push(handler);
      this.listeners.set(event, existing);
      return this;
    }

    emit(event: string, payload: unknown): void {
      for (const handler of this.listeners.get(event) ?? []) {
        handler(payload);
      }
    }

    removeAllListeners(): void {
      this.listeners.clear();
    }

    destroy(): void {
      this.listeners.clear();
      this.children = [];
    }

    toLocal(global: { x: number; y: number }): { x: number; y: number } {
      return { x: global.x, y: global.y };
    }
  }

  class MockGraphics extends MockContainer {
    clear(): this {
      return this;
    }

    circle(x: number, y: number, radius: number): this {
      void x;
      void y;
      void radius;
      return this;
    }

    fill(style: unknown): this {
      void style;
      return this;
    }

    stroke(style: unknown): this {
      void style;
      return this;
    }

    rect(x: number, y: number, w: number, h: number): this {
      void x;
      void y;
      void w;
      void h;
      return this;
    }

    poly(points: number[] | { points: number[] }, closePath: boolean): this {
      void points;
      void closePath;
      return this;
    }

    moveTo(x: number, y: number): this {
      void x;
      void y;
      return this;
    }

    lineTo(x: number, y: number): this {
      void x;
      void y;
      return this;
    }

    closePath(): this {
      return this;
    }
  }

  class MockSprite extends MockContainer {
    width = 0;
    height = 0;
    alpha = 1;
    tint = 0xffffff;
    anchor = {
      x: 0,
      y: 0,
      set: (x: number, y?: number) => {
        this.anchor.x = x;
        this.anchor.y = y ?? x;
      },
    };

    constructor(public texture: unknown) {
      super();
    }
  }

  class MockCircle {
    constructor(
      public x: number,
      public y: number,
      public radius: number,
    ) {}
  }

  class MockRectangle {
    constructor(
      public x: number,
      public y: number,
      public width: number,
      public height: number,
    ) {}
  }

  class MockPolygon {
    points: number[];

    constructor(points: number[]) {
      this.points = points;
    }
  }

  class MockTicker {
    callbacks = new Set<() => void>();
    add = vi.fn((callback: () => void) => {
      this.callbacks.add(callback);
    });
    remove = vi.fn((callback: () => void) => {
      this.callbacks.delete(callback);
    });
  }

  class MockApplication {
    stage = new MockContainer();
    screen = { width: 1000, height: 600 };
    canvas = document.createElement('canvas');
    ticker = new MockTicker();
    init = vi.fn(async () => {
      if (pixiState.nextInitImplementation) {
        const implementation = pixiState.nextInitImplementation;
        pixiState.nextInitImplementation = null;
        await implementation();
        return;
      }
      this.canvas.getBoundingClientRect = () =>
        ({
          left: 0,
          top: 0,
          width: this.screen.width,
          height: this.screen.height,
          right: this.screen.width,
          bottom: this.screen.height,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect;
    });
    destroy = vi.fn();

    constructor() {
      pixiState.appInstances.push(this);
    }
  }

  return {
    Application: MockApplication,
    Assets: {
      load: pixiState.assetsLoadMock,
      unload: pixiState.assetsUnloadMock,
      setPreferences: vi.fn(),
    },
    Circle: MockCircle,
    Container: MockContainer,
    Graphics: MockGraphics,
    Polygon: MockPolygon,
    Rectangle: MockRectangle,
    Sprite: MockSprite,
  };
});

class ResizeObserverMock {
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    resizeObserverState.instances.push(this);
  }

  observe = vi.fn();
  disconnect = vi.fn();

  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

function createPointerEvent(
  type: string,
  init: Partial<PointerEventInit> = {},
): PointerEvent {
  if (typeof PointerEvent === 'function') {
    return new PointerEvent(type, init);
  }
  return new MouseEvent(type, init) as unknown as PointerEvent;
}

function createFederatedPointerEvent(
  overrides: Partial<{
    pointerType: string;
    button: number;
    pointerId: number;
    clientX: number;
    clientY: number;
    global: { x: number; y: number };
  }> = {},
) {
  const pointerId = overrides.pointerId ?? 1;
  const clientX = overrides.clientX ?? 500;
  const clientY = overrides.clientY ?? 300;

  return {
    pointerType: overrides.pointerType ?? 'mouse',
    button: overrides.button ?? 0,
    pointerId,
    clientX,
    clientY,
    global: overrides.global ?? { x: 0, y: 0 },
    stopPropagation: vi.fn(),
    nativeEvent: createPointerEvent('pointerdown', {
      pointerId,
      clientX,
      clientY,
      button: overrides.button ?? 0,
    }),
  };
}

function buildRuntimeConfig(
  overrides: Partial<BattleMapRuntimeConfig> = {},
): BattleMapRuntimeConfig {
  return {
    grid: {
      mode: 'square',
      cellSize: 50,
      originX: 0,
      originY: 0,
      ...(overrides.grid ?? {}),
    },
    map: {
      imageSrc: null,
      backgroundColor: '#000000',
      ...(overrides.map ?? {}),
    },
    camera: {
      x: 0,
      y: 0,
      zoom: 1,
      ...(overrides.camera ?? {}),
    },
  };
}

function buildRuntimeToken(
  overrides: Partial<RuntimeSceneToken> = {},
): RuntimeSceneToken {
  return {
    instanceId: 'runtime-token-1',
    sourceTokenId: 1,
    campaignId: 1,
    name: 'Goblin',
    imageSrc: null,
    isVisible: true,
    sourceMissing: false,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function buildAbility(overrides: Partial<Ability> = {}): Ability {
  return {
    id: 200,
    world_id: 1,
    name: 'Arc Bolt',
    description: null,
    type: 'active',
    passive_subtype: null,
    level_id: null,
    effects: '[]',
    conditions: '[]',
    cast_cost: '{}',
    trigger: null,
    pick_count: null,
    pick_timing: null,
    pick_is_permanent: 0,
    range_cells: 4,
    aoe_shape: 'line',
    aoe_size_cells: 2,
    target_type: 'tile',
    created_at: '2026-03-05 00:00:00',
    updated_at: '2026-03-05 00:00:00',
    ...overrides,
  };
}

function getApp(): MockPixiApp {
  return pixiState.appInstances[0] as MockPixiApp;
}

function getWorldContainer(app: MockPixiApp): MockDisplayNode {
  const worldContainer = app.stage.children[0];
  if (!worldContainer) {
    throw new Error('Expected world container to be initialized');
  }
  return worldContainer;
}

function getTokenLayer(app: MockPixiApp): MockDisplayNode {
  const worldContainer = app.stage.children[0];
  if (!worldContainer) {
    throw new Error('Expected world container to be initialized');
  }
  const tokenLayer = worldContainer.children[5];
  if (!tokenLayer) {
    throw new Error('Expected token layer to be initialized');
  }
  return tokenLayer;
}

function dispatchWheelOnCanvas(
  canvas: HTMLCanvasElement,
  deltaY: number,
  opts: Partial<WheelEventInit> = {},
): void {
  canvas.dispatchEvent(
    new WheelEvent('wheel', {
      deltaY,
      deltaMode: 0,
      clientX: 500,
      clientY: 300,
      bubbles: true,
      cancelable: true,
      ...opts,
    }),
  );
}

describe('BattleMapRuntimeCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pixiState.appInstances.length = 0;
    pixiState.nextInitImplementation = null;
    resizeObserverState.instances.length = 0;
    pixiState.assetsLoadMock.mockResolvedValue({ texture: 'ok' });
    pixiState.assetsUnloadMock.mockResolvedValue(undefined);
    vi.stubGlobal(
      'ResizeObserver',
      ResizeObserverMock as unknown as typeof ResizeObserver,
    );
  });

  it('loads map/token assets and unloads previous map image', async () => {
    const onTokenSelect = vi.fn();
    const onTokenMove = vi.fn();
    const firstRuntimeConfig = buildRuntimeConfig({
      map: { imageSrc: 'map-a.png' },
    });
    const token = buildRuntimeToken({ imageSrc: 'token-a.png' });

    const { rerender } = render(
      <BattleMapRuntimeCanvas
        runtimeConfig={firstRuntimeConfig}
        tokens={[token]}
        selectedTokenInstanceId={null}
        onTokenSelect={onTokenSelect}
        onTokenMove={onTokenMove}
      />,
    );

    await waitFor(() => {
      expect(pixiState.appInstances).toHaveLength(1);
      expect(pixiState.assetsLoadMock).toHaveBeenCalledWith('map-a.png');
      expect(pixiState.assetsLoadMock).toHaveBeenCalledWith('token-a.png');
    });

    pixiState.assetsLoadMock.mockImplementation((src: string) => {
      if (src.includes('broken')) {
        return Promise.reject(new Error('broken'));
      }
      return Promise.resolve({ texture: src });
    });

    rerender(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig({
          map: { imageSrc: 'map-b.png' },
          grid: { mode: 'hex' },
        })}
        tokens={[buildRuntimeToken({ imageSrc: 'broken-token.png' })]}
        selectedTokenInstanceId={null}
        onTokenSelect={onTokenSelect}
        onTokenMove={onTokenMove}
      />,
    );

    await waitFor(() => {
      expect(pixiState.assetsUnloadMock).toHaveBeenCalledWith('map-a.png');
      expect(pixiState.assetsLoadMock).toHaveBeenCalledWith('map-b.png');
      expect(pixiState.assetsLoadMock).toHaveBeenCalledWith('broken-token.png');
    });
  });

  it('snaps drag movement for square, hex, and none grid modes', async () => {
    const onTokenSelect = vi.fn();
    const onTokenMove = vi.fn();
    const token = buildRuntimeToken({ x: 0, y: 0 });

    const { rerender } = render(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig({
          grid: { mode: 'square', cellSize: 50, originX: 0, originY: 0 },
        })}
        tokens={[token]}
        selectedTokenInstanceId={null}
        onTokenSelect={onTokenSelect}
        onTokenMove={onTokenMove}
      />,
    );

    await waitFor(() => {
      expect(pixiState.appInstances).toHaveLength(1);
      expect(getTokenLayer(getApp()).children).toHaveLength(1);
    });
    const tokenDisplay = getTokenLayer(getApp()).children[0];

    tokenDisplay.emit(
      'pointerdown',
      createFederatedPointerEvent({
        pointerId: 11,
        global: { x: 0, y: 0 },
      }),
    );
    window.dispatchEvent(
      createPointerEvent('pointermove', {
        pointerId: 11,
        clientX: 510,
        clientY: 310,
      }),
    );
    window.dispatchEvent(
      createPointerEvent('pointerup', {
        pointerId: 11,
        clientX: 510,
        clientY: 310,
      }),
    );
    expect(onTokenSelect).toHaveBeenCalledWith('runtime-token-1');
    expect(onTokenMove).toHaveBeenLastCalledWith('runtime-token-1', {
      x: 25,
      y: 25,
    });

    rerender(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig({
          grid: { mode: 'hex', cellSize: 50, originX: 0, originY: 0 },
        })}
        tokens={[token]}
        selectedTokenInstanceId={'runtime-token-1'}
        onTokenSelect={onTokenSelect}
        onTokenMove={onTokenMove}
      />,
    );

    tokenDisplay.emit(
      'pointerdown',
      createFederatedPointerEvent({
        pointerId: 12,
        global: { x: 0, y: 0 },
      }),
    );
    window.dispatchEvent(
      createPointerEvent('pointerup', {
        pointerId: 12,
        clientX: 520,
        clientY: 320,
      }),
    );

    const hexCall = onTokenMove.mock.calls[
      onTokenMove.mock.calls.length - 1
    ] as [string, { x: number; y: number }];
    expect(hexCall[0]).toBe('runtime-token-1');
    expect(hexCall[1].x).toBeCloseTo(21.6506, 3);
    expect(hexCall[1].y).toBeCloseTo(37.5, 3);

    rerender(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig({
          grid: { mode: 'none', cellSize: 50, originX: 0, originY: 0 },
        })}
        tokens={[token]}
        selectedTokenInstanceId={null}
        onTokenSelect={onTokenSelect}
        onTokenMove={onTokenMove}
      />,
    );

    tokenDisplay.emit(
      'pointerdown',
      createFederatedPointerEvent({
        pointerId: 13,
        global: { x: 0, y: 0 },
      }),
    );
    window.dispatchEvent(
      createPointerEvent('pointerup', {
        pointerId: 13,
        clientX: 530,
        clientY: 330,
      }),
    );

    expect(onTokenMove).toHaveBeenLastCalledWith('runtime-token-1', {
      x: 30,
      y: 30,
    });
  });

  it('supports stage camera pan and selection clear', async () => {
    const onTokenSelect = vi.fn();
    const onTokenMove = vi.fn();
    render(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig()}
        tokens={[buildRuntimeToken()]}
        selectedTokenInstanceId={null}
        onTokenSelect={onTokenSelect}
        onTokenMove={onTokenMove}
      />,
    );

    await waitFor(() => {
      expect(pixiState.appInstances).toHaveLength(1);
      expect(getApp().stage.hitArea).toBeTruthy();
    });

    getApp().stage.emit(
      'pointerdown',
      createFederatedPointerEvent({
        pointerId: 44,
        clientX: 520,
        clientY: 320,
      }),
    );

    window.dispatchEvent(
      createPointerEvent('pointermove', {
        pointerId: 44,
        clientX: 560,
        clientY: 350,
      }),
    );
    window.dispatchEvent(
      createPointerEvent('pointerup', {
        pointerId: 44,
        clientX: 560,
        clientY: 350,
      }),
    );

    expect(onTokenSelect).toHaveBeenCalledWith(null);
    expect(onTokenMove).not.toHaveBeenCalled();
  });

  it('cleans up active drag and destroys app on unmount', async () => {
    const onTokenSelect = vi.fn();
    const onTokenMove = vi.fn();
    const { unmount, rerender } = render(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig({
          map: { imageSrc: 'map-to-cleanup.png' },
        })}
        tokens={[buildRuntimeToken({ imageSrc: 'token-to-cleanup.png' })]}
        selectedTokenInstanceId={'runtime-token-1'}
        onTokenSelect={onTokenSelect}
        onTokenMove={onTokenMove}
      />,
    );

    await waitFor(() => {
      expect(pixiState.appInstances).toHaveLength(1);
      expect(getTokenLayer(getApp()).children).toHaveLength(1);
    });

    const tokenDisplay = getTokenLayer(getApp()).children[0];
    tokenDisplay.emit(
      'pointerdown',
      createFederatedPointerEvent({
        pointerId: 99,
        global: { x: 0, y: 0 },
      }),
    );

    rerender(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig({
          map: { imageSrc: null },
        })}
        tokens={[]}
        selectedTokenInstanceId={null}
        onTokenSelect={onTokenSelect}
        onTokenMove={onTokenMove}
      />,
    );

    unmount();

    expect(getApp().destroy).toHaveBeenCalledTimes(1);
    expect(pixiState.assetsUnloadMock).toHaveBeenCalled();
  });

  it('ignores stage pan while dragging a token and handles resize observer updates', async () => {
    const onTokenSelect = vi.fn();
    const onTokenMove = vi.fn();

    render(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig()}
        tokens={[buildRuntimeToken({ x: 0, y: 0 })]}
        selectedTokenInstanceId={null}
        onTokenSelect={onTokenSelect}
        onTokenMove={onTokenMove}
      />,
    );

    await waitFor(() => {
      expect(pixiState.appInstances).toHaveLength(1);
      expect(getTokenLayer(getApp()).children).toHaveLength(1);
      expect(resizeObserverState.instances.length).toBeGreaterThan(0);
    });

    const tokenDisplay = getTokenLayer(getApp()).children[0];
    tokenDisplay.emit(
      'pointerdown',
      createFederatedPointerEvent({
        pointerId: 55,
        global: { x: 0, y: 0 },
      }),
    );

    getApp().stage.emit(
      'pointerdown',
      createFederatedPointerEvent({
        pointerId: 56,
        clientX: 530,
        clientY: 320,
      }),
    );
    expect(onTokenSelect).toHaveBeenCalledWith('runtime-token-1');
    expect(onTokenSelect).not.toHaveBeenCalledWith(null);

    resizeObserverState.instances[0].trigger();
    expect(getApp().stage.hitArea).toBeTruthy();

    window.dispatchEvent(
      createPointerEvent('pointerup', {
        pointerId: 55,
        clientX: 510,
        clientY: 310,
      }),
    );
  });

  it('ignores non-primary pointer events for stage panning and token drag', async () => {
    const onTokenSelect = vi.fn();
    const onTokenMove = vi.fn();

    render(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig()}
        tokens={[buildRuntimeToken({ x: 0, y: 0 })]}
        selectedTokenInstanceId={null}
        onTokenSelect={onTokenSelect}
        onTokenMove={onTokenMove}
      />,
    );

    await waitFor(() => {
      expect(pixiState.appInstances).toHaveLength(1);
      expect(getTokenLayer(getApp()).children).toHaveLength(1);
    });

    const tokenDisplay = getTokenLayer(getApp()).children[0];
    tokenDisplay.emit(
      'pointerdown',
      createFederatedPointerEvent({
        pointerId: 71,
        button: 1,
      }),
    );
    expect(onTokenSelect).not.toHaveBeenCalledWith('runtime-token-1');

    getApp().stage.emit(
      'pointerdown',
      createFederatedPointerEvent({
        pointerId: 72,
        button: 1,
      }),
    );
    expect(onTokenSelect).toHaveBeenCalledWith(null);

    window.dispatchEvent(
      createPointerEvent('pointermove', {
        pointerId: 72,
        clientX: 560,
        clientY: 350,
      }),
    );
    window.dispatchEvent(
      createPointerEvent('pointerup', {
        pointerId: 72,
        clientX: 560,
        clientY: 350,
      }),
    );
    expect(onTokenMove).not.toHaveBeenCalled();
  });

  it('destroys pixi app when init completes after component unmount', async () => {
    let resolveInit: (() => void) | null = null;
    pixiState.nextInitImplementation = () =>
      new Promise<void>((resolve) => {
        resolveInit = resolve;
      });

    const { unmount } = render(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig()}
        tokens={[]}
        selectedTokenInstanceId={null}
        onTokenSelect={vi.fn()}
        onTokenMove={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(pixiState.appInstances).toHaveLength(1);
    });
    const app = getApp();
    unmount();
    resolveInit?.();
    await waitFor(() => {
      expect(app.destroy).toHaveBeenCalledWith(true, true);
    });
  });

  it('wheel scroll down zooms in and scroll up zooms out', async () => {
    render(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig({ camera: { x: 0, y: 0, zoom: 1 } })}
        tokens={[]}
        selectedTokenInstanceId={null}
        onTokenSelect={vi.fn()}
        onTokenMove={vi.fn()}
      />,
    );

    await waitFor(() => expect(pixiState.appInstances).toHaveLength(1));
    const canvas = (pixiState.appInstances[0] as { canvas: HTMLCanvasElement })
      .canvas;
    const worldContainer = getWorldContainer(getApp());
    expect(worldContainer.scale.x).toBeCloseTo(1, 5);

    // Positive deltaY → factor > 1 → zoom increases
    dispatchWheelOnCanvas(canvas, 500);
    const zoomedInScale = worldContainer.scale.x;
    expect(zoomedInScale).toBeGreaterThan(1);

    // Negative deltaY from zoomed-in state → zoom decreases
    dispatchWheelOnCanvas(canvas, -200);
    expect(worldContainer.scale.x).toBeLessThan(zoomedInScale);
  });

  it('wheel zoom is clamped at MAX_CAMERA_ZOOM', async () => {
    render(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig({ camera: { x: 0, y: 0, zoom: 1 } })}
        tokens={[]}
        selectedTokenInstanceId={null}
        onTokenSelect={vi.fn()}
        onTokenMove={vi.fn()}
      />,
    );

    await waitFor(() => expect(pixiState.appInstances).toHaveLength(1));
    const canvas = (pixiState.appInstances[0] as { canvas: HTMLCanvasElement })
      .canvas;
    const worldContainer = getWorldContainer(getApp());

    // Extreme scroll down: clamped at MAX_CAMERA_ZOOM (8)
    dispatchWheelOnCanvas(canvas, 100_000);
    expect(worldContainer.scale.x).toBeCloseTo(8, 5);

    // Second extreme scroll from max: newZoom === oldZoom → no-op
    dispatchWheelOnCanvas(canvas, 100_000);
    expect(worldContainer.scale.x).toBeCloseTo(8, 5);
  });

  it('wheel zoom is clamped at the effective min zoom (fit-to-edges boundary)', async () => {
    render(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig({ camera: { x: 0, y: 0, zoom: 4 } })}
        tokens={[]}
        selectedTokenInstanceId={null}
        onTokenSelect={vi.fn()}
        onTokenMove={vi.fn()}
      />,
    );

    await waitFor(() => expect(pixiState.appInstances).toHaveLength(1));
    const canvas = (pixiState.appInstances[0] as { canvas: HTMLCanvasElement })
      .canvas;
    const worldContainer = getWorldContainer(getApp());

    // Mock screen is 1000×600 and scene = viewport → fitZoom = 1.0 → effectiveMinZoom = 1.0
    // Extreme scroll up from zoom 4 must clamp at 1.0
    dispatchWheelOnCanvas(canvas, -100_000);
    expect(worldContainer.scale.x).toBeCloseTo(1, 5);

    // Second extreme scroll-up from min: newZoom === oldZoom → no-op
    dispatchWheelOnCanvas(canvas, -100_000);
    expect(worldContainer.scale.x).toBeCloseTo(1, 5);
  });

  it('wheel zoom is ignored while a token drag is active', async () => {
    const onTokenSelect = vi.fn();
    const onTokenMove = vi.fn();
    render(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig()}
        tokens={[buildRuntimeToken({ x: 0, y: 0 })]}
        selectedTokenInstanceId={null}
        onTokenSelect={onTokenSelect}
        onTokenMove={onTokenMove}
      />,
    );

    await waitFor(() => {
      expect(pixiState.appInstances).toHaveLength(1);
      expect(getTokenLayer(getApp()).children).toHaveLength(1);
    });

    const canvas = (pixiState.appInstances[0] as { canvas: HTMLCanvasElement })
      .canvas;
    const worldContainer = getWorldContainer(getApp());
    const scaleBeforeDrag = worldContainer.scale.x;

    // Start a token drag to set activeTokenDragRef
    const tokenDisplay = getTokenLayer(getApp()).children[0];
    tokenDisplay.emit(
      'pointerdown',
      createFederatedPointerEvent({ pointerId: 88, global: { x: 0, y: 0 } }),
    );

    // Wheel event while drag is active must be ignored
    dispatchWheelOnCanvas(canvas, 5_000);
    expect(worldContainer.scale.x).toBe(scaleBeforeDrag);

    // Release drag to clean up window listeners
    window.dispatchEvent(
      createPointerEvent('pointerup', {
        pointerId: 88,
        clientX: 505,
        clientY: 305,
      }),
    );
  });

  it('selectedTokenInstanceId change while drag is active does not start camera animation', async () => {
    const onTokenSelect = vi.fn();
    const onTokenMove = vi.fn();
    const token = buildRuntimeToken({
      instanceId: 'runtime-token-1',
      x: 0,
      y: 0,
    });

    const { rerender } = render(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig()}
        tokens={[token]}
        selectedTokenInstanceId={null}
        onTokenSelect={onTokenSelect}
        onTokenMove={onTokenMove}
      />,
    );

    await waitFor(() => {
      expect(pixiState.appInstances).toHaveLength(1);
      expect(getTokenLayer(getApp()).children).toHaveLength(1);
    });

    // Start a token drag (activeTokenDragRef becomes non-null)
    const tokenDisplay = getTokenLayer(getApp()).children[0];
    tokenDisplay.emit(
      'pointerdown',
      createFederatedPointerEvent({ pointerId: 91, global: { x: 0, y: 0 } }),
    );

    // Rerender with a new selectedTokenInstanceId while drag is still active;
    // the selectedTokenInstanceId useEffect must short-circuit (no ticker.add for animation)
    const tickerCallsBefore = (getApp().ticker.add as ReturnType<typeof vi.fn>)
      .mock.calls.length;
    rerender(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig()}
        tokens={[token]}
        selectedTokenInstanceId={'runtime-token-1'}
        onTokenSelect={onTokenSelect}
        onTokenMove={onTokenMove}
      />,
    );
    expect(
      (getApp().ticker.add as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBe(tickerCallsBefore);

    // Clean up drag
    window.dispatchEvent(
      createPointerEvent('pointerup', {
        pointerId: 91,
        clientX: 505,
        clientY: 305,
      }),
    );
  });

  it('runtimeConfig camera prop update applies clamped zoom to world container', async () => {
    const { rerender } = render(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig({ camera: { x: 0, y: 0, zoom: 1 } })}
        tokens={[]}
        selectedTokenInstanceId={null}
        onTokenSelect={vi.fn()}
        onTokenMove={vi.fn()}
      />,
    );

    await waitFor(() => expect(pixiState.appInstances).toHaveLength(1));
    const worldContainer = getWorldContainer(getApp());
    expect(worldContainer.scale.x).toBeCloseTo(1, 5);

    // Change camera zoom via prop → camera key changes → applyCameraState called
    rerender(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig({ camera: { x: 0, y: 0, zoom: 3 } })}
        tokens={[]}
        selectedTokenInstanceId={null}
        onTokenSelect={vi.fn()}
        onTokenMove={vi.fn()}
      />,
    );

    expect(worldContainer.scale.x).toBeCloseTo(3, 5);
  });

  it('wheel zoom does nothing when canvas has zero rect dimensions', async () => {
    render(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig()}
        tokens={[]}
        selectedTokenInstanceId={null}
        onTokenSelect={vi.fn()}
        onTokenMove={vi.fn()}
      />,
    );

    await waitFor(() => expect(pixiState.appInstances).toHaveLength(1));
    const canvas = (pixiState.appInstances[0] as { canvas: HTMLCanvasElement })
      .canvas;
    const worldContainer = getWorldContainer(getApp());

    canvas.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        right: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    dispatchWheelOnCanvas(canvas, 500);
    expect(worldContainer.scale.x).toBeCloseTo(1, 5);
  });

  it('skips camera focus when selected token instance is not present', async () => {
    render(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig()}
        tokens={[buildRuntimeToken({ instanceId: 'runtime-token-a' })]}
        selectedTokenInstanceId={'runtime-token-missing'}
        onTokenSelect={vi.fn()}
        onTokenMove={vi.fn()}
        castingState={null}
        onCastingAngleChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(pixiState.appInstances).toHaveLength(1);
    });
    expect(getApp().ticker.add).not.toHaveBeenCalled();
  });

  it('updates casting angle from pointer movement only when casting state is active', async () => {
    const onCastingAngleChange = vi.fn();
    const castingState = {
      casterX: 0,
      casterY: 0,
      angleRad: 0,
      ability: buildAbility({
        id: 301,
        aoe_shape: 'cone',
        target_type: 'tile',
      }),
    };

    const { rerender } = render(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig()}
        tokens={[]}
        selectedTokenInstanceId={null}
        onTokenSelect={vi.fn()}
        onTokenMove={vi.fn()}
        castingState={castingState}
        onCastingAngleChange={onCastingAngleChange}
      />,
    );

    await waitFor(() => {
      expect(pixiState.appInstances).toHaveLength(1);
    });

    const canvas = (pixiState.appInstances[0] as { canvas: HTMLCanvasElement })
      .canvas;
    canvas.dispatchEvent(
      createPointerEvent('pointermove', {
        pointerId: 1,
        clientX: 700,
        clientY: 300,
      }),
    );
    expect(onCastingAngleChange).toHaveBeenCalled();

    const callsBeforeDisable = onCastingAngleChange.mock.calls.length;
    rerender(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig()}
        tokens={[]}
        selectedTokenInstanceId={null}
        onTokenSelect={vi.fn()}
        onTokenMove={vi.fn()}
        castingState={null}
        onCastingAngleChange={onCastingAngleChange}
      />,
    );

    canvas.dispatchEvent(
      createPointerEvent('pointermove', {
        pointerId: 1,
        clientX: 710,
        clientY: 310,
      }),
    );
    expect(onCastingAngleChange.mock.calls.length).toBe(callsBeforeDisable);
  });

  it('guards overlay when casting ability has null range_cells', async () => {
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    render(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig({ grid: { mode: 'square' } })}
        tokens={[buildRuntimeToken({ x: 25, y: 25 })]}
        selectedTokenInstanceId={null}
        onTokenSelect={vi.fn()}
        onTokenMove={vi.fn()}
        castingState={{
          casterX: 25,
          casterY: 25,
          angleRad: 0,
          ability: buildAbility({
            id: 302,
            range_cells: null,
            aoe_shape: null,
          }),
        }}
        onCastingAngleChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  it('executes square casting overlay branches including token targeting and cache reuse', async () => {
    const castingAbility = buildAbility({
      id: 303,
      aoe_shape: 'line',
      target_type: 'token',
      aoe_size_cells: 2,
    });
    const castingState = {
      casterX: 0,
      casterY: 0,
      angleRad: 0,
      ability: castingAbility,
    };

    const { rerender } = render(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig({
          grid: { mode: 'square', cellSize: 50, originX: 0, originY: 0 },
        })}
        tokens={[
          buildRuntimeToken({ instanceId: 'runtime-token-1', x: 25, y: 25 }),
          buildRuntimeToken({ instanceId: 'runtime-token-2', x: 75, y: 25 }),
        ]}
        selectedTokenInstanceId={'runtime-token-1'}
        onTokenSelect={vi.fn()}
        onTokenMove={vi.fn()}
        castingState={castingState}
        onCastingAngleChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(pixiState.appInstances).toHaveLength(1);
    });

    // Same key hits tile cache branch.
    rerender(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig({
          grid: { mode: 'square', cellSize: 50, originX: 0, originY: 0 },
        })}
        tokens={[
          buildRuntimeToken({ instanceId: 'runtime-token-1', x: 25, y: 25 }),
          buildRuntimeToken({ instanceId: 'runtime-token-2', x: 75, y: 25 }),
        ]}
        selectedTokenInstanceId={'runtime-token-1'}
        onTokenSelect={vi.fn()}
        onTokenMove={vi.fn()}
        castingState={castingState}
        onCastingAngleChange={vi.fn()}
      />,
    );

    // Angle-dependent shape with changed angle invalidates cache and recomputes.
    rerender(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig({
          grid: { mode: 'square', cellSize: 50, originX: 0, originY: 0 },
        })}
        tokens={[
          buildRuntimeToken({ instanceId: 'runtime-token-1', x: 25, y: 25 }),
          buildRuntimeToken({ instanceId: 'runtime-token-2', x: 75, y: 25 }),
        ]}
        selectedTokenInstanceId={'runtime-token-2'}
        onTokenSelect={vi.fn()}
        onTokenMove={vi.fn()}
        castingState={{ ...castingState, angleRad: Math.PI / 4 }}
        onCastingAngleChange={vi.fn()}
      />,
    );

    expect(pixiState.appInstances).toHaveLength(1);
  });

  it('executes hex casting overlay branches for token-target abilities', async () => {
    render(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig({
          grid: { mode: 'hex', cellSize: 50, originX: 0, originY: 0 },
        })}
        tokens={[
          buildRuntimeToken({ instanceId: 'runtime-token-h1', x: 0, y: 0 }),
          buildRuntimeToken({ instanceId: 'runtime-token-h2', x: 43.3, y: 75 }),
        ]}
        selectedTokenInstanceId={'runtime-token-h1'}
        onTokenSelect={vi.fn()}
        onTokenMove={vi.fn()}
        castingState={{
          casterX: 0,
          casterY: 0,
          angleRad: Math.PI / 6,
          ability: buildAbility({
            id: 304,
            aoe_shape: 'cone',
            target_type: 'token',
            range_cells: 5,
            aoe_size_cells: 2,
          }),
        }}
        onCastingAngleChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(pixiState.appInstances).toHaveLength(1);
    });
  });
});
