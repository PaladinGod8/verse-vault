import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExcalidrawCanvasEditor, {
  type ExcalidrawCanvasEditorHandle,
} from '../../../src/renderer/components/excalidraw/ExcalidrawCanvasEditor';
import { AppSettingsProvider } from '../../../src/renderer/hooks/useAppSettings';
import { resetWindowDb, setupWindowDb } from '../../helpers/ipcMock';

const { exportToCanvasMock, excalidrawPropsState, mockScene } = vi.hoisted(() => ({
  exportToCanvasMock: vi.fn(),
  excalidrawPropsState: { current: null as Record<string, unknown> | null },
  // `collaborators: {}` mimics the transient Map that JSON-persistence corrupts;
  // the editor must strip it on both the load (initialData) and save (capture) paths.
  mockScene: {
    elements: [{ id: 'shape-1', isDeleted: false }],
    appState: { viewBackgroundColor: '#123456', collaborators: {} },
    files: { 'shape-1': { id: 'shape-1' } },
  } as CanvasSceneData,
}));

vi.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: (props: Record<string, unknown>) => {
    excalidrawPropsState.current = props;
    return (
      <button
        type='button'
        onClick={() =>
          (props.onChange as
            | ((
              elements: unknown[],
              appState: Record<string, unknown>,
              files: Record<string, unknown>,
            ) => void)
            | undefined)?.(
              mockScene.elements,
              mockScene.appState,
              mockScene.files,
            )}
      >
        Trigger Excalidraw Change
      </button>
    );
  },
  exportToCanvas: exportToCanvasMock,
}));

function renderEditor(initialScene: CanvasSceneData | null = mockScene) {
  const ref = createRef<ExcalidrawCanvasEditorHandle>();
  render(
    <AppSettingsProvider>
      <ExcalidrawCanvasEditor ref={ref} initialScene={initialScene} />
    </AppSettingsProvider>,
  );

  return ref;
}

describe('ExcalidrawCanvasEditor', () => {
  beforeEach(() => {
    setupWindowDb();
    resetWindowDb();
    exportToCanvasMock.mockReset();
    excalidrawPropsState.current = null;
    window.EXCALIDRAW_ASSET_PATH = undefined;
  });

  it('passes initialData and light theme into Excalidraw', async () => {
    (window.db.settings.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      config: JSON.stringify({ theme: 'light' }),
      created_at: '2026-01-01 00:00:00',
      updated_at: '2026-01-01 00:00:00',
    });

    renderEditor();

    expect(await screen.findByRole('button', { name: 'Trigger Excalidraw Change' }))
      .toBeInTheDocument();
    expect(excalidrawPropsState.current?.theme).toBe('light');
    expect(excalidrawPropsState.current?.initialData).toEqual({
      elements: mockScene.elements,
      appState: { viewBackgroundColor: '#123456' },
      files: mockScene.files,
    });
    const loadedInitialData = excalidrawPropsState.current?.initialData as {
      appState: Record<string, unknown>;
    };
    expect(loadedInitialData.appState).not.toHaveProperty('collaborators');
    expect(window.EXCALIDRAW_ASSET_PATH).toContain('excalidraw-assets/');
  });

  it('strips transient collaborators from the captured scene so it is never persisted', async () => {
    const user = userEvent.setup();
    exportToCanvasMock.mockResolvedValue({
      toDataURL: () => 'data:image/png;base64,preview',
    });

    const ref = renderEditor(null);

    await user.click(await screen.findByRole('button', { name: 'Trigger Excalidraw Change' }));

    let snapshot: Awaited<ReturnType<ExcalidrawCanvasEditorHandle['captureSnapshot']>> | null =
      null;
    await act(async () => {
      snapshot = await ref.current?.captureSnapshot() ?? null;
    });

    expect(snapshot?.scene?.appState).not.toHaveProperty('collaborators');
    expect(snapshot?.scene?.appState).toEqual({ viewBackgroundColor: '#123456' });
  });

  it('captures latest scene and preview image from exportToCanvas', async () => {
    const user = userEvent.setup();
    exportToCanvasMock.mockResolvedValue({
      toDataURL: () => 'data:image/png;base64,preview',
    });

    const ref = renderEditor(null);

    await user.click(await screen.findByRole('button', { name: 'Trigger Excalidraw Change' }));

    let snapshot: Awaited<ReturnType<ExcalidrawCanvasEditorHandle['captureSnapshot']>> | null =
      null;
    await act(async () => {
      snapshot = await ref.current?.captureSnapshot() ?? null;
    });

    expect(exportToCanvasMock).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: mockScene.elements,
        appState: expect.objectContaining({
          exportBackground: true,
          viewBackgroundColor: '#123456',
        }),
        files: mockScene.files,
      }),
    );
    expect(snapshot).toEqual({
      scene: {
        elements: mockScene.elements,
        appState: { viewBackgroundColor: '#123456' },
        files: mockScene.files,
      },
      previewImage: 'data:image/png;base64,preview',
    });
  });

  it('returns null scene and preview when nothing drawn yet', async () => {
    const ref = renderEditor(null);

    await screen.findByRole('button', { name: 'Trigger Excalidraw Change' });

    let snapshot: Awaited<ReturnType<ExcalidrawCanvasEditorHandle['captureSnapshot']>> | null =
      null;
    await act(async () => {
      snapshot = await ref.current?.captureSnapshot() ?? null;
    });

    expect(exportToCanvasMock).not.toHaveBeenCalled();
    expect(snapshot).toEqual({
      scene: null,
      previewImage: null,
    });
  });

  it('returns null preview when scene has only deleted elements', async () => {
    const ref = renderEditor({
      elements: [{ id: 'deleted-shape', isDeleted: true }],
      appState: { viewBackgroundColor: '#ffffff' },
      files: {},
    });

    await screen.findByRole('button', { name: 'Trigger Excalidraw Change' });

    let snapshot: Awaited<ReturnType<ExcalidrawCanvasEditorHandle['captureSnapshot']>> | null =
      null;
    await act(async () => {
      snapshot = await ref.current?.captureSnapshot() ?? null;
    });

    expect(exportToCanvasMock).not.toHaveBeenCalled();
    expect(snapshot).toEqual({
      scene: {
        elements: [{ id: 'deleted-shape', isDeleted: true }],
        appState: { viewBackgroundColor: '#ffffff' },
        files: {},
      },
      previewImage: null,
    });
  });

  it('filters malformed elements and computes preview dimensions for wide and tall scenes', async () => {
    exportToCanvasMock.mockResolvedValue({
      toDataURL: () => 'data:image/png;base64,preview',
    });

    const ref = renderEditor({
      elements: [null as unknown as never, { id: 'shape-2', isDeleted: false }],
      appState: {},
      files: {},
    });

    await screen.findByRole('button', { name: 'Trigger Excalidraw Change' });

    await act(async () => {
      await ref.current?.captureSnapshot();
    });

    const exportArgs = exportToCanvasMock.mock.calls[0]?.[0] as {
      elements: unknown[];
      getDimensions: (width: number, height: number) => { width: number; height: number; };
    };
    expect(exportArgs.elements).toEqual([{ id: 'shape-2', isDeleted: false }]);
    expect(exportArgs.getDimensions(640, 320)).toEqual({ width: 320, height: 160 });
    expect(exportArgs.getDimensions(200, 400)).toEqual({ width: 90, height: 180 });
  });

  it('returns null preview when exportToCanvas throws', async () => {
    exportToCanvasMock.mockRejectedValue(new Error('boom'));

    const ref = renderEditor({
      elements: [{ id: 'shape-3', isDeleted: false }],
      appState: {},
      files: {},
    });

    await screen.findByRole('button', { name: 'Trigger Excalidraw Change' });

    let snapshot: Awaited<ReturnType<ExcalidrawCanvasEditorHandle['captureSnapshot']>> | null =
      null;
    await act(async () => {
      snapshot = await ref.current?.captureSnapshot() ?? null;
    });

    expect(snapshot).toEqual({
      scene: {
        elements: [{ id: 'shape-3', isDeleted: false }],
        appState: {},
        files: {},
      },
      previewImage: null,
    });
  });
});
