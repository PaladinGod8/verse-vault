import type { CanvasSceneData } from '../../shared/contracts/domainTypes';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeCanvasScene(scene: unknown): CanvasSceneData | null {
  if (scene === null || scene === undefined) {
    return null;
  }

  if (!isRecord(scene)) {
    throw new Error('Canvas scene must be an object');
  }

  const elements = scene.elements;
  const appState = scene.appState;
  const files = scene.files;

  if (!Array.isArray(elements)) {
    throw new Error('Canvas scene elements must be an array');
  }
  if (!isRecord(appState)) {
    throw new Error('Canvas scene appState must be an object');
  }
  if (!isRecord(files)) {
    throw new Error('Canvas scene files must be an object');
  }

  return {
    elements,
    appState,
    files,
  };
}

export function serializeCanvasScene(scene: unknown): string | null {
  const normalized = normalizeCanvasScene(scene);
  return normalized ? JSON.stringify(normalized) : null;
}

export function parseCanvasScene(raw: unknown): CanvasSceneData | null {
  if (typeof raw !== 'string' || !raw.trim()) {
    return null;
  }

  try {
    return normalizeCanvasScene(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function normalizeCanvasPreviewImage(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function normalizeCanvasEnabled(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}
