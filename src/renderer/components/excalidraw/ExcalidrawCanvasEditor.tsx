import { Excalidraw, exportToCanvas } from '@excalidraw/excalidraw';
import { type ComponentProps, forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { useAppSettings } from '../../hooks/useAppSettings';
// eslint-disable-next-line import/no-unresolved
import '@excalidraw/excalidraw/index.css';

export type ExcalidrawCanvasSnapshot = {
  scene: CanvasSceneData | null;
  previewImage: string | null;
};

export type ExcalidrawCanvasEditorHandle = {
  captureSnapshot: () => Promise<ExcalidrawCanvasSnapshot>;
};

type ExcalidrawCanvasEditorProps = {
  initialScene: CanvasSceneData | null;
  onSceneChange?: (scene: CanvasSceneData | null) => void;
  className?: string;
};

type ExcalidrawProps = ComponentProps<typeof Excalidraw>;
type ExcalidrawChangeHandler = NonNullable<ExcalidrawProps['onChange']>;
type ExcalidrawSceneElements = Parameters<ExcalidrawChangeHandler>[0];
type ExcalidrawAppState = Parameters<ExcalidrawChangeHandler>[1];
type ExcalidrawFiles = Parameters<ExcalidrawChangeHandler>[2];
type ExcalidrawInitialData = Exclude<ExcalidrawProps['initialData'], undefined>;
type ExportToCanvasOptions = Parameters<typeof exportToCanvas>[0];
type ExportElements = ExportToCanvasOptions['elements'];
type ExportAppState = NonNullable<ExportToCanvasOptions['appState']>;
type ExportFiles = Exclude<ExportToCanvasOptions['files'], null>;

function buildAssetPath(): string {
  return new URL('./excalidraw-assets/', window.location.href).toString();
}

/**
 * Excalidraw keeps `appState.collaborators` as a `Map`. Persisting the scene
 * runs it through `JSON.stringify`, which turns the Map into `{}`. When that
 * plain object is fed back via `initialData`, Excalidraw calls
 * `collaborators.forEach(...)` and throws `forEach is not a function`, which
 * unmounts the whole canvas page (blank screen, no way back). It is a transient,
 * session-only field that must never be persisted or restored, so drop it on the
 * way in and out. Excalidraw recreates its own empty `Map` internally.
 */
function stripTransientAppState(appState: Record<string, unknown>): Record<string, unknown> {
  if (!('collaborators' in appState)) {
    return appState;
  }
  const clone = { ...appState };
  delete clone.collaborators;
  return clone;
}

function normalizeScene(
  elements: ExcalidrawSceneElements,
  appState: ExcalidrawAppState,
  files: ExcalidrawFiles,
): CanvasSceneData {
  return {
    elements: [...elements],
    appState: stripTransientAppState(appState as unknown as Record<string, unknown>),
    files: files as unknown as Record<string, unknown>,
  };
}

function filterNonDeletedElements(elements: readonly unknown[]): ExportElements {
  return elements.filter((element) => {
    if (!element || typeof element !== 'object') {
      return false;
    }

    return !('isDeleted' in element) || element.isDeleted !== true;
  }) as ExportElements;
}

async function exportPreviewImage(scene: CanvasSceneData): Promise<string | null> {
  const elements = filterNonDeletedElements(scene.elements);
  if (elements.length === 0) {
    return null;
  }

  try {
    const appState = scene.appState as ExportAppState;
    const canvas = await exportToCanvas({
      elements,
      appState: {
        ...appState,
        exportBackground: true,
        viewBackgroundColor: typeof appState.viewBackgroundColor === 'string'
          ? appState.viewBackgroundColor
          : '#ffffff',
      },
      files: scene.files as ExportFiles,
      getDimensions: (width: number, height: number) => {
        const scale = width > height ? 320 / Math.max(width, 1) : 180 / Math.max(height, 1);
        return {
          width: Math.max(1, Math.round(width * Math.min(scale, 1))),
          height: Math.max(1, Math.round(height * Math.min(scale, 1))),
        };
      },
      exportPadding: 16,
    });
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

const ExcalidrawCanvasEditor = forwardRef<
  ExcalidrawCanvasEditorHandle,
  ExcalidrawCanvasEditorProps
>(
  function ExcalidrawCanvasEditor({ initialScene, onSceneChange, className }, ref) {
    const { theme } = useAppSettings();
    const sceneRef = useRef<CanvasSceneData | null>(initialScene);

    window.EXCALIDRAW_ASSET_PATH = buildAssetPath();

    const excalidrawTheme = theme === 'light' ? 'light' : 'dark';
    const initialData = useMemo(
      () =>
        initialScene
          ? {
            elements: initialScene.elements,
            appState: stripTransientAppState(initialScene.appState),
            files: initialScene.files,
          } as ExcalidrawInitialData
          : undefined,
      [initialScene],
    );

    useImperativeHandle(ref, () => ({
      captureSnapshot: async () => {
        const scene = sceneRef.current;
        if (!scene) {
          return { scene: null, previewImage: null };
        }

        return {
          scene,
          previewImage: await exportPreviewImage(scene),
        };
      },
    }));

    return (
      <div
        className={className ?? 'h-full min-h-[70vh] rounded-xl border border-slate-200 bg-white'}
      >
        <Excalidraw
          initialData={initialData}
          theme={excalidrawTheme}
          onChange={(elements, appState, files) => {
            const scene = normalizeScene(elements, appState, files);
            sceneRef.current = scene;
            onSceneChange?.(scene);
          }}
        />
      </div>
    );
  },
);

export default ExcalidrawCanvasEditor;
