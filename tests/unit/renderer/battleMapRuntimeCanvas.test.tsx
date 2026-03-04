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

    circle(_x: number, _y: number, _radius: number): this {
      return this;
    }

    fill(_style: unknown): this {
      return this;
    }

    stroke(_style: unknown): this {
      return this;
    }

    rect(_x: number, _y: number, _w: number, _h: number): this {
      return this;
    }

    moveTo(_x: number, _y: number): this {
      return this;
    }

    lineTo(_x: number, _y: number): this {
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
    },
    Circle: MockCircle,
    Container: MockContainer,
    Graphics: MockGraphics,
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

function getApp(): any {
  return pixiState.appInstances[0] as any;
}

function getTokenLayer(app: any): any {
  const worldContainer = app.stage.children[0];
  return worldContainer.children[4];
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
      expect(pixiState.assetsLoadMock).toHaveBeenCalledWith(
        'broken-token.png',
      );
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

    const hexCall = onTokenMove.mock.calls[onTokenMove.mock.calls.length - 1] as [
      string,
      { x: number; y: number },
    ];
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

  it('skips camera focus when selected token instance is not present', async () => {
    render(
      <BattleMapRuntimeCanvas
        runtimeConfig={buildRuntimeConfig()}
        tokens={[buildRuntimeToken({ instanceId: 'runtime-token-a' })]}
        selectedTokenInstanceId={'runtime-token-missing'}
        onTokenSelect={vi.fn()}
        onTokenMove={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(pixiState.appInstances).toHaveLength(1);
    });
    expect(getApp().ticker.add).not.toHaveBeenCalled();
  });
});
